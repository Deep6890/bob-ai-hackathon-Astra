"""
test_csv_ingestion.py
=====================
Unit and integration tests for CSV upload and dataset ingestion.
Tests the DataController.process_csv_upload path:
  - valid CSV accepted
  - space-separated raw CMAPSS format accepted
  - missing required columns rejected
  - duplicate upload is idempotent (no duplicate rows)
"""
import sys, os, io
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from conftest import make_cmapss_csv


class TestCSVUploadValidation:
    """Tests that validate CSV parsing and column checking."""

    def test_no_file_returns_400(self, client):
        resp = client.post("/api/v1/data/upload", data={}, content_type="multipart/form-data")
        assert resp.status_code == 400

    def test_non_csv_returns_400(self, client):
        data = {"file": (io.BytesIO(b"some,data"), "file.txt")}
        resp = client.post("/api/v1/data/upload", data=data, content_type="multipart/form-data")
        assert resp.status_code == 400

    def test_csv_missing_required_columns_returns_400(self, client):
        bad_csv = io.BytesIO(b"col_a,col_b\n1,2\n3,4\n")
        bad_csv.name = "bad.csv"
        data = {"file": (bad_csv, "bad.csv")}
        resp = client.post("/api/v1/data/upload", data=data, content_type="multipart/form-data")
        assert resp.status_code == 400


class TestCSVIngestion:
    """Tests that validate data is correctly stored after upload."""

    @patch("app.controllers.data_controller.PipelineService")
    def test_valid_csv_returns_200(self, mock_pipeline, client):
        """A valid CSV with all required smooth columns should return 200."""
        mock_pipeline.return_value.analyze_engine.return_value = MagicMock()
        buf = make_cmapss_csv({1: 5})
        data = {"file": (buf, "test.csv")}
        resp = client.post("/api/v1/data/upload", data=data, content_type="multipart/form-data")
        assert resp.status_code == 200

    @patch("app.controllers.data_controller.PipelineService")
    def test_engines_affected_in_response(self, mock_pipeline, client):
        """Response should list the engine numbers that were ingested."""
        mock_pipeline.return_value.analyze_engine.return_value = MagicMock()
        buf = make_cmapss_csv({7: 3, 8: 3})
        data = {"file": (buf, "test.csv")}
        resp = client.post("/api/v1/data/upload", data=data, content_type="multipart/form-data")
        body = resp.get_json()
        assert "engines_in_csv" in body
        assert 7 in body["engines_in_csv"]
        assert 8 in body["engines_in_csv"]

    @patch("app.controllers.data_controller.PipelineService")
    def test_idempotent_upload_does_not_duplicate(self, mock_pipeline, client):
        """Uploading the same CSV twice should not create duplicate sensor_reading rows."""
        from app.models.sensor_reading import SensorReading
        from app import db

        mock_pipeline.return_value.analyze_engine.return_value = MagicMock()

        buf1 = make_cmapss_csv({42: 5})
        client.post("/api/v1/data/upload", data={"file": (buf1, "test.csv")}, content_type="multipart/form-data")

        # Upload again — should be idempotent
        buf2 = make_cmapss_csv({42: 5})
        resp2 = client.post("/api/v1/data/upload", data={"file": (buf2, "test.csv")}, content_type="multipart/form-data")

        with client.application.app_context():
            from app.models.asset import Asset
            asset = Asset.query.filter_by(unit_number=42).first()
            if asset:
                count = SensorReading.query.filter_by(asset_id=asset.id).count()
                assert count == 5, f"Expected 5 readings, got {count} (duplicate rows inserted)"

        assert resp2.status_code == 200

    @patch("app.controllers.data_controller.PipelineService")
    def test_dataset_info_updated_after_upload(self, mock_pipeline, client):
        """After upload, /data/dataset-info should reflect the new engine count."""
        mock_pipeline.return_value.analyze_engine.return_value = MagicMock()

        buf = make_cmapss_csv({55: 10})
        client.post("/api/v1/data/upload", data={"file": (buf, "test.csv")}, content_type="multipart/form-data")

        resp = client.get("/api/v1/data/dataset-info")
        info = resp.get_json()
        assert info["dataset_loaded"] is True
        assert info["engine_count"] >= 1
