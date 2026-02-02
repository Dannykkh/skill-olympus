@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================
REM   Claude Code Customizations Installer
REM   Skills, Agents, Commands, Hooks 설치 스크립트
REM ============================================

echo.
echo ============================================
echo   Claude Code Customizations Installer
echo ============================================
echo.

set "SCRIPT_DIR=%~dp0"
set "CLAUDE_DIR=%USERPROFILE%\.claude"

REM Claude 폴더 확인
if not exist "%CLAUDE_DIR%" (
    echo [오류] Claude Code가 설치되어 있지 않습니다.
    echo        %CLAUDE_DIR% 폴더를 찾을 수 없습니다.
    pause
    exit /b 1
)

REM Skills 설치 (글로벌)
echo [1/4] Skills 설치 중... (글로벌)
if exist "%SCRIPT_DIR%skills" (
    for /d %%D in ("%SCRIPT_DIR%skills\*") do (
        set "skill_name=%%~nxD"
        echo       - !skill_name!
        if not exist "%CLAUDE_DIR%\skills\!skill_name!" mkdir "%CLAUDE_DIR%\skills\!skill_name!"
        xcopy /s /y /q "%%D\*" "%CLAUDE_DIR%\skills\!skill_name!\" >nul
    )
    echo       완료!
) else (
    echo       스킬 없음
)

REM Agents 설치 (글로벌)
echo.
echo [2/4] Agents 설치 중... (글로벌)
if exist "%SCRIPT_DIR%agents" (
    if not exist "%CLAUDE_DIR%\agents" mkdir "%CLAUDE_DIR%\agents"
    for %%F in ("%SCRIPT_DIR%agents\*.md") do (
        echo       - %%~nxF
        copy /y "%%F" "%CLAUDE_DIR%\agents\" >nul
    )
    echo       완료!
) else (
    echo       에이전트 없음
)

REM Commands 안내 (프로젝트별)
echo.
echo [3/4] Commands 안내... (프로젝트별 설치 필요)
if exist "%SCRIPT_DIR%commands" (
    echo       Commands는 프로젝트별로 설치해야 합니다.
    echo       프로젝트 폴더에서 다음 명령 실행:
    echo.
    echo       mkdir .claude\commands
    echo       copy "%SCRIPT_DIR%commands\*" .claude\commands\
    echo.
    echo       포함된 Commands:
    for %%F in ("%SCRIPT_DIR%commands\*.md") do (
        echo       - %%~nxF
    )
) else (
    echo       명령어 없음
)

REM Hooks 안내 (프로젝트별)
echo.
echo [4/4] Hooks 안내... (프로젝트별 설치 필요)
if exist "%SCRIPT_DIR%hooks" (
    echo       Hooks는 프로젝트별로 설치해야 합니다.
    echo.
    REM Git Bash 체크
    where bash >nul 2>nul
    if !errorlevel! equ 0 (
        echo       [OK] Git Bash 감지됨 - .sh 스크립트 사용 가능
        echo.
        echo       프로젝트 폴더에서 다음 명령 실행:
        echo       mkdir .claude\hooks
        echo       copy "%SCRIPT_DIR%hooks\*.sh" .claude\hooks\
        echo.
        echo       settings.json 훅 설정 예시:
        echo       { "command": "bash hooks/save-conversation.sh \"$PROMPT\"" }
    ) else (
        echo       [주의] Git Bash가 설치되어 있지 않습니다!
        echo.
        echo       두 가지 옵션이 있습니다:
        echo.
        echo       옵션 1) Git for Windows 설치 (권장)
        echo              https://git-scm.com/download/win
        echo              설치 후 .sh 스크립트 사용 가능
        echo.
        echo       옵션 2) PowerShell 스크립트 사용
        echo              프로젝트 폴더에서 다음 명령 실행:
        echo              mkdir .claude\hooks
        echo              copy "%SCRIPT_DIR%hooks\*.ps1" .claude\hooks\
        echo.
        echo              settings.json 훅 설정 예시:
        echo              { "command": "powershell -ExecutionPolicy Bypass -File hooks/save-conversation.ps1 \"$PROMPT\"" }
    )
    echo.
    echo       자세한 설정: hooks\README.md 참고
) else (
    echo       훅 없음
)

echo.
echo ============================================
echo   설치 완료!
echo ============================================
echo.
echo   글로벌 설치 완료:
echo   - Skills: %CLAUDE_DIR%\skills\
echo   - Agents: %CLAUDE_DIR%\agents\
echo.
echo   프로젝트별 설치 필요:
echo   - Commands: .claude\commands\
echo   - Hooks: .claude\hooks\ + settings.json
echo.
echo   Claude Code를 재시작하면 적용됩니다.
echo.

endlocal
pause
