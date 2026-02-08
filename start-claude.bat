@echo off
chcp 65001 >nul
setlocal

REM ============================================
REM   Claude Code 부트스트랩 런처
REM   git pull → 설정 업데이트 → claude 실행
REM ============================================

set "CLAUDE_DIR=%USERPROFILE%\.claude"
set "REPO_DIR=%CLAUDE_DIR%\claude-code-agent-customizations"
set "REPO_URL=https://github.com/Dannykkh/claude-code-agent-customizations.git"

REM === 초기 설치 (레포 없을 때) ===
if not exist "%REPO_DIR%\.git" (
    echo [초기 설치] 커스터마이제이션 클론 중...
    git clone "%REPO_URL%" "%REPO_DIR%"
    if errorlevel 1 (
        echo [경고] 클론 실패, 기본 상태로 Claude 실행
        goto :start_claude
    )
    echo.
    echo [초기 설치] 전체 설치 진행 중...
    cmd /c "%REPO_DIR%\install.bat --link" < nul
    goto :start_claude
)

REM === 업데이트 (레포 있을 때) ===
cd /d "%REPO_DIR%"

REM git pull (최신 가져오기)
for /f "tokens=*" %%i in ('git pull origin master --ff-only 2^>^&1') do set "PULL_RESULT=%%i"
echo %PULL_RESULT% | findstr /i "Already up to date" >nul
if %errorlevel% equ 0 (
    REM 변경 없음 - 빠르게 claude 실행
    goto :start_claude
)

REM 변경 있음 - settings.json + CLAUDE.md 업데이트
echo [업데이트] 최신 버전 적용 중...

REM Junction이므로 skills/agents/commands/hooks 파일은 자동 갱신
REM settings.json 훅 설정만 재등록
node "%REPO_DIR%\install-hooks-config.js" "%CLAUDE_DIR%/hooks" "%CLAUDE_DIR%\settings.json" --windows >nul 2>&1

REM CLAUDE.md 규칙 업데이트
node "%REPO_DIR%\install-claude-md.js" "%CLAUDE_DIR%\CLAUDE.md" "%REPO_DIR%\skills\mnemo\templates\claude-md-rules.md" >nul 2>&1

echo [업데이트] 완료

:start_claude
REM Claude 실행 (모든 인수 전달)
endlocal
claude %*
