@echo off
cd /d "%~dp0"

:: Check if already running
wmic process where "commandline like '%%waitress-serve%%wsgi:app%%'" get processid 2>nul | findstr /r "[0-9]" >nul
if %errorlevel%==0 (
    echo Server is already running.
    timeout /t 3 >nul
    exit /b
)

:: Start hidden
set "APP_DIR=%~dp0"
start "tracuuqad-server" /min cmd /c "cd /d %APP_DIR% && .venv\Scripts\waitress-serve.exe --host=0.0.0.0 --port=5000 wsgi:app"
echo Server started at http://0.0.0.0:5000
timeout /t 3 >nul
    