@echo off
REM Orchestrator Global Uninstaller
REM 사용법: uninstall.bat (더블클릭)

cd /d "%~dp0"

REM Node.js 확인
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js가 설치되어 있지 않습니다.
    exit /b 1
)

echo [INFO] Orchestrator 전역 제거 중...
node install.js --global --uninstall

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] 제거 완료되었습니다.
) else (
    echo.
    echo [ERROR] 제거 중 오류가 발생했습니다.
)

pause
