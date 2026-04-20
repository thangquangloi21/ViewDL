@echo off
cd /d "%~dp0"

wmic process where "commandline like '%%waitress-serve%%wsgi:app%%'" get processid 2>nul | findstr /r "[0-9]" >nul
if %errorlevel%==0 (
    wmic process where "commandline like '%%waitress-serve%%wsgi:app%%'" call terminate >nul 2>&1
    taskkill /FI "WINDOWTITLE eq tracuuqad-server" /F >nul 2>&1
    echo Server stopped.
) else (
    echo Server is not running.
)
timeout /t 3 >nul
