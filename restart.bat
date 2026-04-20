@echo off
cd /d "%~dp0"

echo Stopping server...
wmic process where "commandline like '%%waitress-serve%%wsgi:app%%'" call terminate >nul 2>&1
taskkill /FI "WINDOWTITLE eq tracuuqad-server" /F >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting server...
set "APP_DIR=%~dp0"
start "tracuuqad-server" /min cmd /c "cd /d %APP_DIR% && .venv\Scripts\waitress-serve.exe --host=0.0.0.0 --port=5000 wsgi:app"
echo Server restarted at http://0.0.0.0:5000
timeout /t 3 >nul
