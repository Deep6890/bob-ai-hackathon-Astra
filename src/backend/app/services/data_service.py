import pandas as pd
import os
from app.config.settings import Config
from app.utils.errors import APIError

class DataService:
    _instance = None
    
    def __init__(self):
        self.test_data = None
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
        
    def load_data(self):
        """Loads the test dataset into memory once at startup."""
        data_path = os.path.join(Config.DATA_DIR, "processed", "test_ready.csv")
        try:
            self.test_data = pd.read_csv(data_path)
            # Ensure it is chronologically sorted per engine
            self.test_data = self.test_data.sort_values(by=["unit_number", "time_cycles"])
        except Exception as e:
            # We don't crash, we just log it, but it means engine requests might fail
            # In a real app we'd log this properly
            print(f"Error loading dataset: {e}")
            self.test_data = None
            
    def get_engine_history(self, engine_id):
        """Returns the chronological sensor history for a specific engine."""
        if self.test_data is None:
            raise APIError("Test dataset is not loaded.", code="DATA_UNAVAILABLE", status_code=503)
            
        engine_data = self.test_data[self.test_data['unit_number'] == engine_id]
        
        if engine_data.empty:
            raise APIError(f"Engine {engine_id} was not found in the dataset.", code="ENGINE_NOT_FOUND", status_code=404)
            
        return engine_data.copy()

    def get_loaded_status(self):
        return self.test_data is not None
