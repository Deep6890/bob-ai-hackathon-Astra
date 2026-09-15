"""
AeroReady MCP Server
====================
IBM Bob integration via FastMCP (Python mcp SDK).

This server exposes five read-only tools that call the AeroReady Flask API.
All data returned is live fleet data — no mock values.

Tools:
    1. get_fleet_summary        — overall fleet health counts
    2. get_engine_readiness     — full readiness assessment for one engine
    3. get_sensor_health        — per-sensor health breakdown for one engine
    4. list_high_priority_engines — engines flagged HIGH maintenance priority
    5. ask_copilot              — natural-language Q&A about an engine

Configuration:
    AEROREADY_API_URL  — base URL for the Flask API (default: http://localhost:5000/api/v1)
    Start the Flask backend BEFORE starting or using this MCP server.

Usage (standalone test):
    python server.py

Bob will start this server automatically when the project is opened,
using the configuration in .bob/mcp.json.
"""

import os
import json
import requests
from typing import Optional

from mcp.server.fastmcp import FastMCP

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
API_BASE = os.environ.get("AEROREADY_API_URL", "http://localhost:5000/api/v1")
TIMEOUT  = int(os.environ.get("AEROREADY_TIMEOUT", "15"))  # seconds

mcp = FastMCP(
    name="aeroready",
    instructions=(
        "AeroReady is a mission readiness and predictive maintenance platform for turbofan "
        "engine fleets. Use these tools to query live fleet data: RUL predictions, sensor "
        "health states, mission readiness assessments, and maintenance priorities. "
        "All data comes directly from the AeroReady ML pipeline — no values are fabricated. "
        "The Flask API must be running on port 5000 before these tools can be used."
    ),
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get(path: str) -> dict | list:
    """GET request to the AeroReady API. Raises on non-2xx status."""
    url = f"{API_BASE}{path}"
    resp = requests.get(url, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", data)


def _post(path: str, body: dict) -> dict:
    """POST request to the AeroReady API. Raises on non-2xx status."""
    url = f"{API_BASE}{path}"
    resp = requests.post(url, json=body, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", data)


def _api_error(tool_name: str, exc: Exception) -> str:
    """Formats a user-friendly error message when the API is unreachable."""
    if isinstance(exc, requests.ConnectionError):
        return (
            f"[{tool_name}] Cannot connect to the AeroReady API at {API_BASE}. "
            f"Please ensure the Flask backend is running: cd src/backend && python run.py"
        )
    if isinstance(exc, requests.Timeout):
        return f"[{tool_name}] Request timed out after {TIMEOUT}s. The API may be overloaded."
    if isinstance(exc, requests.HTTPError):
        return f"[{tool_name}] API returned an error: {exc.response.status_code} — {exc.response.text[:200]}"
    return f"[{tool_name}] Unexpected error: {str(exc)}"


# ---------------------------------------------------------------------------
# Tool 1 — Fleet Summary
# ---------------------------------------------------------------------------

@mcp.tool()
def get_fleet_summary() -> str:
    """
    Returns a high-level summary of the entire fleet's readiness status.

    Provides:
    - Total number of engines in the fleet
    - Number of engines analyzed
    - Count of SAFE / MARGINAL / CRITICAL engines
    - Count of HIGH / MEDIUM / LOW maintenance priority engines
    - Dataset metadata (latest cycle, upload timestamp)

    Use this tool first to understand the overall fleet health before
    drilling into individual engines.
    """
    try:
        engines     = _get("/engines/")
        dataset_info = _get("/data/dataset-info")
        status      = _get("/system/status")

        if not engines:
            return "The fleet database is empty. Upload a sensor CSV first."

        total     = len(engines)
        analyzed  = 0
        safe = marginal = critical = 0
        high = medium = low = 0

        for eng in engines:
            uid = eng.get("unit_number")
            if uid is None:
                continue
            try:
                r = _post("/mission/readiness", {"engine_id": uid, "mission_duration": 30})
                analyzed += 1
                flag = r.get("combined_assessment", {}).get("mission_readiness", "")
                prio = r.get("combined_assessment", {}).get("maintenance_priority", "LOW")
                if "SAFE" in flag or "READY" in flag:
                    safe += 1
                elif "MARGINAL" in flag or "WARNING" in flag:
                    marginal += 1
                elif "CRITICAL" in flag or "NOT READY" in flag:
                    critical += 1
                if prio == "HIGH":    high += 1
                elif prio == "MEDIUM": medium += 1
                else: low += 1
            except Exception:
                pass  # Engine not analyzed yet — skip

        lines = [
            f"AeroReady Fleet Summary",
            f"========================",
            f"Total engines: {total}",
            f"Analyzed: {analyzed}",
            f"",
            f"Mission Readiness:",
            f"  SAFE:     {safe}",
            f"  MARGINAL: {marginal}",
            f"  CRITICAL: {critical}",
            f"",
            f"Maintenance Priority:",
            f"  HIGH:   {high}",
            f"  MEDIUM: {medium}",
            f"  LOW:    {low}",
        ]

        if dataset_info.get("latest_cycle"):
            lines.append(f"")
            lines.append(f"Latest observation cycle in dataset: {dataset_info['latest_cycle']}")
        if dataset_info.get("latest_upload"):
            lines.append(f"Last dataset upload: {dataset_info['latest_upload']}")

        return "\n".join(lines)

    except Exception as e:
        return _api_error("get_fleet_summary", e)


# ---------------------------------------------------------------------------
# Tool 2 — Engine Readiness
# ---------------------------------------------------------------------------

@mcp.tool()
def get_engine_readiness(engine_id: int) -> str:
    """
    Returns the full mission readiness assessment for a specific engine.

    Provides:
    - Predicted Remaining Useful Life (RUL) in cycles
    - Mission readiness status (SAFE / MARGINAL / CRITICAL)
    - Safety margin = RUL minus mission duration (30 cycles default)
    - Current sensor health summary (normal / degrading / abnormal counts)
    - Maintenance priority (HIGH / MEDIUM / LOW)
    - Plain-English recommendation from the mission readiness engine

    Args:
        engine_id: The unit number of the engine (integer, e.g. 3, 7, 42)

    Use this tool when a user asks about a specific engine's readiness,
    RUL, safety margin, or overall health.
    """
    try:
        r = _post("/mission/readiness", {"engine_id": engine_id, "mission_duration": 30})

        rul_a   = r.get("rul_assessment", {})
        health  = r.get("current_health", {})
        combined = r.get("combined_assessment", {})

        rul     = rul_a.get("predicted_rul_cycles", "N/A")
        margin  = rul_a.get("margin_of_safety", "N/A")
        status  = combined.get("mission_readiness", "N/A")
        prio    = combined.get("maintenance_priority", "N/A")
        rec     = combined.get("recommendation", "No recommendation available.")
        cycle   = r.get("latest_cycle", "N/A")

        norm  = health.get("normal_sensors", "N/A")
        deg   = health.get("degrading_sensors", 0)
        abn   = health.get("abnormal_sensors", 0)
        unk   = health.get("unknown_sensors", 0)

        margin_str = (f"+{margin:.1f}" if isinstance(margin, (int, float)) and margin >= 0
                      else f"{margin:.1f}" if isinstance(margin, (int, float)) else str(margin))

        lines = [
            f"Engine {engine_id} — Mission Readiness Assessment",
            f"{'='*50}",
            f"Observation cycle:    {cycle}",
            f"Predicted RUL:        {rul:.1f if isinstance(rul, float) else rul} cycles",
            f"Mission status:       {status}",
            f"Safety margin:        {margin_str} cycles  (vs 30-cycle mission)",
            f"Maintenance priority: {prio}",
            f"",
            f"Sensor Health ({norm} normal | {deg} degrading | {abn} abnormal | {unk} unknown)",
            f"",
            f"Recommendation:",
            f"  {rec}",
        ]

        return "\n".join(lines)

    except requests.HTTPError as e:
        if e.response.status_code == 404:
            return (f"Engine {engine_id} was not found in the fleet. "
                    f"Ensure sensor data for this unit has been uploaded.")
        return _api_error("get_engine_readiness", e)
    except Exception as e:
        return _api_error("get_engine_readiness", e)


# ---------------------------------------------------------------------------
# Tool 3 — Sensor Health
# ---------------------------------------------------------------------------

@mcp.tool()
def get_sensor_health(engine_id: int) -> str:
    """
    Returns per-sensor health breakdown for a specific engine.

    For each of the 14 monitored sensors, provides:
    - Health state: NORMAL, DEGRADING, ABNORMAL, or UNKNOWN
    - Anomaly persistence (fraction of recent 5-cycle window that was anomalous)
    - Trend slope (direction of recent change)
    - Normalised deviation from the healthy-engine baseline (in standard deviations)

    DEGRADING: sensor trend is aligned with the historical degradation direction.
    ABNORMAL: sensor is anomalous but trend direction is unclear.
    NORMAL: no persistent anomaly detected.

    Args:
        engine_id: The unit number of the engine (integer)

    Use this tool when a user asks which sensors are concerning,
    degrading, or abnormal on a specific engine.
    """
    try:
        sensors = _get(f"/engines/{engine_id}/sensors")

        if not sensors:
            return (f"No sensor analysis available for Engine {engine_id}. "
                    f"The engine may not have been analyzed yet.")

        # Group by state for summary
        abnormal  = [s for s in sensors if s.get("state") == "ABNORMAL"]
        degrading = [s for s in sensors if s.get("state") == "DEGRADING"]
        normal    = [s for s in sensors if s.get("state") == "NORMAL"]
        unknown   = [s for s in sensors if s.get("state") == "UNKNOWN"]

        lines = [
            f"Engine {engine_id} — Sensor Health Analysis (14 sensors)",
            f"{'='*55}",
            f"Summary: {len(normal)} normal | {len(degrading)} degrading | "
            f"{len(abnormal)} abnormal | {len(unknown)} unknown",
            f"",
        ]

        if abnormal:
            lines.append("ABNORMAL sensors (persistent anomaly — trend direction unclear):")
            for s in abnormal:
                pers = s.get("persistence")
                dev  = s.get("normalized_deviation")
                pers_str = f"{pers*100:.0f}%" if pers is not None else "—"
                dev_str  = f"{dev:+.2f}σ"    if dev  is not None else "—"
                lines.append(f"  {s['sensor']:25s}  persistence={pers_str}  deviation={dev_str}")
            lines.append("")

        if degrading:
            lines.append("DEGRADING sensors (aligned with historical degradation direction):")
            for s in degrading:
                pers = s.get("persistence")
                dev  = s.get("normalized_deviation")
                dir_ = s.get("degradation_direction", "—")
                pers_str = f"{pers*100:.0f}%" if pers is not None else "—"
                dev_str  = f"{dev:+.2f}σ"    if dev  is not None else "—"
                lines.append(f"  {s['sensor']:25s}  persistence={pers_str}  deviation={dev_str}  direction={dir_}")
            lines.append("")

        if normal:
            lines.append(f"NORMAL sensors ({len(normal)}): " +
                         ", ".join(s["sensor"] for s in normal))

        return "\n".join(lines)

    except requests.HTTPError as e:
        if e.response.status_code == 404:
            return f"Engine {engine_id} was not found."
        return _api_error("get_sensor_health", e)
    except Exception as e:
        return _api_error("get_sensor_health", e)


# ---------------------------------------------------------------------------
# Tool 4 — High Priority Engines
# ---------------------------------------------------------------------------

@mcp.tool()
def list_high_priority_engines() -> str:
    """
    Lists all engines in the fleet that are flagged HIGH maintenance priority.

    An engine is HIGH priority if ANY of the following is true:
    - It has ABNORMAL or DEGRADING sensors
    - Its safety margin is negative (RUL < mission duration)

    Returns engine unit numbers, RUL, safety margin, and status
    sorted by most critical first.

    Use this tool when a user asks which engines need immediate attention,
    which assets are critical, or which engines to prioritise.
    """
    try:
        engines = _get("/engines/")
        if not engines:
            return "No fleet data available. Upload a sensor CSV first."

        high_priority = []

        for eng in engines:
            uid = eng.get("unit_number")
            if uid is None:
                continue
            try:
                r = _post("/mission/readiness", {"engine_id": uid, "mission_duration": 30})
                prio   = r.get("combined_assessment", {}).get("maintenance_priority", "LOW")
                status = r.get("combined_assessment", {}).get("mission_readiness", "UNKNOWN")
                rul    = r.get("rul_assessment", {}).get("predicted_rul_cycles", None)
                margin = r.get("rul_assessment", {}).get("margin_of_safety", None)
                if prio == "HIGH":
                    high_priority.append({
                        "unit": uid,
                        "rul": rul,
                        "margin": margin,
                        "status": status,
                        "priority": prio,
                    })
            except Exception:
                pass

        if not high_priority:
            return "No HIGH priority engines found in the current fleet analysis."

        # Sort: CRITICAL (negative margin) first, then by margin ascending
        high_priority.sort(
            key=lambda x: (x["margin"] if x["margin"] is not None else 999)
        )

        lines = [
            f"HIGH Priority Engines ({len(high_priority)} of {len(engines)})",
            f"{'='*50}",
            f"{'Unit':>6}  {'RUL (cy)':>9}  {'Margin':>8}  Status",
            f"{'-'*6}  {'-'*9}  {'-'*8}  {'-'*15}",
        ]

        for e in high_priority:
            rul_s    = f"{e['rul']:.1f}" if isinstance(e["rul"], (int, float)) else "—"
            margin_s = (f"+{e['margin']:.1f}" if isinstance(e["margin"], (int, float)) and e["margin"] >= 0
                        else f"{e['margin']:.1f}" if isinstance(e["margin"], (int, float)) else "—")
            lines.append(f"{e['unit']:>6}  {rul_s:>9}  {margin_s:>8}  {e['status']}")

        return "\n".join(lines)

    except Exception as e:
        return _api_error("list_high_priority_engines", e)


# ---------------------------------------------------------------------------
# Tool 5 — Copilot Q&A
# ---------------------------------------------------------------------------

@mcp.tool()
def ask_copilot(engine_id: int, question: str) -> str:
    """
    Ask the AeroReady Mission Readiness Copilot a natural-language question
    about a specific engine.

    The Copilot answers questions about:
    - Mission readiness and go/no-go status
    - Predicted Remaining Useful Life (RUL)
    - Which sensors are degrading or abnormal
    - Safety margin against mission duration
    - Maintenance priority and recommended actions
    - Why the engine is not ready (if applicable)

    The Copilot is DETERMINISTIC — every statement is grounded in real
    database values from the AeroReady ML pipeline. It does not generate
    or fabricate information.

    Args:
        engine_id: Unit number of the engine to query (integer)
        question: Natural-language question (string)

    Example questions:
        "Is Engine 3 ready for a 30-cycle mission?"
        "Why is this engine flagged as critical?"
        "Which sensors on Engine 7 are showing degradation?"
        "What maintenance action is recommended for Engine 12?"
    """
    try:
        result = _post("/copilot/query", {"engine_id": engine_id, "question": question})

        answer   = result.get("answer", "No answer returned.")
        evidence = result.get("evidence", {})

        lines = [answer, ""]

        # Append key evidence fields so Bob can see the raw data behind the answer
        if evidence:
            ev_lines = []
            if "rul_predicted" in evidence:
                ev_lines.append(f"  RUL:           {evidence['rul_predicted']:.1f} cycles")
            if "risk_flag" in evidence:
                ev_lines.append(f"  Risk flag:     {evidence['risk_flag']}")
            if "margin_of_safety" in evidence:
                m = evidence["margin_of_safety"]
                ev_lines.append(f"  Safety margin: {'+' if m >= 0 else ''}{m:.1f} cycles")
            if "maintenance_priority" in evidence:
                ev_lines.append(f"  Priority:      {evidence['maintenance_priority']}")
            if evidence.get("degrading_sensors"):
                ev_lines.append(f"  Degrading:     {', '.join(evidence['degrading_sensors'])}")
            if evidence.get("abnormal_sensors"):
                ev_lines.append(f"  Abnormal:      {', '.join(evidence['abnormal_sensors'])}")

            if ev_lines:
                lines.append("Evidence (from ML pipeline):")
                lines.extend(ev_lines)

        return "\n".join(lines)

    except requests.HTTPError as e:
        if e.response.status_code == 404:
            return (f"Engine {engine_id} was not found in the fleet. "
                    f"Ensure sensor data has been uploaded.")
        return _api_error("ask_copilot", e)
    except Exception as e:
        return _api_error("ask_copilot", e)


# ---------------------------------------------------------------------------
# Entry point (for standalone testing)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print(f"AeroReady MCP Server")
    print(f"API base URL: {API_BASE}")
    print(f"Starting FastMCP server...")
    mcp.run()
