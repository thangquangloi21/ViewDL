"""
Configuration module for the application
Loads settings from environment variables
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration"""
    DEBUG = False
    TESTING = False
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    # Database
    DB_SERVER = os.getenv('DB_SERVER')
    DB_DATABASE = os.getenv('DB_DATABASE')
    DB_USERNAME = os.getenv('DB_USERNAME')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    DB_DRIVER = os.getenv('DB_DRIVER', 'ODBC Driver 18 for SQL Server')
    DB_QUERY_LIMIT = int(os.getenv('DB_QUERY_LIMIT', 100))
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-change-in-production')
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))
    
    @property
    def DATABASE_URL(self):
        """Build database connection string"""
        if not all([self.DB_SERVER, self.DB_DATABASE, self.DB_USERNAME, self.DB_PASSWORD]):
            raise ValueError("Database configuration is incomplete")
        return (
            f'mssql+pyodbc://{self.DB_USERNAME}:{self.DB_PASSWORD}@'
            f'{self.DB_SERVER}/{self.DB_DATABASE}'
            f'?driver={self.DB_DRIVER}&TrustServerCertificate=yes'
        )


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True


def get_config():
    """Get configuration based on environment"""
    flask_env = os.getenv('FLASK_ENV', 'development').lower()
    
    if flask_env == 'production':
        return ProductionConfig()
    elif flask_env == 'testing':
        return TestingConfig()
    else:
        return DevelopmentConfig()
