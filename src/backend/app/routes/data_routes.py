"""
data_routes.py
==============
Endpoints for CSV ingestion, dataset info, and dataset reset.
"""
from flask import Blueprint, request
from app.controllers.data_controller import DataController
from app.utils.responses import success_response

data_bp = Blueprint('data', __name__)
controller = DataController()

@data_bp.route('/upload', methods=['POST'])
def upload_data():
    file = request.files.get('file')
    result = controller.process_csv_upload(file)
    return success_response(result)

@data_bp.route('/dataset-info', methods=['GET'])
def get_dataset_info():
    """
    Returns metadata about the currently loaded dataset.
    GET /api/v1/data/dataset-info
    """
    result = controller.get_dataset_info()
    return success_response(result)

@data_bp.route('/reset', methods=['DELETE'])
def reset_dataset():
    """
    Clears all fleet analysis data (assets, readings, predictions, readiness, missions, sensor analyses).
    Only called after explicit user confirmation — never called automatically.
    DELETE /api/v1/data/reset
    """
    result = controller.reset_dataset()
    return success_response(result)
