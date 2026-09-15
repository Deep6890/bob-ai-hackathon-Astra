# Setup Guide

> **This file is read by the automated evaluation pipeline. Follow these instructions exactly to run AeroReady.**

---

## Prerequisites

Before you begin, ensure you have:

- [ ] Python 3.11 or higher (`python --version`)
- [ ] Node.js 18 or higher (`node --version`)
- [ ] npm 9 or higher (`npm --version`)
- [ ] Git
- [ ] ~2 GB disk space (ML model weights are included in the repository)

**No IBM Cloud account, API key, or external service is required** to run AeroReady. All ML models are pre-trained and bundled in `src/backend/ai_engine/`.

---

## Quick Start (All platforms)

### 1. Clone the repository

```bash
git clone https://github.com/[your-org]/bob-ai-hackathon-Astra.git
cd bob-ai-hackathon-Astra
```

---

## Backend Setup

### 2. Create and activate a Python virtual environment

```bash
cd src/backend

# Create virtual environment
python -m venv .venv

# Activate — macOS / Linux
source .venv/bin/activate

# Activate — Windows PowerShell
.venv\Scripts\Activate.ps1

# Activate — Windows CMD
.venv\Scripts\activate.bat
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

> ⚠️ **Note on PyTorch:** `requirements.txt` pins `torch>=2.0.0`. On some machines, pip may download the CPU-only wheel. This is correct for AeroReady — GPU is not required. If the install fails, install PyTorch manually first: `pip install torch --index-url https://download.pytorch.org/whl/cpu`

### 4. Configure environment variables

```bash
cp .env.example .env
```

The default `.env` is ready to use for local development — **no changes required**. It uses SQLite out of the box.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | *(SQLite)* | Leave blank for SQLite. Set to `postgresql://...` for Postgres. |
| `FLASK_ENV` | `development` | `development` or `production` |
| `FLASK_DEBUG` | `true` | Set `false` in production |
| `FRONTEND_ORIGIN` | `*` | CORS origin for the frontend |
| `MISSION_DURATION_CYCLES` | `30` | Default mission duration in engine cycles |
| `MODEL_DIR` | `ai_engine` | Path to ML model artifacts |

### 5. Initialise the database

```bash
# From src/backend/ with .venv active
flask --app run db upgrade
```

This creates the SQLite database at `src/backend/instance/app.db` with all required tables.

### 6. Start the backend server

```bash
python run.py
```

Expected output:
```
[SERVER] Backend started
Starting production server with waitress on port 5000...
```

The API is now available at `http://localhost:5000/api/v1`

**Verify it works:**
```bash
curl http://localhost:5000/api/v1/health
# Expected: {"status": "ok", "service": "mission-readiness-backend"}
```

---

## Frontend Setup

### 7. Install frontend dependencies

Open a **new terminal**:

```bash
cd src/frontend
npm install
```

### 8. Configure frontend environment (optional)

```bash
cp .env.example .env
```

The default points to `http://127.0.0.1:5000/api/v1`. No change needed for local dev.

### 9. Start the frontend dev server

```bash
npm run dev
```

The application is available at: `http://localhost:5173`

---

## Load Sample Data

AeroReady requires a CSV upload to display fleet data. Use the NASA C-MAPSS test dataset:

1. Open `http://localhost:5173`
2. Click **"Upload CSV"** in the top-right header
3. Select a CSV file in CMAPSS format (see format below)
4. The ML pipeline will process all engines in the background (allow ~30 seconds for 100 engines)

**CSV format:** The file can be:
- NASA C-MAPSS raw format (space-separated, no headers, 26 columns)
- Pre-processed format with headers (`unit_number`, `time_cycles`, `sensor_2` ... `sensor_21`)
- Pre-smoothed format with `sensor_N_smooth` column names

---

## MCP Server Setup (IBM Bob Integration)

### 10. Install MCP server dependencies

```bash
cd src/mcp_server
pip install -r requirements.txt
```

### 11. Register with IBM Bob

The `.bob/mcp.json` configuration file in the repository root automatically registers the AeroReady MCP server with IBM Bob.

**Ensure the backend is running first (step 6), then open IBM Bob.** The MCP server will start automatically when Bob loads the project.

**To test the MCP server manually:**
```bash
cd src/mcp_server
python server.py
```

---

## Running Tests

```bash
cd src/backend
# Activate virtual environment first
source .venv/bin/activate  # or .venv\Scripts\Activate.ps1 on Windows

pytest tests/ -v
```

Expected output: all tests pass. Tests use an in-memory SQLite database — no live server required.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `ModuleNotFoundError: torch` | Run `pip install torch --index-url https://download.pytorch.org/whl/cpu` manually, then `pip install -r requirements.txt` again |
| `flask: command not found` | Ensure your `.venv` is activated |
| `flask db upgrade` fails with "No such command" | Set `FLASK_APP=run.py` in your `.env` file |
| Backend starts but models not loaded | Check that `src/backend/ai_engine/best_rul_lstm.pth` exists — it must be committed to the repo |
| Frontend shows "Unable to load fleet data" | Ensure backend is running on port 5000; check browser console for CORS errors |
| Upload says "CSV already fully ingested" | You've uploaded the same file before. Use "New Analysis" → "Clear & Upload New" to reset |
| MCP server not found by Bob | Ensure `.bob/mcp.json` is present at the repository root; reload the Bob project |

---

## Build for Production

### Frontend production build

```bash
cd src/frontend
npm run build
# Output in src/frontend/dist/
```

### Backend production mode

```bash
cd src/backend
# Set FLASK_ENV=production in .env
python run.py  # Uses Waitress WSGI server
```

---

## Directory Layout

```
src/backend/
├── ai_engine/          ← Pre-trained ML models + inference code
│   ├── best_rul_lstm.pth
│   ├── multivariate_iforest.pkl
│   ├── iforest_scaler.pkl
│   └── sensor_baseline_stats.json
├── app/
│   ├── routes/         ← Flask blueprints (engine, mission, data, copilot, system)
│   ├── controllers/    ← Request validation + orchestration
│   ├── services/       ← Business logic (pipeline, copilot)
│   ├── repositories/   ← Database access layer
│   ├── models/         ← SQLAlchemy models
│   └── utils/          ← Logger, errors, responses
├── tests/              ← Pytest test suite
├── requirements.txt
└── run.py

src/frontend/
├── src/
│   ├── pages/          ← Fleet, AssetHealth, AICopilot, Reports, ModelAnalysis, etc.
│   ├── components/     ← Dashboard, Sidebar, Header, Layout
│   ├── context/        ← AppDataContext (global state management)
│   └── utils/          ← validation.js
└── package.json

src/mcp_server/
├── server.py           ← FastMCP server with 5 tools
└── requirements.txt
```
