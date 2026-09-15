"""
app/models/prediction.py
=========================
Prediction — ML model output for an asset at a specific cycle.

Each time the ML model runs inference on an asset, a new Prediction row
is inserted. The "latest" prediction is what drives the readiness decision.

Relationship: many Predictions → one Asset (latest one is used for go/no-go).

The ML inference pipeline (Krish's code) will write to this table via the API.
"""

from datetime import datetime
from app import db


class Prediction(db.Model):
    __tablename__ = "predictions"

    # ── Keys ─────────────────────────────────────────────────────────────────
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    asset_id = db.Column(
        db.Integer,
        db.ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # The sensor_reading row this prediction was based on (optional link)
    sensor_reading_id = db.Column(
        db.Integer,
        db.ForeignKey("sensor_readings.id", ondelete="SET NULL"),
        nullable=True
    )

    # ── ML model output fields ─────────────────────────────────────────────────
    # Cycle at which the prediction was made
    prediction_cycle = db.Column(db.Integer, nullable=False)

    # Raw RUL predicted by the model (not clipped)
    rul_predicted = db.Column(db.Float, nullable=False)

    # Clipped RUL (≤125) — the model's actual usable output
    rul_clipped = db.Column(db.Float, nullable=False)

    # predicted_failure_TTE: alias for rul_clipped — used by mission window logic
    # Field name matches schema.json exactly
    predicted_failure_TTE = db.Column(db.Float, nullable=False)

    # Model confidence / uncertainty estimate (optional, for future model versions)
    confidence_score = db.Column(db.Float, nullable=True)

    # Which ML model version produced this (for auditability)
    model_version = db.Column(db.String(50), nullable=True, default="v1.0")

    # ── Timestamp ─────────────────────────────────────────────────────────────
    predicted_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # ── Relationships ──────────────────────────────────────────────────────────
    asset          = db.relationship("Asset", back_populates="predictions")
    sensor_reading = db.relationship("SensorReading")
    # One prediction can have one ReadinessResult
    readiness_results = db.relationship(
        "ReadinessResult", back_populates="prediction",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return (
            f"<Prediction asset_id={self.asset_id} "
            f"cycle={self.prediction_cycle} rul={self.rul_clipped:.1f}>"
        )

    def to_dict(self):
        return {
            "id":                    self.id,
            "asset_id":              self.asset_id,
            "sensor_reading_id":     self.sensor_reading_id,
            "prediction_cycle":      self.prediction_cycle,
            "rul_predicted":         self.rul_predicted,
            "rul_clipped":           self.rul_clipped,
            "predicted_failure_TTE": self.predicted_failure_TTE,
            "confidence_score":      self.confidence_score,
            "model_version":         self.model_version,
            "predicted_at":          self.predicted_at.isoformat(),
        }
