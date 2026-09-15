"""
app/models/asset.py
===================
Asset — represents one physical engine / aircraft unit.

Maps to unit_number in the CMAPSS dataset (schema.json).
All other tables (SensorReading, Mission, Prediction, etc.) reference
this table via foreign key on asset_id.
"""

from datetime import datetime
from app import db


class Asset(db.Model):
    """
    One row = one engine/aircraft unit.

    Relationships:
        sensor_readings  → SensorReading (one-to-many)
        service_records  → ServiceRecord (one-to-many)
        missions         → Mission       (one-to-many)
        predictions      → Prediction    (one-to-many, latest used for readiness)
    """
    __tablename__ = "assets"

    # ── Primary key ──────────────────────────────────────────────────────────
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # unit_number matches the CMAPSS dataset identifier (1-100 for FD001)
    # Unique constraint ensures no duplicate engine registrations
    unit_number = db.Column(db.Integer, nullable=False, unique=True, index=True)

    # ── Descriptive fields ───────────────────────────────────────────────────
    # Human-friendly name, e.g. "Engine-001" or tail number for a real aircraft
    name = db.Column(db.String(100), nullable=False)

    # Asset type: "turbofan", "helicopter", "uav", etc.
    asset_type = db.Column(db.String(50), nullable=False, default="turbofan")

    # Fleet or squadron this asset belongs to (for multi-tenant future use)
    fleet_id = db.Column(db.String(50), nullable=True)

    # Current operational status: "active" | "grounded" | "maintenance" | "decommissioned"
    status = db.Column(db.String(30), nullable=False, default="active")

    # Total accumulated cycles at time of record creation (updated as readings come in)
    total_cycles = db.Column(db.Integer, nullable=False, default=0)

    # ── Timestamps ───────────────────────────────────────────────────────────
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False,
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    # lazy="dynamic" → returns a query object, not a list (efficient for large datasets)
    sensor_readings = db.relationship(
        "SensorReading", back_populates="asset",
        cascade="all, delete-orphan", lazy="dynamic"
    )
    missions = db.relationship(
        "Mission", back_populates="asset",
        cascade="all, delete-orphan", lazy="dynamic"
    )
    predictions = db.relationship(
        "Prediction", back_populates="asset",
        cascade="all, delete-orphan", lazy="dynamic"
    )

    def __repr__(self):
        return f"<Asset id={self.id} unit={self.unit_number} status={self.status}>"

    def to_dict(self):
        """JSON-serialisable dict — used by Flask route handlers (Deep)."""
        return {
            "id":           self.id,
            "unit_number":  self.unit_number,
            "name":         self.name,
            "asset_type":   self.asset_type,
            "fleet_id":     self.fleet_id,
            "status":       self.status,
            "total_cycles": self.total_cycles,
            # latest_cycle is an alias for total_cycles here — updated during ingestion.
            # The frontend uses this as the display cycle value.
            # The authoritative source is prediction.prediction_cycle from /analysis.
            "latest_cycle": self.total_cycles if self.total_cycles > 0 else None,
            "created_at":   self.created_at.isoformat(),
            "updated_at":   self.updated_at.isoformat(),
        }
