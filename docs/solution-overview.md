# Solution Overview

## What We Built

AeroReady is an end-to-end mission readiness and predictive maintenance platform. It takes raw turbofan engine sensor data as input and produces, for each engine in the fleet:

1. A **Remaining Useful Life (RUL)** prediction in engine cycles — how many more cycles the engine can operate before failure.
2. A **per-sensor health classification** — which of the 14 monitored sensors show normal, degrading, or abnormal behaviour.
3. A **mission readiness decision** — given a planned mission duration, is there sufficient RUL margin to complete it safely?
4. A **natural-language explanation** via the Mission Readiness Copilot — accessible from the web UI or from IBM Bob via MCP tools.

## How It Works

1. **Data Ingestion:** An operator uploads a CSV file containing per-cycle sensor readings from their engine fleet (NASA C-MAPSS format or raw CMAPSS format). The backend parses and normalises the data, creating per-engine records in a SQLite database. The upload is idempotent — re-uploading the same CSV does not create duplicate records.

2. **ML Inference — RUL Prediction:** For each engine, the last 30 cycles of sensor data (14 smoothed channels) are formed into a sequence and passed to the LSTM model. The model outputs a raw RUL value (cycles until predicted failure), which is clipped at 125 cycles (the maximum meaningful value for the C-MAPSS dataset). Engines with fewer than 30 cycles of history are zero-padded at the start of the sequence.

3. **ML Inference — Sensor Health:** The last 5 cycles of sensor data are passed through an Isolation Forest fitted on healthy-engine observations (RUL > 100). For each sensor, the system computes: anomaly persistence (what fraction of the 5-cycle window is anomalous), trend slope (direction of recent change), and normalised deviation from the healthy baseline. These signals classify each sensor as NORMAL, DEGRADING, ABNORMAL, or UNKNOWN.

4. **Mission Readiness Evaluation:** When an operator queries a specific engine with a mission duration, the system computes `margin_of_safety = RUL - mission_duration`. Margins > 20 cycles = SAFE; 0–20 = MARGINAL; negative = CRITICAL. A plain-English recommendation is generated from the risk flag and margin value.

5. **Fleet Dashboard:** The React frontend presents the entire fleet's analysis in real time: a KPI strip (total/ready/warning/high-priority), a priority-sorted engine card grid, an RUL distribution histogram, and a fleet sensor health breakdown.

6. **Mission Readiness Copilot:** A conversational interface accepts natural-language questions about any engine. Questions are routed to one of seven response handlers by keyword matching. Every sentence in the response is templated from actual database values — no generative AI, no hallucination. Evidence fields are returned alongside the answer so any consumer can verify each claim.

7. **IBM Bob MCP Integration:** The MCP server exposes five tools to IBM Bob, all of which call the existing Flask API. Bob can query fleet status, engine readiness, sensor health, high-priority engines, and ask the Copilot — all from inside the Bob IDE without opening the browser.

## Architecture Diagram

> See [`architecture.md`](architecture.md) for the detailed diagram.

```
[CSV Upload]
     │
     ▼
[Flask API / Data Controller]
     │  ingest (idempotent)
     ▼
[SQLite: assets, sensor_readings]
     │
     ▼
[ML Pipeline]──────────────────────────────────────────┐
     │                                                  │
     ▼                                                  ▼
[LSTM Sequence Model]                    [Isolation Forest]
(30-cycle window → RUL)                 (5-cycle window → sensor states)
     │                                                  │
     └──────────────────────┬────────────────────────── ┘
                            ▼
                   [predictions, sensor_analysis tables]
                            │
                            ▼
                [Mission Readiness Engine]
              (margin = RUL - mission_duration)
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
         [React UI]               [Copilot Service]
      (Fleet Dashboard,           (keyword routing,
       Sensor Health,              template generation,
       Alerts, Reports)            evidence dict)
                                        │
                                        ▼
                                 [MCP Server]
                              (IBM Bob tools)
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| LSTM over tree-based models for RUL | Temporal sequence models are better suited to the degradation trajectory pattern in C-MAPSS; the model captures the historical trend of each engine, not just the current cycle's snapshot |
| 5-fold Group K-Fold by engine_id | Prevents data leakage across engines; each fold uses entirely unseen engines for validation |
| IForest trained on RUL > 100 (healthy baseline) | The model learns what healthy looks like, not what failures look like — unsupervised anomaly detection requires a clean reference |
| Deterministic Copilot (no LLM) | Eliminates hallucination risk entirely; every statement can be traced to a database record; no API key dependency; works offline |
| FastMCP for Bob integration | Lightweight, Python-native MCP server pattern; integrates with IBM Bob's MCP mechanism via a single JSON config entry |
| SQLAlchemy + SQLite default | Zero-dependency local development; PostgreSQL-compatible via DATABASE_URL for production |
| Background thread for analysis after upload | Upload responds immediately with a 200; analysis runs asynchronously so the UI is not blocked on 100-engine inference |

## IBM Technologies Used

- **IBM Bob (via FastMCP MCP integration):** AeroReady exposes five read-only tools through a FastMCP server that IBM Bob discovers via `.bob/mcp.json`. Bob calls these tools when a user asks fleet-related questions in natural language. The tools call the existing AeroReady Flask API, meaning Bob always sees live, real data. See `src/mcp_server/` for implementation.
