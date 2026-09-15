from app.services.data_service import DataService
from app.services.model_service import ModelService
from app.config.settings import Config
from app.utils.errors import APIError

def get_mission_readiness(engine_id, mission_duration=None):
    """
    Executes the existing ML inference pipeline to generate a combined
    mission readiness and maintenance priority report.
    """
    if mission_duration is None:
        mission_duration = Config.MISSION_DURATION_CYCLES
        
    engine_df = DataService.get_instance().get_engine_history(engine_id)
    copilot = ModelService.get_instance().get_copilot()
    
    # We must temporarily override the copilot's mission window if it was explicitly provided
    original_mission_window = copilot.mission_window
    if mission_duration != original_mission_window:
        copilot.mission_window = mission_duration
        
    try:
        result = copilot.analyze_asset(engine_id, engine_df)
    except Exception as e:
        # Restore before raising
        copilot.mission_window = original_mission_window
        raise APIError(f"Error during ML inference: {str(e)}", code="INFERENCE_FAILED", status_code=500)
        
    # Restore the original mission window
    copilot.mission_window = original_mission_window
    
    # Extract facts from result
    predicted_rul = float(result["predicted_rul"])
    current_health_results = result["current_health"]
    
    counts = {"NORMAL": 0, "DEGRADING": 0, "ABNORMAL": 0, "UNKNOWN": 0}
    for data in current_health_results.values():
        counts[data["status"]] += 1
        
    if counts["ABNORMAL"] > 0 or counts["DEGRADING"] > 0:
        overall_health_status = "WARNING"
    elif counts["UNKNOWN"] > 0:
        overall_health_status = "UNKNOWN"
    else:
        overall_health_status = "NORMAL"
        
    margin = predicted_rul - mission_duration
    rul_status = "READY"
    if margin < 0:
        rul_status = "NOT READY"
    elif margin < 15:
        rul_status = "WARNING"
        
    return {
        "engine_id": engine_id,
        "rul_assessment": {
            "predicted_rul_cycles": round(predicted_rul, 1),
            "mission_duration_cycles": mission_duration,
            "status": rul_status,
            "margin_cycles": round(margin, 1)
        },
        "current_health": {
            "status": overall_health_status,
            "normal_sensors": counts["NORMAL"],
            "degrading_sensors": counts["DEGRADING"],
            "abnormal_sensors": counts["ABNORMAL"],
            "unknown_sensors": counts["UNKNOWN"]
        },
        "combined_assessment": {
            "status": result["readiness"],
            "maintenance_priority": result["priority"],
            "reason": result["reason"]
        },
        "evidence": {
            "latest_observed_cycle": int(result["latest_cycle"]),
            "health_window_cycles": 5
        }
    }
