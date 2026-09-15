"""
analysis_repository.py
======================
Database interactions for saving and loading analysis results (Predictions, Readiness, SensorAnalysis).
"""
from app.models.prediction import Prediction
from app.models.readiness import ReadinessResult
from app.models.sensor_analysis import SensorAnalysis
from app.models.mission import Mission
from app import db

class AnalysisRepository:
    
    def get_latest_prediction(self, engine_id: int) -> Prediction:
        """Fetch the most recent RUL prediction for an engine."""
        from app.models.asset import Asset
        return db.session.query(Prediction).join(Asset).filter(
            Asset.unit_number == engine_id
        ).order_by(Prediction.predicted_at.desc()).first()
        
    def get_latest_readiness(self, engine_id: int) -> ReadinessResult:
        """Fetch the most recent readiness result for an engine."""
        from app.models.asset import Asset
        return db.session.query(ReadinessResult).join(Prediction).join(Asset).filter(
            Asset.unit_number == engine_id
        ).order_by(ReadinessResult.computed_at.desc()).first()

    def get_sensor_analysis_for_prediction(self, prediction_id: int):
        """Fetch the sensor level analysis for a specific prediction."""
        return SensorAnalysis.query.filter_by(prediction_id=prediction_id).all()
        
    def save_analysis(self, asset_id: int, rul_value: float, sensor_states: dict, prediction_cycle: int) -> Prediction:
        """
        Persists a new Prediction and its associated SensorAnalysis records.
        """
        # Save engine-level prediction
        rul_clipped = min(rul_value, 125.0)
        pred = Prediction(
            asset_id=asset_id,
            rul_predicted=rul_value,
            rul_clipped=rul_clipped,
            predicted_failure_TTE=rul_clipped,
            prediction_cycle=prediction_cycle
        )
        db.session.add(pred)
        db.session.flush() # get ID
        
        # Save sensor-level analysis
        for sensor_name, state_info in sensor_states.items():
            sa = SensorAnalysis(
                prediction_id=pred.id,
                sensor_name=sensor_name,
                state=state_info.get("status", "UNKNOWN"),
                anomaly_score=state_info.get("anomaly_score"),
                persistence=state_info.get("persistence"),
                slope=state_info.get("trend"),
                normalized_deviation=state_info.get("norm_dev"),
                degradation_direction=state_info.get("degradation_direction")
            )
            db.session.add(sa)
            
        db.session.commit()
        return pred

    def save_readiness(self, prediction_id: int, mission_id: int, 
                       score: float, flag: str, tte: float, 
                       duration: float, margin: float, 
                       critical_overlap: bool, rec: str) -> ReadinessResult:
        """Persists mission readiness."""
        # Check if one already exists for this mission, if so update it
        rr = ReadinessResult.query.filter_by(mission_id=mission_id).first()
        if not rr:
            rr = ReadinessResult(mission_id=mission_id)
            db.session.add(rr)
            
        rr.prediction_id = prediction_id
        rr.readiness_score = score
        rr.risk_flag = flag
        rr.predicted_failure_TTE = tte
        rr.mission_duration = duration
        rr.margin_of_safety = margin
        rr.critical_overlap_risk = critical_overlap
        rr.recommendation = rec
        
        db.session.commit()
        return rr
