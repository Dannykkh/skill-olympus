@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================
REM   Claude Code Customizations Installer
REM   Skills, Agents, Hooks + MCP 자동 설치
REM   사용법: install.bat [--link | --unlink]
REM ============================================

set "SCRIPT_DIR=%~dp0"
set "CLAUDE_DIR=%USERPROFILE%\.claude"
set "CODEX_MNEMO_RESULT=미실행"
set "CODEX_SYNC_RESULT=미실행"
set "CODEX_MCP_RESULT=미실행"
set "CODEX_ORCH_RESULT=미실행"
set "GEMINI_MNEMO_RESULT=미실행"

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
    echo [1/11] Skills 링크 제거 중...
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
    echo [2/11] Agents 링크 제거 중...
    fsutil reparsepoint query "%CLAUDE_DIR%\agents" >nul 2>nul
    if !errorlevel! equ 0 (
        echo       - agents [링크 제거]
        rmdir "%CLAUDE_DIR%\agents"
    ) else (
        echo       - agents [링크 아님, 건너뜀]
    )
    echo       완료!

    echo.
    echo [3/11] Hooks 링크 제거 + settings.json 정리 중...
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
    echo [4/11] CLAUDE.md 장기기억 규칙 제거 중...
    node "%SCRIPT_DIR%install-claude-md.js" "%CLAUDE_DIR%\CLAUDE.md" "%SCRIPT_DIR%skills\mnemo\templates\claude-md-rules.md" --uninstall
    echo       완료!

    echo.
    echo [5/11] MCP 서버 설정은 별도 관리됩니다.
    echo       제거: node "%SCRIPT_DIR%install-mcp.js" --uninstall ^<이름^>
    echo       완료!

    echo.
    echo [6/11] Orchestrator MCP 제거 중...
    claude mcp remove orchestrator -s user >nul 2>nul
    echo       완료!

    echo.
    echo [7/11] Codex-Mnemo 제거 중...
    if exist "%SCRIPT_DIR%skills\codex-mnemo\install.js" (
        node "%SCRIPT_DIR%skills\codex-mnemo\install.js" --uninstall
        if !errorlevel! equ 0 (
            set "CODEX_MNEMO_RESULT=제거 완료"
            echo       완료!
        ) else (
            set "CODEX_MNEMO_RESULT=제거 실패"
            echo       [경고] 제거 실패 (exit: !errorlevel!)
        )
    ) else (
        set "CODEX_MNEMO_RESULT=스킵(install.js 없음)"
        echo       [경고] install.js 없음, 건너뜀
    )

    echo.
    echo [8/11] Codex Skills/Agents 동기화 해제 중...
    if exist "%SCRIPT_DIR%scripts\sync-codex-assets.js" (
        node "%SCRIPT_DIR%scripts\sync-codex-assets.js" --unlink
        if !errorlevel! equ 0 (
            set "CODEX_SYNC_RESULT=해제 완료"
            echo       완료!
        ) else (
            set "CODEX_SYNC_RESULT=해제 실패"
            echo       [경고] 해제 실패 (exit: !errorlevel!)
        )
    ) else (
        set "CODEX_SYNC_RESULT=스킵(sync 스크립트 없음)"
        echo       [경고] sync-codex-assets.js 없음, 건너뜀
    )

    echo.
    echo [9/11] Codex MCP(무료 세트) 제거 중...
    where codex >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "%SCRIPT_DIR%install-mcp-codex.js" (
            node "%SCRIPT_DIR%install-mcp-codex.js" --uninstall context7 fetch playwright sequential-thinking
            if !errorlevel! equ 0 (
                set "CODEX_MCP_RESULT=제거 완료"
                echo       완료!
            ) else (
                set "CODEX_MCP_RESULT=제거 부분 실패"
                echo       [경고] 일부 제거 실패 (exit: !errorlevel!)
            )
        ) else (
            set "CODEX_MCP_RESULT=스킵(install-mcp-codex.js 없음)"
            echo       [경고] install-mcp-codex.js 없음, 건너뜀
        )
    ) else (
        set "CODEX_MCP_RESULT=스킵(codex CLI 없음)"
        echo       [경고] codex CLI 없음, 건너뜀
    )

    echo.
    echo [10/11] Codex Orchestrator MCP 제거 중...
    where codex >nul 2>nul
    if !errorlevel! equ 0 (
        codex mcp remove orchestrator >nul 2>nul
        if !errorlevel! equ 0 (
            set "CODEX_ORCH_RESULT=제거 완료"
            echo       완료!
        ) else (
            set "CODEX_ORCH_RESULT=스킵/실패"
            echo       [경고] 제거 실패 또는 미등록
        )
    ) else (
        set "CODEX_ORCH_RESULT=스킵(codex CLI 없음)"
        echo       [경고] codex CLI 없음, 건너뜀
    )

    echo.
    echo [11/11] Gemini-Mnemo 제거 중...
    if exist "%SCRIPT_DIR%skills\gemini-mnemo\install.js" (
        node "%SCRIPT_DIR%skills\gemini-mnemo\install.js" --uninstall
        if !errorlevel! equ 0 (
            set "GEMINI_MNEMO_RESULT=제거 완료"
            echo       완료!
        ) else (
            set "GEMINI_MNEMO_RESULT=제거 실패"
            echo       [경고] 제거 실패 (exit: !errorlevel!)
        )
    ) else (
        set "GEMINI_MNEMO_RESULT=스킵(install.js 없음)"
        echo       [경고] install.js 없음, 건너뜀
    )

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
    echo [1/12] Skills 링크 중... (글로벌, Junction)
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
    echo [2/12] Agents 링크 중... (글로벌, Junction)
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

    REM Hooks 링크 (전체 폴더)
    echo.
    echo [3/12] Hooks 링크 중... (글로벌, Junction)
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
    echo       완료!

    goto :configure_hooks
)

REM ============================================
REM   기본 모드: 복사
REM ============================================

REM Skills 설치 (글로벌)
echo [1/12] Skills 설치 중... (글로벌)
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
echo [2/12] Agents 설치 중... (글로벌)
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

REM Hooks 설치 (글로벌)
echo.
echo [3/12] Hooks 설치 중... (글로벌)
if not exist "%CLAUDE_DIR%\hooks" mkdir "%CLAUDE_DIR%\hooks"
REM 검증/포맷팅 훅 (루트 hooks/)
if exist "%SCRIPT_DIR%hooks" (
    for %%F in ("%SCRIPT_DIR%hooks\*.ps1") do (
        echo %%~nxF | findstr /i "debug" >nul && (
            echo       - %%~nxF [스킵: 디버그]
        ) || (
            echo       - %%~nxF
            copy /y "%%F" "%CLAUDE_DIR%\hooks\" >nul
        )
    )
    for %%F in ("%SCRIPT_DIR%hooks\*.sh") do (
        echo %%~nxF | findstr /i "debug" >nul && (
            echo       - %%~nxF [스킵: 디버그]
        ) || (
            echo       - %%~nxF
            copy /y "%%F" "%CLAUDE_DIR%\hooks\" >nul
        )
    )
    REM JS 훅 (orchestrator-detector 등)
    for %%F in ("%SCRIPT_DIR%hooks\*.js") do (
        echo       - %%~nxF
        copy /y "%%F" "%CLAUDE_DIR%\hooks\" >nul
    )
)
echo       완료!

:configure_hooks

REM settings.json 훅 설정 (글로벌)
echo.
echo [4/12] settings.json 훅 설정 중... (글로벌)
REM Windows에서는 항상 PowerShell 사용 (Git Bash가 있어도 Claude Code는 /bin/bash 사용)
node "%SCRIPT_DIR%install-hooks-config.js" "%CLAUDE_DIR%/hooks" "%CLAUDE_DIR%\settings.json" --windows

REM CLAUDE.md 장기기억 규칙 설치 (글로벌)
echo.
echo [5/12] CLAUDE.md 장기기억 규칙 설치 중... (글로벌)
node "%SCRIPT_DIR%install-claude-md.js" "%CLAUDE_DIR%\CLAUDE.md" "%SCRIPT_DIR%skills\mnemo\templates\claude-md-rules.md"

REM MCP 서버 자동 설치 (글로벌, 무료 MCP만)
echo.
echo [6/12] MCP 서버 설치 중... (글로벌, 무료만 자동 설치)
echo.
echo       사용 가능한 MCP 서버:
node "%SCRIPT_DIR%install-mcp.js" --list
echo.
echo       무료 MCP 자동 설치를 시작합니다...
echo.
node "%SCRIPT_DIR%install-mcp.js" --all
echo.
echo       (추가 설치/제거: node "%SCRIPT_DIR%install-mcp.js" --list)

REM Orchestrator MCP 서버 등록 (글로벌, PM-Worker 병렬 작업)
echo.
echo [7/12] Orchestrator MCP 서버 등록 중... (글로벌)
set "ORCH_DIST=%SCRIPT_DIR%mcp-servers\claude-orchestrator-mcp\dist\index.js"
if not exist "%ORCH_DIST%" (
    echo       MCP 서버 빌드 중...
    cd /d "%SCRIPT_DIR%mcp-servers\claude-orchestrator-mcp" && npm install >nul 2>nul && npm run build >nul 2>nul
    cd /d "%SCRIPT_DIR%"
)
if exist "%ORCH_DIST%" (
    claude mcp remove orchestrator -s user >nul 2>nul
    claude mcp add orchestrator --scope user -- node "%ORCH_DIST:\=/%" >nul 2>nul
    echo       Orchestrator MCP 등록 완료
) else (
    echo       [경고] MCP 서버 빌드 실패, 건너뜀
)

REM Codex-Mnemo 설치 (Codex CLI 장기기억)
echo.
echo [8/12] Codex-Mnemo 설치 중... (Codex CLI 장기기억)
if exist "%SCRIPT_DIR%skills\codex-mnemo\install.js" (
    node "%SCRIPT_DIR%skills\codex-mnemo\install.js"
    if !errorlevel! equ 0 (
        set "CODEX_MNEMO_RESULT=설치 완료"
        echo       완료!
    ) else (
        set "CODEX_MNEMO_RESULT=설치 실패"
        echo       [경고] 설치 실패 (exit: !errorlevel!)
    )
) else (
    set "CODEX_MNEMO_RESULT=스킵(install.js 없음)"
    echo       [경고] install.js 없음, 건너뜀
)

REM Codex Skills/Agents 동기화 (프로젝트 .agents + ~/.codex)
echo.
echo [9/12] Codex Skills/Agents 동기화 중... (프로젝트 + 글로벌)
if exist "%SCRIPT_DIR%scripts\sync-codex-assets.js" (
    if "%MODE%"=="link" (
        node "%SCRIPT_DIR%scripts\sync-codex-assets.js" --link
    ) else (
        node "%SCRIPT_DIR%scripts\sync-codex-assets.js"
    )
    if !errorlevel! equ 0 (
        set "CODEX_SYNC_RESULT=동기화 완료"
        echo       완료!
    ) else (
        set "CODEX_SYNC_RESULT=동기화 실패"
        echo       [경고] 동기화 실패 (exit: !errorlevel!)
    )
) else (
    set "CODEX_SYNC_RESULT=스킵(sync 스크립트 없음)"
    echo       [경고] sync-codex-assets.js 없음, 건너뜀
)

REM Codex MCP 설치 (Codex CLI 무료 MCP 일괄)
echo.
echo [10/12] Codex MCP 설치 중... (Codex CLI, 무료 세트)
where codex >nul 2>nul
if !errorlevel! equ 0 (
    if exist "%SCRIPT_DIR%install-mcp-codex.js" (
        node "%SCRIPT_DIR%install-mcp-codex.js" --all
        if !errorlevel! equ 0 (
            set "CODEX_MCP_RESULT=설치 완료"
            echo       완료!
        ) else (
            set "CODEX_MCP_RESULT=설치 실패"
            echo       [경고] 설치 실패 (exit: !errorlevel!)
        )
    ) else (
        set "CODEX_MCP_RESULT=스킵(install-mcp-codex.js 없음)"
        echo       [경고] install-mcp-codex.js 없음, 건너뜀
    )
) else (
    set "CODEX_MCP_RESULT=스킵(codex CLI 없음)"
    echo       [경고] codex CLI 없음, 건너뜀
)

REM Codex Orchestrator MCP 등록 (Codex CLI, PM-Worker 병렬 작업)
echo.
echo [11/12] Codex Orchestrator MCP 등록 중... (Codex CLI)
set "CODEX_ORCH_DIST=%SCRIPT_DIR%skills\orchestrator\mcp-server\dist\index.js"
if not exist "%CODEX_ORCH_DIST%" (
    echo       MCP 서버 빌드 중...
    cd /d "%SCRIPT_DIR%skills\orchestrator\mcp-server" && npm install >nul 2>nul && npm run build >nul 2>nul
    cd /d "%SCRIPT_DIR%"
)
where codex >nul 2>nul
if !errorlevel! equ 0 (
    if exist "%CODEX_ORCH_DIST%" (
        set "CODEX_ORCH_PROJECT_ROOT=%SCRIPT_DIR%"
        if "!CODEX_ORCH_PROJECT_ROOT:~-1!"=="\" set "CODEX_ORCH_PROJECT_ROOT=!CODEX_ORCH_PROJECT_ROOT:~0,-1!"
        set "CODEX_ORCH_PROJECT_ROOT=!CODEX_ORCH_PROJECT_ROOT:\=/!"
        set "CODEX_ORCH_DIST_NORM=%CODEX_ORCH_DIST:\=/%"
        codex mcp remove orchestrator >nul 2>nul
        codex mcp add --env ORCHESTRATOR_PROJECT_ROOT=!CODEX_ORCH_PROJECT_ROOT! --env ORCHESTRATOR_WORKER_ID=pm orchestrator -- node "!CODEX_ORCH_DIST_NORM!" >nul 2>nul
        if !errorlevel! equ 0 (
            set "CODEX_ORCH_RESULT=등록 완료"
            echo       Orchestrator MCP 등록 완료
        ) else (
            set "CODEX_ORCH_RESULT=등록 실패"
            echo       [경고] MCP 등록 실패, 건너뜀
        )
    ) else (
        set "CODEX_ORCH_RESULT=스킵(빌드 실패)"
        echo       [경고] MCP 서버 빌드 실패, 건너뜀
    )
) else (
    set "CODEX_ORCH_RESULT=스킵(codex CLI 없음)"
    echo       [경고] codex CLI 없음, 건너뜀
)

REM Gemini-Mnemo 설치 (Gemini CLI 장기기억)
echo.
echo [12/12] Gemini-Mnemo 설치 중... (Gemini CLI 장기기억)
if exist "%SCRIPT_DIR%skills\gemini-mnemo\install.js" (
    node "%SCRIPT_DIR%skills\gemini-mnemo\install.js"
    if !errorlevel! equ 0 (
        set "GEMINI_MNEMO_RESULT=설치 완료"
        echo       완료!
    ) else (
        set "GEMINI_MNEMO_RESULT=설치 실패"
        echo       [경고] 설치 실패 (exit: !errorlevel!)
    )
) else (
    set "GEMINI_MNEMO_RESULT=스킵(install.js 없음)"
    echo       [경고] install.js 없음, 건너뜀
)

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
    echo   글로벌 링크 완료 ^(Junction^):
    echo   - Skills:   %CLAUDE_DIR%\skills\ ^(개별 링크^)
    echo   - Agents:   %CLAUDE_DIR%\agents\ ^(전체 링크^)
    echo   - Hooks:    %CLAUDE_DIR%\hooks\ ^(전체 링크^)
    echo.
    echo   git pull만으로 업데이트가 자동 반영됩니다.
    echo   링크 제거: install.bat --unlink
) else (
    echo   글로벌 설치 완료:
    echo   - Skills:   %CLAUDE_DIR%\skills\
    echo   - Agents:   %CLAUDE_DIR%\agents\
    echo   - Hooks:    %CLAUDE_DIR%\hooks\
)
echo   - settings.json 훅 설정 등록 완료
echo   - CLAUDE.md 장기기억 규칙 등록 완료
echo   - Claude MCP 서버 자동 설치 완료 (변경: node install-mcp.js --list)
echo   - Claude Orchestrator MCP 등록 완료
echo   - Codex-Mnemo: !CODEX_MNEMO_RESULT!
echo   - Codex Skills/Agents 동기화: !CODEX_SYNC_RESULT!
echo   - Codex MCP(무료): !CODEX_MCP_RESULT!
echo   - Codex Orchestrator MCP: !CODEX_ORCH_RESULT!
echo   - Gemini-Mnemo: !GEMINI_MNEMO_RESULT!
echo.
echo   Claude Code / Codex CLI를 재시작하면 적용됩니다.
echo.

endlocal
pause
