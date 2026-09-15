"""
app/config.py
=============
Configuration classes for different environments.
Credentials are loaded from .env via python-dotenv — NEVER hardcoded.
"""

import os
from dotenv import load_dotenv

# Load .env file from src/backend/ directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))


class Config:
    """Base configuration shared by all environments."""

    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-change-in-prod')

    # SQLAlchemy — reads DATABASE_URL from .env
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/mission_readiness_db'
    )
    # Disable modification tracking — saves memory, not needed with SQLAlchemy 2.x
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Echo SQL queries to console in development (set False in prod)
    SQLALCHEMY_ECHO = os.environ.get('FLASK_ENV') == 'development'


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_ECHO = False


# Map string names to config classes — used in app/__init__.py
config_map = {
    'development': DevelopmentConfig,
    'production':  ProductionConfig,
    'default':     DevelopmentConfig,
}
