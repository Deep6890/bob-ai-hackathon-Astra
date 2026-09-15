"""
pipeline_handler.py
===================
Wraps the existing AI engine ML implementation. 
This handler receives DataFrames (constructed by the service layer from repository data),
runs the existing ML Copilot, and returns the structured results.
"""
from app.handlers.model_handler import ModelHandler
from app.utils.logger import log

class PipelineHandler:
    def __init__(self):
        self.model_handler = ModelHandler.get_instance()
        
    def analyze_engine(self, sensor_df, engine_id: int):
        """
        Runs the full AI Copilot on the provided historical sensor data.
        :param sensor_df: A Pandas DataFrame containing chronological sensor readings.
        :param engine_id: The ID of the engine (used by ML engine to format results).
        :return: Tuple of (rul_prediction, sensor_health_dict)
        """
        copilot = self.model_handler.get_copilot()
        log("MODEL", "Using cached model")
        log("MODEL", "RUL inference started")
        log("HEALTH", "Sensor health analysis started")
        
        # 1. RUL Prediction & Sensor Health Analysis
        # The ML engine's analyze_asset method does both
        results = copilot.analyze_asset(engine_id, sensor_df)
        
        rul_prediction = results["predicted_rul"]
        sensor_health_dict = results["current_health"]
        latest_cycle = results["latest_cycle"]
        
        log("MODEL", f"RUL prediction completed: {rul_prediction:.1f}")
        log("HEALTH", "Sensor health analysis completed")
        
        return rul_prediction, sensor_health_dict, latest_cycle
