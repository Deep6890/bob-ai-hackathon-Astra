from flask import Blueprint, request
from app.services.mission_service import get_mission_readiness
from app.utils.responses import success_response
from app.utils.errors import APIError

mission_bp = Blueprint('mission', __name__)

@mission_bp.route('/readiness', methods=['POST'])
def check_readiness():
    data = request.get_json()
    if not data or 'engine_id' not in data:
        raise APIError("Missing required field: 'engine_id'", code="VALIDATION_ERROR", status_code=400)
        
    try:
        engine_id = int(data['engine_id'])
    except ValueError:
        raise APIError("'engine_id' must be an integer.", code="VALIDATION_ERROR", status_code=400)
        
    mission_duration = data.get('mission_duration')
    if mission_duration is not None:
        try:
            mission_duration = int(mission_duration)
        except ValueError:
            raise APIError("'mission_duration' must be an integer.", code="VALIDATION_ERROR", status_code=400)
            
    result = get_mission_readiness(engine_id, mission_duration)
    return success_response(result)
