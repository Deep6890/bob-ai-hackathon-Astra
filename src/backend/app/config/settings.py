import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")
    MISSION_DURATION_CYCLES = int(os.getenv("MISSION_DURATION_CYCLES", "30"))
    
    # Paths (Defaulting to the expected relative paths if running from src/backend)
    BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    MODEL_DIR = os.getenv("MODEL_DIR", os.path.join(BASE_DIR, "ai_engine"))
    DATA_DIR = os.getenv("DATA_DIR", os.path.join(BASE_DIR, "data"))
