@echo off
cd /d "%~dp0"

tasklist /FI "IMAGENAME eq tracuuqad.exe" 2>nul | find /I "tracuuqad.exe" >nul
if %errorlevel%==0 (
    taskkill /IM tracuuqad.exe /F >nul 2>&1
    echo Server stopped.
) else (
    echo Server is not running.
)
timeout /t 3 >nul
