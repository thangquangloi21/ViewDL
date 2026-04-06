"""
Flask Application Factory — NRI Transaction Tracking System.

Usage
-----
Development:
    python app.py

Production (Windows):
    waitress-serve --host=0.0.0.0 --port=5000 wsgi:app

Production (Linux/Docker):
    gunicorn wsgi:app
"""
from flask import Flask, jsonify, request as flask_request
from config import get_config
from database import DatabaseManager
from log import Logger


def create_app(cfg=None):
    """
    Application factory.

    Accepts an optional pre-built config object so tests and
    production runners can inject their own settings.
    """
    if cfg is None:
        cfg = get_config()

    app = Flask(__name__)
    app.config["SECRET_KEY"]  = cfg.SECRET_KEY
    app.config["APP_CONFIG"]  = cfg

    # Attach shared services to the app object so blueprints can
    # access them via current_app without circular imports.
    app.db         = DatabaseManager()
    app.app_logger = Logger(level=cfg.LOG_LEVEL)

    # Register blueprints
    from routes.pages import pages_bp
    from routes.api   import api_bp

    app.register_blueprint(pages_bp)
    app.register_blueprint(api_bp, url_prefix="/api")

    _register_error_handlers(app)

    app.app_logger.info(
        f"App created — env={cfg.__class__.__name__}, debug={cfg.DEBUG}"
    )
    return app


def _register_error_handlers(app: Flask) -> None:
    @app.errorhandler(404)
    def not_found(error):
        app.app_logger.warning(f"404: {flask_request.path}")
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        app.app_logger.error(f"500: {error}")
        return jsonify({"error": "Internal server error"}), 500


# ---------------------------------------------------------------------------
# Development entry-point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    _cfg    = get_config()
    _logger = Logger(level=_cfg.LOG_LEVEL)

    _logger.info("=" * 50)
    _logger.info("Starting development server")
    _logger.info(f"Environment : {_cfg.__class__.__name__}")
    _logger.info(f"Debug mode  : {_cfg.DEBUG}")
    _logger.info(f"Listening on: http://{_cfg.HOST}:{_cfg.PORT}")
    _logger.info("=" * 50)

    _app = create_app(_cfg)

    if _app.db.check_connection():
        _logger.info("Database connection  : OK")
    else:
        _logger.warning(
            "Database connection FAILED — app will start anyway. "
            "Check DB_SERVER / DB_USERNAME / DB_PASSWORD in your .env file."
        )

    _app.run(host=_cfg.HOST, port=_cfg.PORT, debug=_cfg.DEBUG)

