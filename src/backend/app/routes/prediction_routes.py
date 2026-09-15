from flask import Blueprint, request
from app.services.prediction_service import get_rul_prediction
from app.utils.responses import success_response
from app.utils.errors import APIError

prediction_bp = Blueprint('predictions', __name__)

@prediction_bp.route('/rul', methods=['POST'])
def predict_rul():
    data = request.get_json()
    if not data or 'engine_id' not in data:
        raise APIError("Missing required field: 'engine_id'", code="VALIDATION_ERROR", status_code=400)
        
    try:
        engine_id = int(data['engine_id'])
    except ValueError:
        raise APIError("'engine_id' must be an integer.", code="VALIDATION_ERROR", status_code=400)
        
    result = get_rul_prediction(engine_id)
    return success_response(result)
