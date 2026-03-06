@echo off
REM Orchestrator Global Installer
REM Usage: install.bat (double-click)

cd /d "%~dp0"

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    echo Please install it from https://nodejs.org
    exit /b 1
)

echo [INFO] Installing Orchestrator globally...
node install.js --global

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Installation complete.
    echo You can now use 'workpm' or 'pmworker' in any project.
) else (
    echo.
    echo [ERROR] An error occurred during installation.
)

pause
