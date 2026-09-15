"""
test_readiness_logic.py
=======================
Unit tests for the ReadinessResult static methods.
No DB, no server — pure business logic tests.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from app.models.readiness import ReadinessResult


class TestComputeRiskFlag:
    """ReadinessResult.compute_risk_flag(margin) → 'SAFE' | 'MARGINAL' | 'CRITICAL'"""

    def test_positive_large_margin_is_safe(self):
        assert ReadinessResult.compute_risk_flag(50.0) == "SAFE"

    def test_margin_at_21_is_safe(self):
        assert ReadinessResult.compute_risk_flag(21.0) == "SAFE"

    def test_margin_at_20_is_marginal(self):
        # Boundary: margin < 20 → MARGINAL, margin >= 20 → SAFE
        # compute_risk_flag: if margin < 0 CRITICAL, elif margin < 20 MARGINAL, else SAFE
        assert ReadinessResult.compute_risk_flag(20.0) == "SAFE"

    def test_margin_at_19_is_marginal(self):
        assert ReadinessResult.compute_risk_flag(19.0) == "MARGINAL"

    def test_margin_at_zero_is_marginal(self):
        # Exactly 0 is not negative → MARGINAL
        assert ReadinessResult.compute_risk_flag(0.0) == "MARGINAL"

    def test_margin_just_below_zero_is_critical(self):
        assert ReadinessResult.compute_risk_flag(-0.001) == "CRITICAL"

    def test_large_negative_margin_is_critical(self):
        assert ReadinessResult.compute_risk_flag(-100.0) == "CRITICAL"


class TestComputeReadinessScore:
    """ReadinessResult.compute_readiness_score(rul, clip=125) → 0.0..100.0"""

    def test_full_life_is_100(self):
        score = ReadinessResult.compute_readiness_score(125.0)
        assert score == 100.0

    def test_half_life_is_50(self):
        score = ReadinessResult.compute_readiness_score(62.5)
        assert abs(score - 50.0) < 0.01

    def test_zero_rul_is_zero(self):
        score = ReadinessResult.compute_readiness_score(0.0)
        assert score == 0.0

    def test_exceeds_clip_is_capped_at_100(self):
        # RUL > 125 should still return 100 (capped)
        score = ReadinessResult.compute_readiness_score(200.0)
        assert score == 100.0

    def test_custom_clip(self):
        score = ReadinessResult.compute_readiness_score(50.0, rul_clip=100)
        assert score == 50.0


class TestBuildRecommendation:
    """ReadinessResult.build_recommendation(risk_flag, margin) → str"""

    def test_critical_contains_ground_asset(self):
        rec = ReadinessResult.build_recommendation("CRITICAL", -10.0)
        assert "GROUND" in rec.upper()

    def test_critical_contains_cycle_count(self):
        rec = ReadinessResult.build_recommendation("CRITICAL", -15.0)
        assert "15" in rec

    def test_marginal_contains_caution(self):
        rec = ReadinessResult.build_recommendation("MARGINAL", 5.0)
        assert "CAUTION" in rec.upper() or "caution" in rec.lower()

    def test_safe_contains_ready(self):
        rec = ReadinessResult.build_recommendation("SAFE", 30.0)
        assert "READY" in rec.upper() or "ready" in rec.lower()

    def test_returns_string(self):
        for flag in ("SAFE", "MARGINAL", "CRITICAL"):
            rec = ReadinessResult.build_recommendation(flag, 10.0)
            assert isinstance(rec, str)
            assert len(rec) > 10
