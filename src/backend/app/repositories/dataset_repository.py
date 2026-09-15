"""
dataset_repository.py
=====================
Handles bulk insertion of sensor readings from CSV ingestion.
"""
from app import db
from app.models.asset import Asset
from app.models.sensor_reading import SensorReading
from app.utils.logger import log
import pandas as pd

class DatasetRepository:
    def ingest_sensor_data(self, df: pd.DataFrame) -> list:
        """
        Receives a validated DataFrame of sensor readings and inserts them into the database.
        Returns a list of unique engine IDs that were processed.
        """
        # Ensure we don't insert duplicate engine/cycle combos.
        # This implementation can be optimized with bulk_insert mappings or Pandas to_sql,
        # but for simplicity and safety against duplicates, we process per engine.
        
        log("DB", "Saving sensor readings")

        unique_engines = df["unit_number"].unique()
        # Only engines that received NEW readings are returned — used to decide whether
        # to trigger background analysis. Engines whose data was entirely duplicate
        # (same CSV re-uploaded) are excluded to prevent accumulating prediction rows.
        engines_with_new_data = []

        for unit in unique_engines:
            # Check if asset exists, if not create it
            asset = Asset.query.filter_by(unit_number=int(unit)).first()
            if not asset:
                asset = Asset(unit_number=int(unit), status="active", name=f"Engine-{unit}")
                db.session.add(asset)
                db.session.flush()  # flush to get asset.id

            engine_df = df[df["unit_number"] == unit]

            # Fetch existing cycles for this asset to avoid duplicates
            existing_cycles = set(
                r[0] for r in
                db.session.query(SensorReading.time_cycles).filter_by(asset_id=asset.id).all()
            )

            new_readings = []
            for _, row in engine_df.iterrows():
                cycle = int(row["time_cycles"])
                if cycle in existing_cycles:
                    continue  # Skip duplicates — idempotent upload
                
                reading = SensorReading(
                    asset_id=asset.id,
                    unit_number=int(unit),
                    time_cycles=cycle,
                    sensor_2_smooth=row.get("sensor_2_smooth", 0),
                    sensor_3_smooth=row.get("sensor_3_smooth", 0),
                    sensor_4_smooth=row.get("sensor_4_smooth", 0),
                    sensor_7_smooth=row.get("sensor_7_smooth", 0),
                    sensor_8_smooth=row.get("sensor_8_smooth", 0),
                    sensor_9_smooth=row.get("sensor_9_smooth", 0),
                    sensor_11_smooth=row.get("sensor_11_smooth", 0),
                    sensor_12_smooth=row.get("sensor_12_smooth", 0),
                    sensor_13_smooth=row.get("sensor_13_smooth", 0),
                    sensor_14_smooth=row.get("sensor_14_smooth", 0),
                    sensor_15_smooth=row.get("sensor_15_smooth", 0),
                    sensor_17_smooth=row.get("sensor_17_smooth", 0),
                    sensor_20_smooth=row.get("sensor_20_smooth", 0),
                    sensor_21_smooth=row.get("sensor_21_smooth", 0),
                    rul=0,
                    rul_clipped=0
                )
                new_readings.append(reading)
            
            if new_readings:
                db.session.bulk_save_objects(new_readings)
                engines_with_new_data.append(int(unit))
                # Update asset's total_cycles to reflect the latest data
                asset.total_cycles = int(engine_df["time_cycles"].max())

        db.session.commit()
        # Return only engines that actually received new sensor data.
        # If the same CSV is uploaded again and all cycles already exist,
        # this returns [] — no duplicate analysis triggered.
        return engines_with_new_data
