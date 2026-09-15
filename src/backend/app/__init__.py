import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

from app.config.settings import Config
from app.utils.errors import register_error_handlers
from app.services.model_service import ModelService
from app.services.data_service import DataService

# Shared extension instances
db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # In case DATABASE_URL is set in environment, use it, otherwise dummy SQLite
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize DB extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Configure CORS
    CORS(app, resources={r"/api/*": {"origins": Config.FRONTEND_ORIGIN}})
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register models so Alembic/Migrate can detect them
    with app.app_context():
        from app.models import asset          # noqa: F401
        from app.models import sensor_reading # noqa: F401
        from app.models import service_record # noqa: F401
        from app.models import mission        # noqa: F401
        from app.models import prediction     # noqa: F401
        from app.models import readiness      # noqa: F401
    
    # Initialize Data Service
    data_service = DataService.get_instance()
    data_service.load_data()
    
    # Initialize Model Service
    model_service = ModelService.get_instance()
    model_service.load_models()
    
    # Register Blueprints
    from app.routes.system_routes import system_bp
    from app.routes.prediction_routes import prediction_bp
    from app.routes.health_routes import health_bp
    from app.routes.mission_routes import mission_bp
    
    app.register_blueprint(system_bp, url_prefix='/api/v1')
    app.register_blueprint(prediction_bp, url_prefix='/api/v1/predictions')
    app.register_blueprint(health_bp, url_prefix='/api/v1/health')
    app.register_blueprint(mission_bp, url_prefix='/api/v1/mission')
    
    return app
