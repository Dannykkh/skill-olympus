@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================
REM   Claude Code Customizations Installer
REM   Auto-install Skills, Agents, Hooks + MCP
REM   Usage: install.bat [--uninstall] [--all] [--llm ...] [--only ...] [--skip ...]
REM ============================================

set "SCRIPT_DIR=%~dp0"
set "CLAUDE_DIR=%USERPROFILE%\.claude"
set "CODEX_MNEMO_RESULT=not-run"
set "CODEX_SYNC_RESULT=not-run"
set "CODEX_MCP_RESULT=not-run"
set "CODEX_MULTI_AGENT_RESULT=not-run"
set "CODEX_ORCH_RESULT=not-run"
set "GEMINI_MNEMO_RESULT=not-run"
set "GEMINI_SYNC_RESULT=not-run"
set "GEMINI_MCP_RESULT=not-run"
set "GEMINI_ORCH_RESULT=not-run"
set "GEMINI_HOOKS_RESULT=not-run"
set "DEFAULT_MCP_SERVERS=context7 playwright chrome-devtools"
set "LEGACY_MCP_SERVERS=sequential-thinking"

REM Determine mode (scan all arguments)
set "MODE=copy"
for %%A in (%*) do (
    if /i "%%A"=="--uninstall" set "MODE=uninstall"
)

echo.
echo ============================================
if "%MODE%"=="uninstall" (
    echo   Claude Code Customizations Uninstaller
) else (
    echo   Claude Code Customizations Installer
)
echo ============================================
echo.

REM Check Claude directory exists
if not exist "%CLAUDE_DIR%" (
    echo [ERROR] Claude Code is not installed.
    echo        %CLAUDE_DIR% directory not found.
    pause
    exit /b 1
)

REM ============================================
REM   --uninstall mode: Clean up settings (MCP, Mnemo, Hooks, Codex, Gemini)
REM ============================================
if "%MODE%"=="uninstall" (
    echo [1/12] Removing settings.json hook config...
    node "%SCRIPT_DIR%install-hooks-config.js" "%CLAUDE_DIR%\hooks" "%CLAUDE_DIR%\settings.json" --uninstall
    echo       Done!

    echo.
    echo [2/12] Removing CLAUDE.md long-term memory rules...
    node "%SCRIPT_DIR%install-claude-md.js" "%CLAUDE_DIR%\CLAUDE.md" "%SCRIPT_DIR%skills\mnemo\templates\claude-md-rules.md" --uninstall
    echo       Done!

    echo.
    echo [3/12] MCP server settings are managed separately.
    echo       Uninstall: node "%SCRIPT_DIR%install-mcp.js" --uninstall ^<name^>
    echo       Done!

    echo.
    echo [4/12] Removing Orchestrator MCP...
    set "SAVE_CLAUDECODE=!CLAUDECODE!"
    set "CLAUDECODE="
    claude mcp remove orchestrator -s user >nul 2>nul
    set "CLAUDECODE=!SAVE_CLAUDECODE!"
    echo       Done!

    echo.
    echo [5/12] Removing Codex-Mnemo...
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
    echo [6/12] Unlinking Codex Skills/Agents/Hooks sync...
    if exist "%SCRIPT_DIR%scripts\sync-codex-assets.js" (
        node "%SCRIPT_DIR%scripts\sync-codex-assets.js" --unlink
        if !errorlevel! equ 0 (
            set "CODEX_SYNC_RESULT=Unlinked"
            echo       Done!
        ) else (
            set "CODEX_SYNC_RESULT=Unlink failed"
            echo       [WARN] Unlink failed exit: !errorlevel!
        )
    ) else (
        set "CODEX_SYNC_RESULT=Skip: no sync script"
        echo       [WARN] sync-codex-assets.js not found, skipping
    )

    echo.
    echo [7/12] Removing Codex MCP default/legacy set...
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
    echo [8/12] Removing Codex Orchestrator MCP...
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
    echo [9/12] Removing Gemini-Mnemo...
    if exist "%SCRIPT_DIR%skills\gemini-mnemo\install.js" (
        node "%SCRIPT_DIR%skills\gemini-mnemo\install.js" --uninstall
        if !errorlevel! equ 0 (
            set "GEMINI_MNEMO_RESULT=Removed"
            echo       Done!
        ) else (
            set "GEMINI_MNEMO_RESULT=Remove failed"
            echo       [WARN] Remove failed exit: !errorlevel!
        )
    ) else (
        set "GEMINI_MNEMO_RESULT=Skip: no install.js"
        echo       [WARN] install.js not found, skipping
    )

    echo.
    echo [10/12] Unlinking Gemini Skills/Agents/Hooks sync...
    if exist "%SCRIPT_DIR%scripts\sync-gemini-assets.js" (
        node "%SCRIPT_DIR%scripts\sync-gemini-assets.js" --unlink
        if !errorlevel! equ 0 (
            echo       Done!
        ) else (
            echo       [WARN] Unlink failed
        )
    ) else (
        echo       [WARN] sync-gemini-assets.js not found, skipping
    )

    echo.
    echo [11/12] Removing Gemini settings.json hooks...
    set "GEMINI_DIR=%USERPROFILE%\.gemini"
    if exist "!GEMINI_DIR!\settings.json" (
        node "%SCRIPT_DIR%install-hooks-config.js" "!GEMINI_DIR!\hooks" "!GEMINI_DIR!\settings.json" --uninstall
        echo       Done!
    ) else (
        echo       [WARN] Gemini settings.json not found, skipping
    )

    echo.
    echo [12/12] Removing Gemini MCP/Orchestrator...
    where gemini >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "%SCRIPT_DIR%install-mcp-gemini.js" (
            node "%SCRIPT_DIR%install-mcp-gemini.js" --uninstall !DEFAULT_MCP_SERVERS! !LEGACY_MCP_SERVERS!
        )
        call gemini mcp remove orchestrator >nul 2>nul
        echo       Done!
    ) else (
        echo       [WARN] gemini CLI not found, skipping
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
set "HAS_GEMINI=0"
echo ,!LLMS!, | findstr /i ",claude," >nul && set "HAS_CLAUDE=1"
echo ,!LLMS!, | findstr /i ",codex," >nul && set "HAS_CODEX=1"
echo ,!LLMS!, | findstr /i ",gemini," >nul && set "HAS_GEMINI=1"

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

REM ============================================
REM   Default mode: copy (bundle-based filtering)
REM ============================================

REM Clean up broken symlinks/junctions from previous install-link.bat
node "%SCRIPT_DIR%scripts\safe-copy.js" cleanup "%CLAUDE_DIR%"

REM Install Skills (global, bundle filtering)
echo [1/7] Installing Skills... (global) [core]
if exist "%SCRIPT_DIR%skills" (
    for /d %%D in ("%SCRIPT_DIR%skills\*") do (
        set "skill_name=%%~nxD"
        set "INSTALL_SKILL=1"
        REM Skip Codex-only / internal-only skills
        if /i "!skill_name!"=="agent-team-codex" set "INSTALL_SKILL=0"
        if /i "!skill_name!"=="deploymonitor" set "INSTALL_SKILL=0"
        if "!INSTALL_SKILL!"=="1" (
            echo       - !skill_name!
            node "%SCRIPT_DIR%scripts\safe-copy.js" dir "%%D" "%CLAUDE_DIR%\skills\!skill_name!"
        ) else (
            echo       - !skill_name! [skipped]
        )
    )
    echo       Done!
) else (
    echo       No skills found
)

REM Install Agents (global, core)
echo.
echo [2/7] Installing Agents... (global) [core]
node "%SCRIPT_DIR%scripts\safe-copy.js" mkdir "%CLAUDE_DIR%\agents"
if exist "%SCRIPT_DIR%agents" (
    for %%F in ("%SCRIPT_DIR%agents\*.md") do (
        echo       - %%~nxF
        node "%SCRIPT_DIR%scripts\safe-copy.js" file "%%F" "%CLAUDE_DIR%\agents\%%~nxF"
    )
)
for /d %%D in ("%SCRIPT_DIR%skills\*") do (
    if exist "%%D\agents" (
        for %%F in ("%%D\agents\*.md") do (
            echo       - %%~nxF [%%~nxD]
            node "%SCRIPT_DIR%scripts\safe-copy.js" file "%%F" "%CLAUDE_DIR%\agents\%%~nxF"
        )
    )
)
echo       Done!

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

REM Temporarily unset CLAUDECODE env var (prevent nested claude CLI session)
set "SAVE_CLAUDECODE=!CLAUDECODE!"
set "CLAUDECODE="

REM ============================================
REM   Phase 1: Claude (settings.json + CLAUDE.md + MCP + Orchestrator)
REM ============================================
if "!HAS_CLAUDE!"=="0" goto :phase_codex

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
if 1==1 (
    echo.
    echo       Available MCP servers:
    node "%SCRIPT_DIR%install-mcp.js" --list
    echo.
    echo       Starting default MCP auto-install: !DEFAULT_MCP_SERVERS!
    echo.
    node "%SCRIPT_DIR%install-mcp.js" !DEFAULT_MCP_SERVERS!
    echo.
    echo       Done. Additional install: node "%SCRIPT_DIR%install-mcp.js" --list
)

REM Register Orchestrator MCP server (required)
echo.
echo [7/7] Registering Orchestrator MCP... - Claude [required]
if 1==1 (
    set "ORCH_DIST=%SCRIPT_DIR%skills\orchestrator\mcp-server\dist\index.js"
    set "ORCH_SDK=%SCRIPT_DIR%skills\orchestrator\mcp-server\node_modules\@modelcontextprotocol\sdk\package.json"
    set "NEED_ORCH_BUILD=0"
    if not exist "!ORCH_DIST!" set "NEED_ORCH_BUILD=1"
    if not exist "!ORCH_SDK!" set "NEED_ORCH_BUILD=1"
    if "!NEED_ORCH_BUILD!"=="1" (
        echo       Building MCP server...
        cd /d "%SCRIPT_DIR%skills\orchestrator\mcp-server" && npm install >nul 2>nul && npm run build >nul 2>nul
        cd /d "%SCRIPT_DIR%"
    )
    if exist "!ORCH_DIST!" (
        claude mcp remove orchestrator -s user >nul 2>nul
        claude mcp add orchestrator --scope user -- node "!ORCH_DIST:\=/!" >nul 2>nul
        echo       Orchestrator MCP registered
    ) else (
        echo       [WARN] MCP server build failed, skipping
    )
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
if "!HAS_CODEX!"=="0" goto :phase_gemini
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
    node "%SCRIPT_DIR%scripts\sync-codex-assets.js"
    if !errorlevel! equ 0 (
        set "CODEX_SYNC_RESULT=Sync complete"
    ) else (
        set "CODEX_SYNC_RESULT=Sync failed"
    )
) else (
    set "CODEX_SYNC_RESULT=Skip: no sync script"
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
        call codex features enable multi_agent >nul 2>nul
        if !errorlevel! equ 0 (
            set "CODEX_MULTI_AGENT_RESULT=Enabled"
        ) else (
            set "CODEX_MULTI_AGENT_RESULT=Enable failed"
        )
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
    set "CODEX_ORCH_DIST=%SCRIPT_DIR%skills\orchestrator\mcp-server\dist\index.js"
    set "CODEX_ORCH_SDK=%SCRIPT_DIR%skills\orchestrator\mcp-server\node_modules\@modelcontextprotocol\sdk\package.json"
    set "NEED_CODEX_ORCH_BUILD=0"
    if not exist "!CODEX_ORCH_DIST!" set "NEED_CODEX_ORCH_BUILD=1"
    if not exist "!CODEX_ORCH_SDK!" set "NEED_CODEX_ORCH_BUILD=1"
    if "!NEED_CODEX_ORCH_BUILD!"=="1" (
        echo       Building MCP server...
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
                set "CODEX_ORCH_RESULT=Registered"
            ) else (
                set "CODEX_ORCH_RESULT=Register failed"
            )
        ) else (
            set "CODEX_ORCH_RESULT=Skip: build failed"
        )
    ) else (
        set "CODEX_ORCH_RESULT=Skip: codex CLI not found"
    )
    echo       !CODEX_ORCH_RESULT!
)

REM ============================================
REM   Phase 3: Gemini
REM ============================================
:phase_gemini
if "!HAS_GEMINI!"=="0" goto :install_done
echo.
echo   --- Gemini CLI ---

REM Gemini-Mnemo (required + retry on failure) - AGENTS.md rules + save-turn hook + context.fileName
echo.
echo   Installing Gemini-Mnemo... [required]
if exist "%SCRIPT_DIR%skills\gemini-mnemo\install.js" (
    node "%SCRIPT_DIR%skills\gemini-mnemo\install.js"
    if !errorlevel! neq 0 (
        echo       [retry] First attempt failed, reinstalling...
        node "%SCRIPT_DIR%skills\gemini-mnemo\install.js"
        if !errorlevel! equ 0 (
            set "GEMINI_MNEMO_RESULT=Installed after retry"
        ) else (
            set "GEMINI_MNEMO_RESULT=Install failed (including retry)"
        )
    ) else (
        set "GEMINI_MNEMO_RESULT=Installed"
    )
) else (
    set "GEMINI_MNEMO_RESULT=Skip: no install.js"
)
echo       !GEMINI_MNEMO_RESULT!

REM Sync Gemini Skills/Agents/Hooks (always runs, required for zephermine)
echo.
echo   Syncing Gemini Skills/Agents/Hooks...
if exist "%SCRIPT_DIR%scripts\sync-gemini-assets.js" (
    node "%SCRIPT_DIR%scripts\sync-gemini-assets.js"
    if !errorlevel! equ 0 (
        set "GEMINI_SYNC_RESULT=Sync complete"
    ) else (
        set "GEMINI_SYNC_RESULT=Sync failed"
    )
) else (
    set "GEMINI_SYNC_RESULT=Skip: no sync script"
)
echo       !GEMINI_SYNC_RESULT!

REM Gemini settings.json hook config (always set, required for mnemo)
set "GEMINI_DIR=%USERPROFILE%\.gemini"
set "NEED_GEMINI_HOOKS=1"
if "!NEED_GEMINI_HOOKS!"=="1" (
    echo.
    echo   Configuring Gemini settings.json hooks...
    REM Copy save-turn hook to gemini hooks directory
    node "%SCRIPT_DIR%scripts\safe-copy.js" mkdir "!GEMINI_DIR!\hooks"
    if exist "%SCRIPT_DIR%skills\gemini-mnemo\hooks\save-turn.ps1" (
        node "%SCRIPT_DIR%scripts\safe-copy.js" file "%SCRIPT_DIR%skills\gemini-mnemo\hooks\save-turn.ps1" "!GEMINI_DIR!\hooks\save-turn.ps1"
    )
    if exist "%SCRIPT_DIR%skills\gemini-mnemo\hooks\save-turn.sh" (
        node "%SCRIPT_DIR%scripts\safe-copy.js" file "%SCRIPT_DIR%skills\gemini-mnemo\hooks\save-turn.sh" "!GEMINI_DIR!\hooks\save-turn.sh"
    )
    node "%SCRIPT_DIR%install-hooks-config.js" "!GEMINI_DIR!/hooks" "!GEMINI_DIR!\settings.json" --windows --components !BUNDLES! --llms !LLMS! --target gemini
    set "GEMINI_HOOKS_RESULT=Configured"
) else (
    set "GEMINI_HOOKS_RESULT=Skipped: hook bundle not selected"
)

REM Gemini MCP (core)
echo.
echo   Installing Gemini MCP... [core]
if 1==1 (
    where gemini >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "%SCRIPT_DIR%install-mcp-gemini.js" (
            node "%SCRIPT_DIR%install-mcp-gemini.js" !DEFAULT_MCP_SERVERS!
            if !errorlevel! equ 0 (
                set "GEMINI_MCP_RESULT=Installed"
            ) else (
                set "GEMINI_MCP_RESULT=Install failed"
            )
        ) else (
            set "GEMINI_MCP_RESULT=Skip: no install-mcp-gemini.js"
        )
    ) else (
        set "GEMINI_MCP_RESULT=Skip: gemini CLI not found"
    )
    echo       MCP: !GEMINI_MCP_RESULT!
)

REM Gemini Orchestrator MCP (required)
echo.
echo   Registering Gemini Orchestrator MCP... [required]
if 1==1 (
    set "GEMINI_ORCH_DIST=%SCRIPT_DIR%skills\orchestrator\mcp-server\dist\index.js"
    set "GEMINI_ORCH_SDK=%SCRIPT_DIR%skills\orchestrator\mcp-server\node_modules\@modelcontextprotocol\sdk\package.json"
    set "NEED_GEMINI_ORCH_BUILD=0"
    if not exist "!GEMINI_ORCH_DIST!" set "NEED_GEMINI_ORCH_BUILD=1"
    if not exist "!GEMINI_ORCH_SDK!" set "NEED_GEMINI_ORCH_BUILD=1"
    if "!NEED_GEMINI_ORCH_BUILD!"=="1" (
        echo       Building MCP server...
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
                set "GEMINI_ORCH_RESULT=Registered"
            ) else (
                set "GEMINI_ORCH_RESULT=Register failed"
            )
        ) else (
            set "GEMINI_ORCH_RESULT=Skip: build failed"
        )
    ) else (
        set "GEMINI_ORCH_RESULT=Skip: gemini CLI not found"
    )
    echo       !GEMINI_ORCH_RESULT!
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
    echo   - CLAUDE.md memory rules registered
    echo   - MCP servers installed
    echo   - Orchestrator MCP registered
)
if "!HAS_CODEX!"=="1" (
    echo   [Codex]
    echo   - Mnemo: !CODEX_MNEMO_RESULT!
    echo   - Skills/Agents/Hooks: !CODEX_SYNC_RESULT!
    echo   - MCP: !CODEX_MCP_RESULT!
    echo   - multi_agent: !CODEX_MULTI_AGENT_RESULT!
    echo   - Orchestrator: !CODEX_ORCH_RESULT!
)
if "!HAS_GEMINI!"=="1" (
    echo   [Gemini]
    echo   - Mnemo: !GEMINI_MNEMO_RESULT!
    echo   - Skills/Agents/Hooks: !GEMINI_SYNC_RESULT!
    echo   - Hooks: !GEMINI_HOOKS_RESULT!
    echo   - MCP: !GEMINI_MCP_RESULT!
    echo   - Orchestrator: !GEMINI_ORCH_RESULT!
)
echo.
echo   Restart CLI to apply changes.
echo.

endlocal
pause
