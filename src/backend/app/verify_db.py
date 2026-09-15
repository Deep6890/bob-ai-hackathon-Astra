"""
app/verify_db.py
================
Verification script — runs JOIN queries to confirm all relationships
are correctly wired before handoff to the API team.

RUN:
    cd src/backend
    python -m app.verify_db

EXPECTED OUTPUT: Printed tables of joined query results, no errors.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import (
    Asset, SensorReading, ServiceRecord,
    Mission, Prediction, ReadinessResult
)


from sqlalchemy.orm import aliased


def separator(title: str):
    print(f"\n{'─' * 55}")
    print(f"  {title}")
    print('─' * 55)


def verify():
    app = create_app()

    with app.app_context():
        print("=" * 55)
        print("  VERIFY DB — Relationship & Query Checks")
        print("=" * 55)

        # ── Query 1: Asset + latest SensorReading ─────────────────────────────
        separator("Q1: Asset + Latest SensorReading (JOIN)")
        sr_sub = aliased(SensorReading)
        subq = (
            db.session.query(db.func.max(sr_sub.time_cycles))
            .filter(sr_sub.asset_id == Asset.id)
            .scalar_subquery()
        )
        results = (
            db.session.query(Asset, SensorReading)
            .join(SensorReading, Asset.id == SensorReading.asset_id)
            .filter(SensorReading.time_cycles == subq)
            .order_by(Asset.unit_number)
            .limit(5)
            .all()
        )

        if not results:
            print("  WARNING: No results — did you run seed.py?")
        else:
            print(f"  {'unit':>5}  {'max_cycle':>10}  {'rul_clipped':>12}  {'risk':>10}")
            print(f"  {'─'*5}  {'─'*10}  {'─'*12}  {'─'*10}")
            for asset, sr in results:
                print(
                    f"  {asset.unit_number:>5}  {sr.time_cycles:>10}  "
                    f"{sr.rul_clipped:>12}  "
                    f"{'RISK' if sr.critical_overlap_risk else 'SAFE':>10}"
                )

        # ── Query 2: Asset + Mission + ReadinessResult ────────────────────────
        separator("Q2: Asset + Mission + ReadinessResult (JOIN)")
        results2 = (
            db.session.query(Asset, Mission, ReadinessResult)
            .join(Mission, Asset.id == Mission.asset_id)
            .join(ReadinessResult, Mission.id == ReadinessResult.mission_id)
            .order_by(Asset.unit_number, Mission.id)
            .limit(10)
            .all()
        )

        if not results2:
            print("  WARNING: No results — did you run seed.py?")
        else:
            print(f"  {'unit':>5}  {'mission':>20}  {'dur':>5}  {'tte':>5}  {'margin':>8}  {'risk_flag':>10}")
            print(f"  {'─'*5}  {'─'*20}  {'─'*5}  {'─'*5}  {'─'*8}  {'─'*10}")
            for asset, mission, rr in results2:
                print(
                    f"  {asset.unit_number:>5}  {mission.mission_name:>20}  "
                    f"{mission.mission_duration:>5.0f}  {rr.predicted_failure_TTE:>5.0f}  "
                    f"{rr.margin_of_safety:>8.1f}  {rr.risk_flag:>10}"
                )

        # ── Query 3: Assets at CRITICAL risk (for dashboard alert panel) ──────
        separator("Q3: CRITICAL OVERLAP RISK assets — last known state")
        critical = (
            db.session.query(Asset, ReadinessResult, Mission)
            .join(Mission, Asset.id == Mission.asset_id)
            .join(ReadinessResult, Mission.id == ReadinessResult.mission_id)
            .filter(ReadinessResult.critical_overlap_risk == True)
            .order_by(ReadinessResult.margin_of_safety)
            .all()
        )

        if not critical:
            print("  No CRITICAL assets found (good or no seeded data)")
        else:
            print(f"  Found {len(critical)} critical mission(s):")
            for asset, rr, mission in critical:
                print(
                    f"    unit={asset.unit_number:3d}  "
                    f"mission={mission.mission_name}  "
                    f"margin={rr.margin_of_safety:.1f}  "
                    f"score={rr.readiness_score:.1f}"
                )

        # ── Query 4: ServiceRecord count per asset ────────────────────────────
        separator("Q4: Service history per asset")
        svc_counts = (
            db.session.query(
                Asset.unit_number,
                db.func.count(ServiceRecord.id).label("svc_count")
            )
            .join(ServiceRecord, Asset.id == ServiceRecord.asset_id)
            .group_by(Asset.unit_number)
            .order_by(Asset.unit_number)
            .all()
        )
        if not svc_counts:
            print("  No service records found")
        else:
            for unit, count in svc_counts:
                print(f"  unit={unit:3d}  service_records={count}")

        # ── Query 5: Table row counts ─────────────────────────────────────────
        separator("Q5: Row counts for all tables")
        tables = [
            ("assets",           Asset),
            ("sensor_readings",  SensorReading),
            ("service_records",  ServiceRecord),
            ("missions",         Mission),
            ("predictions",      Prediction),
            ("readiness_results",ReadinessResult),
        ]
        for table_name, model in tables:
            count = db.session.query(db.func.count(model.id)).scalar()
            status = "OK" if count > 0 else "EMPTY — run seed.py"
            print(f"  {table_name:25s}: {count:6d} rows  [{status}]")

        print("\n" + "=" * 55)
        print("  VERIFICATION COMPLETE")
        print("=" * 55)


if __name__ == "__main__":
    verify()
