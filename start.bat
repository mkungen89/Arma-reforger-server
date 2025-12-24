@echo off
echo =====================================
echo Arma Reforger Server Manager
echo Starting Web UI...
echo =====================================
echo.

REM Start the backend server
start "Arma Reforger Server Manager" cmd /k "npm start"

echo.
echo Web UI is starting...
echo.
echo Please wait a few seconds, then open your browser to:
echo http://localhost:3001
echo.
echo To stop the server, close the server window.
echo.

timeout /t 5

REM Try to open browser automatically
start http://localhost:3001

pause
