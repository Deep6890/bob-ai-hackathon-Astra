"""
app/models/mission.py
=====================
Mission — a planned sortie/operation assigned to an asset.

Relationship: many Missions → one Asset.
The `mission_duration` field is the key input to the business logic:
    margin_of_safety = predicted_failure_TTE - mission_duration
    CRITICAL_OVERLAP_RISK = margin_of_safety < 0

The API team (Deep) should expose a POST /missions endpoint that creates
a Mission row; the readiness check is then triggered automatically.
"""

from datetime import datetime
from app import db


class Mission(db.Model):
    __tablename__ = "missions"

    # ── Keys ─────────────────────────────────────────────────────────────────
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    asset_id = db.Column(
        db.Integer,
        db.ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # ── Mission details ───────────────────────────────────────────────────────
    # Human-readable mission name / code, e.g. "SORTIE-2024-001"
    mission_name = db.Column(db.String(100), nullable=False)

    # Mission type: "combat", "training", "recon", "transport"
    mission_type = db.Column(db.String(50), nullable=True)

    # CRITICAL FIELD: planned duration in engine cycles.
    # This is what apply_mission_window() receives as the `mission_duration` param.
    # Backend/API team: read this from the DB when computing readiness.
    mission_duration = db.Column(db.Float, nullable=False)

    # Planned start cycle (absolute engine cycle count, not calendar date)
    planned_start_cycle = db.Column(db.Integer, nullable=True)

    # Mission status: "planned" | "active" | "completed" | "aborted"
    status = db.Column(db.String(30), nullable=False, default="planned")

    # Notes / briefing
    notes = db.Column(db.Text, nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    scheduled_at = db.Column(db.DateTime, nullable=True)
    created_at   = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at   = db.Column(
        db.DateTime, nullable=False,
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    asset    = db.relationship("Asset", back_populates="missions")
    # One mission can have one ReadinessResult (the go/no-go decision)
    readiness_result = db.relationship(
        "ReadinessResult", back_populates="mission",
        uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self):
        return (
            f"<Mission id={self.id} name={self.mission_name} "
            f"duration={self.mission_duration} status={self.status}>"
        )

    def to_dict(self):
        return {
            "id":                  self.id,
            "asset_id":            self.asset_id,
            "mission_name":        self.mission_name,
            "mission_type":        self.mission_type,
            "mission_duration":    self.mission_duration,
            "planned_start_cycle": self.planned_start_cycle,
            "status":              self.status,
            "notes":               self.notes,
            "scheduled_at":        self.scheduled_at.isoformat() if self.scheduled_at else None,
            "created_at":          self.created_at.isoformat(),
        }
