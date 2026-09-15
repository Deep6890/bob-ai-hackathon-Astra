from app.services.data_service import DataService
from app.services.model_service import ModelService
from app.utils.errors import APIError

def get_rul_prediction(engine_id):
    """
    Retrieves the sensor history and executes the existing ML inference
    to calculate the RUL.
    """
    engine_df = DataService.get_instance().get_engine_history(engine_id)
    copilot = ModelService.get_instance().get_copilot()
    
    # We use the existing public method to avoid calling private ML methods.
    # We then extract only the RUL prediction fact.
    try:
        result = copilot.analyze_asset(engine_id, engine_df)
    except Exception as e:
        raise APIError(f"Error during ML inference: {str(e)}", code="INFERENCE_FAILED", status_code=500)
        
    return {
        "engine_id": engine_id,
        "prediction": {
            "rul_cycles": round(result["predicted_rul"], 1)
        },
        "model": {
            "type": "LSTM",
            "target": "RUL"
        }
    }
