"""
engine_repository.py
====================
Database interactions for Asset (Engine) records.
"""
from app.models.asset import Asset
from app import db
import pandas as pd

class EngineRepository:
    def get_all_engines(self):
        """Returns all engines in the database."""
        return Asset.query.all()

    def get_engine_by_id(self, engine_id: int):
        """Returns a specific engine by ID."""
        return Asset.query.filter_by(unit_number=engine_id).first()

    def get_engine_by_id_or_404(self, engine_id: int):
        """Returns a specific engine or raises 404."""
        engine = self.get_engine_by_id(engine_id)
        if not engine:
            from app.utils.errors import APIError
            raise APIError(f"Engine {engine_id} not found.", status_code=404)
        return engine
