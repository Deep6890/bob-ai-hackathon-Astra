from flask import Blueprint, request
from app.controllers.mission_controller import MissionController
from app.utils.responses import success_response

mission_bp = Blueprint('mission', __name__)
controller = MissionController()

@mission_bp.route('/readiness', methods=['POST'])
def mission_readiness():
    data = request.get_json()
    result = controller.evaluate_readiness(data)
    return success_response(result)
