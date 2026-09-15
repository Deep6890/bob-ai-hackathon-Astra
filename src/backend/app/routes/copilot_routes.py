"""
copilot_routes.py
=================
POST /api/v1/copilot/query  — Mission Readiness Copilot endpoint.

Request body:
    {
        "engine_id": <int>  (optional — omit for fleet-level questions),
        "question":  <str>  (required)
    }

Response:
    {
        "answer":    <str>,      -- evidence-grounded natural language answer
        "evidence":  <dict>,     -- raw data fields cited in the answer
        "engine_id": <int|null>  -- echoes the engine_id from the request
    }
"""
from flask import Blueprint, request
from app.controllers.copilot_controller import CopilotController
from app.utils.responses import success_response

copilot_bp = Blueprint("copilot", __name__)
_controller = CopilotController()


@copilot_bp.route("/query", methods=["POST"])
def copilot_query():
    """
    POST /api/v1/copilot/query
    Answers a natural-language question about engine or fleet readiness.
    Every factual statement is derived from real ML pipeline output.
    """
    data = request.get_json(silent=True)
    result = _controller.query(data or {})
    return success_response(result)
