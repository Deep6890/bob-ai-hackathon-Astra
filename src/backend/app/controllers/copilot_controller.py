"""
copilot_controller.py
=====================
Validates incoming Copilot query requests and delegates to CopilotService.
"""
from app.services.copilot_service import CopilotService
from app.repositories.engine_repository import EngineRepository
from app.utils.errors import APIError
from app.utils.logger import log


class CopilotController:
    def __init__(self):
        self.copilot_service = CopilotService()
        self.engine_repo     = EngineRepository()

    def query(self, request_json: dict) -> dict:
        """
        Validates the request and delegates to the copilot service.

        Required fields:
            question (str) — the natural-language question

        Optional fields:
            engine_id (int) — if provided, the query is scoped to this engine;
                              if absent, fleet-level questions are answered.
        """
        if not request_json:
            raise APIError("Request body must be JSON.", status_code=400)

        question = request_json.get("question")
        if not question or not isinstance(question, str) or not question.strip():
            raise APIError(
                "'question' is required and must be a non-empty string.",
                status_code=400
            )

        question = question.strip()
        engine_id_raw = request_json.get("engine_id")

        # engine_id is optional for fleet-level questions
        engine_id = None
        if engine_id_raw is not None:
            try:
                engine_id = int(engine_id_raw)
            except (ValueError, TypeError):
                raise APIError("'engine_id' must be an integer.", status_code=400)
            # Validate the engine exists
            self.engine_repo.get_engine_by_id_or_404(engine_id)

        log("COPILOT", f"Query — engine_id={engine_id} question='{question[:60]}'")
        return self.copilot_service.answer(engine_id, question)
