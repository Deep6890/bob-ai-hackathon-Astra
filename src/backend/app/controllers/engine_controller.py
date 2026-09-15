"""
engine_controller.py
====================
Validates incoming requests for Engine routes and interacts with Services/Repositories.
"""
from app.repositories.engine_repository import EngineRepository
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.sensor_repository import SensorRepository
from app.services.pipeline_service import PipelineService
from app.utils.errors import APIError

class EngineController:
    def __init__(self):
        self.engine_repo = EngineRepository()
        self.analysis_repo = AnalysisRepository()
        self.sensor_repo = SensorRepository()
        self.pipeline_service = PipelineService()

    def get_engines(self):
        engines = self.engine_repo.get_all_engines()
        return [e.to_dict() for e in engines]

    def get_engine(self, engine_id: int):
        engine = self.engine_repo.get_engine_by_id_or_404(engine_id)
        return engine.to_dict()

    def get_engine_analysis(self, engine_id: int):
        """Returns the latest engine-level analysis result from the DB."""
        engine = self.engine_repo.get_engine_by_id_or_404(engine_id)
        
        # We try to get Readiness if a mission was run, else we just get the latest Prediction
        # For simplicity, we just return the latest prediction.
        pred = self.analysis_repo.get_latest_prediction(engine_id)
        if not pred:
            # Maybe run analysis if it doesn't exist? The requirement asks to persist and return.
            pred = self.pipeline_service.analyze_engine(engine_id)
            
        return pred.to_dict()

    def force_analyze_engine(self, engine_id: int):
        """Forces a manual re-analysis."""
        # Validates engine exists
        self.engine_repo.get_engine_by_id_or_404(engine_id)
        pred = self.pipeline_service.analyze_engine(engine_id)
        return pred.to_dict()

    def get_engine_sensors(self, engine_id: int):
        """Returns the latest sensor-level analysis."""
        engine = self.engine_repo.get_engine_by_id_or_404(engine_id)
        pred = self.analysis_repo.get_latest_prediction(engine_id)
        if not pred:
            pred = self.pipeline_service.analyze_engine(engine_id)
            
        sensor_analyses = self.analysis_repo.get_sensor_analysis_for_prediction(pred.id)
        return [sa.to_dict() for sa in sensor_analyses]

    def get_sensor_history(self, engine_id: int, limit: int = 50):
        """
        Returns chronological sensor reading history for an engine.
        Uses the existing SensorReading table (per-cycle smoothed sensor data).
        Results are ordered by time_cycles ASC, limited to `limit` latest cycles.
        Returns an empty list if no readings exist for this engine.
        """
        # Validates engine exists
        engine = self.engine_repo.get_engine_by_id_or_404(engine_id)
        readings = self.sensor_repo.get_readings_for_engine(engine.unit_number)
        # Trim to last `limit` cycles
        readings = readings[-limit:] if len(readings) > limit else readings
        return [r.to_dict() for r in readings]
