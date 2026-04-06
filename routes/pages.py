"""
Page routes — renders HTML views.
"""
from flask import Blueprint, render_template, jsonify, current_app
from constants import SAMPLE_DATA

pages_bp = Blueprint("pages", __name__)


@pages_bp.route("/")
def index():
    current_app.app_logger.info("Accessed main dashboard")
    return render_template("index.html", data=SAMPLE_DATA)


@pages_bp.route("/health")
def health_check():
    db_healthy = current_app.db.check_connection()
    status_text = "healthy" if db_healthy else "unhealthy"
    db_text     = "connected" if db_healthy else "disconnected"
    http_code   = 200 if db_healthy else 503
    return jsonify({"status": status_text, "database": db_text}), http_code
