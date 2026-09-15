from flask import Flask, jsonify
from flask_cors import CORS

from app.config.settings import Config
from app.utils.errors import register_error_handlers
from app.services.model_service import ModelService
from app.services.data_service import DataService

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Configure CORS
    CORS(app, resources={r"/api/*": {"origins": Config.FRONTEND_ORIGIN}})
    
    # Register error handlers
    register_error_handlers(app)
    
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
