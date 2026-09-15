"""
app/models/sensor_reading.py
=============================
SensorReading — one row per engine cycle measurement.

Column names match schema.json EXACTLY (source of truth from EDA teammate).
Each column is the smoothed + z-score-scaled sensor value from the ML pipeline.
The raw/clipped RUL values are stored here for direct DB queries without
needing to call the ML model again.

Relationship: many SensorReadings → one Asset
"""

from datetime import datetime
from app import db


class SensorReading(db.Model):
    """
    Per-cycle sensor snapshot for an asset.

    Primary key is composite (asset_id, time_cycles) — this is the natural key
    for the CMAPSS dataset. A surrogate integer id is also added for ORM convenience.
    """
    __tablename__ = "sensor_readings"

    # ── Indexes declared here for migration to pick up ────────────────────────
    __table_args__ = (
        # Composite index for the most common query pattern:
        # "get all readings for unit X ordered by cycle"
        db.Index("ix_sensor_readings_asset_cycle", "asset_id", "time_cycles"),
    )

    # ── Keys ─────────────────────────────────────────────────────────────────
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # FK → assets.id
    asset_id = db.Column(
        db.Integer,
        db.ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # ── Identity columns (from schema.json) ──────────────────────────────────
    # unit_number is denormalised here for fast look-up without JOIN
    unit_number = db.Column(db.Integer, nullable=False, index=True)
    time_cycles = db.Column(db.Integer, nullable=False)

    # ── Sensor columns (smoothed + z-score scaled, from schema.json) ─────────
    # Naming convention: sensor_<N>_smooth matches schema.json exactly
    sensor_2_smooth  = db.Column(db.Float, nullable=False)
    sensor_3_smooth  = db.Column(db.Float, nullable=False)
    sensor_4_smooth  = db.Column(db.Float, nullable=False)
    sensor_7_smooth  = db.Column(db.Float, nullable=False)
    sensor_8_smooth  = db.Column(db.Float, nullable=False)
    sensor_9_smooth  = db.Column(db.Float, nullable=False)
    sensor_11_smooth = db.Column(db.Float, nullable=False)
    sensor_12_smooth = db.Column(db.Float, nullable=False)
    sensor_13_smooth = db.Column(db.Float, nullable=False)
    sensor_14_smooth = db.Column(db.Float, nullable=False)
    sensor_15_smooth = db.Column(db.Float, nullable=False)
    sensor_17_smooth = db.Column(db.Float, nullable=False)
    sensor_20_smooth = db.Column(db.Float, nullable=False)
    sensor_21_smooth = db.Column(db.Float, nullable=False)

    # ── RUL columns (from schema.json) ───────────────────────────────────────
    rul         = db.Column(db.Integer, nullable=False)   # raw RUL
    rul_clipped = db.Column(db.Integer, nullable=False)   # clipped at 125 — ML target

    # ── Mission window columns (from schema.json) ─────────────────────────────
    # These are populated by apply_mission_window() at prediction time
    predicted_failure_TTE  = db.Column(db.Integer,  nullable=True)  # = rul_clipped at prediction time
    mission_duration       = db.Column(db.Float,    nullable=True)  # cycles — configurable per asset
    margin_of_safety       = db.Column(db.Float,    nullable=True)  # predicted_failure_TTE - mission_duration
    # Stored as BOOLEAN. Maps to CRITICAL_OVERLAP_RISK in schema.json
    critical_overlap_risk  = db.Column(db.Boolean,  nullable=True)  # True = GROUND THIS ASSET

    # ── Timestamp ─────────────────────────────────────────────────────────────
    recorded_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # ── Relationship ──────────────────────────────────────────────────────────
    asset = db.relationship("Asset", back_populates="sensor_readings")

    def __repr__(self):
        return (
            f"<SensorReading asset_id={self.asset_id} "
            f"cycle={self.time_cycles} rul={self.rul_clipped}>"
        )

    def to_dict(self):
        """JSON-serialisable dict — field names match schema.json for API consistency."""
        return {
            "id":                    self.id,
            "asset_id":              self.asset_id,
            "unit_number":           self.unit_number,
            "time_cycles":           self.time_cycles,
            # sensor readings
            "sensor_2_smooth":       self.sensor_2_smooth,
            "sensor_3_smooth":       self.sensor_3_smooth,
            "sensor_4_smooth":       self.sensor_4_smooth,
            "sensor_7_smooth":       self.sensor_7_smooth,
            "sensor_8_smooth":       self.sensor_8_smooth,
            "sensor_9_smooth":       self.sensor_9_smooth,
            "sensor_11_smooth":      self.sensor_11_smooth,
            "sensor_12_smooth":      self.sensor_12_smooth,
            "sensor_13_smooth":      self.sensor_13_smooth,
            "sensor_14_smooth":      self.sensor_14_smooth,
            "sensor_15_smooth":      self.sensor_15_smooth,
            "sensor_17_smooth":      self.sensor_17_smooth,
            "sensor_20_smooth":      self.sensor_20_smooth,
            "sensor_21_smooth":      self.sensor_21_smooth,
            # RUL
            "rul":                   self.rul,
            "rul_clipped":           self.rul_clipped,
            # mission window
            "predicted_failure_TTE": self.predicted_failure_TTE,
            "mission_duration":      self.mission_duration,
            "margin_of_safety":      self.margin_of_safety,
            "critical_overlap_risk": self.critical_overlap_risk,
            "recorded_at":           self.recorded_at.isoformat(),
        }

    # ── Convenience: list of feature column names for ML pipeline ─────────────
    SENSOR_FEATURE_COLS = [
        "sensor_2_smooth",  "sensor_3_smooth",  "sensor_4_smooth",
        "sensor_7_smooth",  "sensor_8_smooth",  "sensor_9_smooth",
        "sensor_11_smooth", "sensor_12_smooth", "sensor_13_smooth",
        "sensor_14_smooth", "sensor_15_smooth", "sensor_17_smooth",
        "sensor_20_smooth", "sensor_21_smooth",
    ]
