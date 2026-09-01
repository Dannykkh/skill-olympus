@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================
REM   Claude Code Customizations Installer
REM   Auto-install Skills, Agents, Hooks + MCP
REM   Usage: install.bat [--uninstall] [--all] [--llm ...] [--only ...] [--skip ...] [--include-source-only-skills] [--include-source-only-agents]
REM ============================================

set "SCRIPT_DIR=%~dp0"

set "SHOW_HELP=0"
for %%A in (%*) do (
    if /i "%%~A"=="--help" set "SHOW_HELP=1"
    if /i "%%~A"=="-h" set "SHOW_HELP=1"
)
if "!SHOW_HELP!"=="1" (
    echo Usage: install.bat [options]
    echo.
    echo   --all                              Install four TermSnap default CLI targets
    echo   --llm claude,codex,antigravity,grok,openclaw,hermes
    echo                                      Install selected targets; OpenClaw/Hermes are skills-only
    echo   --uninstall                        Remove managed assets
    echo   --include-source-only-skills       Register optional source-only skills
    echo   --include-broad-coding-skills      Register legacy broad coding skills
    echo   --include-source-only-agents       Register optional custom agents
    echo   --help, -h                         Show this help without changing files
    exit /b 0
)

set "CLAUDE_DIR=%USERPROFILE%\.claude"
set "CODEX_DIR=%CODEX_HOME%"
if not defined CODEX_DIR set "CODEX_DIR=%USERPROFILE%\.codex"
for %%I in ("%CODEX_DIR%") do set "CODEX_DIR=%%~fI"
set "ANTIGRAVITY_ROOT=%ANTIGRAVITY_HOME%"
if not defined ANTIGRAVITY_ROOT set "ANTIGRAVITY_ROOT=%USERPROFILE%\.gemini"
for %%I in ("%ANTIGRAVITY_ROOT%") do set "ANTIGRAVITY_ROOT=%%~fI"
set "OPENCLAW_DIR=%OPENCLAW_HOME%"
if not defined OPENCLAW_DIR set "OPENCLAW_DIR=%USERPROFILE%\.openclaw"
for %%I in ("%OPENCLAW_DIR%") do set "OPENCLAW_DIR=%%~fI"
set "HERMES_DIR=%HERMES_HOME%"
if not defined HERMES_DIR set "HERMES_DIR=%USERPROFILE%\.hermes"
for %%I in ("%HERMES_DIR%") do set "HERMES_DIR=%%~fI"
set "CREATED_CLAUDE_DIR=0"
set "HAS_CLAUDE_CLI=0"
set "JQ_MISSING=0"
set "CLAUDE_MCP_RESULT=not-run"
set "CLAUDE_ORCH_RESULT=not-run"
set "CODEX_MNEMO_RESULT=not-run"
set "CODEX_SYNC_RESULT=not-run"
set "CODEX_MCP_RESULT=not-run"
set "CODEX_MULTI_AGENT_RESULT=not-run"
set "CODEX_ORCH_RESULT=not-run"
set "ANTIGRAVITY_MNEMO_RESULT=not-run"
set "ANTIGRAVITY_SYNC_RESULT=not-run"
set "ANTIGRAVITY_MCP_RESULT=not-run"
set "ANTIGRAVITY_ORCH_RESULT=not-run"
set "ANTIGRAVITY_HOOKS_RESULT=not-run"
set "GROK_MNEMO_RESULT=not-run"
set "OPENCLAW_SYNC_RESULT=not-run"
set "HERMES_SYNC_RESULT=not-run"
set "DEFAULT_MCP_SERVERS=context7 playwright chrome-devtools"
set "LEGACY_MCP_SERVERS=sequential-thinking"
set "INCLUDE_SOURCE_ONLY_AGENTS=0"
set "SOURCE_ONLY_AGENT_FLAG="
set "INCLUDE_SOURCE_ONLY_SKILLS=0"
set "INCLUDE_BROAD_CODING_SKILLS=0"
set "SOURCE_ONLY_SKILL_FLAG="

REM ============================================
REM   Prerequisites check
REM ============================================
REM Node.js는 대체가 없다 - 설치 로직 전체가 node 스크립트(install-select.js,
REM safe-copy.js, install-hooks-config.js 등)라 여기서 중단하는 것이 맞다.
REM 자동 설치는 하지 않는다: winget으로 깔아도 현재 cmd 세션의 PATH는 갱신되지
REM 않아 그 실행에서는 여전히 node를 못 찾는다. 대신 명령어를 그대로 알려준다.
where node >nul 2>nul || (
    echo [ERROR] Node.js is required but not found.
    echo.
    echo        Install with one of:
    echo          winget install OpenJS.NodeJS.LTS
    echo          choco install nodejs-lts
    echo        Or download: https://nodejs.org/
    echo.
    echo        Then open a NEW terminal and re-run this installer
    echo        ^(PATH is not refreshed in the current one^).
    pause
    exit /b 1
)

where jq >nul 2>nul || (
    echo [PREREQ] jq not found. Installing...
    set "JQ_INSTALLED=0"

    REM Try winget first
    where winget >nul 2>nul && (
        echo        Trying winget...
        winget install jqlang.jq --accept-package-agreements --accept-source-agreements >nul 2>nul
        where jq >nul 2>nul && set "JQ_INSTALLED=1"
    )

    REM Try choco as fallback
    if "!JQ_INSTALLED!"=="0" (
        where choco >nul 2>nul && (
            echo        Trying chocolatey...
            choco install jq -y >nul 2>nul
            where jq >nul 2>nul && set "JQ_INSTALLED=1"
        )
    )

    REM Direct download as last resort
    if "!JQ_INSTALLED!"=="0" (
        echo        Downloading jq from GitHub...
        set "JQ_URL=https://github.com/jqlang/jq/releases/latest/download/jq-windows-amd64.exe"
        set "JQ_DEST=%USERPROFILE%\.local\bin\jq.exe"
        if not exist "%USERPROFILE%\.local\bin" mkdir "%USERPROFILE%\.local\bin"
        powershell -Command "Invoke-WebRequest -Uri '!JQ_URL!' -OutFile '!JQ_DEST!'" >nul 2>nul
        if exist "!JQ_DEST!" (
            set "PATH=%USERPROFILE%\.local\bin;%PATH%"
            set "JQ_INSTALLED=1"
            echo        Downloaded to !JQ_DEST!
            echo        NOTE: Add %USERPROFILE%\.local\bin to your PATH for future sessions.
        )
    )

    REM jq가 없어도 중단하지 않는다. Windows에 등록되는 훅은 PowerShell(.ps1)이라
    REM jq를 쓰지 않는다 - jq는 .sh 훅(Git Bash/WSL)의 JSON 파싱 전용이다.
    REM 예전에는 여기서 exit /b 1로 끊어, 쓰지도 않는 의존성 때문에 설치 전체가
    REM 실패했다(오프라인이거나 winget/choco가 없는 새 컴퓨터에서 재현).
    if "!JQ_INSTALLED!"=="0" (
        echo   [WARN] jq installation failed - continuing without it.
        echo          Windows hooks run on PowerShell ^(.ps1^) and do not need jq.
        echo          Only the .sh hooks ^(Git Bash / WSL^) require it.
        echo          Install later: winget install jqlang.jq
        set "JQ_MISSING=1"
    ) else (
        echo [PREREQ] jq installed successfully.
    )
)

REM Determine mode (scan all arguments)
set "MODE=copy"
for %%A in (%*) do (
    if /i "%%A"=="--uninstall" set "MODE=uninstall"
    if /i "%%A"=="--include-source-only-agents" set "INCLUDE_SOURCE_ONLY_AGENTS=1"
    if /i "%%A"=="--include-passive-agents" set "INCLUDE_SOURCE_ONLY_AGENTS=1"
    if /i "%%A"=="--include-broad-coding-agents" set "INCLUDE_SOURCE_ONLY_AGENTS=1"
    if /i "%%A"=="--include-source-only-skills" set "INCLUDE_SOURCE_ONLY_SKILLS=1"
    if /i "%%A"=="--include-broad-coding-skills" set "INCLUDE_BROAD_CODING_SKILLS=1"
)
if "!INCLUDE_SOURCE_ONLY_AGENTS!"=="1" set "SOURCE_ONLY_AGENT_FLAG=--include-source-only-agents"
if "!INCLUDE_SOURCE_ONLY_SKILLS!"=="1" set "SOURCE_ONLY_SKILL_FLAG=--include-source-only-skills"
if "!INCLUDE_BROAD_CODING_SKILLS!"=="1" set "SOURCE_ONLY_SKILL_FLAG=!SOURCE_ONLY_SKILL_FLAG! --include-broad-coding-skills"

echo.
echo ============================================
if "%MODE%"=="uninstall" (
    echo   Claude Code Customizations Uninstaller
) else (
    echo   Claude Code Customizations Installer
)
echo ============================================
echo.

if "%MODE%" NEQ "uninstall" (
    echo   Skill registry migration notice:
    echo   - Unrelated third-party skill names are preserved.
    echo   - Modified same-name conflicts move to ^<CLI_HOME^>\_olympus-preserved\...
    echo   - The default keeps optional skills source-only.
    echo   - Activate source-only skills: install.bat --all --include-source-only-skills
    echo   - Recovery guide: docs\skill-registry-migration.md
    echo.
)

REM ============================================
REM   Update check (non-blocking)
REM ============================================
if "%MODE%" NEQ "uninstall" (
    for /f "tokens=1,2,3" %%A in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\update-check.ps1" 2^>nul') do (
        if "%%A"=="UPGRADE_AVAILABLE" (
            echo   ╔══════════════════════════════════════════════╗
            echo   ║  New version available: v%%B  -- v%%C          ║
            echo   ║  Run: git pull ^&^& install.bat --all         ║
            echo   ╚══════════════════════════════════════════════╝
            echo.
        )
    )
)

REM ============================================
REM   --uninstall mode: Clean up all Olympus-managed runtime assets
REM ============================================
if "%MODE%"=="uninstall" (
    echo [1/14] Removing settings.json hook config...
    if exist "%CLAUDE_DIR%\settings.json" (
        node "%SCRIPT_DIR%install-hooks-config.js" "%CLAUDE_DIR%\hooks" "%CLAUDE_DIR%\settings.json" --uninstall
        echo       Done!
    ) else (
        echo       [WARN] Claude settings.json not found, skipping
    )

    echo.
    echo [2/14] Removing CLAUDE.md long-term memory rules...
    if exist "%CLAUDE_DIR%\CLAUDE.md" (
        node "%SCRIPT_DIR%install-claude-md.js" "%CLAUDE_DIR%\CLAUDE.md" "%SCRIPT_DIR%skills\mnemo\templates\claude-md-rules.md" --uninstall
        echo       Done!
    ) else (
        echo       [WARN] Claude CLAUDE.md not found, skipping
    )
    del /f /q "%CLAUDE_DIR%\SKILLS-CATALOG.md" >nul 2>nul
    del /f /q "%CLAUDE_DIR%\AGENTS-CATALOG.md" >nul 2>nul
    if exist "%SCRIPT_DIR%scripts\sync-claude-skills.js" (
        node "%SCRIPT_DIR%scripts\sync-claude-skills.js" "%CLAUDE_DIR%" --unlink
        if !errorlevel! neq 0 (
            echo       [ERROR] Claude skill unlink failed: !errorlevel!
            exit /b 1
        )
    ) else (
        echo       [ERROR] sync-claude-skills.js not found
        exit /b 1
    )
    if exist "%SCRIPT_DIR%scripts\sync-claude-agents.js" (
        node "%SCRIPT_DIR%scripts\sync-claude-agents.js" "%CLAUDE_DIR%" --unlink
        if !errorlevel! neq 0 (
            echo       [ERROR] Claude agent cleanup failed: !errorlevel!
            exit /b 1
        )
        del /f /q "%CLAUDE_DIR%\AGENTS-CATALOG.md" >nul 2>nul
    ) else (
        echo       [ERROR] sync-claude-agents.js not found
        exit /b 1
    )

    echo.
    echo [3/14] MCP server settings are managed separately.
    echo       Uninstall: node "%SCRIPT_DIR%install-mcp.js" --uninstall ^<name^>
    echo       Done!

    echo.
    echo [4/14] Removing Orchestrator MCP...
    set "SAVE_CLAUDECODE=!CLAUDECODE!"
    set "CLAUDECODE="
    where claude >nul 2>nul
    if !errorlevel! equ 0 (
        REM `call` 필수 - npm shim(claude.cmd)을 call 없이 부르면 제어가 돌아오지 않는다.
        call claude mcp remove orchestrator -s user >nul 2>nul
        echo       Done!
    ) else (
        echo       [WARN] claude CLI not found, skipping
    )
    set "CLAUDECODE=!SAVE_CLAUDECODE!"

    echo.
    echo [5/14] Removing Codex-Mnemo...
    if exist "%SCRIPT_DIR%skills\codex-mnemo\install.js" (
        node "%SCRIPT_DIR%skills\codex-mnemo\install.js" --uninstall
        if !errorlevel! equ 0 (
            set "CODEX_MNEMO_RESULT=Removed"
            echo       Done!
        ) else (
            set "CODEX_MNEMO_RESULT=Remove failed"
            echo       [WARN] Remove failed exit: !errorlevel!
        )
    ) else (
        set "CODEX_MNEMO_RESULT=Skip: no install.js"
        echo       [WARN] install.js not found, skipping
    )

    echo.
    echo [6/14] Unlinking Codex Skills/Agents/Hooks sync...
    if exist "%SCRIPT_DIR%scripts\sync-codex-assets.js" (
        node "%SCRIPT_DIR%scripts\sync-codex-assets.js" --unlink
        if !errorlevel! equ 0 (
            set "CODEX_SYNC_RESULT=Unlinked"
            echo       Done!
        ) else (
            set "CODEX_SYNC_RESULT=Unlink failed"
            echo       [ERROR] Unlink failed exit: !errorlevel!
            exit /b 1
        )
    ) else (
        set "CODEX_SYNC_RESULT=Failed: no sync script"
        echo       [ERROR] sync-codex-assets.js not found
        exit /b 1
    )

    echo.
    echo [7/14] Removing Codex MCP default/legacy set...
    where codex >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "%SCRIPT_DIR%install-mcp-codex.js" (
            node "%SCRIPT_DIR%install-mcp-codex.js" --uninstall !DEFAULT_MCP_SERVERS! !LEGACY_MCP_SERVERS!
            if !errorlevel! equ 0 (
                set "CODEX_MCP_RESULT=Removed"
                echo       Done!
            ) else (
                set "CODEX_MCP_RESULT=Partial remove failure"
                echo       [WARN] Partial remove failed exit: !errorlevel!
            )
        ) else (
            set "CODEX_MCP_RESULT=Skip: no install-mcp-codex.js"
            echo       [WARN] install-mcp-codex.js not found, skipping
        )
    ) else (
        set "CODEX_MCP_RESULT=Skip: codex CLI not found"
        echo       [WARN] codex CLI not found, skipping
    )

    echo.
    echo [8/14] Removing Codex Orchestrator MCP...
    where codex >nul 2>nul
    if !errorlevel! equ 0 (
        call codex mcp remove orchestrator >nul 2>nul
        if !errorlevel! equ 0 (
            set "CODEX_ORCH_RESULT=Removed"
            echo       Done!
        ) else (
            set "CODEX_ORCH_RESULT=Skip/failed"
            echo       [WARN] Remove failed or not registered
        )
    ) else (
        set "CODEX_ORCH_RESULT=Skip: codex CLI not found"
        echo       [WARN] codex CLI not found, skipping
    )

    echo.
    echo [9/14] Removing Antigravity-Mnemo...
    if exist "%SCRIPT_DIR%skills\antigravity-mnemo\install.js" (
        node "%SCRIPT_DIR%skills\antigravity-mnemo\install.js" --uninstall
        if !errorlevel! equ 0 (
            set "ANTIGRAVITY_MNEMO_RESULT=Removed"
            echo       Done!
        ) else (
            set "ANTIGRAVITY_MNEMO_RESULT=Remove failed"
            echo       [WARN] Remove failed exit: !errorlevel!
        )
    ) else (
        set "ANTIGRAVITY_MNEMO_RESULT=Skip: no install.js"
        echo       [WARN] install.js not found, skipping
    )

    echo.
    echo Removing Grok-Mnemo... [auto-skip if Grok not installed]
    if exist "%SCRIPT_DIR%skills\grok-mnemo\install.js" (
        node "%SCRIPT_DIR%skills\grok-mnemo\install.js" --uninstall
        if !errorlevel! equ 0 (
            set "GROK_MNEMO_RESULT=Removed"
            echo       Done!
        ) else (
            set "GROK_MNEMO_RESULT=Remove failed"
            echo       [WARN] Remove failed exit: !errorlevel!
        )
    ) else (
        set "GROK_MNEMO_RESULT=Skip: no install.js"
    )

    echo.
    echo [10/14] Unlinking Antigravity Skills/Agents/Hooks sync...
    if exist "%SCRIPT_DIR%scripts\sync-antigravity-assets.js" (
        node "%SCRIPT_DIR%scripts\sync-antigravity-assets.js" --unlink
        if !errorlevel! equ 0 (
            echo       Done!
        ) else (
            echo       [ERROR] Unlink failed
            exit /b 1
        )
    ) else (
        echo       [ERROR] sync-antigravity-assets.js not found
        exit /b 1
    )

    echo.
    echo [11/14] Removing Antigravity core hooks...
    if exist "!ANTIGRAVITY_ROOT!\config\hooks.json" (
        node "%SCRIPT_DIR%install-hooks-config.js" "!ANTIGRAVITY_ROOT!\config\hooks" "!ANTIGRAVITY_ROOT!\config\hooks.json" --uninstall --target antigravity
        echo       Done!
    ) else (
        echo       [WARN] Antigravity hooks.json not found, skipping
    )

    echo.
    echo [12/14] Removing Antigravity MCP/Orchestrator...
    if exist "%SCRIPT_DIR%install-mcp-antigravity.js" (
        node "%SCRIPT_DIR%install-mcp-antigravity.js" --uninstall !DEFAULT_MCP_SERVERS! !LEGACY_MCP_SERVERS! orchestrator
        echo       Done!
    ) else (
        echo       [WARN] install-mcp-antigravity.js not found, skipping
    )

    echo.
    echo [13/14] Removing OpenClaw skills-only assets...
    node "%SCRIPT_DIR%scripts\sync-portable-skills.js" openclaw --home "!OPENCLAW_DIR!" --unlink
    if !errorlevel! neq 0 (
        echo       [ERROR] OpenClaw skill unlink failed: !errorlevel!
        exit /b 1
    )

    echo.
    echo [14/14] Removing Hermes Agent skills-only assets...
    node "%SCRIPT_DIR%scripts\sync-portable-skills.js" hermes --home "!HERMES_DIR!" --unlink
    if !errorlevel! neq 0 (
        echo       [ERROR] Hermes skill unlink failed: !errorlevel!
        exit /b 1
    )

    echo.
    echo ============================================
    echo   Removed!
    echo ============================================
    echo.
    echo   To reinstall: install.bat
    echo.
    endlocal
    pause
    exit /b 0
)

REM ============================================
REM   Component selection (install-select.js)
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
    echo [CANCEL] Installation cancelled.
    pause
    exit /b 0
)

REM Parse LLM flags
set "HAS_CLAUDE=0"
set "HAS_CODEX=0"
set "HAS_ANTIGRAVITY=0"
set "HAS_GROK=0"
set "HAS_OPENCLAW=0"
set "HAS_HERMES=0"
echo ,!LLMS!, | findstr /i ",claude," >nul && set "HAS_CLAUDE=1"
echo ,!LLMS!, | findstr /i ",codex," >nul && set "HAS_CODEX=1"
echo ,!LLMS!, | findstr /i ",antigravity," >nul && set "HAS_ANTIGRAVITY=1"
echo ,!LLMS!, | findstr /i ",grok," >nul && set "HAS_GROK=1"
echo ,!LLMS!, | findstr /i ",openclaw," >nul && set "HAS_OPENCLAW=1"
echo ,!LLMS!, | findstr /i ",hermes," >nul && set "HAS_HERMES=1"

REM Parse bundle flags
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
REM All 5 bundles selected = all
if "!HAS_ZEPHERMINE!!HAS_AGENT_TEAM!!HAS_MNEMO!!HAS_ORCHESTRATOR!!HAS_MCP!"=="11111" set "HAS_ALL_BUNDLES=1"

echo   LLM: !LLMS!
echo   Bundles: !BUNDLES!
echo.

REM %CLAUDE_DIR%가 없으면 만들어서 설치한다.
REM 예전에는 여기서 exit /b 1로 중단했다. 그러면 Claude Code를 안 깔았거나 깔고
REM 한 번도 실행하지 않아 ~/.claude가 아직 없는 컴퓨터에서 Codex/Antigravity 자산까지
REM 통째로 설치되지 않았다. 자동 설치 모드는 LLM을 전부 선택하므로 새
REM 컴퓨터에서 아무것도 안 깔리는 원인이 됐다.
REM
REM skills/agents/hooks/CLAUDE.md/settings.json은 전부 파일 복사라 claude CLI 없이도
REM 유효하다. Grok Build는 compat.claude로 이 디렉터리를 직접 읽으므로 Claude Code가
REM 없어도 실제로 쓰이고, 나중에 Claude Code를 깔면 재설치 없이 그대로 적용된다.
REM claude CLI가 실제로 필요한 것은 MCP 등록뿐이므로 그 단계만 따로 판정한다
REM (아래 HAS_CLAUDE_CLI — Codex의 `where codex` 가드와 같은 방식).
if "!HAS_CLAUDE!"=="1" (
    if not exist "%CLAUDE_DIR%" (
        echo   [INFO] %CLAUDE_DIR% not found - creating it.
        echo          Assets install there; Claude Code uses them on its first run.
        mkdir "%CLAUDE_DIR%" 2>nul
        set "CREATED_CLAUDE_DIR=1"
    )
)

REM ============================================
REM   Default mode: copy (bundle-based filtering)
REM ============================================

if "!HAS_CLAUDE!"=="0" goto :skip_claude_assets

REM Clean up broken symlinks/junctions from previous install-link.bat
node "%SCRIPT_DIR%scripts\safe-copy.js" cleanup "%CLAUDE_DIR%"

REM Move deprecated Olympus agents/skills out of active Claude paths, with backup.
if exist "%SCRIPT_DIR%scripts\prune-stale-assets.js" (
    node "%SCRIPT_DIR%scripts\prune-stale-assets.js" "%CLAUDE_DIR%" --label claude
    if !errorlevel! neq 0 (
        echo       [ERROR] Stale asset quarantine failed: !errorlevel!
        exit /b 1
    )
)

REM Install Skills (global, default-deny runtime policy)
echo [1/7] Installing Skills... (global) [core]
if exist "%SCRIPT_DIR%scripts\sync-claude-skills.js" (
    node "%SCRIPT_DIR%scripts\sync-claude-skills.js" "%CLAUDE_DIR%" !SOURCE_ONLY_SKILL_FLAG!
    if !errorlevel! equ 0 (
        echo       Done!
    ) else (
        echo       [ERROR] Skill sync failed: !errorlevel!
        exit /b 1
    )
) else (
    echo       [ERROR] sync-claude-skills.js not found
    exit /b 1
)

REM Install Agents (global, core)
echo.
echo [2/7] Installing Agents... (global) [core]
if exist "%SCRIPT_DIR%scripts\sync-claude-agents.js" (
    node "%SCRIPT_DIR%scripts\sync-claude-agents.js" "%CLAUDE_DIR%" !SOURCE_ONLY_AGENT_FLAG!
    if !errorlevel! equ 0 (
        echo       Done!
    ) else (
        echo       [ERROR] Agent sync failed: !errorlevel!
        exit /b 1
    )
) else (
    echo       [ERROR] sync-claude-agents.js not found
    exit /b 1
)

REM Install Hooks (global, always installed for mnemo)
echo.
echo [3/7] Installing Hooks... (global) [mnemo required]
set "NEED_HOOKS=1"
if "!NEED_HOOKS!"=="1" (
    node "%SCRIPT_DIR%scripts\safe-copy.js" mkdir "%CLAUDE_DIR%\hooks"
    if exist "%SCRIPT_DIR%hooks" (
        for %%F in ("%SCRIPT_DIR%hooks\*.ps1") do (
            echo %%~nxF | findstr /i "debug" >nul && (
                echo       - %%~nxF [skip: debug]
            ) || (
                echo       - %%~nxF
                node "%SCRIPT_DIR%scripts\safe-copy.js" file "%%F" "%CLAUDE_DIR%\hooks\%%~nxF"
            )
        )
        for %%F in ("%SCRIPT_DIR%hooks\*.sh") do (
            echo %%~nxF | findstr /i "debug" >nul && (
                echo       - %%~nxF [skip: debug]
            ) || (
                echo       - %%~nxF
                node "%SCRIPT_DIR%scripts\safe-copy.js" file "%%F" "%CLAUDE_DIR%\hooks\%%~nxF"
            )
        )
        for %%F in ("%SCRIPT_DIR%hooks\*.js") do (
            echo       - %%~nxF
            node "%SCRIPT_DIR%scripts\safe-copy.js" file "%%F" "%CLAUDE_DIR%\hooks\%%~nxF"
        )
    )
    echo       Done!
) else (
    echo       [skipped] hook bundle not selected
)
goto :after_claude_assets

:skip_claude_assets
echo [1/7] Skipping Claude global skills install... (Claude not selected)
echo.
echo [2/7] Skipping Claude global agents install... (Claude not selected)
echo.
echo [3/7] Skipping Claude global hooks install... (Claude not selected)

:after_claude_assets

REM Temporarily unset CLAUDECODE env var (prevent nested claude CLI session)
set "SAVE_CLAUDECODE=!CLAUDECODE!"
set "CLAUDECODE="

REM ============================================
REM   Phase 1: Claude (settings.json + CLAUDE.md + MCP + Orchestrator)
REM ============================================
if "!HAS_CLAUDE!"=="0" goto :phase_codex

REM MCP 등록은 claude CLI(`claude mcp add`)가 있어야 한다. 디렉터리 존재 여부와
REM 무관하게 PATH로 판정한다 - Claude Code 미설치 상태에서 자산만 깐 경우가 있다.
where claude >nul 2>nul && set "HAS_CLAUDE_CLI=1"

REM Hook config for settings.json (component-based filtering)
echo.
echo [4/7] Configuring settings.json hooks... (Claude)
node "%SCRIPT_DIR%install-hooks-config.js" "%CLAUDE_DIR%/hooks" "%CLAUDE_DIR%\settings.json" --windows --components !BUNDLES! --llms !LLMS!

REM Install CLAUDE.md long-term memory rules (mnemo: required)
echo.
echo [5/7] Installing CLAUDE.md memory rules... - Claude [required]
node "%SCRIPT_DIR%install-claude-md.js" "%CLAUDE_DIR%\CLAUDE.md" "%SCRIPT_DIR%skills\mnemo\templates\claude-md-rules.md"

REM Auto-install MCP servers (core)
echo.
echo [6/7] Installing MCP servers... - Claude default stable set [core]
if "!HAS_CLAUDE_CLI!"=="1" (
    echo.
    echo       Available MCP servers:
    node "%SCRIPT_DIR%install-mcp.js" --list
    echo.
    echo       Starting default MCP auto-install: !DEFAULT_MCP_SERVERS!
    echo.
    node "%SCRIPT_DIR%install-mcp.js" !DEFAULT_MCP_SERVERS!
    echo.
    echo       Done. Additional install: node "%SCRIPT_DIR%install-mcp.js" --list
    set "CLAUDE_MCP_RESULT=Installed"
) else (
    set "CLAUDE_MCP_RESULT=Skip: claude CLI not found"
    echo       !CLAUDE_MCP_RESULT!
)

REM Register Orchestrator MCP server (required)
echo.
echo [7/7] Registering Orchestrator MCP... - Claude [required]
if 1==1 (
    REM source-only 모듈 라이브러리는 discovery 밖에 있지만 MCP 런타임은 여기서 직접 사용한다.
    set "ORCH_DIR=%CLAUDE_DIR%\.olympus\runtime-modules\orchestrator\mcp-server"
    set "ORCH_DIST=!ORCH_DIR!\dist\index.js"
    set "ORCH_SDK=!ORCH_DIR!\node_modules\@modelcontextprotocol\sdk\package.json"
    set "ORCH_SQLITE=!ORCH_DIR!\node_modules\better-sqlite3\package.json"
    set "NEED_ORCH_BUILD=0"
    if not exist "!ORCH_DIST!" set "NEED_ORCH_BUILD=1"
    if not exist "!ORCH_SDK!" set "NEED_ORCH_BUILD=1"
    if not exist "!ORCH_SQLITE!" set "NEED_ORCH_BUILD=1"
    if "!NEED_ORCH_BUILD!"=="1" (
        echo       Installing MCP server dependencies...
        cd /d "!ORCH_DIR!" && call npm install >nul 2>nul && call npm run build >nul 2>nul
        cd /d "%SCRIPT_DIR%"
    )
    set "ORCH_READY=1"
    if not exist "!ORCH_DIST!" set "ORCH_READY=0"
    if not exist "!ORCH_SDK!" set "ORCH_READY=0"
    if not exist "!ORCH_SQLITE!" set "ORCH_READY=0"
    if "!ORCH_READY!"=="1" (
        REM 빌드는 CLI 유무와 무관하게 해둔다 - Claude Code를 나중에 깔고 재실행하면
        REM 등록만 하면 되도록. 등록 자체는 claude CLI가 있어야 한다.
        if "!HAS_CLAUDE_CLI!"=="1" (
            REM `call` 필수 - PATH의 claude가 npm shim(claude.cmd)이면 call 없이 부를 때
            REM 제어가 돌아오지 않아 install.bat이 여기서 통째로 끝난다(Codex/Antigravity 미실행).
            call claude mcp remove orchestrator -s user >nul 2>nul
            call claude mcp add orchestrator --scope user -- node "!ORCH_DIST:\=/!" >nul 2>nul
            set "CLAUDE_ORCH_RESULT=Registered"
        ) else (
            set "CLAUDE_ORCH_RESULT=Skip: claude CLI not found"
        )
    ) else (
        set "CLAUDE_ORCH_RESULT=Skip: dependencies/build failed"
        echo       [WARN] Run manually: cd /d "!ORCH_DIR!" ^&^& npm install ^&^& npm run build
    )
    echo       !CLAUDE_ORCH_RESULT!
)

REM Mnemo healthcheck + auto-repair on failure (Claude)
echo.
echo   [Mnemo check] Verifying Claude long-term memory system...
node "%SCRIPT_DIR%skills\mnemo\install.js" --check >nul 2>nul
if !errorlevel! neq 0 (
    echo       [repair] Issue found - retrying Mnemo install...
    node "%SCRIPT_DIR%skills\mnemo\install.js"
    node "%SCRIPT_DIR%skills\mnemo\install.js" --check >nul 2>nul
    if !errorlevel! neq 0 (
        echo       [WARN] Mnemo repair failed! Manual check required:
        echo              node "%SCRIPT_DIR%skills\mnemo\install.js" --check
    ) else (
        echo       [repair done] Mnemo verified OK
    )
) else (
    echo       Mnemo OK
)

REM ============================================
REM   Phase 2: Codex
REM ============================================
:phase_codex
if "!HAS_CODEX!"=="0" goto :phase_antigravity
echo.
echo   --- Codex CLI ---

REM Codex-Mnemo (required + retry on failure)
echo.
echo   Installing Codex-Mnemo... [required]
if exist "%SCRIPT_DIR%skills\codex-mnemo\install.js" (
    node "%SCRIPT_DIR%skills\codex-mnemo\install.js"
    if !errorlevel! neq 0 (
        echo       [retry] First attempt failed, reinstalling...
        node "%SCRIPT_DIR%skills\codex-mnemo\install.js"
        if !errorlevel! equ 0 (
            set "CODEX_MNEMO_RESULT=Installed after retry"
        ) else (
            set "CODEX_MNEMO_RESULT=Install failed (including retry)"
        )
    ) else (
        set "CODEX_MNEMO_RESULT=Installed"
    )
) else (
    set "CODEX_MNEMO_RESULT=Skip: no install.js"
)
echo       !CODEX_MNEMO_RESULT!

REM Sync Codex Skills/Agents/Hooks (always runs, required for zephermine)
echo.
echo   Syncing Codex Skills/Agents/Hooks...
if exist "%SCRIPT_DIR%scripts\sync-codex-assets.js" (
    node "%SCRIPT_DIR%scripts\sync-codex-assets.js" !SOURCE_ONLY_SKILL_FLAG! !SOURCE_ONLY_AGENT_FLAG!
    if !errorlevel! equ 0 (
        set "CODEX_SYNC_RESULT=Sync complete"
    ) else (
        set "CODEX_SYNC_RESULT=Sync failed"
        echo       [ERROR] Required policy sync failed: !errorlevel!
        exit /b 1
    )
) else (
    set "CODEX_SYNC_RESULT=Failed: no sync script"
    echo       [ERROR] sync-codex-assets.js not found
    exit /b 1
)
echo       !CODEX_SYNC_RESULT!

REM Codex MCP (core)
echo.
echo   Installing Codex MCP... [core]
if 1==1 (
    where codex >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "%SCRIPT_DIR%install-mcp-codex.js" (
            node "%SCRIPT_DIR%install-mcp-codex.js" !DEFAULT_MCP_SERVERS!
            if !errorlevel! equ 0 (
                set "CODEX_MCP_RESULT=Installed"
            ) else (
                set "CODEX_MCP_RESULT=Install failed"
            )
        ) else (
            set "CODEX_MCP_RESULT=Skip: no install-mcp-codex.js"
        )
        REM Current Codex releases ship stable multi-agent enabled by default.
        REM Preserve the user's feature configuration instead of mutating it.
        set "CODEX_MULTI_AGENT_RESULT=Native default (settings unchanged)"
    ) else (
        set "CODEX_MCP_RESULT=Skip: codex CLI not found"
        set "CODEX_MULTI_AGENT_RESULT=Skip: codex CLI not found"
    )
    echo       MCP: !CODEX_MCP_RESULT!, multi_agent: !CODEX_MULTI_AGENT_RESULT!
)

REM Codex Orchestrator MCP (required)
echo.
echo   Registering Codex Orchestrator MCP... [required]
if 1==1 (
    set "CODEX_ORCH_DIR=!CODEX_DIR!\.olympus\runtime-modules\orchestrator\mcp-server"
    set "CODEX_ORCH_DIST=!CODEX_ORCH_DIR!\dist\index.js"
    set "CODEX_ORCH_SDK=!CODEX_ORCH_DIR!\node_modules\@modelcontextprotocol\sdk\package.json"
    set "CODEX_ORCH_SQLITE=!CODEX_ORCH_DIR!\node_modules\better-sqlite3\package.json"
    set "NEED_CODEX_ORCH_BUILD=0"
    if not exist "!CODEX_ORCH_DIST!" set "NEED_CODEX_ORCH_BUILD=1"
    if not exist "!CODEX_ORCH_SDK!" set "NEED_CODEX_ORCH_BUILD=1"
    if not exist "!CODEX_ORCH_SQLITE!" set "NEED_CODEX_ORCH_BUILD=1"
    if "!NEED_CODEX_ORCH_BUILD!"=="1" (
        echo       Installing MCP server dependencies...
        cd /d "!CODEX_ORCH_DIR!" && call npm install >nul 2>nul && call npm run build >nul 2>nul
        cd /d "%SCRIPT_DIR%"
    )
    set "CODEX_ORCH_READY=1"
    if not exist "!CODEX_ORCH_DIST!" set "CODEX_ORCH_READY=0"
    if not exist "!CODEX_ORCH_SDK!" set "CODEX_ORCH_READY=0"
    if not exist "!CODEX_ORCH_SQLITE!" set "CODEX_ORCH_READY=0"
    where codex >nul 2>nul
    if !errorlevel! equ 0 (
        if "!CODEX_ORCH_READY!"=="1" (
            set "CODEX_ORCH_DIST_NORM=!CODEX_ORCH_DIST:\=/!"
            call codex mcp remove orchestrator >nul 2>nul
            call codex mcp add --env ORCHESTRATOR_WORKER_ID=pm orchestrator -- node "!CODEX_ORCH_DIST_NORM!" >nul 2>nul
            if !errorlevel! equ 0 (
                set "CODEX_ORCH_RESULT=Registered"
            ) else (
                set "CODEX_ORCH_RESULT=Register failed"
            )
        ) else (
            set "CODEX_ORCH_RESULT=Skip: dependencies/build failed"
            echo       [WARN] Run manually: cd /d "!CODEX_ORCH_DIR!" ^&^& npm install ^&^& npm run build
        )
    ) else (
        set "CODEX_ORCH_RESULT=Skip: codex CLI not found"
    )
    echo       !CODEX_ORCH_RESULT!
)

REM ============================================
REM   Phase 3: Google Antigravity
REM ============================================
:phase_antigravity
if "!HAS_ANTIGRAVITY!"=="0" goto :phase_grok
echo.
echo   --- Google Antigravity CLI ---

where agy >nul 2>nul
if !errorlevel! neq 0 echo       [WARN] agy CLI not found; assets will be installed for a later CLI setup.

echo.
echo   Installing Antigravity-Mnemo... [required]
if exist "%SCRIPT_DIR%skills\antigravity-mnemo\install.js" (
    node "%SCRIPT_DIR%skills\antigravity-mnemo\install.js"
    if !errorlevel! neq 0 (
        echo       [retry] First attempt failed, reinstalling...
        node "%SCRIPT_DIR%skills\antigravity-mnemo\install.js"
        if !errorlevel! equ 0 (
            set "ANTIGRAVITY_MNEMO_RESULT=Installed after retry"
        ) else (
            set "ANTIGRAVITY_MNEMO_RESULT=Install failed (including retry)"
        )
    ) else (
        set "ANTIGRAVITY_MNEMO_RESULT=Installed"
    )
) else (
    set "ANTIGRAVITY_MNEMO_RESULT=Skip: no install.js"
)
echo       !ANTIGRAVITY_MNEMO_RESULT!

echo.
echo   Syncing Antigravity Skills/Agents/Hooks...
if exist "%SCRIPT_DIR%scripts\sync-antigravity-assets.js" (
    node "%SCRIPT_DIR%scripts\sync-antigravity-assets.js" !SOURCE_ONLY_SKILL_FLAG! !SOURCE_ONLY_AGENT_FLAG!
    if !errorlevel! equ 0 (
        set "ANTIGRAVITY_SYNC_RESULT=Sync complete"
    ) else (
        set "ANTIGRAVITY_SYNC_RESULT=Sync failed"
        echo       [ERROR] Required policy sync failed: !errorlevel!
        exit /b 1
    )
) else (
    set "ANTIGRAVITY_SYNC_RESULT=Failed: no sync script"
    echo       [ERROR] sync-antigravity-assets.js not found
    exit /b 1
)
echo       !ANTIGRAVITY_SYNC_RESULT!

echo.
echo   Configuring Antigravity hooks.json...
node "%SCRIPT_DIR%install-hooks-config.js" "!ANTIGRAVITY_ROOT!/config/hooks" "!ANTIGRAVITY_ROOT!\config\hooks.json" --windows --components !BUNDLES! --llms !LLMS! --target antigravity
if !errorlevel! equ 0 (
    set "ANTIGRAVITY_HOOKS_RESULT=Configured"
) else (
    set "ANTIGRAVITY_HOOKS_RESULT=Configuration failed"
    exit /b 1
)

echo.
echo   Installing Antigravity MCP servers...
if exist "%SCRIPT_DIR%install-mcp-antigravity.js" (
    node "%SCRIPT_DIR%install-mcp-antigravity.js" !DEFAULT_MCP_SERVERS!
    if !errorlevel! equ 0 (
        set "ANTIGRAVITY_MCP_RESULT=Installed"
    ) else (
        set "ANTIGRAVITY_MCP_RESULT=Install failed"
    )
) else (
    set "ANTIGRAVITY_MCP_RESULT=Skip: no installer"
)

echo.
echo   Registering Antigravity Orchestrator MCP... [required]
set "ANTIGRAVITY_ORCH_DIR=!ANTIGRAVITY_ROOT!\antigravity-cli\.olympus\runtime-modules\orchestrator\mcp-server"
set "ANTIGRAVITY_ORCH_DIST=!ANTIGRAVITY_ORCH_DIR!\dist\index.js"
set "ANTIGRAVITY_ORCH_SDK=!ANTIGRAVITY_ORCH_DIR!\node_modules\@modelcontextprotocol\sdk\package.json"
set "ANTIGRAVITY_ORCH_SQLITE=!ANTIGRAVITY_ORCH_DIR!\node_modules\better-sqlite3\package.json"
set "NEED_ANTIGRAVITY_ORCH_BUILD=0"
if not exist "!ANTIGRAVITY_ORCH_DIST!" set "NEED_ANTIGRAVITY_ORCH_BUILD=1"
if not exist "!ANTIGRAVITY_ORCH_SDK!" set "NEED_ANTIGRAVITY_ORCH_BUILD=1"
if not exist "!ANTIGRAVITY_ORCH_SQLITE!" set "NEED_ANTIGRAVITY_ORCH_BUILD=1"
if "!NEED_ANTIGRAVITY_ORCH_BUILD!"=="1" (
    echo       Installing MCP server dependencies...
    cd /d "!ANTIGRAVITY_ORCH_DIR!" && call npm install >nul 2>nul && call npm run build >nul 2>nul
    cd /d "%SCRIPT_DIR%"
)
if exist "!ANTIGRAVITY_ORCH_DIST!" if exist "!ANTIGRAVITY_ORCH_SDK!" if exist "!ANTIGRAVITY_ORCH_SQLITE!" (
    node "%SCRIPT_DIR%install-mcp-antigravity.js" --orchestrator "!ANTIGRAVITY_ORCH_DIST!"
    if !errorlevel! equ 0 (
        set "ANTIGRAVITY_ORCH_RESULT=Registered"
    ) else (
        set "ANTIGRAVITY_ORCH_RESULT=Register failed"
    )
) else (
    set "ANTIGRAVITY_ORCH_RESULT=Skip: dependencies/build failed"
    echo       [WARN] Run manually: cd /d "!ANTIGRAVITY_ORCH_DIR!" ^&^& npm install ^&^& npm run build
)
echo       !ANTIGRAVITY_ORCH_RESULT!

REM ============================================
REM   Grok Build
REM ============================================
:phase_grok
if "!HAS_GROK!"=="0" if not exist "%USERPROFILE%\.grok" goto :phase_openclaw
REM Grok reads skills/agents/MCP/rules from ~/.claude/ via [compat.claude].
REM When Claude was not selected, prepare the minimal shared compatibility home
REM here; Grok's conversation hook still uses its own grok-mnemo adapter.
echo.
echo   --- Grok Build ---
echo.
echo   Installing Grok-Mnemo... [optional: auto-skip if Grok not installed]
if exist "%SCRIPT_DIR%skills\grok-mnemo\install.js" (
    if exist "%USERPROFILE%\.grok" (
        if "!HAS_CLAUDE!"=="0" (
            if exist "%SCRIPT_DIR%scripts\prune-stale-assets.js" (
                node "%SCRIPT_DIR%scripts\prune-stale-assets.js" "%CLAUDE_DIR%" --label grok-compat
                if !errorlevel! neq 0 (
                    echo       [ERROR] Grok compatibility stale asset quarantine failed: !errorlevel!
                    exit /b 1
                )
            )
            if exist "%SCRIPT_DIR%scripts\sync-claude-skills.js" (
                node "%SCRIPT_DIR%scripts\sync-claude-skills.js" "%CLAUDE_DIR%" !SOURCE_ONLY_SKILL_FLAG!
                if !errorlevel! neq 0 (
                    echo       [ERROR] Grok compatibility skill sync failed: !errorlevel!
                    exit /b 1
                )
            ) else (
                echo       [ERROR] sync-claude-skills.js not found
                exit /b 1
            )
            if exist "%SCRIPT_DIR%scripts\sync-claude-agents.js" (
                node "%SCRIPT_DIR%scripts\sync-claude-agents.js" "%CLAUDE_DIR%" !SOURCE_ONLY_AGENT_FLAG!
                if !errorlevel! neq 0 (
                    echo       [ERROR] Grok compatibility agent sync failed: !errorlevel!
                    exit /b 1
                )
            ) else (
                echo       [ERROR] sync-claude-agents.js not found
                exit /b 1
            )
            if exist "%SCRIPT_DIR%install-claude-md.js" node "%SCRIPT_DIR%install-claude-md.js" "%CLAUDE_DIR%\CLAUDE.md" "%SCRIPT_DIR%skills\mnemo\templates\claude-md-rules.md"
        )
        node "%SCRIPT_DIR%skills\grok-mnemo\install.js"
        if !errorlevel! equ 0 (
            set "GROK_MNEMO_RESULT=Installed"
        ) else (
            set "GROK_MNEMO_RESULT=Install failed"
        )
    ) else (
        set "GROK_MNEMO_RESULT=Skip: Grok CLI not found"
    )
) else (
    set "GROK_MNEMO_RESULT=Skip: no install.js"
)
echo       !GROK_MNEMO_RESULT!

REM ============================================
REM   OpenClaw skills-only host
REM ============================================
:phase_openclaw
if "!HAS_OPENCLAW!"=="0" goto :phase_hermes
echo.
echo   --- OpenClaw ^(skills only^) ---
node "%SCRIPT_DIR%scripts\sync-portable-skills.js" openclaw --home "!OPENCLAW_DIR!" !SOURCE_ONLY_SKILL_FLAG!
if !errorlevel! equ 0 (
    set "OPENCLAW_SYNC_RESULT=Skills synced"
) else (
    set "OPENCLAW_SYNC_RESULT=Sync failed"
    echo       [ERROR] OpenClaw skill sync failed: !errorlevel!
    exit /b 1
)

REM ============================================
REM   Hermes Agent skills-only host
REM ============================================
:phase_hermes
if "!HAS_HERMES!"=="0" goto :install_done
echo.
echo   --- Hermes Agent ^(skills only^) ---
node "%SCRIPT_DIR%scripts\sync-portable-skills.js" hermes --home "!HERMES_DIR!" !SOURCE_ONLY_SKILL_FLAG!
if !errorlevel! equ 0 (
    set "HERMES_SYNC_RESULT=Skills synced"
) else (
    set "HERMES_SYNC_RESULT=Sync failed"
    echo       [ERROR] Hermes skill sync failed: !errorlevel!
    exit /b 1
)

:install_done
REM Restore CLAUDECODE env var
set "CLAUDECODE=!SAVE_CLAUDECODE!"

echo.
echo ============================================
echo   Installation complete!
echo ============================================
echo.
echo   LLM: !LLMS!
echo   Bundles: !BUNDLES!
echo.
if "!HAS_CLAUDE!"=="1" (
    echo   [Claude]
    echo   - Skills: %CLAUDE_DIR%\skills\
    echo   - Agents: %CLAUDE_DIR%\agents\
    echo   - Catalogs: %CLAUDE_DIR%\SKILLS-CATALOG.md, %CLAUDE_DIR%\AGENTS-CATALOG.md
    echo   - CLAUDE.md memory rules registered
    echo   - MCP: !CLAUDE_MCP_RESULT!
    echo   - Orchestrator: !CLAUDE_ORCH_RESULT!
)
if "!HAS_CODEX!"=="1" (
    echo   [Codex]
    echo   - Mnemo: !CODEX_MNEMO_RESULT!
    echo   - Skills/Agents/Hooks: !CODEX_SYNC_RESULT!
    echo   - MCP: !CODEX_MCP_RESULT!
    echo   - multi_agent: !CODEX_MULTI_AGENT_RESULT!
    echo   - Orchestrator: !CODEX_ORCH_RESULT!
)
if "!HAS_ANTIGRAVITY!"=="1" (
    echo   [Antigravity]
    echo   - Mnemo: !ANTIGRAVITY_MNEMO_RESULT!
    echo   - Skills/Agents/Hooks: !ANTIGRAVITY_SYNC_RESULT!
    echo   - Hooks: !ANTIGRAVITY_HOOKS_RESULT!
    echo   - MCP: !ANTIGRAVITY_MCP_RESULT!
    echo   - Orchestrator: !ANTIGRAVITY_ORCH_RESULT!
)
if exist "%USERPROFILE%\.grok" (
    echo   [Grok]
    echo   - Mnemo: !GROK_MNEMO_RESULT!
    echo   - Skills/Agents/MCP: reads ~/.claude/ directly via compat.claude - no sync needed
)
if "!HAS_OPENCLAW!"=="1" (
    echo   [OpenClaw - skills only]
    echo   - Skills: !OPENCLAW_DIR!\skills\
    echo   - Catalog: !OPENCLAW_DIR!\SKILLS-CATALOG.md
    echo   - Plugins/Hooks/Mnemo/MCP: not installed
    echo   - Result: !OPENCLAW_SYNC_RESULT!
)
if "!HAS_HERMES!"=="1" (
    echo   [Hermes Agent - skills only]
    echo   - Skills: !HERMES_DIR!\skills\
    echo   - Catalog: !HERMES_DIR!\SKILLS-CATALOG.md
    echo   - Plugins/Hooks/Mnemo/MCP: not installed
    echo   - Result: !HERMES_SYNC_RESULT!
)
if "!CREATED_CLAUDE_DIR!"=="1" (
    echo.
    echo   [NOTE] %CLAUDE_DIR% did not exist and was created by this installer.
    echo          Assets are in place; Claude Code picks them up on its first run.
)
if "!HAS_CLAUDE!"=="1" if "!HAS_CLAUDE_CLI!"=="0" (
    echo.
    echo   [SKIPPED] Claude MCP registration - claude CLI not found in PATH.
    echo             Install Claude Code, then re-run this installer to register MCP.
)
if "!JQ_MISSING!"=="1" (
    echo.
    echo   [SKIPPED] jq is not installed.
    echo             PowerShell hooks work without it; the .sh hooks
    echo             ^(Git Bash / WSL^) will not. Install: winget install jqlang.jq
)
echo.
echo   If a same-name asset was preserved, use the "source -^> backup" path printed above.
echo   --uninstall does not restore preserved backups automatically; see docs\skill-registry-migration.md.
echo.
echo   Restart CLI to apply changes.
echo.

endlocal
pause
