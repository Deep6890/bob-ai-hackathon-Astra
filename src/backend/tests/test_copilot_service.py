"""
test_copilot_service.py
=======================
Unit tests for CopilotService response generation.
Verifies:
- Correct keyword routing
- Evidence dict contains required fields
- Handles missing data gracefully (returns "Insufficient evidence" phrasing)
- Never invents data (all returned values come from mocked DB objects)
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from unittest.mock import MagicMock, patch
from app.services.copilot_service import CopilotService


def make_mock_prediction(rul=45.0, cycle=120, clip=45.0):
    p = MagicMock()
    p.id = 1
    p.rul_predicted = rul
    p.rul_clipped   = clip
    p.prediction_cycle = cycle
    return p


def make_mock_readiness(risk_flag="SAFE", margin=15.0, score=80.0, duration=30.0, rec="MISSION READY."):
    r = MagicMock()
    r.risk_flag          = risk_flag
    r.margin_of_safety   = margin
    r.readiness_score    = score
    r.mission_duration   = duration
    r.recommendation     = rec
    return r


def make_mock_sensors(normal=12, degrading=1, abnormal=1):
    sensors = []
    sensor_names = [f"sensor_{i}_smooth" for i in [2,3,4,7,8,9,11,12,13,14,15,17,20,21]]
    idx = 0
    for _ in range(normal):
        s = MagicMock(); s.state = "NORMAL"; s.sensor_name = sensor_names[idx % len(sensor_names)]; idx+=1; sensors.append(s)
    for _ in range(degrading):
        s = MagicMock(); s.state = "DEGRADING"; s.sensor_name = sensor_names[idx % len(sensor_names)]; idx+=1; sensors.append(s)
    for _ in range(abnormal):
        s = MagicMock(); s.state = "ABNORMAL"; s.sensor_name = sensor_names[idx % len(sensor_names)]; idx+=1; sensors.append(s)
    return sensors


class TestCopilotRouting:
    """Test that the correct handler is invoked based on question keywords."""

    @patch("app.services.copilot_service.EngineRepository")
    @patch("app.services.copilot_service.AnalysisRepository")
    def _make_service_with_data(self, mock_analysis_cls, mock_engine_cls,
                                 rul=45.0, risk="SAFE", margin=15.0, n=12, d=1, a=1):
        svc = CopilotService.__new__(CopilotService)
        svc.engine_repo    = MagicMock()
        svc.analysis_repo  = MagicMock()
        svc.sensor_repo    = MagicMock()

        svc.engine_repo.get_engine_by_id.return_value = MagicMock(unit_number=1)
        svc.analysis_repo.get_latest_prediction.return_value = make_mock_prediction(rul)
        svc.analysis_repo.get_latest_readiness.return_value  = make_mock_readiness(risk, margin)
        svc.analysis_repo.get_sensor_analysis_for_prediction.return_value = make_mock_sensors(n, d, a)
        return svc

    def test_ready_question_mentions_mission_ready_or_status(self):
        svc = self._make_service_with_data()
        result = svc.answer(1, "Is this engine ready for the mission?")
        assert "Engine 1" in result["answer"]
        assert any(w in result["answer"].upper() for w in ["READY", "MARGINAL", "CRITICAL", "SAFE"])

    def test_rul_question_mentions_cycles(self):
        svc = self._make_service_with_data(rul=45.0)
        result = svc.answer(1, "What is the predicted RUL?")
        assert "45" in result["answer"] or "45.0" in result["answer"]
        assert "cycles" in result["answer"].lower()

    def test_sensor_question_lists_sensors(self):
        svc = self._make_service_with_data(d=2, a=1)
        result = svc.answer(1, "Which sensors are degrading?")
        # Should mention degrading or abnormal sensors
        assert any(word in result["answer"].lower() for word in ["degrading", "abnormal", "sensor"])

    def test_margin_question_mentions_margin(self):
        svc = self._make_service_with_data(margin=12.3)
        result = svc.answer(1, "What is the safety margin?")
        assert "12" in result["answer"]

    def test_maintenance_question_mentions_priority(self):
        svc = self._make_service_with_data(risk="MARGINAL", margin=5.0)
        result = svc.answer(1, "What maintenance should be prioritised?")
        assert any(w in result["answer"].upper() for w in ["HIGH", "MEDIUM", "LOW", "PRIORITY"])

    def test_general_question_returns_summary(self):
        svc = self._make_service_with_data()
        result = svc.answer(1, "Tell me about this engine")
        assert "Engine 1" in result["answer"]


class TestCopilotEvidence:
    """Test that evidence dict is populated from DB values."""

    def _make_service(self, rul=80.0, risk="SAFE", margin=50.0):
        svc = CopilotService.__new__(CopilotService)
        svc.engine_repo   = MagicMock()
        svc.analysis_repo = MagicMock()
        svc.sensor_repo   = MagicMock()

        svc.engine_repo.get_engine_by_id.return_value = MagicMock(unit_number=5)
        svc.analysis_repo.get_latest_prediction.return_value = make_mock_prediction(rul)
        svc.analysis_repo.get_latest_readiness.return_value  = make_mock_readiness(risk, margin)
        svc.analysis_repo.get_sensor_analysis_for_prediction.return_value = make_mock_sensors()
        return svc

    def test_evidence_contains_engine_id(self):
        svc = self._make_service()
        result = svc.answer(5, "Is it ready?")
        assert result["evidence"]["engine_id"] == 5

    def test_evidence_contains_rul(self):
        svc = self._make_service(rul=80.0)
        result = svc.answer(5, "Is it ready?")
        assert "rul_predicted" in result["evidence"]
        assert abs(result["evidence"]["rul_predicted"] - 80.0) < 0.01

    def test_evidence_contains_risk_flag(self):
        svc = self._make_service(risk="MARGINAL", margin=5.0)
        result = svc.answer(5, "What is the readiness?")
        assert result["evidence"].get("risk_flag") == "MARGINAL"

    def test_evidence_contains_sensor_counts(self):
        svc = self._make_service()
        result = svc.answer(5, "Sensor health?")
        assert "normal_count" in result["evidence"]
        assert "abnormal_count" in result["evidence"]
        assert "degrading_count" in result["evidence"]


class TestCopilotMissingData:
    """Test graceful handling when no prediction exists."""

    def _make_service_no_data(self):
        svc = CopilotService.__new__(CopilotService)
        svc.engine_repo   = MagicMock()
        svc.analysis_repo = MagicMock()
        svc.sensor_repo   = MagicMock()

        svc.engine_repo.get_engine_by_id.return_value = MagicMock(unit_number=99)
        svc.analysis_repo.get_latest_prediction.return_value = None
        svc.analysis_repo.get_latest_readiness.return_value  = None
        svc.analysis_repo.get_sensor_analysis_for_prediction.return_value = []
        return svc

    def test_no_prediction_returns_insufficient_evidence(self):
        svc = self._make_service_no_data()
        result = svc.answer(99, "Is this engine ready?")
        answer_lower = result["answer"].lower()
        assert "insufficient" in answer_lower or "no prediction" in answer_lower or "not found" in answer_lower

    def test_no_data_returns_string_answer(self):
        svc = self._make_service_no_data()
        result = svc.answer(99, "What is the RUL?")
        assert isinstance(result["answer"], str)
        assert len(result["answer"]) > 10
