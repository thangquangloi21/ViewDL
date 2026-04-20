"""
Standalone entry-point for PyInstaller exe.
Starts the Flask app with Waitress.
"""
import sys
import os

# When running as a frozen exe, set the base path to the exe directory
# so that .env, templates/, static/ are found correctly.
if getattr(sys, 'frozen', False):
    os.chdir(os.path.dirname(sys.executable))

from waitress import serve
from app import create_app

if __name__ == '__main__':
    app = create_app()
    host = app.config["APP_CONFIG"].HOST
    port = app.config["APP_CONFIG"].PORT
    print(f"Server running at http://{host}:{port}")
    serve(app, host=host, port=port)
