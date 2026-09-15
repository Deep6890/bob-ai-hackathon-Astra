from app.services.data_service import DataService
from app.services.model_service import ModelService
from app.utils.errors import APIError

def get_health_analysis(engine_id):
    """
    Retrieves the sensor history and executes the existing ML inference
    to analyze the current sensor health using Isolation Forest.
    """
    engine_df = DataService.get_instance().get_engine_history(engine_id)
    copilot = ModelService.get_instance().get_copilot()
    
    try:
        result = copilot.analyze_asset(engine_id, engine_df)
    except Exception as e:
        raise APIError(f"Error during ML inference: {str(e)}", code="INFERENCE_FAILED", status_code=500)
        
    current_health_results = result["current_health"]
    
    counts = {"NORMAL": 0, "DEGRADING": 0, "ABNORMAL": 0, "UNKNOWN": 0}
    sensors_list = []
    
    for sensor, data in current_health_results.items():
        counts[data["status"]] += 1
        
        # Only include non-normal sensors for evidence explanation
        if data["status"] != "NORMAL":
            hist_trend = copilot.health_detector.baseline_stats[sensor]["trend"]
            sensors_list.append({
                "sensor": sensor,
                "state": data["status"],
                "persistence": data["persistence"],
                "slope": round(data["trend"], 4),
                "normalized_deviation": round(data["norm_dev"], 2),
                "historical_direction": hist_trend
            })
            
    # Overall summary status
    if counts["ABNORMAL"] > 0 or counts["DEGRADING"] > 0:
        overall_status = "WARNING"
    elif counts["UNKNOWN"] > 0:
        overall_status = "UNKNOWN"
    else:
        overall_status = "NORMAL"
        
    return {
        "engine_id": engine_id,
        "current_health": {
            "state": overall_status,
            "normal_sensors": counts["NORMAL"],
            "degrading_sensors": counts["DEGRADING"],
            "abnormal_sensors": counts["ABNORMAL"],
            "unknown_sensors": counts["UNKNOWN"]
        },
        "evidence": {
            "window_size": copilot.health_detector.window_size if hasattr(copilot.health_detector, 'window_size') else 5,
            "latest_cycle": int(result["latest_cycle"])
        },
        "sensors": sensors_list
    }
