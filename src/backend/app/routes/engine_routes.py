"""
engine_routes.py
================
Endpoints for engines and sensor analysis.
"""
from flask import Blueprint
from app.controllers.engine_controller import EngineController
from app.utils.responses import success_response

engine_bp = Blueprint('engines', __name__)
controller = EngineController()

@engine_bp.route('/', methods=['GET'])
def get_engines():
    engines = controller.get_engines()
    return success_response(engines)

@engine_bp.route('/<int:engine_id>', methods=['GET'])
def get_engine(engine_id):
    engine = controller.get_engine(engine_id)
    return success_response(engine)

@engine_bp.route('/<int:engine_id>/analysis', methods=['GET'])
def get_engine_analysis(engine_id):
    analysis = controller.get_engine_analysis(engine_id)
    return success_response(analysis)

@engine_bp.route('/<int:engine_id>/analyze', methods=['POST'])
def force_analyze_engine(engine_id):
    analysis = controller.force_analyze_engine(engine_id)
    return success_response(analysis)

@engine_bp.route('/<int:engine_id>/sensors', methods=['GET'])
def get_engine_sensors(engine_id):
    sensors = controller.get_engine_sensors(engine_id)
    return success_response(sensors)

@engine_bp.route('/<int:engine_id>/sensors/history', methods=['GET'])
def get_sensor_history(engine_id):
    """
    Returns per-cycle sensor reading history from the SensorReading table.
    Query param: ?limit=50 (default 50, max 200)
    Results ordered time_cycles ASC.
    """
    from flask import request as flask_request
    try:
        limit = int(flask_request.args.get('limit', 50))
        limit = min(limit, 200)  # cap at 200
    except ValueError:
        limit = 50
    history = controller.get_sensor_history(engine_id, limit=limit)
    return success_response(history)
