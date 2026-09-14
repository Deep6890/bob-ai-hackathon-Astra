"""
app/models/service_record.py
=============================
ServiceRecord — maintenance / inspection history for an asset.

Relationship: many ServiceRecords → one Asset.
Used to track what work was done and when, so the readiness score can
account for recent maintenance (e.g. reset degradation counter after overhaul).
"""

from datetime import datetime
from app import db


class ServiceRecord(db.Model):
    __tablename__ = "service_records"

    # ── Keys ─────────────────────────────────────────────────────────────────
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    asset_id = db.Column(
        db.Integer,
        db.ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # ── Service details ───────────────────────────────────────────────────────
    # Type of service: "inspection" | "repair" | "overhaul" | "part_replacement"
    service_type = db.Column(db.String(50), nullable=False)

    # Human-readable description of what was done
    description = db.Column(db.Text, nullable=True)

    # Cycle count on the engine at time of service
    cycle_at_service = db.Column(db.Integer, nullable=False)

    # Technician / crew ID performing the service
    performed_by = db.Column(db.String(100), nullable=True)

    # Outcome: "completed" | "pending" | "failed"
    outcome = db.Column(db.String(30), nullable=False, default="completed")

    # ── Timestamps ────────────────────────────────────────────────────────────
    service_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    created_at   = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # ── Relationship ──────────────────────────────────────────────────────────
    asset = db.relationship("Asset", back_populates="service_records")

    def __repr__(self):
        return (
            f"<ServiceRecord asset_id={self.asset_id} "
            f"type={self.service_type} date={self.service_date.date()}>"
        )

    def to_dict(self):
        return {
            "id":               self.id,
            "asset_id":         self.asset_id,
            "service_type":     self.service_type,
            "description":      self.description,
            "cycle_at_service": self.cycle_at_service,
            "performed_by":     self.performed_by,
            "outcome":          self.outcome,
            "service_date":     self.service_date.isoformat(),
            "created_at":       self.created_at.isoformat(),
        }
