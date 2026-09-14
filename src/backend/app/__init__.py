"""
app/__init__.py
===============
Flask application factory.
WHY factory pattern: allows creating multiple app instances (e.g. for testing)
and avoids circular imports between models and routes.
"""

import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# ── Shared extension instances (initialised without app yet) ──────────────────
# These are imported by models so they must be created here, not inside create_app()
db = SQLAlchemy()
migrate = Migrate()


def create_app(config_name: str = None) -> Flask:
    """
    Application factory.

    Args:
        config_name: 'development' | 'production' | None (reads FLASK_ENV)

    Returns:
        Configured Flask app instance.
    """
    app = Flask(__name__)

    # ── Load config ──────────────────────────────────────────────────────────
    from app.config import config_map
    env = config_name or os.environ.get('FLASK_ENV', 'development')
    app.config.from_object(config_map.get(env, config_map['default']))

    # ── Initialise extensions ─────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)

    # ── Register models so Alembic/Migrate can detect them ───────────────────
    # Import here (after db.init_app) to avoid circular imports
    with app.app_context():
        from app.models import asset          # noqa: F401
        from app.models import sensor_reading # noqa: F401
        from app.models import service_record # noqa: F401
        from app.models import mission        # noqa: F401
        from app.models import prediction     # noqa: F401
        from app.models import readiness      # noqa: F401

    # ── Register blueprints (routes) — Deep will add route logic here ─────────
    # from app.routes.assets   import assets_bp;   app.register_blueprint(assets_bp)
    # from app.routes.missions import missions_bp; app.register_blueprint(missions_bp)
    # (Uncomment above when Deep creates the route files)

    return app
