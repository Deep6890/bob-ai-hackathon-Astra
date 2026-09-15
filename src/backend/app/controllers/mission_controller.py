"""
mission_controller.py
=====================
Validates incoming requests for Mission Readiness evaluations.
"""
from app.services.pipeline_service import PipelineService
from app.utils.errors import APIError
from app.models.mission import Mission
from app.repositories.engine_repository import EngineRepository
from app import db

class MissionController:
    def __init__(self):
        self.pipeline_service = PipelineService()
        self.engine_repo = EngineRepository()

    def evaluate_readiness(self, request_json: dict):
        if not request_json:
            raise APIError("Request body must be JSON.", status_code=400)
            
        engine_id = request_json.get("engine_id")
        mission_duration = request_json.get("mission_duration")
        
        if engine_id is None or mission_duration is None:
            raise APIError("Both 'engine_id' and 'mission_duration' are required.", status_code=400)
            
        try:
            engine_id = int(engine_id)
            mission_duration = float(mission_duration)
        except ValueError:
            raise APIError("Invalid data types for engine_id or mission_duration.", status_code=400)

        # Validate engine exists
        engine = self.engine_repo.get_engine_by_id_or_404(engine_id)
        
        # In a real app we'd receive mission details and create/find the mission.
        # For this hackathon endpoint, we check if one exists for the asset and update duration,
        # or create a new mock mission row.
        mission = Mission.query.filter_by(asset_id=engine.id).first()
        if not mission:
            mission = Mission(asset_id=engine.id, mission_duration=mission_duration, mission_name=f"SORTIE-{engine_id}")
            db.session.add(mission)
            db.session.commit()
        elif mission.mission_duration != mission_duration:
            mission.mission_duration = mission_duration
            db.session.commit()

        # Run pipeline service
        rr = self.pipeline_service.evaluate_mission_readiness(
            engine_id=engine_id, 
            mission_id=mission.id, 
            mission_duration=mission_duration
        )
        # Fetch latest prediction and sensors
        pred = self.pipeline_service.analysis_repo.get_latest_prediction(engine_id)
        sensors = self.pipeline_service.analysis_repo.get_sensor_analysis_for_prediction(pred.id)
        
        normal = sum(1 for s in sensors if s.state == "NORMAL")
        degrading = sum(1 for s in sensors if s.state == "DEGRADING")
        abnormal = sum(1 for s in sensors if s.state == "ABNORMAL")
        unknown = sum(1 for s in sensors if s.state == "UNKNOWN")
        
        maintenance_priority = "LOW"
        if abnormal > 0 or degrading > 0 or rr.margin_of_safety < 0:
            maintenance_priority = "HIGH"
        elif rr.margin_of_safety < 15:
            maintenance_priority = "MEDIUM"

        return {
            "engine_id": engine_id,
            "latest_cycle": pred.prediction_cycle,
            "rul_assessment": {
                "predicted_rul_cycles": float(pred.rul_predicted),
                "margin_of_safety": rr.margin_of_safety
            },
            "current_health": {
                "normal_sensors": normal,
                "degrading_sensors": degrading,
                "abnormal_sensors": abnormal,
                "unknown_sensors": unknown,
                "status": "WARNING" if (abnormal > 0 or degrading > 0) else "READY"
            },
            "combined_assessment": {
                "mission_readiness": rr.risk_flag,
                "maintenance_priority": maintenance_priority,
                "recommendation": rr.recommendation
            }
        }
