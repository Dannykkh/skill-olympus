@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================
REM   Claude Code Customizations Installer
REM   Skills, Agents, Hooks + MCP 자동 설치
REM   사용법: install.bat [--link | --unlink] [--all] [--llm ...] [--only ...] [--skip ...]
REM ============================================

set "SCRIPT_DIR=%~dp0"
set "CLAUDE_DIR=%USERPROFILE%\.claude"
set "CODEX_MNEMO_RESULT=미실행"
set "CODEX_SYNC_RESULT=미실행"
set "CODEX_MCP_RESULT=미실행"
set "CODEX_MULTI_AGENT_RESULT=미실행"
set "CODEX_ORCH_RESULT=미실행"
set "GEMINI_MNEMO_RESULT=미실행"
set "GEMINI_SYNC_RESULT=미실행"
set "GEMINI_MCP_RESULT=미실행"
set "GEMINI_ORCH_RESULT=미실행"
set "GEMINI_HOOKS_RESULT=미실행"

REM 모드 결정 (인자 전체 스캔)
set "MODE=copy"
for %%A in (%*) do (
    if /i "%%A"=="--link" set "MODE=link"
    if /i "%%A"=="--unlink" set "MODE=unlink"
)

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
    echo [1/15] Skills 링크 제거 중...
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
    echo [2/15] Agents 링크 제거 중...
    fsutil reparsepoint query "%CLAUDE_DIR%\agents" >nul 2>nul
    if !errorlevel! equ 0 (
        echo       - agents [링크 제거]
        rmdir "%CLAUDE_DIR%\agents"
    ) else (
        echo       - agents [링크 아님, 건너뜀]
    )
    echo       완료!

    echo.
    echo [3/15] Hooks 링크 제거 + settings.json 정리 중...
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
    echo [4/15] CLAUDE.md 장기기억 규칙 제거 중...
    node "%SCRIPT_DIR%install-claude-md.js" "%CLAUDE_DIR%\CLAUDE.md" "%SCRIPT_DIR%skills\mnemo\templates\claude-md-rules.md" --uninstall
    echo       완료!

    echo.
    echo [5/15] MCP 서버 설정은 별도 관리됩니다.
    echo       제거: node "%SCRIPT_DIR%install-mcp.js" --uninstall ^<이름^>
    echo       완료!

    echo.
    echo [6/15] Orchestrator MCP 제거 중...
    set "SAVE_CLAUDECODE=!CLAUDECODE!"
    set "CLAUDECODE="
    claude mcp remove orchestrator -s user >nul 2>nul
    set "CLAUDECODE=!SAVE_CLAUDECODE!"
    echo       완료!

    echo.
    echo [7/15] Codex-Mnemo 제거 중...
    if exist "%SCRIPT_DIR%skills\codex-mnemo\install.js" (
        node "%SCRIPT_DIR%skills\codex-mnemo\install.js" --uninstall
        if !errorlevel! equ 0 (
            set "CODEX_MNEMO_RESULT=제거 완료"
            echo       완료!
        ) else (
            set "CODEX_MNEMO_RESULT=제거 실패"
            echo       [경고] 제거 실패 exit: !errorlevel!
        )
    ) else (
        set "CODEX_MNEMO_RESULT=스킵: install.js 없음"
        echo       [경고] install.js 없음, 건너뜀
    )

    echo.
    echo [8/15] Codex Skills/Agents 동기화 해제 중...
    if exist "%SCRIPT_DIR%scripts\sync-codex-assets.js" (
        node "%SCRIPT_DIR%scripts\sync-codex-assets.js" --unlink
        if !errorlevel! equ 0 (
            set "CODEX_SYNC_RESULT=해제 완료"
            echo       완료!
        ) else (
            set "CODEX_SYNC_RESULT=해제 실패"
            echo       [경고] 해제 실패 exit: !errorlevel!
        )
    ) else (
        set "CODEX_SYNC_RESULT=스킵: sync 스크립트 없음"
        echo       [경고] sync-codex-assets.js 없음, 건너뜀
    )

    echo.
    echo [9/15] Codex MCP 무료 세트 제거 중...
    where codex >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "%SCRIPT_DIR%install-mcp-codex.js" (
            node "%SCRIPT_DIR%install-mcp-codex.js" --uninstall context7 fetch playwright sequential-thinking
            if !errorlevel! equ 0 (
                set "CODEX_MCP_RESULT=제거 완료"
                echo       완료!
            ) else (
                set "CODEX_MCP_RESULT=제거 부분 실패"
                echo       [경고] 일부 제거 실패 exit: !errorlevel!
            )
        ) else (
            set "CODEX_MCP_RESULT=스킵: install-mcp-codex.js 없음"
            echo       [경고] install-mcp-codex.js 없음, 건너뜀
        )
    ) else (
        set "CODEX_MCP_RESULT=스킵: codex CLI 없음"
        echo       [경고] codex CLI 없음, 건너뜀
    )

    echo.
    echo [10/15] Codex Orchestrator MCP 제거 중...
    where codex >nul 2>nul
    if !errorlevel! equ 0 (
        call codex mcp remove orchestrator >nul 2>nul
        if !errorlevel! equ 0 (
            set "CODEX_ORCH_RESULT=제거 완료"
            echo       완료!
        ) else (
            set "CODEX_ORCH_RESULT=스킵/실패"
            echo       [경고] 제거 실패 또는 미등록
        )
    ) else (
        set "CODEX_ORCH_RESULT=스킵: codex CLI 없음"
        echo       [경고] codex CLI 없음, 건너뜀
    )

    echo.
    echo [11/15] Gemini-Mnemo 제거 중...
    if exist "%SCRIPT_DIR%skills\gemini-mnemo\install.js" (
        node "%SCRIPT_DIR%skills\gemini-mnemo\install.js" --uninstall
        if !errorlevel! equ 0 (
            set "GEMINI_MNEMO_RESULT=제거 완료"
            echo       완료!
        ) else (
            set "GEMINI_MNEMO_RESULT=제거 실패"
            echo       [경고] 제거 실패 exit: !errorlevel!
        )
    ) else (
        set "GEMINI_MNEMO_RESULT=스킵: install.js 없음"
        echo       [경고] install.js 없음, 건너뜀
    )

    echo.
    echo [12/15] Gemini Skills/Agents/Hooks 동기화 해제 중...
    if exist "%SCRIPT_DIR%scripts\sync-gemini-assets.js" (
        node "%SCRIPT_DIR%scripts\sync-gemini-assets.js" --unlink
        if !errorlevel! equ 0 (
            echo       완료!
        ) else (
            echo       [경고] 해제 실패
        )
    ) else (
        echo       [경고] sync-gemini-assets.js 없음, 건너뜀
    )

    echo.
    echo [13/15] Gemini settings.json 훅 제거 중...
    set "GEMINI_DIR=%USERPROFILE%\.gemini"
    if exist "!GEMINI_DIR!\settings.json" (
        node "%SCRIPT_DIR%install-hooks-config.js" "!GEMINI_DIR!\hooks" "!GEMINI_DIR!\settings.json" --uninstall
        echo       완료!
    ) else (
        echo       [경고] Gemini settings.json 없음, 건너뜀
    )

    echo.
    echo [14/15] Gemini MCP 제거 중...
    where gemini >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "%SCRIPT_DIR%install-mcp-gemini.js" (
            node "%SCRIPT_DIR%install-mcp-gemini.js" --uninstall context7 fetch playwright sequential-thinking
            echo       완료!
        ) else (
            echo       [경고] install-mcp-gemini.js 없음, 건너뜀
        )
    ) else (
        echo       [경고] gemini CLI 없음, 건너뜀
    )

    echo.
    echo [15/15] Gemini Orchestrator MCP 제거 중...
    where gemini >nul 2>nul
    if !errorlevel! equ 0 (
        call gemini mcp remove orchestrator >nul 2>nul
        echo       완료!
    ) else (
        echo       [경고] gemini CLI 없음, 건너뜀
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
REM   컴포넌트 선택 (install-select.js)
REM ============================================
set "LINENUM=0"
set "LLMS="
set "BUNDLES="
for /f "delims=" %%C in ('node "%SCRIPT_DIR%install-select.js" %*') do (
    set /a LINENUM+=1
    if !LINENUM!==1 set "LLMS=%%C"
    if !LINENUM!==2 set "BUNDLES=%%C"
)
if "!LLMS!"=="" (
    echo [취소] 설치를 취소했습니다.
    pause
    exit /b 0
)

REM LLM 플래그 파싱
set "HAS_CLAUDE=0"
set "HAS_CODEX=0"
set "HAS_GEMINI=0"
echo ,!LLMS!, | findstr /i ",claude," >nul && set "HAS_CLAUDE=1"
echo ,!LLMS!, | findstr /i ",codex," >nul && set "HAS_CODEX=1"
echo ,!LLMS!, | findstr /i ",gemini," >nul && set "HAS_GEMINI=1"

REM 번들 플래그 파싱
set "HAS_ALL_BUNDLES=0"
set "HAS_ZEPHERMINE=0"
set "HAS_AGENT_TEAM=0"
set "HAS_MNEMO=0"
set "HAS_ORCHESTRATOR=0"
set "HAS_MCP=0"
echo ,!BUNDLES!, | findstr /i ",zephermine," >nul && set "HAS_ZEPHERMINE=1"
echo ,!BUNDLES!, | findstr /i ",agent-team," >nul && set "HAS_AGENT_TEAM=1"
echo ,!BUNDLES!, | findstr /i ",mnemo," >nul && set "HAS_MNEMO=1"
echo ,!BUNDLES!, | findstr /i ",orchestrator," >nul && set "HAS_ORCHESTRATOR=1"
echo ,!BUNDLES!, | findstr /i ",mcp," >nul && set "HAS_MCP=1"
REM 5개 번들 모두 선택 = all
if "!HAS_ZEPHERMINE!!HAS_AGENT_TEAM!!HAS_MNEMO!!HAS_ORCHESTRATOR!!HAS_MCP!"=="11111" set "HAS_ALL_BUNDLES=1"

echo   LLM: !LLMS!
echo   번들: !BUNDLES!
echo.

REM ============================================
REM   --link 모드: Junction 생성
REM ============================================
if "%MODE%"=="link" (
    REM Skills 링크 - 번들에 따라 개별 폴더
    echo [1/7] Skills 링크 중... - 글로벌, Junction
    if exist "%SCRIPT_DIR%skills" (
        if not exist "%CLAUDE_DIR%\skills" mkdir "%CLAUDE_DIR%\skills"
        for /d %%D in ("%SCRIPT_DIR%skills\*") do (
            set "skill_name=%%~nxD"
            set "INSTALL_SKILL=0"
            if "!HAS_ALL_BUNDLES!"=="1" set "INSTALL_SKILL=1"
            if /i "!skill_name!"=="zephermine" if "!HAS_ZEPHERMINE!"=="1" set "INSTALL_SKILL=1"
            if /i "!skill_name!"=="agent-team" if "!HAS_AGENT_TEAM!"=="1" set "INSTALL_SKILL=1"
            if /i "!skill_name!"=="agent-team-codex" set "INSTALL_SKILL=0"
            if "!INSTALL_SKILL!"=="1" (
                set "target=%CLAUDE_DIR%\skills\!skill_name!"
                if exist "!target!" (
                    fsutil reparsepoint query "!target!" >nul 2>nul
                    if !errorlevel! equ 0 ( rmdir "!target!" ) else ( rmdir /s /q "!target!" )
                )
                mklink /J "!target!" "%%D" >nul
                echo       - !skill_name! [linked]
            ) else (
                echo       - !skill_name! [건너뜀]
            )
        )
    )
    echo       완료!

    REM Agents 링크 - all 번들일 때만 전체 링크
    echo.
    echo [2/7] Agents 링크 중... - 글로벌, Junction
    if "!HAS_ALL_BUNDLES!"=="1" (
        if exist "%SCRIPT_DIR%agents" (
            set "target=%CLAUDE_DIR%\agents"
            if exist "!target!" (
                fsutil reparsepoint query "!target!" >nul 2>nul
                if !errorlevel! equ 0 ( rmdir "!target!" ) else ( rmdir /s /q "!target!" )
            )
            mklink /J "!target!" "%SCRIPT_DIR%agents" >nul
            echo       - agents [linked]
        ) else (
            if not exist "%CLAUDE_DIR%\agents" mkdir "%CLAUDE_DIR%\agents"
        )
        for /d %%D in ("%SCRIPT_DIR%skills\*") do (
            if exist "%%D\agents" (
                for %%F in ("%%D\agents\*.md") do (
                    echo       - %%~nxF [%%~nxD, copied]
                    copy /y "%%F" "%CLAUDE_DIR%\agents\" >nul
                )
            )
        )
    ) else (
        echo       [건너뜀] 개별 번들 모드 - 에이전트 미설치
    )
    echo       완료!

    REM Hooks 링크 - 훅 번들이 있으면 전체 링크 (settings.json이 활성 훅 필터링)
    echo.
    echo [3/7] Hooks 링크 중... - 글로벌, Junction
    set "NEED_HOOKS=0"
    if "!HAS_MNEMO!"=="1" set "NEED_HOOKS=1"
    if "!HAS_ORCHESTRATOR!"=="1" set "NEED_HOOKS=1"
    if "!HAS_ALL_BUNDLES!"=="1" set "NEED_HOOKS=1"
    if "!NEED_HOOKS!"=="1" (
        if exist "%SCRIPT_DIR%hooks" (
            set "target=%CLAUDE_DIR%\hooks"
            if exist "!target!" (
                fsutil reparsepoint query "!target!" >nul 2>nul
                if !errorlevel! equ 0 ( rmdir "!target!" ) else ( rmdir /s /q "!target!" )
            )
            mklink /J "!target!" "%SCRIPT_DIR%hooks" >nul
            echo       - hooks [linked]
        )
    ) else (
        echo       [건너뜀] 훅 번들 미선택
    )
    echo       완료!

    goto :configure_hooks
)

REM ============================================
REM   기본 모드: 복사 (번들 기반 필터링)
REM ============================================

REM Skills 설치 (글로벌, 번들 필터링)
echo [1/7] Skills 설치 중... (글로벌)
if exist "%SCRIPT_DIR%skills" (
    for /d %%D in ("%SCRIPT_DIR%skills\*") do (
        set "skill_name=%%~nxD"
        set "INSTALL_SKILL=0"
        if "!HAS_ALL_BUNDLES!"=="1" set "INSTALL_SKILL=1"
        if /i "!skill_name!"=="zephermine" if "!HAS_ZEPHERMINE!"=="1" set "INSTALL_SKILL=1"
        if /i "!skill_name!"=="agent-team" if "!HAS_AGENT_TEAM!"=="1" set "INSTALL_SKILL=1"
        if /i "!skill_name!"=="agent-team-codex" set "INSTALL_SKILL=0"
        if "!INSTALL_SKILL!"=="1" (
            echo       - !skill_name!
            if not exist "%CLAUDE_DIR%\skills\!skill_name!" mkdir "%CLAUDE_DIR%\skills\!skill_name!"
            xcopy /s /y /q "%%D\*" "%CLAUDE_DIR%\skills\!skill_name!\" >nul
        ) else (
            echo       - !skill_name! [건너뜀]
        )
    )
    echo       완료!
) else (
    echo       스킬 없음
)

REM Agents 설치 (글로벌, all 번들만)
echo.
echo [2/7] Agents 설치 중... (글로벌)
if "!HAS_ALL_BUNDLES!"=="1" (
    if not exist "%CLAUDE_DIR%\agents" mkdir "%CLAUDE_DIR%\agents"
    if exist "%SCRIPT_DIR%agents" (
        for %%F in ("%SCRIPT_DIR%agents\*.md") do (
            echo       - %%~nxF
            copy /y "%%F" "%CLAUDE_DIR%\agents\" >nul
        )
    )
    for /d %%D in ("%SCRIPT_DIR%skills\*") do (
        if exist "%%D\agents" (
            for %%F in ("%%D\agents\*.md") do (
                echo       - %%~nxF [%%~nxD]
                copy /y "%%F" "%CLAUDE_DIR%\agents\" >nul
            )
        )
    )
    echo       완료!
) else (
    echo       [건너뜀] 개별 번들 모드 - 에이전트 미설치
)

REM Hooks 설치 (글로벌, 번들 기반 필터링)
echo.
echo [3/7] Hooks 설치 중... (글로벌)
set "NEED_HOOKS=0"
if "!HAS_MNEMO!"=="1" set "NEED_HOOKS=1"
if "!HAS_ORCHESTRATOR!"=="1" set "NEED_HOOKS=1"
if "!HAS_ALL_BUNDLES!"=="1" set "NEED_HOOKS=1"
if "!NEED_HOOKS!"=="1" (
    if not exist "%CLAUDE_DIR%\hooks" mkdir "%CLAUDE_DIR%\hooks"
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
        for %%F in ("%SCRIPT_DIR%hooks\*.js") do (
            echo       - %%~nxF
            copy /y "%%F" "%CLAUDE_DIR%\hooks\" >nul
        )
    )
    echo       완료!
) else (
    echo       [건너뜀] 훅 번들 미선택
)

:configure_hooks

REM CLAUDECODE 환경변수 임시 해제 (claude CLI 중첩 세션 방지)
set "SAVE_CLAUDECODE=!CLAUDECODE!"
set "CLAUDECODE="

REM ============================================
REM   Phase 1: Claude (settings.json + CLAUDE.md + MCP + Orchestrator)
REM ============================================
if "!HAS_CLAUDE!"=="0" goto :phase_codex

REM settings.json 훅 설정 (컴포넌트 기반 필터링)
echo.
echo [4/7] settings.json 훅 설정 중... (Claude)
node "%SCRIPT_DIR%install-hooks-config.js" "%CLAUDE_DIR%/hooks" "%CLAUDE_DIR%\settings.json" --windows --components !BUNDLES! --llms !LLMS!

REM CLAUDE.md 장기기억 규칙 설치 (mnemo 번들)
echo.
if "!HAS_MNEMO!"=="1" (
    echo [5/7] CLAUDE.md 장기기억 규칙 설치 중... (Claude)
    node "%SCRIPT_DIR%install-claude-md.js" "%CLAUDE_DIR%\CLAUDE.md" "%SCRIPT_DIR%skills\mnemo\templates\claude-md-rules.md"
) else (
    echo [5/7] CLAUDE.md 장기기억 규칙 [건너뜀] - mnemo 번들 미선택
)

REM MCP 서버 자동 설치 (mcp 번들)
echo.
if "!HAS_MCP!"=="1" (
    echo [6/7] MCP 서버 설치 중... (Claude, 무료만 자동 설치)
    echo.
    echo       사용 가능한 MCP 서버:
    node "%SCRIPT_DIR%install-mcp.js" --list
    echo.
    echo       무료 MCP 자동 설치를 시작합니다...
    echo.
    node "%SCRIPT_DIR%install-mcp.js" --all
    echo.
    echo       완료! (추가: node "%SCRIPT_DIR%install-mcp.js" --list^)
) else (
    echo [6/7] MCP 서버 [건너뜀] - mcp 번들 미선택
)

REM Orchestrator MCP 서버 등록 (orchestrator 번들)
echo.
if "!HAS_ORCHESTRATOR!"=="1" (
    echo [7/7] Orchestrator MCP 서버 등록 중... (Claude)
    set "ORCH_DIST=%SCRIPT_DIR%skills\orchestrator\mcp-server\dist\index.js"
    set "ORCH_SDK=%SCRIPT_DIR%skills\orchestrator\mcp-server\node_modules\@modelcontextprotocol\sdk\package.json"
    set "NEED_ORCH_BUILD=0"
    if not exist "!ORCH_DIST!" set "NEED_ORCH_BUILD=1"
    if not exist "!ORCH_SDK!" set "NEED_ORCH_BUILD=1"
    if "!NEED_ORCH_BUILD!"=="1" (
        echo       MCP 서버 빌드 중...
        cd /d "%SCRIPT_DIR%skills\orchestrator\mcp-server" && npm install >nul 2>nul && npm run build >nul 2>nul
        cd /d "%SCRIPT_DIR%"
    )
    if exist "!ORCH_DIST!" (
        claude mcp remove orchestrator -s user >nul 2>nul
        claude mcp add orchestrator --scope user -- node "!ORCH_DIST:\=/!" >nul 2>nul
        echo       Orchestrator MCP 등록 완료
    ) else (
        echo       [경고] MCP 서버 빌드 실패, 건너뜀
    )
) else (
    echo [7/7] Orchestrator MCP [건너뜀] - orchestrator 번들 미선택
)

REM ============================================
REM   Phase 2: Codex
REM ============================================
:phase_codex
if "!HAS_CODEX!"=="0" goto :phase_gemini
echo.
echo   --- Codex CLI ---

REM Codex-Mnemo (mnemo 번들)
if "!HAS_MNEMO!"=="1" (
    echo.
    echo   Codex-Mnemo 설치 중...
    if exist "%SCRIPT_DIR%skills\codex-mnemo\install.js" (
        node "%SCRIPT_DIR%skills\codex-mnemo\install.js"
        if !errorlevel! equ 0 (
            set "CODEX_MNEMO_RESULT=설치 완료"
        ) else (
            set "CODEX_MNEMO_RESULT=설치 실패"
        )
    ) else (
        set "CODEX_MNEMO_RESULT=스킵: install.js 없음"
    )
    echo       !CODEX_MNEMO_RESULT!
) else (
    set "CODEX_MNEMO_RESULT=건너뜀: mnemo 미선택"
)

REM Codex Skills/Agents 동기화 (all 번들 또는 zephermine)
if "!HAS_ALL_BUNDLES!"=="1" (
    goto :codex_sync
)
if "!HAS_ZEPHERMINE!"=="1" (
    goto :codex_sync
)
set "CODEX_SYNC_RESULT=건너뜀: 관련 번들 미선택"
goto :codex_after_sync
:codex_sync
echo.
echo   Codex Skills/Agents 동기화 중...
if exist "%SCRIPT_DIR%scripts\sync-codex-assets.js" (
    if "%MODE%"=="link" (
        node "%SCRIPT_DIR%scripts\sync-codex-assets.js" --link
    ) else (
        node "%SCRIPT_DIR%scripts\sync-codex-assets.js"
    )
    if !errorlevel! equ 0 (
        set "CODEX_SYNC_RESULT=동기화 완료"
    ) else (
        set "CODEX_SYNC_RESULT=동기화 실패"
    )
) else (
    set "CODEX_SYNC_RESULT=스킵: sync 스크립트 없음"
)
echo       !CODEX_SYNC_RESULT!
:codex_after_sync

REM Codex MCP (mcp 번들)
if "!HAS_MCP!"=="1" (
    echo.
    echo   Codex MCP 설치 중...
    where codex >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "%SCRIPT_DIR%install-mcp-codex.js" (
            node "%SCRIPT_DIR%install-mcp-codex.js" --all
            if !errorlevel! equ 0 (
                set "CODEX_MCP_RESULT=설치 완료"
            ) else (
                set "CODEX_MCP_RESULT=설치 실패"
            )
        ) else (
            set "CODEX_MCP_RESULT=스킵: install-mcp-codex.js 없음"
        )
        call codex features enable multi_agent >nul 2>nul
        if !errorlevel! equ 0 (
            set "CODEX_MULTI_AGENT_RESULT=활성화 완료"
        ) else (
            set "CODEX_MULTI_AGENT_RESULT=활성화 실패"
        )
    ) else (
        set "CODEX_MCP_RESULT=스킵: codex CLI 없음"
        set "CODEX_MULTI_AGENT_RESULT=스킵: codex CLI 없음"
    )
    echo       MCP: !CODEX_MCP_RESULT!, multi_agent: !CODEX_MULTI_AGENT_RESULT!
) else (
    set "CODEX_MCP_RESULT=건너뜀: mcp 미선택"
    set "CODEX_MULTI_AGENT_RESULT=건너뜀: mcp 미선택"
)

REM Codex Orchestrator MCP (orchestrator 번들)
if "!HAS_ORCHESTRATOR!"=="1" (
    echo.
    echo   Codex Orchestrator MCP 등록 중...
    set "CODEX_ORCH_DIST=%SCRIPT_DIR%skills\orchestrator\mcp-server\dist\index.js"
    set "CODEX_ORCH_SDK=%SCRIPT_DIR%skills\orchestrator\mcp-server\node_modules\@modelcontextprotocol\sdk\package.json"
    set "NEED_CODEX_ORCH_BUILD=0"
    if not exist "!CODEX_ORCH_DIST!" set "NEED_CODEX_ORCH_BUILD=1"
    if not exist "!CODEX_ORCH_SDK!" set "NEED_CODEX_ORCH_BUILD=1"
    if "!NEED_CODEX_ORCH_BUILD!"=="1" (
        echo       MCP 서버 빌드 중...
        cd /d "%SCRIPT_DIR%skills\orchestrator\mcp-server" && npm install >nul 2>nul && npm run build >nul 2>nul
        cd /d "%SCRIPT_DIR%"
    )
    where codex >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "!CODEX_ORCH_DIST!" (
            set "CODEX_ORCH_PROJECT_ROOT=%SCRIPT_DIR%"
            if "!CODEX_ORCH_PROJECT_ROOT:~-1!"=="\" set "CODEX_ORCH_PROJECT_ROOT=!CODEX_ORCH_PROJECT_ROOT:~0,-1!"
            set "CODEX_ORCH_PROJECT_ROOT=!CODEX_ORCH_PROJECT_ROOT:\=/!"
            set "CODEX_ORCH_DIST_NORM=!CODEX_ORCH_DIST:\=/!"
            call codex mcp remove orchestrator >nul 2>nul
            call codex mcp add --env ORCHESTRATOR_PROJECT_ROOT=!CODEX_ORCH_PROJECT_ROOT! --env ORCHESTRATOR_WORKER_ID=pm orchestrator -- node "!CODEX_ORCH_DIST_NORM!" >nul 2>nul
            if !errorlevel! equ 0 (
                set "CODEX_ORCH_RESULT=등록 완료"
            ) else (
                set "CODEX_ORCH_RESULT=등록 실패"
            )
        ) else (
            set "CODEX_ORCH_RESULT=스킵: 빌드 실패"
        )
    ) else (
        set "CODEX_ORCH_RESULT=스킵: codex CLI 없음"
    )
    echo       !CODEX_ORCH_RESULT!
) else (
    set "CODEX_ORCH_RESULT=건너뜀: orchestrator 미선택"
)

REM ============================================
REM   Phase 3: Gemini
REM ============================================
:phase_gemini
if "!HAS_GEMINI!"=="0" goto :install_done
echo.
echo   --- Gemini CLI ---

REM Gemini-Mnemo (mnemo 번들) — AGENTS.md 규칙 + save-turn 훅 + context.fileName
if "!HAS_MNEMO!"=="1" (
    echo.
    echo   Gemini-Mnemo 설치 중...
    if exist "%SCRIPT_DIR%skills\gemini-mnemo\install.js" (
        node "%SCRIPT_DIR%skills\gemini-mnemo\install.js"
        if !errorlevel! equ 0 (
            set "GEMINI_MNEMO_RESULT=설치 완료"
        ) else (
            set "GEMINI_MNEMO_RESULT=설치 실패"
        )
    ) else (
        set "GEMINI_MNEMO_RESULT=스킵: install.js 없음"
    )
    echo       !GEMINI_MNEMO_RESULT!
) else (
    set "GEMINI_MNEMO_RESULT=건너뜀: mnemo 미선택"
)

REM Gemini Skills/Agents/Hooks 동기화 (all 또는 zephermine)
if "!HAS_ALL_BUNDLES!"=="1" (
    goto :gemini_sync
)
if "!HAS_ZEPHERMINE!"=="1" (
    goto :gemini_sync
)
if "!HAS_AGENT_TEAM!"=="1" (
    goto :gemini_sync
)
set "GEMINI_SYNC_RESULT=건너뜀: 관련 번들 미선택"
goto :gemini_after_sync
:gemini_sync
echo.
echo   Gemini Skills/Agents/Hooks 동기화 중...
if exist "%SCRIPT_DIR%scripts\sync-gemini-assets.js" (
    if "%MODE%"=="link" (
        node "%SCRIPT_DIR%scripts\sync-gemini-assets.js" --link
    ) else (
        node "%SCRIPT_DIR%scripts\sync-gemini-assets.js"
    )
    if !errorlevel! equ 0 (
        set "GEMINI_SYNC_RESULT=동기화 완료"
    ) else (
        set "GEMINI_SYNC_RESULT=동기화 실패"
    )
) else (
    set "GEMINI_SYNC_RESULT=스킵: sync 스크립트 없음"
)
echo       !GEMINI_SYNC_RESULT!
:gemini_after_sync

REM Gemini settings.json 훅 설정 (컴포넌트 기반 필터링)
set "GEMINI_DIR=%USERPROFILE%\.gemini"
set "NEED_GEMINI_HOOKS=0"
if "!HAS_MNEMO!"=="1" set "NEED_GEMINI_HOOKS=1"
if "!HAS_ORCHESTRATOR!"=="1" set "NEED_GEMINI_HOOKS=1"
if "!HAS_ALL_BUNDLES!"=="1" set "NEED_GEMINI_HOOKS=1"
if "!NEED_GEMINI_HOOKS!"=="1" (
    echo.
    echo   Gemini settings.json 훅 설정 중...
    REM save-turn 훅을 gemini hooks 디렉토리에 복사
    if not exist "!GEMINI_DIR!\hooks" mkdir "!GEMINI_DIR!\hooks"
    if exist "%SCRIPT_DIR%skills\gemini-mnemo\hooks\save-turn.ps1" (
        copy /y "%SCRIPT_DIR%skills\gemini-mnemo\hooks\save-turn.ps1" "!GEMINI_DIR!\hooks\" >nul
    )
    if exist "%SCRIPT_DIR%skills\gemini-mnemo\hooks\save-turn.sh" (
        copy /y "%SCRIPT_DIR%skills\gemini-mnemo\hooks\save-turn.sh" "!GEMINI_DIR!\hooks\" >nul
    )
    node "%SCRIPT_DIR%install-hooks-config.js" "!GEMINI_DIR!/hooks" "!GEMINI_DIR!\settings.json" --windows --components !BUNDLES! --llms !LLMS! --target gemini
    set "GEMINI_HOOKS_RESULT=설정 완료"
) else (
    set "GEMINI_HOOKS_RESULT=건너뜀: 훅 번들 미선택"
)

REM Gemini MCP (mcp 번들)
if "!HAS_MCP!"=="1" (
    echo.
    echo   Gemini MCP 설치 중...
    where gemini >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "%SCRIPT_DIR%install-mcp-gemini.js" (
            node "%SCRIPT_DIR%install-mcp-gemini.js" --all
            if !errorlevel! equ 0 (
                set "GEMINI_MCP_RESULT=설치 완료"
            ) else (
                set "GEMINI_MCP_RESULT=설치 실패"
            )
        ) else (
            set "GEMINI_MCP_RESULT=스킵: install-mcp-gemini.js 없음"
        )
    ) else (
        set "GEMINI_MCP_RESULT=스킵: gemini CLI 없음"
    )
    echo       MCP: !GEMINI_MCP_RESULT!
) else (
    set "GEMINI_MCP_RESULT=건너뜀: mcp 미선택"
)

REM Gemini Orchestrator MCP (orchestrator 번들)
if "!HAS_ORCHESTRATOR!"=="1" (
    echo.
    echo   Gemini Orchestrator MCP 등록 중...
    set "GEMINI_ORCH_DIST=%SCRIPT_DIR%skills\orchestrator\mcp-server\dist\index.js"
    set "GEMINI_ORCH_SDK=%SCRIPT_DIR%skills\orchestrator\mcp-server\node_modules\@modelcontextprotocol\sdk\package.json"
    set "NEED_GEMINI_ORCH_BUILD=0"
    if not exist "!GEMINI_ORCH_DIST!" set "NEED_GEMINI_ORCH_BUILD=1"
    if not exist "!GEMINI_ORCH_SDK!" set "NEED_GEMINI_ORCH_BUILD=1"
    if "!NEED_GEMINI_ORCH_BUILD!"=="1" (
        echo       MCP 서버 빌드 중...
        cd /d "%SCRIPT_DIR%skills\orchestrator\mcp-server" && npm install >nul 2>nul && npm run build >nul 2>nul
        cd /d "%SCRIPT_DIR%"
    )
    where gemini >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "!GEMINI_ORCH_DIST!" (
            set "GEMINI_ORCH_DIST_NORM=!GEMINI_ORCH_DIST:\=/!"
            call gemini mcp remove orchestrator >nul 2>nul
            call gemini mcp add orchestrator node "!GEMINI_ORCH_DIST_NORM!" >nul 2>nul
            if !errorlevel! equ 0 (
                set "GEMINI_ORCH_RESULT=등록 완료"
            ) else (
                set "GEMINI_ORCH_RESULT=등록 실패"
            )
        ) else (
            set "GEMINI_ORCH_RESULT=스킵: 빌드 실패"
        )
    ) else (
        set "GEMINI_ORCH_RESULT=스킵: gemini CLI 없음"
    )
    echo       !GEMINI_ORCH_RESULT!
) else (
    set "GEMINI_ORCH_RESULT=건너뜀: orchestrator 미선택"
)

:install_done
REM CLAUDECODE 환경변수 복원
set "CLAUDECODE=!SAVE_CLAUDECODE!"

echo.
echo ============================================
if "%MODE%"=="link" (
    echo   설치 완료! [LINK]
) else (
    echo   설치 완료!
)
echo ============================================
echo.
echo   LLM: !LLMS!
echo   번들: !BUNDLES!
echo.
if "!HAS_CLAUDE!"=="1" (
    echo   [Claude]
    if "%MODE%"=="link" (
        echo   - Skills: %CLAUDE_DIR%\skills\ ^(링크^)
    ) else (
        echo   - Skills: %CLAUDE_DIR%\skills\
    )
    if "!HAS_ALL_BUNDLES!"=="1" echo   - Agents: %CLAUDE_DIR%\agents\
    if "!HAS_MNEMO!"=="1" echo   - CLAUDE.md 장기기억 규칙 등록 완료
    if "!HAS_MCP!"=="1" echo   - MCP 서버 설치 완료
    if "!HAS_ORCHESTRATOR!"=="1" echo   - Orchestrator MCP 등록 완료
)
if "!HAS_CODEX!"=="1" (
    echo   [Codex]
    echo   - Mnemo: !CODEX_MNEMO_RESULT!
    echo   - Skills/Agents: !CODEX_SYNC_RESULT!
    echo   - MCP: !CODEX_MCP_RESULT!
    echo   - multi_agent: !CODEX_MULTI_AGENT_RESULT!
    echo   - Orchestrator: !CODEX_ORCH_RESULT!
)
if "!HAS_GEMINI!"=="1" (
    echo   [Gemini]
    echo   - Mnemo: !GEMINI_MNEMO_RESULT!
    echo   - Skills/Agents: !GEMINI_SYNC_RESULT!
    echo   - Hooks: !GEMINI_HOOKS_RESULT!
    echo   - MCP: !GEMINI_MCP_RESULT!
    echo   - Orchestrator: !GEMINI_ORCH_RESULT!
)
echo.
echo   CLI를 재시작하면 적용됩니다.
echo.

endlocal
pause
