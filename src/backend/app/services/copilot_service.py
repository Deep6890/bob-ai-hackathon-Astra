"""
copilot_service.py
==================
Mission Readiness Copilot — deterministic, evidence-grounded NL response generator.

Design principles:
- Every factual statement is sourced from a real DB record.
- No LLM, no external API, no hallucination.
- If data is unavailable, explicitly says "Insufficient evidence available."
- Evidence dict accompanies every answer so callers can verify all claims.
- Questions are routed to specialised handlers by keyword matching.
"""
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.engine_repository import EngineRepository
from app.repositories.sensor_repository import SensorRepository
from app.utils.logger import log


# ---------------------------------------------------------------------------
# Keyword sets used for routing
# ---------------------------------------------------------------------------
_KW_READY    = {"ready", "mission", "go", "dispatch", "fly", "safe", "clear", "approved"}
_KW_RUL      = {"rul", "remaining", "life", "cycles", "how long", "hours", "endurance"}
_KW_SENSOR   = {"sensor", "health", "degrading", "abnormal", "degradation", "anomaly",
                 "which sensors", "what sensors", "sensor issues"}
_KW_MARGIN   = {"margin", "safety", "buffer", "slack", "cushion"}
_KW_MAINT    = {"maintenance", "priority", "action", "inspect", "service", "repair",
                "overhaul", "ground", "fix", "schedule"}
_KW_FLEET    = {"fleet", "all engines", "all assets", "critical engines", "high priority",
                "which engines", "any engines", "overview"}


def _q(question: str) -> set:
    """Lowercase word set of the question for keyword matching."""
    return set(question.lower().split())


class CopilotService:
    """
    Answers natural-language questions about engine mission readiness
    using only real data from the database.
    """

    def __init__(self):
        self.analysis_repo  = AnalysisRepository()
        self.engine_repo    = EngineRepository()
        self.sensor_repo    = SensorRepository()

    # -----------------------------------------------------------------------
    # Public entry point
    # -----------------------------------------------------------------------

    def answer(self, engine_id: int | None, question: str) -> dict:
        """
        Route the question to the appropriate handler and return
        {answer, evidence, engine_id}.

        engine_id may be None for fleet-level questions.
        """
        log("COPILOT", f"Query engine_id={engine_id} question='{question[:80]}'")
        words = _q(question)

        # Fleet-level questions — don't need a specific engine
        if _KW_FLEET & words or engine_id is None:
            return self._handle_fleet_question(question)

        # Load engine data for per-engine questions
        engine = self.engine_repo.get_engine_by_id(engine_id)
        if not engine:
            return {
                "answer": f"Engine {engine_id} was not found in the fleet database. "
                          f"Please upload sensor data for this unit first.",
                "evidence": {},
                "engine_id": engine_id,
            }

        pred     = self.analysis_repo.get_latest_prediction(engine_id)
        readiness = self.analysis_repo.get_latest_readiness(engine_id)
        sensors  = (self.analysis_repo.get_sensor_analysis_for_prediction(pred.id)
                    if pred else [])

        # Build evidence dict regardless of which handler runs
        evidence = self._build_evidence(engine_id, pred, readiness, sensors)

        # Route by keyword priority
        if _KW_READY & words:
            answer = self._handle_readiness(evidence, pred, readiness, sensors)
        elif _KW_SENSOR & words:
            answer = self._handle_sensors(evidence, pred, sensors)
        elif _KW_RUL & words:
            answer = self._handle_rul(evidence, pred)
        elif _KW_MARGIN & words:
            answer = self._handle_margin(evidence, readiness)
        elif _KW_MAINT & words:
            answer = self._handle_maintenance(evidence, pred, readiness, sensors)
        else:
            # Default: full structured summary
            answer = self._handle_general(evidence, pred, readiness, sensors)

        return {"answer": answer, "evidence": evidence, "engine_id": engine_id}

    # -----------------------------------------------------------------------
    # Response handlers — each returns a plain string
    # -----------------------------------------------------------------------

    def _handle_readiness(self, ev, pred, readiness, sensors) -> str:
        if not pred:
            return (f"Insufficient evidence available for Engine {ev.get('engine_id')}. "
                    f"No prediction has been computed yet. Upload sensor data and allow "
                    f"the ML pipeline to complete analysis.")

        rul   = ev.get("rul_predicted", "—")
        flag  = ev.get("risk_flag", "UNKNOWN")
        margin = ev.get("margin_of_safety")
        rec   = ev.get("recommendation", "")
        abn   = ev.get("abnormal_count", 0)
        deg   = ev.get("degrading_count", 0)

        if flag == "SAFE":
            status_line = (f"Engine {ev['engine_id']} is MISSION READY. "
                           f"Predicted RUL is {rul:.1f} cycles with a safety margin "
                           f"of +{margin:.1f} cycles against the {ev.get('mission_duration', 30)}-cycle mission window.")
        elif flag == "MARGINAL":
            status_line = (f"Engine {ev['engine_id']} has MARGINAL mission readiness. "
                           f"Predicted RUL is {rul:.1f} cycles with only {margin:.1f} cycles "
                           f"of margin — this is below the recommended 20-cycle buffer.")
        elif flag == "CRITICAL":
            status_line = (f"Engine {ev['engine_id']} is NOT MISSION READY. "
                           f"Predicted RUL is {rul:.1f} cycles, which is {abs(margin):.1f} cycles "
                           f"LESS than the required mission duration. Do not dispatch.")
        else:
            status_line = f"Engine {ev['engine_id']} readiness status is currently UNKNOWN."

        sensor_line = ""
        if abn > 0 or deg > 0:
            sensor_line = (f" Additionally, {deg} sensor(s) are degrading and "
                           f"{abn} sensor(s) show abnormal behaviour.")

        return f"{status_line}{sensor_line} {rec}".strip()

    def _handle_rul(self, ev, pred) -> str:
        if not pred:
            return (f"Insufficient evidence available. No RUL prediction has been computed "
                    f"for Engine {ev.get('engine_id')}.")

        rul   = ev.get("rul_predicted", "—")
        cycle = ev.get("prediction_cycle", "—")
        return (f"Engine {ev['engine_id']} has a predicted Remaining Useful Life of "
                f"{rul:.1f} cycles, computed at observation cycle {cycle}. "
                f"This prediction was produced by the LSTM model trained on NASA C-MAPSS FD001 data. "
                f"Note: RUL values above 125 cycles are clipped — the model's maximum meaningful output is 125.")

    def _handle_sensors(self, ev, pred, sensors) -> str:
        if not pred or not sensors:
            return (f"Insufficient evidence available for Engine {ev.get('engine_id')}. "
                    f"No sensor analysis has been computed yet.")

        abn_list = [s.sensor_name for s in sensors if s.state == "ABNORMAL"]
        deg_list = [s.sensor_name for s in sensors if s.state == "DEGRADING"]
        normal   = sum(1 for s in sensors if s.state == "NORMAL")
        unknown  = sum(1 for s in sensors if s.state == "UNKNOWN")

        lines = [f"Sensor health analysis for Engine {ev['engine_id']} "
                 f"(based on the last 5 observation cycles):"]
        lines.append(f"  • {normal} sensor(s) NORMAL")

        if deg_list:
            lines.append(f"  • {len(deg_list)} sensor(s) DEGRADING: {', '.join(deg_list)}")
            lines.append("    Degrading sensors show persistent anomalous behaviour aligned "
                         "with the historical degradation direction for that sensor.")
        if abn_list:
            lines.append(f"  • {len(abn_list)} sensor(s) ABNORMAL: {', '.join(abn_list)}")
            lines.append("    Abnormal sensors are persistently outside the healthy baseline "
                         "but their trend direction does not clearly follow historical degradation.")
        if unknown > 0:
            lines.append(f"  • {unknown} sensor(s) UNKNOWN classification (insufficient trend data)")

        if not abn_list and not deg_list:
            lines.append("No sensors require immediate attention.")

        return "\n".join(lines)

    def _handle_margin(self, ev, readiness) -> str:
        if readiness is None:
            return (f"Insufficient evidence available for Engine {ev.get('engine_id')}. "
                    f"Run a mission readiness evaluation first by visiting the Asset Dashboard.")

        margin = ev.get("margin_of_safety")
        flag   = ev.get("risk_flag", "UNKNOWN")
        dur    = ev.get("mission_duration", 30)

        if margin is None:
            return "Margin of safety data is not available."

        if margin > 0:
            return (f"Engine {ev['engine_id']} has a positive safety margin of +{margin:.1f} cycles "
                    f"against the {dur}-cycle mission duration. "
                    f"Risk classification: {flag}. "
                    f"A margin above 20 cycles is considered SAFE; 0–20 cycles is MARGINAL.")
        else:
            return (f"Engine {ev['engine_id']} has a NEGATIVE safety margin of {margin:.1f} cycles. "
                    f"The engine is predicted to fail {abs(margin):.1f} cycles before the "
                    f"{dur}-cycle mission is complete. Risk classification: CRITICAL — do not dispatch.")

    def _handle_maintenance(self, ev, pred, readiness, sensors) -> str:
        if not pred:
            return (f"Insufficient evidence available for Engine {ev.get('engine_id')}. "
                    f"No analysis has been computed yet.")

        priority = ev.get("maintenance_priority", "UNKNOWN")
        rec      = ev.get("recommendation", "No specific recommendation available.")
        abn      = [s.sensor_name for s in sensors if s.state in ("ABNORMAL", "DEGRADING")]

        lines = [f"Maintenance assessment for Engine {ev['engine_id']}:"]
        lines.append(f"  Priority: {priority}")
        if abn:
            lines.append(f"  Sensors requiring inspection: {', '.join(abn)}")
        lines.append(f"  Backend recommendation: {rec}")

        if priority == "HIGH":
            lines.append("Action: Prioritise inspection before next dispatch. "
                         "Do not assign to mission without maintenance review.")
        elif priority == "MEDIUM":
            lines.append("Action: Schedule inspection at next available maintenance window. "
                         "Mission assignment requires maintenance chief sign-off.")
        else:
            lines.append("No immediate maintenance action required based on current evidence.")

        return "\n".join(lines)

    def _handle_general(self, ev, pred, readiness, sensors) -> str:
        """Full structured summary — used as default when no keyword matches."""
        if not pred:
            return (f"Insufficient evidence available for Engine {ev.get('engine_id')}. "
                    f"Please upload sensor data and allow the ML pipeline to complete.")

        rul    = ev.get("rul_predicted", "—")
        flag   = ev.get("risk_flag", "UNKNOWN")
        margin = ev.get("margin_of_safety")
        abn    = ev.get("abnormal_count", 0)
        deg    = ev.get("degrading_count", 0)
        norm   = ev.get("normal_count", 0)
        rec    = ev.get("recommendation", "")

        lines = [f"Summary for Engine {ev['engine_id']}:"]
        lines.append(f"  Predicted RUL: {rul:.1f} cycles (at cycle {ev.get('prediction_cycle', '—')})")
        if margin is not None:
            lines.append(f"  Mission margin: {'+' if margin >= 0 else ''}{margin:.1f} cycles → {flag}")
        lines.append(f"  Sensor health: {norm} normal, {deg} degrading, {abn} abnormal")
        if rec:
            lines.append(f"  Recommendation: {rec}")

        return "\n".join(lines)

    def _handle_fleet_question(self, question: str) -> dict:
        """
        Answers fleet-level questions (no specific engine required).
        Returns the full response dict directly.
        """
        engines = self.engine_repo.get_all_engines()
        if not engines:
            return {
                "answer": "No fleet data is currently loaded. Upload a sensor CSV to begin analysis.",
                "evidence": {"fleet_size": 0},
                "engine_id": None,
            }

        total   = len(engines)
        safe    = marginal = critical = high = 0
        critical_ids = []
        high_ids = []

        for eng in engines:
            r = self.analysis_repo.get_latest_readiness(eng.unit_number)
            if not r:
                continue
            flag = r.risk_flag
            if flag == "SAFE":    safe    += 1
            elif flag == "MARGINAL": marginal += 1
            elif flag == "CRITICAL":
                critical += 1
                critical_ids.append(eng.unit_number)
            pred = self.analysis_repo.get_latest_prediction(eng.unit_number)
            if pred:
                # Reconstruct priority from sensors
                sensors = self.analysis_repo.get_sensor_analysis_for_prediction(pred.id)
                abn = sum(1 for s in sensors if s.state == "ABNORMAL")
                deg = sum(1 for s in sensors if s.state == "DEGRADING")
                if abn > 0 or deg > 0 or (r.margin_of_safety < 0):
                    high += 1
                    high_ids.append(eng.unit_number)

        evidence = {
            "fleet_size": total,
            "safe_count": safe,
            "marginal_count": marginal,
            "critical_count": critical,
            "high_priority_count": high,
            "critical_engine_ids": critical_ids[:10],
            "high_priority_engine_ids": high_ids[:10],
        }

        words = _q(question)
        if "critical" in words or ("high" in words and "priority" in words):
            if critical == 0 and high == 0:
                answer = f"No engines are currently in CRITICAL or HIGH priority status across the {total}-engine fleet."
            else:
                parts = []
                if critical > 0:
                    parts.append(f"{critical} engine(s) are CRITICAL (will fail before mission completes): "
                                 f"Units {', '.join(str(i) for i in critical_ids[:10])}")
                if high > 0:
                    parts.append(f"{high} engine(s) are HIGH priority (degrading sensors or low margin): "
                                 f"Units {', '.join(str(i) for i in high_ids[:10])}")
                answer = "Fleet alert — " + "; ".join(parts) + "."
        else:
            answer = (f"Fleet summary ({total} engines): "
                      f"{safe} SAFE, {marginal} MARGINAL, {critical} CRITICAL. "
                      f"{high} engine(s) flagged HIGH maintenance priority.")

        return {"answer": answer, "evidence": evidence, "engine_id": None}

    # -----------------------------------------------------------------------
    # Evidence builder
    # -----------------------------------------------------------------------

    def _build_evidence(self, engine_id, pred, readiness, sensors) -> dict:
        ev = {"engine_id": engine_id}

        if pred:
            ev["rul_predicted"]     = float(pred.rul_predicted)
            ev["rul_clipped"]       = float(pred.rul_clipped)
            ev["prediction_cycle"]  = int(pred.prediction_cycle)

        if readiness:
            ev["risk_flag"]          = readiness.risk_flag
            ev["readiness_score"]    = float(readiness.readiness_score)
            ev["mission_duration"]   = float(readiness.mission_duration)
            ev["margin_of_safety"]   = float(readiness.margin_of_safety)
            ev["recommendation"]     = readiness.recommendation
            ev["maintenance_priority"] = self._derive_priority(readiness, sensors)

        if sensors:
            abn = [s.sensor_name for s in sensors if s.state == "ABNORMAL"]
            deg = [s.sensor_name for s in sensors if s.state == "DEGRADING"]
            ev["abnormal_sensors"]  = abn
            ev["degrading_sensors"] = deg
            ev["normal_count"]      = sum(1 for s in sensors if s.state == "NORMAL")
            ev["degrading_count"]   = len(deg)
            ev["abnormal_count"]    = len(abn)
            ev["unknown_count"]     = sum(1 for s in sensors if s.state == "UNKNOWN")

        return ev

    @staticmethod
    def _derive_priority(readiness, sensors) -> str:
        """Mirrors the logic in MissionController.evaluate_readiness."""
        abn = sum(1 for s in sensors if s.state == "ABNORMAL") if sensors else 0
        deg = sum(1 for s in sensors if s.state == "DEGRADING") if sensors else 0
        margin = readiness.margin_of_safety if readiness else 0
        if abn > 0 or deg > 0 or margin < 0:
            return "HIGH"
        elif margin < 15:
            return "MEDIUM"
        return "LOW"
