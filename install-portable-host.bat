@echo off
setlocal

if not defined OLYMPUS_PORTABLE_RUNTIME (
    echo [ERROR] OLYMPUS_PORTABLE_RUNTIME is not set.
    exit /b 2
)

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is required but was not found in PATH.
    exit /b 1
)

echo.
echo ============================================
echo   Olympus Skills-Only Installer
echo   Target: %OLYMPUS_PORTABLE_RUNTIME%
echo ============================================
echo   Installs skills and the source catalog only.
echo   Plugins, hooks, Mnemo, MCP, and agents are not installed.
echo.

node "%~dp0scripts\sync-portable-skills.js" "%OLYMPUS_PORTABLE_RUNTIME%" %*
set "INSTALL_RESULT=%ERRORLEVEL%"

if not "%INSTALL_RESULT%"=="0" (
    echo.
    echo [ERROR] %OLYMPUS_PORTABLE_RUNTIME% skill installation failed.
    exit /b %INSTALL_RESULT%
)

echo.
echo [OK] %OLYMPUS_PORTABLE_RUNTIME% skills-only operation completed.
exit /b 0
