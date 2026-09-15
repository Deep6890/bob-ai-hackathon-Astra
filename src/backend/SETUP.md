# Backend Setup Guide — Mission Readiness & Predictive Maintenance
**Stack:** Python 3.10+ · Flask 3 · SQLAlchemy 2 · PostgreSQL 14+ · Alembic

---

## Prerequisites

| Tool | Install |
|------|---------|
| Python 3.10+ | https://www.python.org/downloads/ |
| PostgreSQL 14+ | https://www.postgresql.org/download/ |
| pip | comes with Python |

---

## Step 1 — Clone & Branch

```bash
git clone https://github.com/Deep6890/bob-ai-hackathon-Astra.git
cd bob-ai-hackathon-Astra
git checkout dhairya-backend
```

---

## Step 2 — Python Virtual Environment

```bash
cd src/backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

---

## Step 3 — Create PostgreSQL Database

Open **psql** or **pgAdmin** and run:

```sql
CREATE DATABASE mission_readiness_db;
CREATE USER mission_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE mission_readiness_db TO mission_user;
```

Or with the `createdb` CLI:
```bash
createdb -U postgres mission_readiness_db
```

---

## Step 4 — Configure Environment Variables

```bash
# Copy the template
cp .env.example .env

# Edit .env with your actual Postgres credentials:
# DATABASE_URL=postgresql://mission_user:yourpassword@localhost:5432/mission_readiness_db
```

> **IMPORTANT:** Never commit `.env` to Git — it's in `.gitignore`.

---

## Step 5 — Run Database Migrations

Flask-Migrate (Alembic) creates all tables automatically:

```bash
# From src/backend/
set FLASK_APP=run.py          # Windows CMD
export FLASK_APP=run.py       # Mac/Linux

# Initialise migration repo (only needed once, already done)
# flask db init

# Generate initial migration (only if migrations/versions/ is empty)
flask db migrate -m "initial schema — all 6 tables"

# Apply migrations to your local DB
flask db upgrade
```

To verify tables were created:
```sql
-- In psql:
\c mission_readiness_db
\dt
```
Expected output:
```
 assets, sensor_readings, service_records, missions, predictions, readiness_results
```

---

## Step 6 — Seed the Database

Populates DB with 10 engines from `train_ready.csv` and dummy service/mission data:

```bash
# From src/backend/
python -m app.seed
```

Expected output:
```
SEED COMPLETE — DB counts:
  Assets          : 10
  SensorReadings  : ~2000
  ServiceRecords  : ~25
  Missions        : ~30
  Predictions     : 10
  ReadinessResults: ~30
```

---

## Step 7 — Verify Relationships

```bash
python -m app.verify_db
```

This runs 5 JOIN queries and prints results. All tables should show > 0 rows.

---

## Step 8 — Start the Dev Server

```bash
python run.py
# Server running at http://0.0.0.0:5000
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `could not connect to server` | Check PostgreSQL is running: `pg_ctl status` |
| `FATAL: password authentication failed` | Check DATABASE_URL in .env matches your psql user |
| `ModuleNotFoundError: No module named 'app'` | Run commands from `src/backend/`, not from repo root |
| `Target database is not up to date` | Run `flask db upgrade` first |

---

## Environment Variable Reference

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/mission_readiness_db` | YES |
| `FLASK_APP` | `run.py` | YES |
| `FLASK_ENV` | `development` | YES |
| `SECRET_KEY` | `some-random-string` | YES |
