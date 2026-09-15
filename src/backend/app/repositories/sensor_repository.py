"""
sensor_repository.py
====================
Database interactions for SensorReading records.
"""
from app.models.sensor_reading import SensorReading
from app import db
import pandas as pd

class SensorRepository:
    def get_readings_for_engine(self, engine_id: int):
        """Returns chronological sensor readings for an engine as a list of models."""
        # Using asset's unit_number to filter via a join
        from app.models.asset import Asset
        readings = db.session.query(SensorReading).join(Asset).filter(
            Asset.unit_number == engine_id
        ).order_by(SensorReading.time_cycles.asc()).all()
        return readings


