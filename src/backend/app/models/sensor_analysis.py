from datetime import datetime
from app import db

class SensorAnalysis(db.Model):
    """
    SensorAnalysis — stores per-sensor health evidence for a specific prediction/cycle.
    """
    __tablename__ = "sensor_analysis"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Links to the Prediction row which represents the engine-level analysis for this cycle
    prediction_id = db.Column(
        db.Integer,
        db.ForeignKey("predictions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    sensor_name = db.Column(db.String(50), nullable=False)
    state = db.Column(db.String(20), nullable=False)  # NORMAL, DEGRADING, ABNORMAL, UNKNOWN
    anomaly_score = db.Column(db.Float, nullable=True)
    persistence = db.Column(db.Float, nullable=True)
    slope = db.Column(db.Float, nullable=True)
    normalized_deviation = db.Column(db.Float, nullable=True)
    degradation_direction = db.Column(db.String(20), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    prediction = db.relationship("Prediction", backref=db.backref("sensor_analyses", lazy="dynamic", cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "sensor": self.sensor_name,
            "state": self.state,
            "anomaly_score": self.anomaly_score,
            "persistence": self.persistence,
            "slope": self.slope,
            "normalized_deviation": self.normalized_deviation,
            "degradation_direction": self.degradation_direction,
            "created_at": self.created_at.isoformat(),
        }
