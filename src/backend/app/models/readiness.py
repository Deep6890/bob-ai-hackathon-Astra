"""
app/models/readiness.py
========================
ReadinessResult — the final computed go/no-go decision for a mission.

This table is the OUTPUT of the full pipeline:
    Asset → latest Prediction → Mission → ReadinessResult

Field names here are what the FRONTEND TEAM (Mayur) will read from API responses.
Do NOT rename these fields without coordinating with Mayur.

Frontend-facing fields:
    readiness_score        — 0.0 to 100.0 (higher = safer)
    risk_flag              — "SAFE" | "MARGINAL" | "CRITICAL"
    predicted_failure_TTE  — cycles until predicted failure
    margin_of_safety       — predicted_failure_TTE - mission_duration
    critical_overlap_risk  — Boolean, true = GROUND THIS ASSET
    recommendation         — human-readable string for UI display
"""

from datetime import datetime
from app import db


class ReadinessResult(db.Model):
    __tablename__ = "readiness_results"

    # ── Keys ─────────────────────────────────────────────────────────────────
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # FK → predictions.id — which ML output drove this decision
    prediction_id = db.Column(
        db.Integer,
        db.ForeignKey("predictions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # FK → missions.id — which mission is being assessed
    mission_id = db.Column(
        db.Integer,
        db.ForeignKey("missions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,   # one result per mission (re-run overwrites via update)
        index=True
    )

    # ── Core readiness fields (frontend-facing — DO NOT RENAME) ───────────────
    # Composite score 0–100: 100 = perfect health, 0 = immediate failure
    # Formula: min(100, (predicted_failure_TTE / 125) * 100)
    readiness_score = db.Column(db.Float, nullable=False)

    # Categorical risk level for UI badge colouring
    # "SAFE" if margin_of_safety > 20, "MARGINAL" if 0–20, "CRITICAL" if < 0
    risk_flag = db.Column(db.String(20), nullable=False)

    # Mirrors Prediction.predicted_failure_TTE — denormalised for fast API reads
    predicted_failure_TTE = db.Column(db.Float, nullable=False)

    # mission_duration echoed from Mission row
    mission_duration = db.Column(db.Float, nullable=False)

    # predicted_failure_TTE - mission_duration (negative = will fail mid-mission)
    margin_of_safety = db.Column(db.Float, nullable=False)

    # Boolean go/no-go flag — maps to CRITICAL_OVERLAP_RISK in schema.json
    critical_overlap_risk = db.Column(db.Boolean, nullable=False)

    # Plain-English recommendation for the UI card
    recommendation = db.Column(db.Text, nullable=True)

    # ── Timestamp ─────────────────────────────────────────────────────────────
    computed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # ── Relationships ──────────────────────────────────────────────────────────
    prediction = db.relationship("Prediction", back_populates="readiness_results")
    mission    = db.relationship("Mission",    back_populates="readiness_result")

    def __repr__(self):
        return (
            f"<ReadinessResult mission_id={self.mission_id} "
            f"risk={self.risk_flag} score={self.readiness_score:.1f}>"
        )

    def to_dict(self):
        """
        Frontend-facing serialisation.
        Mayur: these are the exact field names you'll get from GET /readiness/<mission_id>
        """
        return {
            "id":                    self.id,
            "prediction_id":         self.prediction_id,
            "mission_id":            self.mission_id,
            "readiness_score":       round(self.readiness_score, 2),
            "risk_flag":             self.risk_flag,
            "predicted_failure_TTE": self.predicted_failure_TTE,
            "mission_duration":      self.mission_duration,
            "margin_of_safety":      round(self.margin_of_safety, 2),
            "critical_overlap_risk": self.critical_overlap_risk,
            "recommendation":        self.recommendation,
            "computed_at":           self.computed_at.isoformat(),
        }

    @staticmethod
    def compute_risk_flag(margin: float) -> str:
        """
        Derive risk flag from margin of safety.
        WHY: Centralised here so API and seed script use identical logic.
        """
        if margin < 0:
            return "CRITICAL"
        elif margin < 20:
            return "MARGINAL"
        else:
            return "SAFE"

    @staticmethod
    def compute_readiness_score(predicted_tte: float, rul_clip: int = 125) -> float:
        """Simple 0–100 score: what fraction of max healthy life remains."""
        return min(100.0, (predicted_tte / rul_clip) * 100)

    @staticmethod
    def build_recommendation(risk_flag: str, margin: float) -> str:
        """Generate plain-English recommendation string for the dashboard card."""
        if risk_flag == "CRITICAL":
            return (
                f"GROUND ASSET IMMEDIATELY. Engine will fail {abs(margin):.0f} cycles "
                f"before mission completion. Do not dispatch."
            )
        elif risk_flag == "MARGINAL":
            return (
                f"CAUTION: Only {margin:.0f} cycles of margin. Schedule inspection "
                f"before dispatch. Mission requires approval from maintenance chief."
            )
        else:
            return (
                f"MISSION READY. {margin:.0f} cycles of safety margin available. "
                f"Proceed as planned."
            )
