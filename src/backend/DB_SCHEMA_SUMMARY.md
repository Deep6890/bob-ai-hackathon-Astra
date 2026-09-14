# DB Schema Summary — Mission Readiness & Predictive Maintenance
*Backend Engineer: Dhairya | For: Deep (API), Mayur (Frontend)*

---

## ER Diagram (ASCII)

```
┌──────────────────────────┐
│          assets           │
│  PK  id                  │
│      unit_number (UNIQUE) │
│      name                 │
│      asset_type           │
│      fleet_id             │
│      status               │
│      total_cycles         │
│      created_at           │
│      updated_at           │
└────────────┬─────────────┘
             │  1
             │
     ┌───────┴────────────────────────────────────────────┐
     │               │                │                   │
     │ N             │ N              │ N                 │ N
     ▼               ▼                ▼                   ▼
┌────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│sensor_     │  │service_      │  │  missions   │  │ predictions  │
│readings    │  │records       │  │             │  │              │
│ asset_id──►│  │ asset_id────►│  │ asset_id──► │  │ asset_id────►│
│ unit_number│  │ service_type │  │mission_name │  │ rul_predicted│
│ time_cycles│  │ description  │  │mission_type │  │ rul_clipped  │
│ sensor_2.. │  │ cycle_at_svc │  │mission_     │  │ predicted_   │
│ ..sensor_21│  │ performed_by │  │  duration◄──┼──┼──────────────┤
│ rul        │  │ outcome      │  │ status      │  │              │
│ rul_clipped│  │ service_date │  │ scheduled_at│  │              │
│ predicted_ │  └──────────────┘  └──────┬──────┘  └──────┬───────┘
│  failure_  │                           │ 1               │ 1
│  TTE       │                           │                 │
│ margin_of_ │                           └────────┬────────┘
│  safety    │                                    │
│ critical_  │                                    ▼
│  overlap_  │                          ┌─────────────────────┐
│  risk      │                          │  readiness_results  │
└────────────┘                          │  prediction_id ─────┤
                                        │  mission_id ────────┤
                                        │  readiness_score    │
                                        │  risk_flag          │
                                        │  predicted_failure_ │
                                        │    TTE              │
                                        │  mission_duration   │
                                        │  margin_of_safety   │
                                        │  critical_overlap_  │
                                        │    risk             │
                                        │  recommendation     │
                                        └─────────────────────┘
```

---

## Table Reference

### 1. `assets`
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | INTEGER PK | NO | auto-increment |
| unit_number | INTEGER | NO | UNIQUE, indexed. Maps to CMAPSS unit_number |
| name | VARCHAR(100) | NO | e.g. "Engine-001" |
| asset_type | VARCHAR(50) | NO | default "turbofan" |
| fleet_id | VARCHAR(50) | YES | e.g. "FD001" |
| status | VARCHAR(30) | NO | "active" \| "grounded" \| "maintenance" |
| total_cycles | INTEGER | NO | updated as readings come in |
| created_at | TIMESTAMP | NO | |
| updated_at | TIMESTAMP | NO | auto-updated on change |

---

### 2. `sensor_readings`
*Columns match `schema.json` exactly — DO NOT rename.*

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | INTEGER PK | NO | |
| asset_id | INTEGER FK | NO | → assets.id |
| unit_number | INTEGER | NO | denormalised for fast lookup |
| time_cycles | INTEGER | NO | indexed |
| sensor_2_smooth | DOUBLE PRECISION | NO | z-score scaled |
| sensor_3_smooth | DOUBLE PRECISION | NO | |
| sensor_4_smooth | DOUBLE PRECISION | NO | |
| sensor_7_smooth | DOUBLE PRECISION | NO | |
| sensor_8_smooth | DOUBLE PRECISION | NO | |
| sensor_9_smooth | DOUBLE PRECISION | NO | |
| sensor_11_smooth | DOUBLE PRECISION | NO | strongest RUL predictor |
| sensor_12_smooth | DOUBLE PRECISION | NO | |
| sensor_13_smooth | DOUBLE PRECISION | NO | |
| sensor_14_smooth | DOUBLE PRECISION | NO | |
| sensor_15_smooth | DOUBLE PRECISION | NO | |
| sensor_17_smooth | DOUBLE PRECISION | NO | |
| sensor_20_smooth | DOUBLE PRECISION | NO | |
| sensor_21_smooth | DOUBLE PRECISION | NO | |
| rul | INTEGER | NO | raw RUL |
| rul_clipped | INTEGER | NO | clipped at 125 — ML target |
| predicted_failure_TTE | INTEGER | YES | from mission window logic |
| mission_duration | DOUBLE PRECISION | YES | cycles — configurable |
| margin_of_safety | DOUBLE PRECISION | YES | predicted_failure_TTE - mission_duration |
| critical_overlap_risk | BOOLEAN | YES | True = GROUND ASSET |
| recorded_at | TIMESTAMP | NO | |

**Indexes:**
- `ix_sensor_readings_asset_cycle` on `(asset_id, time_cycles)` — primary query pattern
- `ix_sensor_readings_unit_number` on `unit_number`

---

### 3. `service_records`
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | INTEGER PK | NO | |
| asset_id | INTEGER FK | NO | → assets.id CASCADE DELETE |
| service_type | VARCHAR(50) | NO | "inspection" \| "repair" \| "overhaul" |
| description | TEXT | YES | |
| cycle_at_service | INTEGER | NO | engine cycle when serviced |
| performed_by | VARCHAR(100) | YES | technician ID |
| outcome | VARCHAR(30) | NO | "completed" \| "pending" \| "failed" |
| service_date | TIMESTAMP | NO | |
| created_at | TIMESTAMP | NO | |

---

### 4. `missions`
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | INTEGER PK | NO | |
| asset_id | INTEGER FK | NO | → assets.id CASCADE DELETE |
| mission_name | VARCHAR(100) | NO | e.g. "SORTIE-001-01" |
| mission_type | VARCHAR(50) | YES | "training" \| "recon" \| "transport" |
| **mission_duration** | DOUBLE PRECISION | NO | **KEY FIELD** — drives readiness logic |
| planned_start_cycle | INTEGER | YES | |
| status | VARCHAR(30) | NO | "planned" \| "active" \| "completed" |
| notes | TEXT | YES | |
| scheduled_at | TIMESTAMP | YES | |
| created_at | TIMESTAMP | NO | |
| updated_at | TIMESTAMP | NO | |

---

### 5. `predictions`
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | INTEGER PK | NO | |
| asset_id | INTEGER FK | NO | → assets.id |
| sensor_reading_id | INTEGER FK | YES | → sensor_readings.id SET NULL |
| prediction_cycle | INTEGER | NO | cycle at prediction time |
| rul_predicted | DOUBLE PRECISION | NO | raw model output |
| rul_clipped | DOUBLE PRECISION | NO | clipped at 125 |
| **predicted_failure_TTE** | DOUBLE PRECISION | NO | **= rul_clipped** — used by mission window |
| confidence_score | DOUBLE PRECISION | YES | model uncertainty |
| model_version | VARCHAR(50) | YES | default "v1.0" |
| predicted_at | TIMESTAMP | NO | |

---

### 6. `readiness_results`
*These are the FRONTEND-FACING fields — Mayur reads these from API responses.*

| Column | Type | Nullable | Frontend field name | Notes |
|--------|------|----------|---------------------|-------|
| id | INTEGER PK | NO | `id` | |
| prediction_id | INTEGER FK | NO | — | internal |
| mission_id | INTEGER FK | NO | — | UNIQUE |
| **readiness_score** | DOUBLE PRECISION | NO | `readiness_score` | 0–100, higher=safer |
| **risk_flag** | VARCHAR(20) | NO | `risk_flag` | "SAFE" / "MARGINAL" / "CRITICAL" |
| **predicted_failure_TTE** | DOUBLE PRECISION | NO | `predicted_failure_TTE` | cycles to failure |
| **mission_duration** | DOUBLE PRECISION | NO | `mission_duration` | planned sortie length |
| **margin_of_safety** | DOUBLE PRECISION | NO | `margin_of_safety` | negative = CRITICAL |
| **critical_overlap_risk** | BOOLEAN | NO | `critical_overlap_risk` | True = GROUND ASSET |
| **recommendation** | TEXT | YES | `recommendation` | human-readable string for UI |
| computed_at | TIMESTAMP | NO | `computed_at` | |

---

## Relationships Summary

```
assets          1 ──────── N  sensor_readings
assets          1 ──────── N  service_records
assets          1 ──────── N  missions
assets          1 ──────── N  predictions
missions        1 ──────── 1  readiness_results
predictions     1 ──────── N  readiness_results
```

---

## Running Migrations from Scratch

```bash
cd src/backend
pip install -r requirements.txt
cp .env.example .env       # fill in your DATABASE_URL

set FLASK_APP=run.py       # Windows
export FLASK_APP=run.py    # Mac/Linux

flask db migrate -m "initial schema"
flask db upgrade

python -m app.seed         # populate with sample data
python -m app.verify_db    # confirm everything works
```

---

## API Team (Deep) — Field Reference

When building Flask routes, use these model classes and attributes:

```python
from app.models import Asset, SensorReading, Mission, Prediction, ReadinessResult

# Get latest sensor reading for an asset
latest = SensorReading.query \
    .filter_by(asset_id=asset_id) \
    .order_by(SensorReading.time_cycles.desc()) \
    .first()

# Get readiness for a mission
rr = ReadinessResult.query.filter_by(mission_id=mission_id).first()
return jsonify(rr.to_dict())    # all frontend fields included

# Apply mission window for a new mission_duration
# (import from data pipeline)
from data.cmapss_pipeline import apply_mission_window
```

Key route endpoints to implement:
- `GET  /api/assets` → list all assets with status
- `GET  /api/assets/<id>` → asset + latest sensor reading
- `POST /api/missions` → create mission, trigger readiness compute
- `GET  /api/readiness/<mission_id>` → return ReadinessResult.to_dict()
- `GET  /api/fleet/critical` → all assets with CRITICAL risk_flag

---

## Frontend Team (Mayur) — API Response Reference

Every readiness API response will contain these exact JSON fields:

```json
{
  "id": 1,
  "readiness_score": 72.0,
  "risk_flag": "SAFE",
  "predicted_failure_TTE": 90,
  "mission_duration": 30.0,
  "margin_of_safety": 60.0,
  "critical_overlap_risk": false,
  "recommendation": "MISSION READY. 60 cycles of safety margin available.",
  "computed_at": "2026-09-14T21:00:00"
}
```

Risk flag → UI colour mapping:
| `risk_flag` | Badge colour | Action |
|-------------|-------------|--------|
| `"SAFE"` | 🟢 Green | Dispatch approved |
| `"MARGINAL"` | 🟡 Yellow | Requires approval |
| `"CRITICAL"` | 🔴 Red | Grounded — do not dispatch |
