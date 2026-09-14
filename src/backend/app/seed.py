"""
app/seed.py
============
Database seed script — populates the DB with sample data from train_ready.csv.

WHY: The API team (Deep) and frontend (Mayur) need real data to test against.
     An empty database makes integration testing impossible.

WHAT IT DOES:
  1. Reads the first N engines from train_ready.csv
  2. Inserts Asset rows (one per unique unit_number)
  3. Inserts SensorReading rows (all cycles for those engines)
  4. Adds 2-3 dummy ServiceRecord + Mission rows per asset
  5. Creates dummy Prediction + ReadinessResult rows

RUN:
    cd src/backend
    python -m app.seed

SAFE TO RE-RUN: Uses get-or-create logic so it won't duplicate rows.
"""

import os
import sys
import random
from datetime import datetime, timedelta

# ── Make sure the app package is importable ───────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd

from app import create_app, db
from app.models import (
    Asset, SensorReading, ServiceRecord,
    Mission, Prediction, ReadinessResult
)

# ── Config ────────────────────────────────────────────────────────────────────
# Path to the processed CSV (relative to this script)
CSV_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "processed", "train_ready.csv"
)

# Number of unique engines to seed (keep small for fast seeding)
N_ENGINES = 10

# Mission durations to cycle through (cycles) — simulates varied sortie lengths
MISSION_DURATIONS = [15.0, 30.0, 45.0, 60.0]

ASSET_TYPES = ["turbofan", "turbofan", "turbofan"]  # all FD001 are turbofans
SERVICE_TYPES = ["inspection", "repair", "overhaul", "part_replacement"]


def seed():
    app = create_app()

    with app.app_context():
        print("=" * 55)
        print("  SEED SCRIPT — Mission Readiness DB")
        print("=" * 55)

        # ── 1. Load CSV ───────────────────────────────────────────────────────
        print(f"\n[1/5] Loading CSV from {CSV_PATH} ...")
        if not os.path.exists(CSV_PATH):
            print(f"  ERROR: {CSV_PATH} not found.")
            print("  Run cmapss_pipeline.py first to generate train_ready.csv")
            sys.exit(1)

        df = pd.read_csv(CSV_PATH)
        # Pick the first N_ENGINES unique unit_numbers
        sample_units = sorted(df["unit_number"].unique())[:N_ENGINES]
        df = df[df["unit_number"].isin(sample_units)]
        print(f"  Loaded {len(df)} rows for engines: {sample_units}")

        # ── 2. Insert Assets ──────────────────────────────────────────────────
        print(f"\n[2/5] Seeding {N_ENGINES} Asset rows ...")
        asset_map = {}  # unit_number → Asset.id

        for unit in sample_units:
            # get-or-create pattern — safe to re-run
            existing = Asset.query.filter_by(unit_number=int(unit)).first()
            if existing:
                asset_map[unit] = existing.id
                print(f"  Asset unit={unit} already exists — skipping")
                continue

            max_cycle = int(df[df["unit_number"] == unit]["time_cycles"].max())
            asset = Asset(
                unit_number  = int(unit),
                name         = f"Engine-{int(unit):03d}",
                asset_type   = "turbofan",
                fleet_id     = "FD001",
                status       = "active",
                total_cycles = max_cycle,
            )
            db.session.add(asset)
            db.session.flush()   # get auto-generated id before committing
            asset_map[unit] = asset.id
            print(f"  Created Asset id={asset.id} unit={unit} cycles={max_cycle}")

        db.session.commit()

        # ── 3. Insert SensorReadings ──────────────────────────────────────────
        print(f"\n[3/5] Seeding SensorReading rows ...")
        sensor_cols = [
            "sensor_2_smooth",  "sensor_3_smooth",  "sensor_4_smooth",
            "sensor_7_smooth",  "sensor_8_smooth",  "sensor_9_smooth",
            "sensor_11_smooth", "sensor_12_smooth", "sensor_13_smooth",
            "sensor_14_smooth", "sensor_15_smooth", "sensor_17_smooth",
            "sensor_20_smooth", "sensor_21_smooth",
        ]
        total_readings = 0

        for unit in sample_units:
            asset_id = asset_map[unit]
            unit_df  = df[df["unit_number"] == unit].sort_values("time_cycles")

            # Check if readings already exist
            existing_count = SensorReading.query.filter_by(asset_id=asset_id).count()
            if existing_count > 0:
                print(f"  unit={unit}: {existing_count} readings already exist — skipping")
                continue

            rows_to_insert = []
            for _, row in unit_df.iterrows():
                sr = SensorReading(
                    asset_id     = asset_id,
                    unit_number  = int(row["unit_number"]),
                    time_cycles  = int(row["time_cycles"]),
                    # Sensor values
                    **{col: float(row[col]) for col in sensor_cols},
                    # RUL values
                    rul          = int(row["rul"]),
                    rul_clipped  = int(row["rul_clipped"]),
                    # Mission window values (from the EDA pipeline's default 30-cycle mission)
                    predicted_failure_TTE = int(row["predicted_failure_TTE"]),
                    mission_duration      = float(row["mission_duration"]),
                    margin_of_safety      = float(row["margin_of_safety"]),
                    critical_overlap_risk = bool(row["CRITICAL_OVERLAP_RISK"]),
                )
                rows_to_insert.append(sr)

            db.session.bulk_save_objects(rows_to_insert)
            db.session.commit()
            total_readings += len(rows_to_insert)
            print(f"  unit={unit}: inserted {len(rows_to_insert)} readings")

        print(f"  Total sensor readings inserted: {total_readings}")

        # ── 4. Insert ServiceRecords + Missions ───────────────────────────────
        print(f"\n[4/5] Seeding ServiceRecords and Missions ...")

        for unit in sample_units:
            asset_id = asset_map[unit]
            unit_df  = df[df["unit_number"] == unit]
            max_cycle = int(unit_df["time_cycles"].max())

            # ── ServiceRecords (2-3 per asset) ────────────────────────────────
            existing_svc = ServiceRecord.query.filter_by(asset_id=asset_id).count()
            if existing_svc == 0:
                for i in range(random.randint(2, 3)):
                    svc = ServiceRecord(
                        asset_id         = asset_id,
                        service_type     = random.choice(SERVICE_TYPES),
                        description      = f"Routine {SERVICE_TYPES[i % len(SERVICE_TYPES)]} at cycle {max_cycle // (i + 2)}",
                        cycle_at_service = max_cycle // (i + 2),
                        performed_by     = f"Tech-{random.randint(1, 20):02d}",
                        outcome          = "completed",
                        service_date     = datetime.utcnow() - timedelta(days=30 * (i + 1)),
                    )
                    db.session.add(svc)
                db.session.flush()

            # ── Missions (2-3 per asset) ──────────────────────────────────────
            existing_mis = Mission.query.filter_by(asset_id=asset_id).count()
            if existing_mis == 0:
                for i, dur in enumerate(random.sample(MISSION_DURATIONS, k=3)):
                    mission = Mission(
                        asset_id            = asset_id,
                        mission_name        = f"SORTIE-{int(unit):03d}-{i+1:02d}",
                        mission_type        = random.choice(["training", "recon", "transport"]),
                        mission_duration    = dur,
                        planned_start_cycle = max_cycle + (i * 5),
                        status              = "planned",
                        scheduled_at        = datetime.utcnow() + timedelta(days=i + 1),
                    )
                    db.session.add(mission)
                db.session.flush()

        db.session.commit()
        print(f"  ServiceRecords and Missions seeded for {len(sample_units)} assets")

        # ── 5. Insert Predictions + ReadinessResults ──────────────────────────
        print(f"\n[5/5] Seeding Predictions and ReadinessResults ...")

        for unit in sample_units:
            asset_id = asset_map[unit]
            unit_df  = df[df["unit_number"] == unit].sort_values("time_cycles")
            last_row = unit_df.iloc[-1]   # latest cycle = most recent state

            # Create one Prediction per asset (latest cycle)
            existing_pred = Prediction.query.filter_by(asset_id=asset_id).first()
            if existing_pred:
                pred = existing_pred
            else:
                pred = Prediction(
                    asset_id              = asset_id,
                    prediction_cycle      = int(last_row["time_cycles"]),
                    rul_predicted         = float(last_row["rul"]),
                    rul_clipped           = float(last_row["rul_clipped"]),
                    predicted_failure_TTE = float(last_row["predicted_failure_TTE"]),
                    model_version         = "v1.0-cmapss-baseline",
                )
                db.session.add(pred)
                db.session.flush()

            # Create ReadinessResult for each Mission of this asset
            missions = Mission.query.filter_by(asset_id=asset_id).all()
            for mission in missions:
                existing_rr = ReadinessResult.query.filter_by(mission_id=mission.id).first()
                if existing_rr:
                    continue

                margin = pred.predicted_failure_TTE - mission.mission_duration
                risk   = ReadinessResult.compute_risk_flag(margin)
                score  = ReadinessResult.compute_readiness_score(pred.predicted_failure_TTE)
                rec    = ReadinessResult.build_recommendation(risk, margin)

                rr = ReadinessResult(
                    prediction_id         = pred.id,
                    mission_id            = mission.id,
                    readiness_score       = score,
                    risk_flag             = risk,
                    predicted_failure_TTE = pred.predicted_failure_TTE,
                    mission_duration      = mission.mission_duration,
                    margin_of_safety      = margin,
                    critical_overlap_risk = (margin < 0),
                    recommendation        = rec,
                )
                db.session.add(rr)

        db.session.commit()
        print(f"  Predictions and ReadinessResults seeded")

        # ── Summary ───────────────────────────────────────────────────────────
        print("\n" + "=" * 55)
        print("  SEED COMPLETE — DB counts:")
        print(f"    Assets         : {Asset.query.count()}")
        print(f"    SensorReadings : {SensorReading.query.count()}")
        print(f"    ServiceRecords : {ServiceRecord.query.count()}")
        print(f"    Missions       : {Mission.query.count()}")
        print(f"    Predictions    : {Prediction.query.count()}")
        print(f"    ReadinessResults: {ReadinessResult.query.count()}")
        print("=" * 55)


if __name__ == "__main__":
    seed()
