"""
WSGI entry-point — for production deployment.

Windows (Waitress):
    waitress-serve --host=0.0.0.0 --port=5000 wsgi:app

Linux / Docker (Gunicorn):
    gunicorn --workers=4 --bind=0.0.0.0:5000 wsgi:app
"""
from app import create_app

app = create_app()
