"""
pipeline_service.py
===================
Coordinates the execution of ML inference by fetching data from Repositories,
running Handlers, and persisting results back to Repositories.
"""
import pandas as pd
from app.repositories.sensor_repository import SensorRepository
from app.repositories.engine_repository import EngineRepository
from app.repositories.analysis_repository import AnalysisRepository
from app.handlers.pipeline_handler import PipelineHandler
from app.utils.logger import log

class PipelineService:
    def __init__(self):
        self.sensor_repo = SensorRepository()
        self.engine_repo = EngineRepository()
        self.analysis_repo = AnalysisRepository()
        self.pipeline_handler = PipelineHandler()

    def analyze_engine(self, engine_id: int):
        """
        Orchestrates full analysis for a given engine.
        Returns the saved Prediction object (engine-level) which includes the SensorAnalysis relationship.
        """
        log("PIPELINE", f"Starting analysis for Engine {engine_id}")
        # 1. Fetch engine
        engine = self.engine_repo.get_engine_by_id_or_404(engine_id)

        # 2. Fetch sensor data for this engine and convert to DataFrame
        readings = self.sensor_repo.get_readings_for_engine(engine_id)
        
        if not readings:
            from app.utils.errors import APIError
            raise APIError(f"No sensor data found for engine {engine_id}.", status_code=400)
            
        # Convert SQLAlchemy objects to pandas DataFrame
        data = []
        for r in readings:
            data.append({
                "time_cycles": r.time_cycles,
                "sensor_2_smooth": r.sensor_2_smooth,
                "sensor_3_smooth": r.sensor_3_smooth,
                "sensor_4_smooth": r.sensor_4_smooth,
                "sensor_7_smooth": r.sensor_7_smooth,
                "sensor_8_smooth": r.sensor_8_smooth,
                "sensor_9_smooth": r.sensor_9_smooth,
                "sensor_11_smooth": r.sensor_11_smooth,
                "sensor_12_smooth": r.sensor_12_smooth,
                "sensor_13_smooth": r.sensor_13_smooth,
                "sensor_14_smooth": r.sensor_14_smooth,
                "sensor_15_smooth": r.sensor_15_smooth,
                "sensor_17_smooth": r.sensor_17_smooth,
                "sensor_20_smooth": r.sensor_20_smooth,
                "sensor_21_smooth": r.sensor_21_smooth
            })
        df = pd.DataFrame(data)

        # 3. Run Pipeline Handler (Inference)
        rul_prediction, sensor_health_dict, latest_cycle = self.pipeline_handler.analyze_engine(df, engine_id)

        # 4. Save results to Database (Persistence)
        # We need the Asset's primary key `id`, not the `unit_number` engine_id
        saved_prediction = self.analysis_repo.save_analysis(
            asset_id=engine.id,
            rul_value=float(rul_prediction),
            sensor_states=sensor_health_dict,
            prediction_cycle=int(latest_cycle)
        )
        
        log("DB", "Saving prediction")
        log("DB", "Saving sensor analysis")
        log("PIPELINE", f"Engine {engine_id} analysis completed")

        return saved_prediction

    def evaluate_mission_readiness(self, engine_id: int, mission_id: int, mission_duration: float):
        """
        Evaluates mission readiness based on the LATEST prediction for the engine.
        If no prediction exists, runs the pipeline first.
        """
        # Fetch latest prediction
        prediction = self.analysis_repo.get_latest_prediction(engine_id)
        
        # If no analysis exists yet, run it
        if not prediction:
            prediction = self.analyze_engine(engine_id)
            
        log("MISSION", f"Mission readiness evaluation started for Engine {engine_id}")
        # Get sensor level health to compute combined status
        from app.models.readiness import ReadinessResult
        
        # Compute Readiness logic
        # 1. TTE
        tte = float(prediction.rul_predicted)
        
        # 2. Margin
        margin = tte - mission_duration
        
        # 3. Risk Flag
        risk_flag = ReadinessResult.compute_risk_flag(margin)
        
        # 4. Score
        score = ReadinessResult.compute_readiness_score(tte)
        
        # 5. Recommendation
        rec = ReadinessResult.build_recommendation(risk_flag, margin)
        
        # 6. Critical overlap risk
        critical_overlap = margin < 0
        
        log("MISSION", f"Readiness: {risk_flag}")
        log("MISSION", f"Maintenance priority: {rec.split('.')[0]}")

        # Save Readiness
        rr = self.analysis_repo.save_readiness(
            prediction_id=prediction.id,
            mission_id=mission_id,
            score=score,
            flag=risk_flag,
            tte=tte,
            duration=mission_duration,
            margin=margin,
            critical_overlap=critical_overlap,
            rec=rec
        )
        
        return rr
