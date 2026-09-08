@echo off
chcp 65001 >nul
setlocal
REM Orchestrator Global Uninstaller
REM Usage: uninstall.bat (double-click)

cd /d "%~dp0"

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    exit /b 1
)

echo [INFO] Removing Orchestrator globally...
node install.js --global --uninstall

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Removal complete.
) else (
    echo.
    echo [ERROR] Removal failed.
)

endlocal
pause
