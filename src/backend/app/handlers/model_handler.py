import os
import sys
import torch
from app.config.settings import Config
from app.utils.errors import APIError

# Add the backend directory and ai_engine to path to allow seamless imports of existing ML code
sys.path.append(os.path.abspath(os.path.join(Config.BASE_DIR, "ai_engine")))

try:
    from lstm_network import RULPredictorLSTM
    from inference import PredictiveMaintenanceCopilot
except ImportError as e:
    print(f"Error importing existing ML modules: {e}")

class ModelHandler:
    _instance = None
    
    def __init__(self):
        self.copilot = None
        self.lstm_model = None
        self.is_loaded = False
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
        
    def load_models(self):
        """Loads models once and caches them."""
        try:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            model_dir = Config.MODEL_DIR
            lstm_path = os.path.join(model_dir, "best_rul_lstm.pth")
            
            # The 14 sensor features used in the existing pipeline
            feature_cols = [f'sensor_{i}_smooth' for i in [2, 3, 4, 7, 8, 9, 11, 12, 13, 14, 15, 17, 20, 21]]
            
            # 1. Initialize empty PyTorch model
            self.lstm_model = RULPredictorLSTM(input_size=len(feature_cols), hidden_size=64, num_layers=2, dropout=0.2)
            
            # 2. Load weights
            if os.path.exists(lstm_path):
                self.lstm_model.load_state_dict(torch.load(lstm_path, map_location=device))
            else:
                print(f"LSTM weights not found at {lstm_path}. Inference will fail.")
                
            self.lstm_model.to(device)
            self.lstm_model.eval()
            
            # 3. Instantiate the public existing ML inference class
            # This class internally loads the UnsupervisedHealthDetector and its artifacts
            self.copilot = PredictiveMaintenanceCopilot(
                model=self.lstm_model,
                feature_cols=feature_cols,
                sequence_length=30,
                mission_window=Config.MISSION_DURATION_CYCLES,
                device=device
            )
            
            self.is_loaded = True
        except Exception as e:
            print(f"Error loading models: {e}")
            self.is_loaded = False
            
    def get_copilot(self):
        if not self.is_loaded or self.copilot is None:
            raise APIError("Models are not loaded or unavailable.", code="MODELS_UNAVAILABLE", status_code=503)
        return self.copilot

