"""
test_api_contracts.py
=====================
Integration tests for the Flask API endpoint response shapes.
Uses the in-memory SQLite fixture from conftest.py.
These tests verify the API contract — shape of JSON responses —
without requiring actual ML inference (models are mocked).
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from unittest.mock import patch, MagicMock


class TestHealthEndpoint:
    def test_health_returns_ok(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "ok"
        assert "service" in data

    def test_health_service_name(self, client):
        resp = client.get("/api/v1/health")
        data = resp.get_json()
        assert data["service"] == "mission-readiness-backend"


class TestSystemStatus:
    def test_system_status_shape(self, client):
        resp = client.get("/api/v1/system/status")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "api_status" in data
        assert "dataset_loaded" in data
        assert data["api_status"] == "ok"

    def test_dataset_loaded_false_when_empty(self, client):
        resp = client.get("/api/v1/system/status")
        data = resp.get_json()
        assert data["dataset_loaded"] is False


class TestEnginesEndpoint:
    def test_engines_list_is_array_when_empty(self, client):
        resp = client.get("/api/v1/engines/")
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)

    def test_engines_404_for_missing_engine(self, client):
        resp = client.get("/api/v1/engines/9999")
        assert resp.status_code == 404

    def test_engines_404_response_has_error_key(self, client):
        resp = client.get("/api/v1/engines/9999")
        data = resp.get_json()
        assert "error" in data


class TestDatasetInfo:
    def test_dataset_info_shape_when_empty(self, client):
        resp = client.get("/api/v1/data/dataset-info")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "engine_count" in data
        assert "dataset_loaded" in data
        assert data["engine_count"] == 0
        assert data["dataset_loaded"] is False


class TestMissionReadinessContract:
    """Verify 400 error response shape when request is invalid."""

    def test_missing_body_returns_400(self, client):
        resp = client.post(
            "/api/v1/mission/readiness",
            data=json.dumps({}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_missing_engine_id_returns_400(self, client):
        resp = client.post(
            "/api/v1/mission/readiness",
            data=json.dumps({"mission_duration": 30}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_missing_mission_duration_returns_400(self, client):
        resp = client.post(
            "/api/v1/mission/readiness",
            data=json.dumps({"engine_id": 1}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_nonexistent_engine_returns_404(self, client):
        resp = client.post(
            "/api/v1/mission/readiness",
            data=json.dumps({"engine_id": 9999, "mission_duration": 30}),
            content_type="application/json",
        )
        assert resp.status_code == 404


class TestCopilotContract:
    """Verify the copilot endpoint response shape."""

    def test_missing_body_returns_400(self, client):
        resp = client.post(
            "/api/v1/copilot/query",
            data=json.dumps({}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_missing_question_returns_400(self, client):
        resp = client.post(
            "/api/v1/copilot/query",
            data=json.dumps({"engine_id": 1}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_nonexistent_engine_returns_404(self, client):
        resp = client.post(
            "/api/v1/copilot/query",
            data=json.dumps({"engine_id": 9999, "question": "Is this engine ready?"}),
            content_type="application/json",
        )
        assert resp.status_code == 404
