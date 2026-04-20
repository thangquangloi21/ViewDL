@echo off
cd /d "%~dp0"

tasklist /FI "IMAGENAME eq tracuuqad.exe" 2>nul | find /I "tracuuqad.exe" >nul
if %errorlevel%==0 (
    echo Server is already running.
    timeout /t 3 >nul
    exit /b
)

start "" /min "%~dp0tracuuqad.exe"
echo Server started at http://0.0.0.0:5000
timeout /t 3 >nul
