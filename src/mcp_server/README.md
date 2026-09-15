# AeroReady MCP Server

IBM Bob integration for the AeroReady Mission Readiness & Predictive Maintenance platform.

## Overview

This FastMCP server exposes five read-only tools to IBM Bob. All tools call the
AeroReady Flask API — they require the backend to be running first.

## Prerequisites

1. AeroReady backend running: `cd src/backend && python run.py`
2. Fleet data loaded: upload a NASA C-MAPSS CSV via the UI

## Installation

```bash
cd src/mcp_server
pip install -r requirements.txt
```

## Tools

| Tool | Description |
|---|---|
| `get_fleet_summary` | Overall fleet health: SAFE/MARGINAL/CRITICAL counts, priority breakdown |
| `get_engine_readiness(engine_id)` | Full readiness for one engine: RUL, margin, status, recommendation |
| `get_sensor_health(engine_id)` | Per-sensor health for one engine: 14 sensor states with evidence |
| `list_high_priority_engines` | All HIGH priority engines sorted by safety margin |
| `ask_copilot(engine_id, question)` | Natural-language Q&A about a specific engine |

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `AEROREADY_API_URL` | `http://localhost:5000/api/v1` | AeroReady Flask API base URL |
| `AEROREADY_TIMEOUT` | `15` | Request timeout in seconds |

## Example Bob Conversations

**"Which engines are high priority?"**
→ Bob calls `list_high_priority_engines()` → returns engines sorted by safety margin

**"What is the readiness of Engine 3?"**
→ Bob calls `get_engine_readiness(3)` → returns RUL, margin, status, recommendation

**"Which sensors on Engine 7 are degrading?"**
→ Bob calls `get_sensor_health(7)` → returns per-sensor states

**"Why is Engine 12 not ready?"**
→ Bob calls `ask_copilot(12, "Why is Engine 12 not ready?")` → copilot answer with evidence

## Bob Registration

The `.bob/mcp.json` file at the project root automatically registers this server.
Reload the Bob project after installing to activate the tools.

## Manual Test

```bash
cd src/mcp_server
python server.py
```
