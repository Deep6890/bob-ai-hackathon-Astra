"""
conftest.py
===========
Pytest fixtures for the AeroReady test suite.
All fixtures use an in-memory SQLite database — no live server required.
"""
import io
import pytest
import pandas as pd

# Add the backend root to the path so `app` is importable
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db as _db


@pytest.fixture(scope="session")
def app():
    """Flask application configured for in-memory SQLite testing."""
    application = create_app()
    application.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        # Disable model loading for most tests (speeds up test suite significantly)
        # Individual tests that need the ML pipeline should mock ModelHandler
    })
    yield application


@pytest.fixture(scope="session")
def tables(app):
    """Create all tables once for the session."""
    with app.app_context():
        _db.create_all()
    yield
    with app.app_context():
        _db.drop_all()


@pytest.fixture()
def client(app, tables):
    """Flask test client with a clean database for each test."""
    with app.app_context():
        # Clean all tables before each test
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()
    return app.test_client()


@pytest.fixture()
def db(app, tables):
    """SQLAlchemy db session for direct inspection in tests."""
    with app.app_context():
        yield _db


def make_cmapss_csv(engines=None):
    """
    Returns a BytesIO CSV file with sensor data for the given engines dict.
    engines: dict of {unit_number: num_cycles} — defaults to {1: 35, 2: 10}
    """
    if engines is None:
        engines = {1: 35, 2: 10}

    rows = []
    sensor_cols = [2, 3, 4, 7, 8, 9, 11, 12, 13, 14, 15, 17, 20, 21]
    for unit, cycles in engines.items():
        for c in range(1, cycles + 1):
            row = {"unit_number": unit, "time_cycles": c}
            for s in sensor_cols:
                row[f"sensor_{s}_smooth"] = float(c) * 0.1 + s * 0.01
            rows.append(row)

    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    buf.name = "test_fleet.csv"
    return buf
