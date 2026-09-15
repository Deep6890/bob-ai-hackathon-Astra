import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

from app.config.settings import Config
from app.utils.errors import register_error_handlers
from app.handlers.model_handler import ModelHandler

# Shared extension instances
db = SQLAlchemy()
migrate = Migrate()

from app.utils.logger import setup_structured_logger, log

def create_app():
    app = Flask(__name__)
    
    setup_structured_logger()
    log("SERVER", "Backend started")
    app.config.from_object(Config)
    
    # In case DATABASE_URL is set in environment, use it, otherwise dummy SQLite
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize DB extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Configure CORS
    CORS(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register models so Alembic/Migrate can detect them
    with app.app_context():
        from app.models import asset          # noqa: F401
        from app.models import sensor_reading # noqa: F401
        from app.models import mission        # noqa: F401
        from app.models import prediction     # noqa: F401
        from app.models import readiness      # noqa: F401
        from app.models import sensor_analysis # noqa: F401
    
    
    # Initialize Model Handler
    model_handler = ModelHandler.get_instance()
    model_handler.load_models()
    
    # Register Blueprints
    from app.routes.system_routes import system_bp
    from app.routes.engine_routes import engine_bp
    from app.routes.mission_routes import mission_bp
    from app.routes.data_routes import data_bp
    from app.routes.copilot_routes import copilot_bp

    app.register_blueprint(system_bp, url_prefix='/api/v1')
    app.register_blueprint(engine_bp, url_prefix='/api/v1/engines')
    app.register_blueprint(mission_bp, url_prefix='/api/v1/mission')
    app.register_blueprint(data_bp, url_prefix='/api/v1/data')
    app.register_blueprint(copilot_bp, url_prefix='/api/v1/copilot')
    
    return app
