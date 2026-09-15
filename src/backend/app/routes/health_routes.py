from flask import Blueprint, request
from app.services.health_service import get_health_analysis
from app.utils.responses import success_response
from app.utils.errors import APIError

health_bp = Blueprint('health', __name__)

@health_bp.route('/analyze', methods=['POST'])
def analyze_health():
    data = request.get_json()
    if not data or 'engine_id' not in data:
        raise APIError("Missing required field: 'engine_id'", code="VALIDATION_ERROR", status_code=400)
        
    try:
        engine_id = int(data['engine_id'])
    except ValueError:
        raise APIError("'engine_id' must be an integer.", code="VALIDATION_ERROR", status_code=400)
        
    result = get_health_analysis(engine_id)
    return success_response(result)
