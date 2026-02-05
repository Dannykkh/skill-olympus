@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================
REM   Claude Code Customizations Installer
REM   Skills, Agents, Commands, Hooks 설치 스크립트
REM   사용법: install.bat [--link | --unlink]
REM ============================================

set "SCRIPT_DIR=%~dp0"
set "CLAUDE_DIR=%USERPROFILE%\.claude"

REM 모드 결정
set "MODE=copy"
if "%~1"=="--link" set "MODE=link"
if "%~1"=="--unlink" set "MODE=unlink"

echo.
echo ============================================
if "%MODE%"=="link" (
    echo   Claude Code Customizations Installer [LINK]
) else if "%MODE%"=="unlink" (
    echo   Claude Code Customizations Unlinker
) else (
    echo   Claude Code Customizations Installer
)
echo ============================================
echo.

REM Claude 폴더 확인
if not exist "%CLAUDE_DIR%" (
    echo [오류] Claude Code가 설치되어 있지 않습니다.
    echo        %CLAUDE_DIR% 폴더를 찾을 수 없습니다.
    pause
    exit /b 1
)

REM ============================================
REM   --unlink 모드: Junction 제거 + settings.json 정리
REM ============================================
if "%MODE%"=="unlink" (
    echo [1/5] Skills 링크 제거 중...
    if exist "%SCRIPT_DIR%skills" (
        for /d %%D in ("%SCRIPT_DIR%skills\*") do (
            set "skill_name=%%~nxD"
            set "target=%CLAUDE_DIR%\skills\!skill_name!"
            REM Junction인지 확인
            fsutil reparsepoint query "!target!" >nul 2>nul
            if !errorlevel! equ 0 (
                echo       - !skill_name! [링크 제거]
                rmdir "!target!"
            ) else (
                echo       - !skill_name! [링크 아님, 건너뜀]
            )
        )
    )
    echo       완료!

    echo.
    echo [2/5] Agents 링크 제거 중...
    fsutil reparsepoint query "%CLAUDE_DIR%\agents" >nul 2>nul
    if !errorlevel! equ 0 (
        echo       - agents [링크 제거]
        rmdir "%CLAUDE_DIR%\agents"
    ) else (
        echo       - agents [링크 아님, 건너뜀]
    )
    echo       완료!

    echo.
    echo [3/5] Commands 링크 제거 중...
    fsutil reparsepoint query "%CLAUDE_DIR%\commands" >nul 2>nul
    if !errorlevel! equ 0 (
        echo       - commands [링크 제거]
        rmdir "%CLAUDE_DIR%\commands"
    ) else (
        echo       - commands [링크 아님, 건너뜀]
    )
    echo       완료!

    echo.
    echo [4/5] Hooks 링크 제거 + settings.json 정리 중...
    fsutil reparsepoint query "%CLAUDE_DIR%\hooks" >nul 2>nul
    if !errorlevel! equ 0 (
        echo       - hooks [링크 제거]
        rmdir "%CLAUDE_DIR%\hooks"
    ) else (
        echo       - hooks [링크 아님, 건너뜀]
    )
    REM settings.json에서 hooks 설정 제거
    node "%SCRIPT_DIR%install-hooks-config.js" "%CLAUDE_DIR%\hooks" "%CLAUDE_DIR%\settings.json" --uninstall
    echo       완료!

    echo.
    echo [5/5] CLAUDE.md 장기기억 규칙 제거 중...
    node "%SCRIPT_DIR%install-claude-md.js" "%CLAUDE_DIR%\CLAUDE.md" "%SCRIPT_DIR%skills\mnemo\templates\claude-md-rules.md" --uninstall
    echo       완료!

    echo.
    echo ============================================
    echo   링크 제거 완료!
    echo ============================================
    echo.
    echo   원본 파일은 그대로 유지됩니다.
    echo   복사 모드로 재설치하려면: install.bat
    echo   링크 모드로 재설치하려면: install.bat --link
    echo.
    endlocal
    pause
    exit /b 0
)

REM ============================================
REM   --link 모드: Junction 생성
REM ============================================
if "%MODE%"=="link" (
    REM Skills 링크 (개별 폴더)
    echo [1/6] Skills 링크 중... (글로벌, Junction)
    if exist "%SCRIPT_DIR%skills" (
        if not exist "%CLAUDE_DIR%\skills" mkdir "%CLAUDE_DIR%\skills"
        for /d %%D in ("%SCRIPT_DIR%skills\*") do (
            set "skill_name=%%~nxD"
            set "target=%CLAUDE_DIR%\skills\!skill_name!"
            REM 기존 항목이 있으면 제거 (Junction이든 일반 폴더든)
            if exist "!target!" (
                fsutil reparsepoint query "!target!" >nul 2>nul
                if !errorlevel! equ 0 (
                    rmdir "!target!"
                ) else (
                    rmdir /s /q "!target!"
                )
            )
            mklink /J "!target!" "%%D" >nul
            echo       - !skill_name! [linked]
        )
        echo       완료!
    ) else (
        echo       스킬 없음
    )

    REM Agents 링크 (전체 폴더) + skills/*/agents/ 복사
    echo.
    echo [2/6] Agents 링크 중... (글로벌, Junction)
    if exist "%SCRIPT_DIR%agents" (
        set "target=%CLAUDE_DIR%\agents"
        if exist "!target!" (
            fsutil reparsepoint query "!target!" >nul 2>nul
            if !errorlevel! equ 0 (
                rmdir "!target!"
            ) else (
                rmdir /s /q "!target!"
            )
        )
        mklink /J "!target!" "%SCRIPT_DIR%agents" >nul
        echo       - agents [linked]
    ) else (
        if not exist "%CLAUDE_DIR%\agents" mkdir "%CLAUDE_DIR%\agents"
    )
    REM skills/*/agents/ 폴더는 별도 복사 (링크 폴더에 추가)
    for /d %%D in ("%SCRIPT_DIR%skills\*") do (
        if exist "%%D\agents" (
            for %%F in ("%%D\agents\*.md") do (
                echo       - %%~nxF [%%~nxD, copied]
                copy /y "%%F" "%CLAUDE_DIR%\agents\" >nul
            )
        )
    )
    echo       완료!

    REM Commands 링크 (전체 폴더)
    echo.
    echo [3/6] Commands 링크 중... (글로벌, Junction)
    if exist "%SCRIPT_DIR%commands" (
        set "target=%CLAUDE_DIR%\commands"
        if exist "!target!" (
            fsutil reparsepoint query "!target!" >nul 2>nul
            if !errorlevel! equ 0 (
                rmdir "!target!"
            ) else (
                rmdir /s /q "!target!"
            )
        )
        mklink /J "!target!" "%SCRIPT_DIR%commands" >nul
        echo       - commands [linked]
        echo       완료!
    ) else (
        echo       명령어 없음
    )

    REM Hooks 링크 (전체 폴더) + Mnemo 훅 복사
    echo.
    echo [4/6] Hooks 링크 중... (글로벌, Junction)
    if exist "%SCRIPT_DIR%hooks" (
        set "target=%CLAUDE_DIR%\hooks"
        if exist "!target!" (
            fsutil reparsepoint query "!target!" >nul 2>nul
            if !errorlevel! equ 0 (
                rmdir "!target!"
            ) else (
                rmdir /s /q "!target!"
            )
        )
        mklink /J "!target!" "%SCRIPT_DIR%hooks" >nul
        echo       - hooks [linked]
    ) else (
        if not exist "%CLAUDE_DIR%\hooks" mkdir "%CLAUDE_DIR%\hooks"
    )
    REM Mnemo 훅은 별도 폴더에 있어 복사 필요
    if exist "%SCRIPT_DIR%skills\mnemo\hooks" (
        for %%F in ("%SCRIPT_DIR%skills\mnemo\hooks\*.ps1") do (
            echo       - %%~nxF [mnemo, copied]
            copy /y "%%F" "%CLAUDE_DIR%\hooks\" >nul
        )
        for %%F in ("%SCRIPT_DIR%skills\mnemo\hooks\*.sh") do (
            echo       - %%~nxF [mnemo, copied]
            copy /y "%%F" "%CLAUDE_DIR%\hooks\" >nul
        )
    )
    echo       완료!

    goto :configure_hooks
)

REM ============================================
REM   기본 모드: 복사
REM ============================================

REM Skills 설치 (글로벌)
echo [1/6] Skills 설치 중... (글로벌)
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
echo [2/6] Agents 설치 중... (글로벌)
if not exist "%CLAUDE_DIR%\agents" mkdir "%CLAUDE_DIR%\agents"
REM 루트 agents/ 폴더
if exist "%SCRIPT_DIR%agents" (
    for %%F in ("%SCRIPT_DIR%agents\*.md") do (
        echo       - %%~nxF
        copy /y "%%F" "%CLAUDE_DIR%\agents\" >nul
    )
)
REM skills/*/agents/ 폴더 (통합 스킬 내 에이전트)
for /d %%D in ("%SCRIPT_DIR%skills\*") do (
    if exist "%%D\agents" (
        for %%F in ("%%D\agents\*.md") do (
            echo       - %%~nxF [%%~nxD]
            copy /y "%%F" "%CLAUDE_DIR%\agents\" >nul
        )
    )
)
echo       완료!

REM Commands 설치 (글로벌)
echo.
echo [3/6] Commands 설치 중... (글로벌)
if exist "%SCRIPT_DIR%commands" (
    if not exist "%CLAUDE_DIR%\commands" mkdir "%CLAUDE_DIR%\commands"
    for %%F in ("%SCRIPT_DIR%commands\*.md") do (
        echo       - %%~nxF
        copy /y "%%F" "%CLAUDE_DIR%\commands\" >nul
    )
    echo       완료!
) else (
    echo       명령어 없음
)

REM Hooks 설치 (글로벌)
echo.
echo [4/6] Hooks 설치 중... (글로벌)
if not exist "%CLAUDE_DIR%\hooks" mkdir "%CLAUDE_DIR%\hooks"
REM 검증/포맷팅 훅 (루트 hooks/)
if exist "%SCRIPT_DIR%hooks" (
    for %%F in ("%SCRIPT_DIR%hooks\*.ps1") do (
        REM 프로젝트 전용 훅 제외 (orchestrator)
        echo %%~nxF | findstr /i "workpm-hook pmworker-hook orchestrator-mode debug" >nul && (
            echo       - %%~nxF [스킵: 프로젝트 전용/디버그]
        ) || (
            echo       - %%~nxF
            copy /y "%%F" "%CLAUDE_DIR%\hooks\" >nul
        )
    )
    for %%F in ("%SCRIPT_DIR%hooks\*.sh") do (
        echo %%~nxF | findstr /i "workpm-hook pmworker-hook orchestrator-mode debug" >nul && (
            echo       - %%~nxF [스킵: 프로젝트 전용/디버그]
        ) || (
            echo       - %%~nxF
            copy /y "%%F" "%CLAUDE_DIR%\hooks\" >nul
        )
    )
)
REM Mnemo 훅 (skills/mnemo/hooks/)
if exist "%SCRIPT_DIR%skills\mnemo\hooks" (
    for %%F in ("%SCRIPT_DIR%skills\mnemo\hooks\*.ps1") do (
        echo       - %%~nxF [mnemo]
        copy /y "%%F" "%CLAUDE_DIR%\hooks\" >nul
    )
    for %%F in ("%SCRIPT_DIR%skills\mnemo\hooks\*.sh") do (
        echo       - %%~nxF [mnemo]
        copy /y "%%F" "%CLAUDE_DIR%\hooks\" >nul
    )
)
echo       완료!

:configure_hooks

REM settings.json 훅 설정 (글로벌)
echo.
echo [5/6] settings.json 훅 설정 중... (글로벌)
REM Windows에서는 항상 PowerShell 사용 (Git Bash가 있어도 Claude Code는 /bin/bash 사용)
node "%SCRIPT_DIR%install-hooks-config.js" "%CLAUDE_DIR%/hooks" "%CLAUDE_DIR%\settings.json" --windows

REM CLAUDE.md 장기기억 규칙 설치 (글로벌)
echo.
echo [6/6] CLAUDE.md 장기기억 규칙 설치 중... (글로벌)
node "%SCRIPT_DIR%install-claude-md.js" "%CLAUDE_DIR%\CLAUDE.md" "%SCRIPT_DIR%skills\mnemo\templates\claude-md-rules.md"

echo.
echo ============================================
if "%MODE%"=="link" (
    echo   링크 설치 완료!
) else (
    echo   설치 완료!
)
echo ============================================
echo.
if "%MODE%"=="link" (
    echo   글로벌 링크 완료 (Junction):
    echo   - Skills:   %CLAUDE_DIR%\skills\ (개별 링크)
    echo   - Agents:   %CLAUDE_DIR%\agents\ (전체 링크)
    echo   - Commands: %CLAUDE_DIR%\commands\ (전체 링크)
    echo   - Hooks:    %CLAUDE_DIR%\hooks\ (전체 링크)
    echo.
    echo   git pull만으로 업데이트가 자동 반영됩니다.
    echo   링크 제거: install.bat --unlink
) else (
    echo   글로벌 설치 완료:
    echo   - Skills:   %CLAUDE_DIR%\skills\
    echo   - Agents:   %CLAUDE_DIR%\agents\
    echo   - Commands: %CLAUDE_DIR%\commands\
    echo   - Hooks:    %CLAUDE_DIR%\hooks\
)
echo   - settings.json 훅 설정 등록 완료
echo   - CLAUDE.md 장기기억 규칙 등록 완료
echo.
echo   Claude Code를 재시작하면 적용됩니다.
echo.

endlocal
pause
