import os
import pytest
from unittest.mock import patch, MagicMock
from app.services.copilot_service import CopilotService

# Fake prediction data to use for tests
class FakePrediction:
    def __init__(self):
        self.id = 1
        self.rul_predicted = 45.2
        self.rul_clipped = 45.2
        self.prediction_cycle = 120

class FakeReadiness:
    def __init__(self):
        self.risk_flag = "MARGINAL"
        self.readiness_score = 36.16
        self.mission_duration = 30.0
        self.margin_of_safety = 15.2
        self.recommendation = "Check sensors."

class FakeSensor:
    def __init__(self, name, state):
        self.sensor_name = name
        self.state = state

class FakeEngine:
    def __init__(self):
        self.unit_number = 5


@pytest.fixture
def copilot_service():
    service = CopilotService()
    # Mock the repositories to return our fake data
    service.engine_repo.get_engine_by_id = MagicMock(return_value=FakeEngine())
    service.analysis_repo.get_latest_prediction = MagicMock(return_value=FakePrediction())
    service.analysis_repo.get_latest_readiness = MagicMock(return_value=FakeReadiness())
    service.analysis_repo.get_sensor_analysis_for_prediction = MagicMock(return_value=[
        FakeSensor("sensor_11_smooth", "DEGRADING")
    ])
    return service


def test_groq_disabled(copilot_service, monkeypatch):
    """Test that when GROQ_API_KEY is absent, the deterministic fallback is used."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    
    response = copilot_service.answer(5, "Why is Engine 5 not mission ready?")
    
    assert "Engine 5 has MARGINAL mission readiness." in response["answer"]
    assert response["engine_id"] == 5
    assert response["evidence"]["rul_predicted"] == 45.2
    assert "margin_of_safety" in response["evidence"]


@patch("app.services.copilot_service.Groq")
def test_groq_enabled(mock_groq_class, copilot_service, monkeypatch):
    """Test that when GROQ_API_KEY is present, Groq is called and used."""
    monkeypatch.setenv("GROQ_API_KEY", "fake_key")
    
    mock_client = MagicMock()
    mock_groq_class.return_value = mock_client
    
    mock_chat_completion = MagicMock()
    mock_chat_completion.choices[0].message.content = "Groq explanation: The engine is marginal."
    mock_client.chat.completions.create.return_value = mock_chat_completion

    response = copilot_service.answer(5, "Is Engine 5 ready?")
    
    assert response["answer"] == "Groq explanation: The engine is marginal."
    assert response["engine_id"] == 5
    # Evidence must remain fully intact and authoritative
    assert response["evidence"]["rul_predicted"] == 45.2
    assert response["evidence"]["risk_flag"] == "MARGINAL"
    assert response["evidence"]["degrading_sensors"] == ["sensor_11_smooth"]

    # Verify that the Groq API was called correctly
    mock_client.chat.completions.create.assert_called_once()
    call_kwargs = mock_client.chat.completions.create.call_args.kwargs
    assert call_kwargs["temperature"] == 0.0
    
    # Ensure system prompt forbids hallucinations
    system_prompt = call_kwargs["messages"][0]["content"]
    assert "Do not invent" in system_prompt
    assert "authoritative" in system_prompt


@patch("app.services.copilot_service.Groq")
def test_groq_failure_fallback(mock_groq_class, copilot_service, monkeypatch):
    """Test that if Groq throws an exception, the service falls back gracefully."""
    monkeypatch.setenv("GROQ_API_KEY", "fake_key")
    
    mock_client = MagicMock()
    mock_groq_class.return_value = mock_client
    
    # Simulate a network/API exception
    mock_client.chat.completions.create.side_effect = Exception("Groq API Timeout")

    # Should not raise an exception, but fall back to deterministic response
    response = copilot_service.answer(5, "Is it safe?")
    
    # Deterministic answer should be present
    assert "MARGINAL" in response["answer"]
    assert "Groq API Timeout" not in response["answer"]
    # Evidence is untouched
    assert response["evidence"]["rul_predicted"] == 45.2


def test_invalid_insufficient_evidence(copilot_service, monkeypatch):
    """Test that Groq immediately rejects if evidence is missing."""
    monkeypatch.setenv("GROQ_API_KEY", "fake_key")
    
    # Nullify all ML predictions to create insufficient evidence state
    copilot_service.analysis_repo.get_latest_prediction.return_value = None
    
    # Call internal groq method directly to verify its rejection logic
    empty_evidence = {"engine_id": 5}
    groq_ans = copilot_service._get_groq_explanation(empty_evidence, "RUL?")
    
    assert groq_ans == "Insufficient evidence available."
