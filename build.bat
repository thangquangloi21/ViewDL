@echo off
cd /d "%~dp0"

echo ============================================
echo   Building tracuuqad.exe ...
echo ============================================

:: Build exe
.venv\Scripts\pyinstaller.exe --noconfirm --onedir --noconsole --name tracuuqad --add-data templates;templates --add-data static;static --collect-all waitress --collect-all pyodbc --hidden-import pyodbc --hidden-import sqlalchemy.sql.default_comparator run_server.py

if %errorlevel% neq 0 (
    echo BUILD FAILED!
    pause
    exit /b 1
)

:: Copy .env
copy .env dist\tracuuqad\.env /Y >nul

:: Copy bat files
copy deploy\start.bat dist\tracuuqad\start.bat /Y >nul
copy deploy\stop.bat dist\tracuuqad\stop.bat /Y >nul
copy deploy\restart.bat dist\tracuuqad\restart.bat /Y >nul

echo.
echo ============================================
echo   Build OK! Output: dist\tracuuqad\
echo ============================================
pause
