@echo off
REM Orchestrator Global Installer
REM 사용법: install.bat (더블클릭)

cd /d "%~dp0"

REM Node.js 확인
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org 에서 설치해주세요.
    exit /b 1
)

echo [INFO] Orchestrator 전역 설치 중...
node install.js --global

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] 설치 완료되었습니다.
    echo 이제 어떤 프로젝트에서든 'workpm' 또는 'pmworker'를 사용할 수 있습니다.
) else (
    echo.
    echo [ERROR] 설치 중 오류가 발생했습니다.
)

pause
