@echo off
cd /d "%~dp0"

echo Stopping server...
taskkill /IM tracuuqad.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting server...
start "" /min "%~dp0tracuuqad.exe"
echo Server restarted at http://0.0.0.0:5000
timeout /t 3 >nul
