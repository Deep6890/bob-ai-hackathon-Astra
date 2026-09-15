# ✈️ AeroReady — Mission Readiness & Predictive Maintenance Platform

> **IBM Bob AI Hackathon Submission** — AI Track

AeroReady is a mission readiness and predictive maintenance platform for turbofan engine fleets. It uses an LSTM neural network to predict Remaining Useful Life (RUL) and an Isolation Forest to assess per-sensor health, then evaluates whether each engine has sufficient margin to complete a planned mission.

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | Team Astra |
| **Track** | AI |
| **Team Lead** | [Lead Name] — [lead@email.com] |
| **Members** | [Member 1], [Member 2], [Member 3], [Member 4] |

---

## 🎯 Problem Statement

Unplanned aircraft-on-ground (AOG) events cost airlines and defence operators millions per day. Maintenance crews currently rely on fixed time-based inspection schedules that either service engines too early (wasting resources) or too late (risking mission failure). There is no fast, data-driven way for a fleet operator to ask "Is this engine safe for today's mission?" and get a justified answer backed by real sensor evidence.

---

## 💡 Solution

AeroReady ingests raw turbofan sensor telemetry, runs it through a dual-model ML pipeline (LSTM for RUL prediction + Isolation Forest for anomaly detection), and produces a go/no-go mission readiness decision with an explicit margin of safety. A conversational Mission Readiness Copilot — accessible via both a web UI and IBM Bob through MCP tools — lets operators ask natural-language questions and receive evidence-grounded answers derived directly from the ML pipeline output.

---

## ✨ Key Features

- **LSTM RUL Prediction:** A 2-layer LSTM trained on NASA C-MAPSS data predicts remaining useful life with MAE of ~10 cycles and R² of 0.897.
- **Isolation Forest Sensor Health:** Detects anomalous sensor behaviour against a healthy-engine baseline; classifies each of 14 sensors as NORMAL, DEGRADING, ABNORMAL, or UNKNOWN.
- **Mission Readiness Engine:** Computes margin-of-safety = RUL − mission_duration and issues SAFE / MARGINAL / CRITICAL go/no-go decisions with plain-English recommendations.
- **Mission Readiness Copilot:** Evidence-grounded natural language Q&A over the fleet — answers questions about readiness, RUL, sensor health, and maintenance priority without any LLM or external API. Integrated with IBM Bob via MCP.
- **Fleet Dashboard:** Real-time KPI strip, RUL distribution chart, priority-sorted engine cards, and sensor health breakdown for a 100-engine fleet.
- **IBM Bob MCP Integration:** Five MCP tools expose fleet data to IBM Bob, enabling conversational fleet analysis directly inside the Bob IDE.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | Python 3.11+, JavaScript (ES2022) |
| **Frameworks** | Flask 3.0, React 18, Vite, TailwindCSS |
| **IBM Technologies** | IBM Bob (MCP integration via FastMCP) |
| **ML / AI** | PyTorch 2.x (LSTM), scikit-learn (Isolation Forest), NASA C-MAPSS dataset |
| **Databases** | SQLite (development) / PostgreSQL-compatible (production) |
| **Other** | SQLAlchemy, Flask-Migrate, Recharts, Lucide React, Waitress |

---

## 📁 Repository Structure

```
├── src/
│   ├── backend/              # Flask API + ML pipeline
│   │   ├── ai_engine/        # LSTM, IsolationForest, inference
│   │   ├── app/              # Routes, controllers, services, repositories, models
│   │   ├── tests/            # Pytest test suite
│   │   └── run.py            # Entry point
│   ├── frontend/             # React + Vite + TailwindCSS
│   │   └── src/
│   │       ├── pages/        # Fleet, AssetHealth, Copilot, Reports, etc.
│   │       ├── components/   # Dashboard, Sidebar, Header, Layout
│   │       └── context/      # AppDataContext (global state)
│   └── mcp_server/           # IBM Bob MCP tools (FastMCP)
├── docs/                     # Architecture, setup, problem statement
├── demo/                     # Screenshots, video link
├── presentation/             # Slide deck
└── submission.yaml           # Hackathon metadata
```

---

## ⚡ How to Run

> Full instructions: [`docs/setup-guide.md`](docs/setup-guide.md)

### Backend

```bash
cd src/backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env if needed (SQLite works out of the box — no database setup required)

# Initialise database
flask --app run db upgrade

# Start server (port 5000)
python run.py
```

### Frontend

```bash
cd src/frontend
npm install
cp .env.example .env             # optional — defaults to localhost:5000
npm run dev                      # http://localhost:5173
```

### MCP Server (IBM Bob integration)

```bash
cd src/mcp_server
pip install -r requirements.txt
# Register in Bob — see .bob/mcp.json
```

---

## 🖥️ Demo

| Artifact | Link |
|---|---|
| 📹 Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| 🌐 Live Demo | [See demo/live-demo-url.txt](demo/live-demo-url.txt) |
| 🖼️ Screenshots | [See demo/screenshots/](demo/screenshots/) |
| 📊 Presentation | [See presentation/](presentation/) |

---

## ⚠️ Known Limitations

- Trained on NASA C-MAPSS FD001 only (single operating condition, single fault mode — not multi-condition generalisation).
- Per-sensor anomaly scores are derived from a multivariate Isolation Forest; the score shown per sensor is the ensemble score for that time-step, not an independent per-sensor score.
- The Copilot uses deterministic rule-based NL generation — not a generative LLM. It answers only the question categories it was designed for.
- No authentication layer — intended for local demo use only.
- SQLite is used by default; switch to PostgreSQL via `DATABASE_URL` env var for production.

---

## 🏅 What We're Most Proud Of

The end-to-end depth of the ML pipeline: from NASA C-MAPSS data through a rigorously validated LSTM (5-fold Group K-Fold, MAE 10.05, R² 0.897) and a baseline-grounded Isolation Forest, to a mission-window readiness engine that produces actionable go/no-go decisions with explicit safety margins — all surfaced through a clean React dashboard, a conversational Copilot, and IBM Bob MCP tools that make the entire fleet interrogable in natural language.

---

## 🔬 IBM Bob Integration

AeroReady exposes five MCP tools to IBM Bob:

| Tool | What Bob can ask |
|---|---|
| `get_fleet_summary` | "How many engines are critical right now?" |
| `get_engine_readiness` | "What is the mission readiness of Engine 3?" |
| `get_sensor_health` | "Which sensors on Engine 7 are degrading?" |
| `list_high_priority_engines` | "Which engines need immediate attention?" |
| `ask_copilot` | "Why is Engine 12 not ready for the mission?" |

See [`src/mcp_server/`](src/mcp_server/) and [`.bob/mcp.json`](.bob/mcp.json) for setup.
