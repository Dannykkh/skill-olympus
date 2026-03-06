@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================
REM   Claude Code Customizations Installer
REM   Skills, Agents, Hooks + MCP 자동 설치
REM   사용법: install.bat [--uninstall] [--with-open-websearch] [--all] [--llm ...] [--only ...] [--skip ...]
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
set "INCLUDE_OPEN_WEBSEARCH=0"
set "DEFAULT_MCP_SERVERS=context7 fetch playwright chrome-devtools"
set "LEGACY_MCP_SERVERS=open-websearch sequential-thinking"

REM 모드 결정 (인자 전체 스캔)
set "MODE=copy"
for %%A in (%*) do (
    if /i "%%A"=="--uninstall" set "MODE=uninstall"
    if /i "%%A"=="--with-open-websearch" set "INCLUDE_OPEN_WEBSEARCH=1"
)
if "!INCLUDE_OPEN_WEBSEARCH!"=="1" set "DEFAULT_MCP_SERVERS=!DEFAULT_MCP_SERVERS! open-websearch"

echo.
echo ============================================
if "%MODE%"=="uninstall" (
    echo   Claude Code Customizations Uninstaller
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
REM   --uninstall 모드: 설정 정리 (MCP, Mnemo, Hooks, Codex, Gemini)
REM ============================================
if "%MODE%"=="uninstall" (
    echo [1/12] settings.json 훅 설정 제거 중...
    node "%SCRIPT_DIR%install-hooks-config.js" "%CLAUDE_DIR%\hooks" "%CLAUDE_DIR%\settings.json" --uninstall
    echo       완료!

    echo.
    echo [2/12] CLAUDE.md 장기기억 규칙 제거 중...
    node "%SCRIPT_DIR%install-claude-md.js" "%CLAUDE_DIR%\CLAUDE.md" "%SCRIPT_DIR%skills\mnemo\templates\claude-md-rules.md" --uninstall
    echo       완료!

    echo.
    echo [3/12] MCP 서버 설정은 별도 관리됩니다.
    echo       제거: node "%SCRIPT_DIR%install-mcp.js" --uninstall ^<이름^>
    echo       완료!

    echo.
    echo [4/12] Orchestrator MCP 제거 중...
    set "SAVE_CLAUDECODE=!CLAUDECODE!"
    set "CLAUDECODE="
    claude mcp remove orchestrator -s user >nul 2>nul
    set "CLAUDECODE=!SAVE_CLAUDECODE!"
    echo       완료!

    echo.
    echo [5/12] Codex-Mnemo 제거 중...
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
    echo [6/12] Codex Skills/Agents 동기화 해제 중...
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
    echo [7/12] Codex MCP 기본/레거시 세트 제거 중...
    where codex >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "%SCRIPT_DIR%install-mcp-codex.js" (
            node "%SCRIPT_DIR%install-mcp-codex.js" --uninstall !DEFAULT_MCP_SERVERS! !LEGACY_MCP_SERVERS!
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
    echo [8/12] Codex Orchestrator MCP 제거 중...
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
    echo [9/12] Gemini-Mnemo 제거 중...
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
    echo [10/12] Gemini Skills/Agents/Hooks 동기화 해제 중...
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
    echo [11/12] Gemini settings.json 훅 제거 중...
    set "GEMINI_DIR=%USERPROFILE%\.gemini"
    if exist "!GEMINI_DIR!\settings.json" (
        node "%SCRIPT_DIR%install-hooks-config.js" "!GEMINI_DIR!\hooks" "!GEMINI_DIR!\settings.json" --uninstall
        echo       완료!
    ) else (
        echo       [경고] Gemini settings.json 없음, 건너뜀
    )

    echo.
    echo [12/12] Gemini MCP/Orchestrator 제거 중...
    where gemini >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "%SCRIPT_DIR%install-mcp-gemini.js" (
            node "%SCRIPT_DIR%install-mcp-gemini.js" --uninstall !DEFAULT_MCP_SERVERS! !LEGACY_MCP_SERVERS!
        )
        call gemini mcp remove orchestrator >nul 2>nul
        echo       완료!
    ) else (
        echo       [경고] gemini CLI 없음, 건너뜀
    )

    echo.
    echo ============================================
    echo   제거 완료!
    echo ============================================
    echo.
    echo   재설치하려면: install.bat
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
REM   기본 모드: 복사 (번들 기반 필터링)
REM ============================================

REM 이전 install-link.bat에서 생성된 깨진 심볼릭 링크 정리
node -e "const fs=require('fs'),p=require('path');['skills','agents','hooks'].forEach(function(d){var t=p.join(process.argv[1],d);try{if(fs.lstatSync(t).isSymbolicLink()){fs.unlinkSync(t);console.log('      [정리] broken symlink removed: '+d)}}catch(e){}})" "%CLAUDE_DIR%"

REM Skills 설치 (글로벌, 번들 필터링)
echo [1/7] Skills 설치 중... (글로벌) [코어]
if exist "%SCRIPT_DIR%skills" (
    for /d %%D in ("%SCRIPT_DIR%skills\*") do (
        set "skill_name=%%~nxD"
        set "INSTALL_SKILL=1"
        REM Codex 전용 / 내부 전용 스킬은 설치하지 않음
        if /i "!skill_name!"=="agent-team-codex" set "INSTALL_SKILL=0"
        if /i "!skill_name!"=="deploymonitor" set "INSTALL_SKILL=0"
        if "!INSTALL_SKILL!"=="1" (
            echo       - !skill_name!
            node -e "const fs=require('fs');fs.mkdirSync(process.argv[2],{recursive:true});fs.cpSync(process.argv[1],process.argv[2],{recursive:true,force:true})" "%%D" "%CLAUDE_DIR%\skills\!skill_name!"
        ) else (
            echo       - !skill_name! [건너뜀]
        )
    )
    echo       완료!
) else (
    echo       스킬 없음
)

REM Agents 설치 (글로벌, 코어)
echo.
echo [2/7] Agents 설치 중... (글로벌) [코어]
node -e "require('fs').mkdirSync(process.argv[1],{recursive:true})" "%CLAUDE_DIR%\agents"
if exist "%SCRIPT_DIR%agents" (
    for %%F in ("%SCRIPT_DIR%agents\*.md") do (
        echo       - %%~nxF
        node -e "require('fs').copyFileSync(process.argv[1],process.argv[2])" "%%F" "%CLAUDE_DIR%\agents\%%~nxF"
    )
)
for /d %%D in ("%SCRIPT_DIR%skills\*") do (
    if exist "%%D\agents" (
        for %%F in ("%%D\agents\*.md") do (
            echo       - %%~nxF [%%~nxD]
            node -e "require('fs').copyFileSync(process.argv[1],process.argv[2])" "%%F" "%CLAUDE_DIR%\agents\%%~nxF"
        )
    )
)
echo       완료!

REM Hooks 설치 (글로벌, mnemo 필수이므로 항상 설치)
echo.
echo [3/7] Hooks 설치 중... (글로벌) [mnemo 필수]
set "NEED_HOOKS=1"
if "!NEED_HOOKS!"=="1" (
    node -e "require('fs').mkdirSync(process.argv[1],{recursive:true})" "%CLAUDE_DIR%\hooks"
    if exist "%SCRIPT_DIR%hooks" (
        for %%F in ("%SCRIPT_DIR%hooks\*.ps1") do (
            echo %%~nxF | findstr /i "debug" >nul && (
                echo       - %%~nxF [스킵: 디버그]
            ) || (
                echo       - %%~nxF
                node -e "require('fs').copyFileSync(process.argv[1],process.argv[2])" "%%F" "%CLAUDE_DIR%\hooks\%%~nxF"
            )
        )
        for %%F in ("%SCRIPT_DIR%hooks\*.sh") do (
            echo %%~nxF | findstr /i "debug" >nul && (
                echo       - %%~nxF [스킵: 디버그]
            ) || (
                echo       - %%~nxF
                node -e "require('fs').copyFileSync(process.argv[1],process.argv[2])" "%%F" "%CLAUDE_DIR%\hooks\%%~nxF"
            )
        )
        for %%F in ("%SCRIPT_DIR%hooks\*.js") do (
            echo       - %%~nxF
            node -e "require('fs').copyFileSync(process.argv[1],process.argv[2])" "%%F" "%CLAUDE_DIR%\hooks\%%~nxF"
        )
    )
    echo       완료!
) else (
    echo       [건너뜀] 훅 번들 미선택
)

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

REM CLAUDE.md 장기기억 규칙 설치 (mnemo: 필수 설치)
echo.
echo [5/7] CLAUDE.md 장기기억 규칙 설치 중... - Claude [필수]
node "%SCRIPT_DIR%install-claude-md.js" "%CLAUDE_DIR%\CLAUDE.md" "%SCRIPT_DIR%skills\mnemo\templates\claude-md-rules.md"

REM MCP 서버 자동 설치 (코어)
echo.
echo [6/7] MCP 서버 설치 중... - Claude 기본 안정 세트 [코어]
if 1==1 (
    echo.
    echo       사용 가능한 MCP 서버:
    node "%SCRIPT_DIR%install-mcp.js" --list
    echo.
    echo       기본 MCP 자동 설치를 시작합니다: !DEFAULT_MCP_SERVERS!
    echo.
    node "%SCRIPT_DIR%install-mcp.js" !DEFAULT_MCP_SERVERS!
    echo.
    echo       완료. 추가 설치: node "%SCRIPT_DIR%install-mcp.js" --list, 선택: open-websearch
)

REM Orchestrator MCP 서버 등록 (필수 설치)
echo.
echo [7/7] Orchestrator MCP 서버 등록 중... - Claude [필수]
if 1==1 (
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
)

REM Mnemo 헬스체크 + 실패 시 자동 복구 (Claude)
echo.
echo   [Mnemo 검증] Claude 장기기억 시스템 확인 중...
node "%SCRIPT_DIR%skills\mnemo\install.js" --check >nul 2>nul
if !errorlevel! neq 0 (
    echo       [복구] 문제 발견 - Mnemo 재설치 시도...
    node "%SCRIPT_DIR%skills\mnemo\install.js"
    node "%SCRIPT_DIR%skills\mnemo\install.js" --check >nul 2>nul
    if !errorlevel! neq 0 (
        echo       [경고] Mnemo 복구 실패! 수동 확인 필요:
        echo              node "%SCRIPT_DIR%skills\mnemo\install.js" --check
    ) else (
        echo       [복구 완료] Mnemo 정상 확인
    )
) else (
    echo       Mnemo 정상
)

REM ============================================
REM   Phase 2: Codex
REM ============================================
:phase_codex
if "!HAS_CODEX!"=="0" goto :phase_gemini
echo.
echo   --- Codex CLI ---

REM Codex-Mnemo (필수 설치 + 실패 시 재시도)
echo.
echo   Codex-Mnemo 설치 중... [필수]
if exist "%SCRIPT_DIR%skills\codex-mnemo\install.js" (
    node "%SCRIPT_DIR%skills\codex-mnemo\install.js"
    if !errorlevel! neq 0 (
        echo       [재시도] 첫 번째 시도 실패, 재설치...
        node "%SCRIPT_DIR%skills\codex-mnemo\install.js"
        if !errorlevel! equ 0 (
            set "CODEX_MNEMO_RESULT=재시도 후 설치 완료"
        ) else (
            set "CODEX_MNEMO_RESULT=설치 실패 (재시도 포함)"
        )
    ) else (
        set "CODEX_MNEMO_RESULT=설치 완료"
    )
) else (
    set "CODEX_MNEMO_RESULT=스킵: install.js 없음"
)
echo       !CODEX_MNEMO_RESULT!

REM Codex Skills/Agents 동기화 (zephermine 필수이므로 항상 실행)
echo.
echo   Codex Skills/Agents 동기화 중...
if exist "%SCRIPT_DIR%scripts\sync-codex-assets.js" (
    node "%SCRIPT_DIR%scripts\sync-codex-assets.js"
    if !errorlevel! equ 0 (
        set "CODEX_SYNC_RESULT=동기화 완료"
    ) else (
        set "CODEX_SYNC_RESULT=동기화 실패"
    )
) else (
    set "CODEX_SYNC_RESULT=스킵: sync 스크립트 없음"
)
echo       !CODEX_SYNC_RESULT!

REM Codex MCP (코어)
echo.
echo   Codex MCP 설치 중... [코어]
if 1==1 (
    where codex >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "%SCRIPT_DIR%install-mcp-codex.js" (
            node "%SCRIPT_DIR%install-mcp-codex.js" !DEFAULT_MCP_SERVERS!
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
)

REM Codex Orchestrator MCP (필수 설치)
echo.
echo   Codex Orchestrator MCP 등록 중... [필수]
if 1==1 (
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
)

REM ============================================
REM   Phase 3: Gemini
REM ============================================
:phase_gemini
if "!HAS_GEMINI!"=="0" goto :install_done
echo.
echo   --- Gemini CLI ---

REM Gemini-Mnemo (필수 설치 + 실패 시 재시도) — AGENTS.md 규칙 + save-turn 훅 + context.fileName
echo.
echo   Gemini-Mnemo 설치 중... [필수]
if exist "%SCRIPT_DIR%skills\gemini-mnemo\install.js" (
    node "%SCRIPT_DIR%skills\gemini-mnemo\install.js"
    if !errorlevel! neq 0 (
        echo       [재시도] 첫 번째 시도 실패, 재설치...
        node "%SCRIPT_DIR%skills\gemini-mnemo\install.js"
        if !errorlevel! equ 0 (
            set "GEMINI_MNEMO_RESULT=재시도 후 설치 완료"
        ) else (
            set "GEMINI_MNEMO_RESULT=설치 실패 (재시도 포함)"
        )
    ) else (
        set "GEMINI_MNEMO_RESULT=설치 완료"
    )
) else (
    set "GEMINI_MNEMO_RESULT=스킵: install.js 없음"
)
echo       !GEMINI_MNEMO_RESULT!

REM Gemini Skills/Agents/Hooks 동기화 (zephermine 필수이므로 항상 실행)
echo.
echo   Gemini Skills/Agents/Hooks 동기화 중...
if exist "%SCRIPT_DIR%scripts\sync-gemini-assets.js" (
    node "%SCRIPT_DIR%scripts\sync-gemini-assets.js"
    if !errorlevel! equ 0 (
        set "GEMINI_SYNC_RESULT=동기화 완료"
    ) else (
        set "GEMINI_SYNC_RESULT=동기화 실패"
    )
) else (
    set "GEMINI_SYNC_RESULT=스킵: sync 스크립트 없음"
)
echo       !GEMINI_SYNC_RESULT!

REM Gemini settings.json 훅 설정 (mnemo 필수이므로 항상 설정)
set "GEMINI_DIR=%USERPROFILE%\.gemini"
set "NEED_GEMINI_HOOKS=1"
if "!NEED_GEMINI_HOOKS!"=="1" (
    echo.
    echo   Gemini settings.json 훅 설정 중...
    REM save-turn 훅을 gemini hooks 디렉토리에 복사
    node -e "require('fs').mkdirSync(process.argv[1],{recursive:true})" "!GEMINI_DIR!\hooks"
    if exist "%SCRIPT_DIR%skills\gemini-mnemo\hooks\save-turn.ps1" (
        node -e "require('fs').copyFileSync(process.argv[1],process.argv[2])" "%SCRIPT_DIR%skills\gemini-mnemo\hooks\save-turn.ps1" "!GEMINI_DIR!\hooks\save-turn.ps1"
    )
    if exist "%SCRIPT_DIR%skills\gemini-mnemo\hooks\save-turn.sh" (
        node -e "require('fs').copyFileSync(process.argv[1],process.argv[2])" "%SCRIPT_DIR%skills\gemini-mnemo\hooks\save-turn.sh" "!GEMINI_DIR!\hooks\save-turn.sh"
    )
    node "%SCRIPT_DIR%install-hooks-config.js" "!GEMINI_DIR!/hooks" "!GEMINI_DIR!\settings.json" --windows --components !BUNDLES! --llms !LLMS! --target gemini
    set "GEMINI_HOOKS_RESULT=설정 완료"
) else (
    set "GEMINI_HOOKS_RESULT=건너뜀: 훅 번들 미선택"
)

REM Gemini MCP (코어)
echo.
echo   Gemini MCP 설치 중... [코어]
if 1==1 (
    where gemini >nul 2>nul
    if !errorlevel! equ 0 (
        if exist "%SCRIPT_DIR%install-mcp-gemini.js" (
            node "%SCRIPT_DIR%install-mcp-gemini.js" !DEFAULT_MCP_SERVERS!
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
)

REM Gemini Orchestrator MCP (필수 설치)
echo.
echo   Gemini Orchestrator MCP 등록 중... [필수]
if 1==1 (
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
)

:install_done
REM CLAUDECODE 환경변수 복원
set "CLAUDECODE=!SAVE_CLAUDECODE!"

echo.
echo ============================================
echo   설치 완료!
echo ============================================
echo.
echo   LLM: !LLMS!
echo   번들: !BUNDLES!
echo.
if "!HAS_CLAUDE!"=="1" (
    echo   [Claude]
    echo   - Skills: %CLAUDE_DIR%\skills\
    echo   - Agents: %CLAUDE_DIR%\agents\
    echo   - CLAUDE.md 장기기억 규칙 등록 완료
    echo   - MCP 서버 설치 완료
    echo   - Orchestrator MCP 등록 완료
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
