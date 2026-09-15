"""
app/seed.py
============
Database seed script — populates the DB with MIXED-RISK demo data from train_ready.csv.

WHY: The API team (Deep) and frontend (Mayur) need realistic data that covers
     BOTH healthy and critical states. Previously all engines ended up at rul=0
     (end-of-life) because the script always picked the last cycle.

WHAT IT DOES:
  1. TRUNCATES all seeded tables (FK-safe order) so re-runs are always clean.
  2. Reads train_ready.csv, picks N_ENGINES unique engines.
  3. For each engine, picks a cycle from the RISK_TIER_DISTRIBUTION:
       - HEALTHY   (40%): rul_clipped >= RUL_HEALTHY_MIN  → clearly safe margin
       - MODERATE  (30%): RUL_MODERATE_MIN <= rul_clipped < RUL_HEALTHY_MIN → borderline
       - CRITICAL  (30%): rul_clipped < RUL_MODERATE_MIN  → near/at failure
  4. Assigns mission_duration values per tier so readiness outcomes are realistic.
  5. Inserts Asset, SensorReading, ServiceRecord, Mission, Prediction, ReadinessResult.

RUN:
    cd src/backend
    python -m app.seed

SAFE TO RE-RUN: Truncates existing seeded data first, then re-inserts cleanly.
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

# ════════════════════════════════════════════════════════════════════════════════
#  CONFIGURABLE SEED PARAMETERS — tweak before demo
# ════════════════════════════════════════════════════════════════════════════════

# Path to the processed CSV (relative to this script)
CSV_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "processed", "train_ready.csv"
)

# Number of unique engines to seed (keep small for fast seeding)
N_ENGINES = 10

# ── Risk tier RUL thresholds ──────────────────────────────────────────────────
# These boundaries define which rul_clipped values map to which tier.
# Adjust to match your dataset's RUL distribution.
RUL_HEALTHY_MIN  = 80   # rul_clipped >= 80  → HEALTHY tier
RUL_MODERATE_MIN = 20   # 20 <= rul_clipped < 80 → MODERATE tier
                         # rul_clipped < 20   → CRITICAL tier

# ── Risk tier distribution across N_ENGINES units ────────────────────────────
# How many of the 10 engines fall into each tier?
# Must sum to N_ENGINES.
RISK_TIER_DISTRIBUTION = {
    "healthy":  4,   # ~40% — clearly safe
    "moderate": 3,   # ~30% — borderline / needs attention
    "critical": 3,   # ~30% — near-failure (preserves demo worst-case)
}

# ── Mission duration pools per tier (cycles) ──────────────────────────────────
# Healthy engines get SHORT missions → wide positive margin
# Moderate engines get a MIX → some positive, some barely negative
# Critical engines get LONG missions relative to their TTE → negative margin
MISSION_DURATIONS_BY_TIER = {
    "healthy":  [5.0, 8.0, 10.0],   # TTE ~80-125 → margins ~+70 to +120
    "moderate": [15.0, 25.0, 40.0], # TTE ~20-79  → margins range -20 to +60
    "critical": [30.0, 45.0, 60.0], # TTE ~0-19   → margins very negative
}

# ── Missions per asset ────────────────────────────────────────────────────────
MISSIONS_PER_ASSET = 3

# ── Static lookups ────────────────────────────────────────────────────────────
ASSET_TYPES    = ["turbofan"]
SERVICE_TYPES  = ["inspection", "repair", "overhaul", "part_replacement"]
MISSION_TYPES  = ["training", "recon", "transport", "combat-air-patrol"]


# ════════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ════════════════════════════════════════════════════════════════════════════════

def _assign_tiers(sample_units: list) -> dict:
    """
    Assign a risk tier label to each unit_number based on RISK_TIER_DISTRIBUTION.
    Returns {unit_number: 'healthy'|'moderate'|'critical'}.
    """
    shuffled = list(sample_units)
    random.shuffle(shuffled)

    tiers = {}
    idx = 0
    for tier, count in RISK_TIER_DISTRIBUTION.items():
        for unit in shuffled[idx: idx + count]:
            tiers[unit] = tier
        idx += count

    # If N_ENGINES doesn't divide perfectly, any leftover units → "moderate"
    for unit in shuffled[idx:]:
        tiers[unit] = "moderate"

    return tiers


def _pick_cycle_for_tier(unit_df: pd.DataFrame, tier: str) -> pd.Series:
    """
    From all cycles available for this engine, pick ONE representative row
    according to the tier:
      - healthy:  row where rul_clipped >= RUL_HEALTHY_MIN
      - moderate: row where RUL_MODERATE_MIN <= rul_clipped < RUL_HEALTHY_MIN
      - critical: row where rul_clipped < RUL_MODERATE_MIN (including 0)

    Falls back gracefully if no rows match the bracket (e.g. short-lived engine).
    """
    if tier == "healthy":
        candidates = unit_df[unit_df["rul_clipped"] >= RUL_HEALTHY_MIN]
        if candidates.empty:
            candidates = unit_df  # fallback: take earliest cycle available
        return candidates.iloc[len(candidates) // 2]   # mid-point of healthy window

    elif tier == "moderate":
        candidates = unit_df[
            (unit_df["rul_clipped"] >= RUL_MODERATE_MIN) &
            (unit_df["rul_clipped"] <  RUL_HEALTHY_MIN)
        ]
        if candidates.empty:
            candidates = unit_df.iloc[:len(unit_df) // 2]   # fallback: first half
        return candidates.iloc[len(candidates) // 2]

    else:  # critical
        candidates = unit_df[unit_df["rul_clipped"] < RUL_MODERATE_MIN]
        if candidates.empty:
            candidates = unit_df.iloc[-5:]   # fallback: last few cycles
        return candidates.iloc[-1]   # very last critical cycle


def _truncate_all(session):
    """
    Delete all seeded rows in FK-safe reverse order, then reset sequences.
    Using DELETE (not TRUNCATE) for portability; safe with ON DELETE CASCADE.
    """
    print("  Truncating existing data (FK-safe order)...")
    session.execute(db.text("DELETE FROM readiness_results"))
    session.execute(db.text("DELETE FROM predictions"))
    session.execute(db.text("DELETE FROM missions"))
    session.execute(db.text("DELETE FROM service_records"))
    session.execute(db.text("DELETE FROM sensor_readings"))
    session.execute(db.text("DELETE FROM assets"))

    # Reset PK sequences so IDs start from 1 again on each re-seed
    is_sqlite = db.engine.url.drivername.startswith("sqlite")
    
    for table in ["assets", "sensor_readings", "service_records",
                  "missions", "predictions", "readiness_results"]:
        if is_sqlite:
            try:
                session.execute(db.text(f"DELETE FROM sqlite_sequence WHERE name='{table}'"))
            except Exception:
                pass # Table doesn't exist yet
        else:
            session.execute(db.text(f"ALTER SEQUENCE {table}_id_seq RESTART WITH 1"))

    session.commit()
    print("  All tables cleared and sequences reset.")


# ════════════════════════════════════════════════════════════════════════════════
#  MAIN SEED FUNCTION
# ════════════════════════════════════════════════════════════════════════════════

def seed():
    app = create_app()

    with app.app_context():
        print("=" * 55)
        print("  SEED SCRIPT — Mission Readiness DB (Mixed-Risk)")
        print("=" * 55)
        print(f"\n  Risk tier config: {RISK_TIER_DISTRIBUTION}")
        print(f"  RUL brackets: healthy≥{RUL_HEALTHY_MIN}, "
              f"moderate {RUL_MODERATE_MIN}-{RUL_HEALTHY_MIN-1}, "
              f"critical<{RUL_MODERATE_MIN}")

        # ── 0. Truncate all existing data ─────────────────────────────────────
        print("\n[0/5] Clearing existing seed data ...")
        _truncate_all(db.session)

        # ── 1. Load CSV ───────────────────────────────────────────────────────
        print(f"\n[1/5] Loading CSV from {CSV_PATH} ...")
        if not os.path.exists(CSV_PATH):
            print(f"  ERROR: {CSV_PATH} not found.")
            print("  Run cmapss_pipeline.py first to generate train_ready.csv")
            sys.exit(1)

        df = pd.read_csv(CSV_PATH)
        sample_units = sorted(df["unit_number"].unique())[:N_ENGINES]
        df = df[df["unit_number"].isin(sample_units)]
        print(f"  Loaded {len(df)} rows for engines: {sample_units}")

        # Assign tier to each unit
        tier_map = _assign_tiers(sample_units)
        print(f"\n  Tier assignments:")
        for unit in sample_units:
            print(f"    unit={int(unit):3d} → {tier_map[unit].upper()}")

        # ── 2. Insert Assets ──────────────────────────────────────────────────
        print(f"\n[2/5] Seeding {N_ENGINES} Asset rows ...")
        asset_map = {}        # unit_number → Asset.id
        snapshot_map = {}     # unit_number → representative pd.Series row

        for unit in sample_units:
            unit_df   = df[df["unit_number"] == unit].sort_values("time_cycles")
            tier      = tier_map[unit]
            snap_row  = _pick_cycle_for_tier(unit_df, tier)
            snapshot_map[unit] = snap_row

            max_cycle = int(unit_df["time_cycles"].max())
            asset = Asset(
                unit_number  = int(unit),
                name         = f"Engine-{int(unit):03d}",
                asset_type   = "turbofan",
                fleet_id     = "FD001",
                status       = "active",
                total_cycles = max_cycle,
            )
            db.session.add(asset)
            db.session.flush()
            asset_map[unit] = asset.id
            print(
                f"  Created Asset id={asset.id} unit={int(unit)} "
                f"tier={tier.upper():8s} snap_cycle={int(snap_row['time_cycles'])} "
                f"rul_clipped={int(snap_row['rul_clipped'])}"
            )

        db.session.commit()

        # ── 3. Insert SensorReadings (ALL cycles for each unit) ───────────────
        print(f"\n[3/5] Seeding SensorReading rows (all cycles) ...")
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

            rows_to_insert = []
            for _, row in unit_df.iterrows():
                sr = SensorReading(
                    asset_id     = asset_id,
                    unit_number  = int(row["unit_number"]),
                    time_cycles  = int(row["time_cycles"]),
                    **{col: float(row[col]) for col in sensor_cols},
                    rul                   = int(row["rul"]),
                    rul_clipped           = int(row["rul_clipped"]),
                    predicted_failure_TTE = int(row["predicted_failure_TTE"]),
                    mission_duration      = float(row["mission_duration"]),
                    margin_of_safety      = float(row["margin_of_safety"]),
                    critical_overlap_risk = bool(row["CRITICAL_OVERLAP_RISK"]),
                )
                rows_to_insert.append(sr)

            db.session.bulk_save_objects(rows_to_insert)
            db.session.commit()
            total_readings += len(rows_to_insert)
            print(f"  unit={int(unit)}: inserted {len(rows_to_insert)} readings")

        print(f"  Total sensor readings inserted: {total_readings}")

        # ── 4. Insert ServiceRecords + Missions ───────────────────────────────
        print(f"\n[4/5] Seeding ServiceRecords and Missions ...")

        for unit in sample_units:
            asset_id  = asset_map[unit]
            unit_df   = df[df["unit_number"] == unit]
            max_cycle = int(unit_df["time_cycles"].max())
            tier      = tier_map[unit]

            # ── ServiceRecords (2-3 per asset) ────────────────────────────────
            for i in range(random.randint(2, 3)):
                svc = ServiceRecord(
                    asset_id         = asset_id,
                    service_type     = random.choice(SERVICE_TYPES),
                    description      = (
                        f"Routine {SERVICE_TYPES[i % len(SERVICE_TYPES)]} "
                        f"at cycle {max_cycle // (i + 2)}"
                    ),
                    cycle_at_service = max_cycle // (i + 2),
                    performed_by     = f"Tech-{random.randint(1, 20):02d}",
                    outcome          = "completed",
                    service_date     = datetime.utcnow() - timedelta(days=30 * (i + 1)),
                )
                db.session.add(svc)
            db.session.flush()

            # ── Missions (MISSIONS_PER_ASSET per asset) ───────────────────────
            # Use tier-specific durations so margins are realistic
            durations = random.sample(
                MISSION_DURATIONS_BY_TIER[tier], k=MISSIONS_PER_ASSET
            )
            for i, dur in enumerate(durations):
                mission = Mission(
                    asset_id            = asset_id,
                    mission_name        = f"SORTIE-{int(unit):03d}-{i+1:02d}",
                    mission_type        = random.choice(MISSION_TYPES),
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
            snap_row = snapshot_map[unit]    # tier-appropriate cycle
            tier     = tier_map[unit]

            # One Prediction per asset — based on the TIER-SELECTED snapshot cycle
            pred = Prediction(
                asset_id              = asset_id,
                prediction_cycle      = int(snap_row["time_cycles"]),
                rul_predicted         = float(snap_row["rul"]),
                rul_clipped           = float(snap_row["rul_clipped"]),
                predicted_failure_TTE = float(snap_row["predicted_failure_TTE"]),
                model_version         = "v1.0-cmapss-baseline",
            )
            db.session.add(pred)
            db.session.flush()

            # One ReadinessResult per Mission — margin computed vs THIS prediction
            missions = Mission.query.filter_by(asset_id=asset_id).all()
            for mission in missions:
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
                print(
                    f"  unit={int(unit):3d} [{tier.upper():8s}] "
                    f"mission={mission.mission_name} "
                    f"TTE={pred.predicted_failure_TTE:.0f} "
                    f"dur={mission.mission_duration:.0f} "
                    f"margin={margin:+.0f} → {risk}"
                )

        db.session.commit()
        print(f"\n  Predictions and ReadinessResults seeded")

        # ── Summary ───────────────────────────────────────────────────────────
        total_rr = ReadinessResult.query.count()
        safe_ct  = ReadinessResult.query.filter_by(risk_flag="SAFE").count()
        marg_ct  = ReadinessResult.query.filter_by(risk_flag="MARGINAL").count()
        crit_ct  = ReadinessResult.query.filter_by(risk_flag="CRITICAL").count()

        print("\n" + "=" * 55)
        print("  SEED COMPLETE — DB counts:")
        print(f"    Assets          : {Asset.query.count()}")
        print(f"    SensorReadings  : {SensorReading.query.count()}")
        print(f"    ServiceRecords  : {ServiceRecord.query.count()}")
        print(f"    Missions        : {Mission.query.count()}")
        print(f"    Predictions     : {Prediction.query.count()}")
        print(f"    ReadinessResults: {total_rr}")
        print(f"\n  Risk distribution across {total_rr} ReadinessResults:")
        print(f"    SAFE     : {safe_ct:3d} ({safe_ct/total_rr*100:.0f}%)")
        print(f"    MARGINAL : {marg_ct:3d} ({marg_ct/total_rr*100:.0f}%)")
        print(f"    CRITICAL : {crit_ct:3d} ({crit_ct/total_rr*100:.0f}%)")
        print("=" * 55)


if __name__ == "__main__":
    seed()
