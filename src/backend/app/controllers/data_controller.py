"""
data_controller.py
==================
Validates incoming CSV upload requests, exposes dataset info, handles dataset reset.
"""
from app.utils.errors import APIError
from app.repositories.dataset_repository import DatasetRepository
from app.services.pipeline_service import PipelineService
from app.utils.logger import log
import pandas as pd
import threading

class DataController:
    def __init__(self):
        self.dataset_repo = DatasetRepository()

    def get_dataset_info(self):
        """
        Returns metadata about the currently loaded dataset:
        engine count, latest cycle across fleet, earliest/latest upload timestamp.
        All values sourced from the DB — nothing invented.
        """
        from app.models.asset import Asset
        from app.models.sensor_reading import SensorReading
        from app import db
        from sqlalchemy import func

        log("API", "GET /api/v1/data/dataset-info")

        asset_count = Asset.query.count()
        if asset_count == 0:
            return {
                "engine_count": 0,
                "latest_cycle": None,
                "earliest_upload": None,
                "latest_upload": None,
                "dataset_loaded": False,
            }

        latest_cycle = db.session.query(func.max(SensorReading.time_cycles)).scalar()

        # Use asset created_at as a proxy for upload timestamp
        earliest = db.session.query(func.min(Asset.created_at)).scalar()
        latest   = db.session.query(func.max(Asset.updated_at)).scalar()

        return {
            "engine_count": asset_count,
            "latest_cycle": int(latest_cycle) if latest_cycle is not None else None,
            "earliest_upload": earliest.isoformat() if earliest else None,
            "latest_upload":   latest.isoformat()   if latest   else None,
            "dataset_loaded": True,
        }

    def reset_dataset(self):
        """
        Deletes all fleet data: assets (cascades to sensor_readings, predictions,
        sensor_analyses, readiness_results, missions).
        ONLY called after explicit user confirmation in the UI.
        Never called on page load or backend restart.

        Uses DELETE with synchronize_session=False for SQLite compatibility.
        The database FK CASCADE handles child table deletions.
        """
        from app.models.asset import Asset
        from app.models.sensor_reading import SensorReading
        from app.models.prediction import Prediction
        from app.models.sensor_analysis import SensorAnalysis
        from app.models.readiness import ReadinessResult
        from app.models.mission import Mission
        from app import db

        log("API", "DELETE /api/v1/data/reset — user-initiated dataset clear")

        # Count assets before deletion for the response
        count = Asset.query.count()

        # Delete in dependency order to respect FK constraints.
        # SQLite does not enforce FK by default but we delete explicitly for correctness.
        # SQLAlchemy's lazy="dynamic" relationships do not cascade automatically with bulk delete.
        SensorAnalysis.query.delete(synchronize_session=False)
        ReadinessResult.query.delete(synchronize_session=False)
        SensorReading.query.delete(synchronize_session=False)
        Prediction.query.delete(synchronize_session=False)
        Mission.query.delete(synchronize_session=False)
        Asset.query.delete(synchronize_session=False)
        db.session.commit()

        log("DB", f"Dataset reset complete — {count} asset(s) and all associated data deleted")
        log("DB", "Model artifacts unchanged — only production analysis data was cleared")

        return {
            "message": "Dataset cleared successfully.",
            "assets_deleted": count,
        }
        
    def process_csv_upload(self, file):
        log("API", "POST /api/v1/data/upload")
        log("UPLOAD", "CSV received")
        if not file:
            log("ERROR", "CSV validation failed: No file provided")
            raise APIError("No file provided.", status_code=400)
            
        if not file.filename.endswith('.csv'):
            log("ERROR", "CSV validation failed: Invalid file type")
            raise APIError("Invalid file type. Only .csv is allowed.", status_code=400)
            
        try:
            # Try parsing with comma first
            df = pd.read_csv(file)
            
            # If it read only 1 column, it might be space separated
            if len(df.columns) == 1:
                file.seek(0)
                df = pd.read_csv(file, sep=r'\s+', header=None)
            
            # If headers are missing (first column is a number or it's named '1'), assign CMAPSS headers
            if "unit_number" not in df.columns:
                # Assuming raw CMAPSS format without headers
                # CMAPSS has 26 columns, sometimes 27/28 if trailing spaces
                num_cols = len(df.columns)
                col_names = ["unit_number", "time_cycles", "op_setting_1", "op_setting_2", "op_setting_3"] + [f"sensor_{i}" for i in range(1, 22)]
                
                if num_cols >= 26:
                    # Assign the first 26 columns to the standard names
                    df = df.iloc[:, :26]
                    df.columns = col_names
                    
        except Exception as e:
            log("ERROR", f"CSV parsing failed: {str(e)}")
            raise APIError(f"Error parsing CSV: {str(e)}", status_code=400)
            
        log("UPLOAD", "Validating CSV")
        required_cols = {"unit_number", "time_cycles"}
        sensor_cols = {f"sensor_{i}_smooth" for i in [2,3,4,7,8,9,11,12,13,14,15,17,20,21]}
        
        # If smooth columns are missing, try to map from raw sensor columns
        for i in [2,3,4,7,8,9,11,12,13,14,15,17,20,21]:
            smooth_col = f"sensor_{i}_smooth"
            raw_col = f"sensor_{i}"
            if smooth_col not in df.columns and raw_col in df.columns:
                df[smooth_col] = df[raw_col]
        
        all_required = required_cols.union(sensor_cols)
        
        missing_cols = all_required - set(df.columns)
        if missing_cols:
            log("ERROR", f"CSV validation failed: Missing columns {missing_cols}")
            raise APIError(f"Missing required columns: {missing_cols}", status_code=400)
            
        # Ingest to DB — returns only engines with genuinely NEW sensor readings
        # (same CSV re-uploaded returns empty list, preventing duplicate analysis)
        engines_with_new_data = self.dataset_repo.ingest_sensor_data(df)
        
        # Also get the full list of engines that exist in the CSV (for the response)
        all_csv_engines = df["unit_number"].unique().tolist()
        log("UPLOAD", f"Engines in CSV: {all_csv_engines}")
        log("UPLOAD", f"Engines with new data: {engines_with_new_data}")
        
        # Only trigger background analysis for engines that received NEW data.
        # This prevents accumulating prediction rows when the same CSV is re-uploaded.
        if engines_with_new_data:
            from flask import current_app
            app = current_app._get_current_object()
            
            def run_analysis_bg(app_instance, engine_ids):
                with app_instance.app_context():
                    pipeline = PipelineService()
                    for eid in engine_ids:
                        try:
                            pipeline.analyze_engine(eid)
                        except Exception as e:
                            log("ERROR", f"Background analysis failed for Engine {eid}: {str(e)}")
                            
            thread = threading.Thread(target=run_analysis_bg, args=(app, engines_with_new_data))
            thread.start()

        return {
            "message": "CSV uploaded and ingestion started." if engines_with_new_data else "CSV already fully ingested — no new data found.",
            "engines_affected": engines_with_new_data,
            "engines_in_csv": [int(e) for e in all_csv_engines],
            "status": "Processing in background" if engines_with_new_data else "No new data",
        }
