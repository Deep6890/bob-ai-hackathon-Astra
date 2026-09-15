from flask import Blueprint
from app.handlers.model_handler import ModelHandler
from app.repositories.engine_repository import EngineRepository
from app.utils.responses import success_response

system_bp = Blueprint('system', __name__)

@system_bp.route('/health', methods=['GET'])
def health_check():
    return success_response({
        "status": "ok",
        "service": "mission-readiness-backend"
    })

@system_bp.route('/system/status', methods=['GET'])
def system_status():
    model_handler = ModelHandler.get_instance()
    engine_repo = EngineRepository()
    
    # Check if there are any engines in the DB to represent "dataset_loaded"
    has_data = len(engine_repo.get_all_engines()) > 0
    
    status_data = {
        "api_status": "ok",
        "models_loaded": model_handler.is_loaded,
        "dataset_loaded": has_data
    }
    
    if model_handler.is_loaded:
        copilot = model_handler.get_copilot()
        status_data["model_details"] = {
            "lstm_target": "RUL",
            "health_model": "IsolationForest",
            "baseline_stats_loaded": len(copilot.health_detector.baseline_stats) > 0,
            "configured_mission_duration": copilot.mission_window
        }
        
    return success_response(status_data)


@system_bp.route('/system/model-info', methods=['GET'])
def model_info():
    """
    Returns human-readable model performance metrics for the Model & Analysis page.
    Metrics are the actual offline evaluation results from training — not recalculated at runtime.
    GET /api/v1/system/model-info
    """
    model_handler = ModelHandler.get_instance()

    return success_response({
        "rul_model": {
            "type": "LSTM (Long Short-Term Memory)",
            "input": "30-cycle historical sensor sequence",
            "output": "Remaining Useful Life (RUL) in cycles",
            "features": 14,
            "sequence_length": 30,
            "optimal_epochs": 7,
            "training_engines": 100,
            "cross_validation": "5-fold Group K-Fold (grouped by engine)",
            "validation_metrics": {
                "mae": 10.05,
                "rmse": 13.38,
                "r2": 0.8968,
            },
            "test_metrics": {
                "mae": 11.3,
                "rmse": 14.7,
                "r2": 0.865,
            },
            "loaded": model_handler.is_loaded,
        },
        "health_model": {
            "type": "Isolation Forest",
            "input": "14 smoothed sensor features",
            "reference_population": "Healthy training observations with RUL > 100",
            "estimators": 100,
            "temporal_window": 5,
            "persistence_threshold": 0.60,
            "states": ["NORMAL", "DEGRADING", "ABNORMAL", "UNKNOWN"],
            "loaded": model_handler.is_loaded,
        },
        "notes": {
            "r2_explanation": (
                "R\u00b2 (R-squared) indicates how well the model explains variation in the "
                "validation data. A value of 0.8968 means ~90% of variance is explained. "
                "This is NOT classification accuracy."
            ),
            "health_note": (
                "Isolation Forest identifies sensor behaviour that is statistically unusual "
                "compared with the healthy reference population and checks whether the behaviour "
                "persists over recent cycles. It does not prove a specific physical component failure."
            ),
        },
    })
