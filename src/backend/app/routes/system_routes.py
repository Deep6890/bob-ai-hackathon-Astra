from flask import Blueprint
from app.services.model_service import ModelService
from app.services.data_service import DataService
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
    model_service = ModelService.get_instance()
    data_service = DataService.get_instance()
    
    status_data = {
        "api_status": "ok",
        "models_loaded": model_service.is_loaded,
        "dataset_loaded": data_service.get_loaded_status()
    }
    
    if model_service.is_loaded:
        copilot = model_service.get_copilot()
        status_data["model_details"] = {
            "lstm_target": "RUL",
            "health_model": "IsolationForest",
            "baseline_stats_loaded": len(copilot.health_detector.baseline_stats) > 0,
            "configured_mission_duration": copilot.mission_window
        }
        
    return success_response(status_data)
