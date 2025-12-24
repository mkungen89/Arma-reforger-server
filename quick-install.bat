@echo off
echo =====================================
echo Arma Reforger Server Manager
echo Quick Install Script
echo =====================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as Administrator"
    pause
    exit /b 1
)

echo Starting installation...
echo.

REM Run PowerShell installation script
powershell.exe -ExecutionPolicy Bypass -File "%~dp0install.ps1"

if %errorLevel% equ 0 (
    echo.
    echo =====================================
    echo Installation complete!
    echo =====================================
    echo.
    echo To start the Web UI, run: npm start
    echo Then open your browser to: http://localhost:3001
    echo.
) else (
    echo.
    echo Installation failed! Check the errors above.
    echo.
)

pause
