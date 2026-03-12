#!/bin/bash
# ============================================
#   Claude Code Customizations Installer
#   Skills, Agents, Hooks + MCP 자동 설치
#   사용법: install.sh [--uninstall] [--all] [--llm ...] [--only ...] [--skip ...]
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
CODEX_MNEMO_RESULT="미실행"
CODEX_SYNC_RESULT="미실행"
CODEX_MCP_RESULT="미실행"
CODEX_MULTI_AGENT_RESULT="미실행"
CODEX_ORCH_RESULT="미실행"
GEMINI_MNEMO_RESULT="미실행"
GEMINI_SYNC_RESULT="미실행"
GEMINI_MCP_RESULT="미실행"
GEMINI_ORCH_RESULT="미실행"
GEMINI_HOOKS_RESULT="미실행"

# 모드 결정 (인자 전체 스캔)
MODE="copy"
for arg in "$@"; do
    case "$arg" in
        --uninstall) MODE="uninstall" ;;
    esac
done

echo ""
echo "============================================"
if [ "$MODE" = "uninstall" ]; then
    echo "  Claude Code Customizations Uninstaller"
else
    echo "  Claude Code Customizations Installer"
fi
echo "============================================"
echo ""

# Claude 폴더 확인
if [ ! -d "$CLAUDE_DIR" ]; then
    echo "[오류] Claude Code가 설치되어 있지 않습니다."
    echo "       $CLAUDE_DIR 폴더를 찾을 수 없습니다."
    exit 1
fi

# ============================================
#   --uninstall 모드: 설정 정리 (MCP, Mnemo, Hooks, Codex, Gemini)
# ============================================
if [ "$MODE" = "uninstall" ]; then
    echo "[1/12] settings.json 훅 설정 제거 중..."
    node "$SCRIPT_DIR/install-hooks-config.js" "$CLAUDE_DIR/hooks" "$CLAUDE_DIR/settings.json" --uninstall
    echo "      완료!"

    echo ""
    echo "[2/12] CLAUDE.md 장기기억 규칙 제거 중..."
    node "$SCRIPT_DIR/install-claude-md.js" "$CLAUDE_DIR/CLAUDE.md" "$SCRIPT_DIR/skills/mnemo/templates/claude-md-rules.md" --uninstall
    echo "      완료!"

    echo ""
    echo "[3/12] MCP 서버 설정은 별도 관리됩니다."
    echo "      제거: node \"$SCRIPT_DIR/install-mcp.js\" --uninstall <이름>"
    echo "      완료!"

    echo ""
    echo "[4/12] Orchestrator MCP 제거 중..."
    SAVE_CLAUDECODE="${CLAUDECODE:-}"
    unset CLAUDECODE
    claude mcp remove orchestrator -s user >/dev/null 2>&1 || true
    if [ -n "$SAVE_CLAUDECODE" ]; then
        export CLAUDECODE="$SAVE_CLAUDECODE"
    fi
    echo "      완료!"

    echo ""
    echo "[5/12] Codex-Mnemo 제거 중..."
    if [ -f "$SCRIPT_DIR/skills/codex-mnemo/install.js" ]; then
        if node "$SCRIPT_DIR/skills/codex-mnemo/install.js" --uninstall; then
            CODEX_MNEMO_RESULT="제거 완료"
            echo "      완료!"
        else
            CODEX_MNEMO_RESULT="제거 실패"
            echo "      [경고] 제거 실패"
        fi
    else
        CODEX_MNEMO_RESULT="스킵(install.js 없음)"
        echo "      [경고] install.js 없음, 건너뜀"
    fi

    echo ""
    echo "[6/12] Codex Skills/Agents/Hooks 동기화 해제 중..."
    if [ -f "$SCRIPT_DIR/scripts/sync-codex-assets.js" ]; then
        if node "$SCRIPT_DIR/scripts/sync-codex-assets.js" --unlink; then
            CODEX_SYNC_RESULT="해제 완료"
            echo "      완료!"
        else
            CODEX_SYNC_RESULT="해제 실패"
            echo "      [경고] 해제 실패"
        fi
    else
        CODEX_SYNC_RESULT="스킵(sync 스크립트 없음)"
        echo "      [경고] sync-codex-assets.js 없음, 건너뜀"
    fi

    echo ""
    echo "[7/12] Codex MCP 제거 중..."
    if command -v codex >/dev/null 2>&1; then
        if [ -f "$SCRIPT_DIR/install-mcp-codex.js" ]; then
            if node "$SCRIPT_DIR/install-mcp-codex.js" --uninstall context7 fetch playwright sequential-thinking; then
                CODEX_MCP_RESULT="제거 완료"
                echo "      완료!"
            else
                CODEX_MCP_RESULT="제거 부분 실패"
                echo "      [경고] 일부 제거 실패"
            fi
        else
            CODEX_MCP_RESULT="스킵(install-mcp-codex.js 없음)"
            echo "      [경고] install-mcp-codex.js 없음, 건너뜀"
        fi
    else
        CODEX_MCP_RESULT="스킵(codex CLI 없음)"
        echo "      [경고] codex CLI 없음, 건너뜀"
    fi

    echo ""
    echo "[8/12] Codex Orchestrator MCP 제거 중..."
    if command -v codex >/dev/null 2>&1; then
        if codex mcp remove orchestrator >/dev/null 2>&1; then
            CODEX_ORCH_RESULT="제거 완료"
            echo "      완료!"
        else
            CODEX_ORCH_RESULT="스킵/실패"
            echo "      [경고] 제거 실패 또는 미등록"
        fi
    else
        CODEX_ORCH_RESULT="스킵(codex CLI 없음)"
        echo "      [경고] codex CLI 없음, 건너뜀"
    fi

    echo ""
    echo "[9/12] Gemini-Mnemo 제거 중..."
    if [ -f "$SCRIPT_DIR/skills/gemini-mnemo/install.js" ]; then
        if node "$SCRIPT_DIR/skills/gemini-mnemo/install.js" --uninstall; then
            GEMINI_MNEMO_RESULT="제거 완료"
            echo "      완료!"
        else
            GEMINI_MNEMO_RESULT="제거 실패"
            echo "      [경고] 제거 실패"
        fi
    else
        GEMINI_MNEMO_RESULT="스킵(install.js 없음)"
        echo "      [경고] install.js 없음, 건너뜀"
    fi

    echo ""
    echo "[10/12] Gemini Skills/Agents/Hooks 동기화 해제 중..."
    if [ -f "$SCRIPT_DIR/scripts/sync-gemini-assets.js" ]; then
        if node "$SCRIPT_DIR/scripts/sync-gemini-assets.js" --unlink; then
            echo "      완료!"
        else
            echo "      [경고] 해제 실패"
        fi
    else
        echo "      [경고] sync-gemini-assets.js 없음, 건너뜀"
    fi

    echo ""
    GEMINI_DIR="$HOME/.gemini"
    echo "[11/12] Gemini settings.json 훅 제거 중..."
    if [ -f "$GEMINI_DIR/settings.json" ]; then
        node "$SCRIPT_DIR/install-hooks-config.js" "$GEMINI_DIR/hooks" "$GEMINI_DIR/settings.json" --uninstall
        echo "      완료!"
    else
        echo "      [경고] Gemini settings.json 없음, 건너뜀"
    fi

    echo ""
    echo "[12/12] Gemini MCP/Orchestrator 제거 중..."
    if command -v gemini >/dev/null 2>&1; then
        if [ -f "$SCRIPT_DIR/install-mcp-gemini.js" ]; then
            node "$SCRIPT_DIR/install-mcp-gemini.js" --uninstall context7 fetch playwright sequential-thinking
        fi
        gemini mcp remove orchestrator >/dev/null 2>&1 || true
        echo "      완료!"
    else
        echo "      [경고] gemini CLI 없음, 건너뜀"
    fi

    echo ""
    echo "============================================"
    echo "  제거 완료!"
    echo "============================================"
    echo ""
    echo "  재설치하려면: ./install.sh"
    echo ""
    exit 0
fi

# ============================================
#   컴포넌트 선택 (install-select.js)
# ============================================
LINENUM=0
LLMS=""
BUNDLES=""
while IFS= read -r line; do
    LINENUM=$((LINENUM + 1))
    if [ "$LINENUM" -eq 1 ]; then LLMS="$line"; fi
    if [ "$LINENUM" -eq 2 ]; then BUNDLES="$line"; fi
done < <(node "$SCRIPT_DIR/install-select.js" "$@")

if [ -z "$LLMS" ]; then
    echo "[취소] 설치를 취소했습니다."
    exit 0
fi

# LLM/번들 플래그 파싱 헬퍼
has_llm()    { echo ",$LLMS," | grep -qi ",$1,"; }
has_bundle() { echo ",$BUNDLES," | grep -qi ",$1,"; }

HAS_CLAUDE=0; has_llm "claude" && HAS_CLAUDE=1
HAS_CODEX=0;  has_llm "codex"  && HAS_CODEX=1
HAS_GEMINI=0; has_llm "gemini" && HAS_GEMINI=1

HAS_ZEPHERMINE=0;  has_bundle "zephermine"  && HAS_ZEPHERMINE=1
HAS_AGENT_TEAM=0;  has_bundle "agent-team"  && HAS_AGENT_TEAM=1
HAS_MNEMO=0;        has_bundle "mnemo"       && HAS_MNEMO=1
HAS_ORCHESTRATOR=0; has_bundle "orchestrator" && HAS_ORCHESTRATOR=1
HAS_MCP=0;          has_bundle "mcp"          && HAS_MCP=1

HAS_ALL_BUNDLES=0
if [ "$HAS_ZEPHERMINE$HAS_AGENT_TEAM$HAS_MNEMO$HAS_ORCHESTRATOR$HAS_MCP" = "11111" ]; then
    HAS_ALL_BUNDLES=1
fi

echo "  LLM: $LLMS"
echo "  번들: $BUNDLES"
echo ""

# ============================================
#   복사 모드: Skills/Agents/Hooks 설치
# ============================================

    # Skills 설치 (코어 설치)
    echo "[1/7] Skills 설치 중... (글로벌) [코어]"
    if [ -d "$SCRIPT_DIR/skills" ]; then
        for skill_dir in "$SCRIPT_DIR/skills"/*/; do
            if [ -d "$skill_dir" ]; then
                skill_name=$(basename "$skill_dir")
                INSTALL_SKILL=1
                # Codex 전용 / 내부 전용 스킬은 설치하지 않음
                [ "$skill_name" = "agent-team-codex" ] && INSTALL_SKILL=0
                [ "$skill_name" = "deploymonitor" ] && INSTALL_SKILL=0
                if [ "$INSTALL_SKILL" = "1" ]; then
                    echo "      - $skill_name"
                    mkdir -p "$CLAUDE_DIR/skills/$skill_name"
                    cp -r "$skill_dir"* "$CLAUDE_DIR/skills/$skill_name/"
                else
                    echo "      - $skill_name [건너뜀]"
                fi
            fi
        done
        echo "      완료!"
    else
        echo "      스킬 없음"
    fi

    # Agents 설치 (코어)
    echo ""
    echo "[2/7] Agents 설치 중... (글로벌) [코어]"
    mkdir -p "$CLAUDE_DIR/agents"
    if [ -d "$SCRIPT_DIR/agents" ]; then
        for agent_file in "$SCRIPT_DIR/agents"/*.md; do
            [ -f "$agent_file" ] && echo "      - $(basename "$agent_file")" && cp "$agent_file" "$CLAUDE_DIR/agents/"
        done
    fi
    for skill_dir in "$SCRIPT_DIR/skills"/*/; do
        if [ -d "${skill_dir}agents" ]; then
            skill_name=$(basename "$skill_dir")
            for agent_file in "${skill_dir}agents"/*.md; do
                [ -f "$agent_file" ] && echo "      - $(basename "$agent_file") [$skill_name]" && cp "$agent_file" "$CLAUDE_DIR/agents/"
            done
        fi
    done
    echo "      완료!"

    # Hooks 설치 (mnemo 필수이므로 항상 설치)
    echo ""
    echo "[3/7] Hooks 설치 중... (글로벌) [mnemo 필수]"
    NEED_HOOKS=1
    if [ "$NEED_HOOKS" = "1" ] && [ -d "$SCRIPT_DIR/hooks" ]; then
        mkdir -p "$CLAUDE_DIR/hooks"
        for hook_file in "$SCRIPT_DIR/hooks"/*.sh; do
            [ -f "$hook_file" ] && hook_name=$(basename "$hook_file") && echo "      - $hook_name" && cp "$hook_file" "$CLAUDE_DIR/hooks/" && chmod +x "$CLAUDE_DIR/hooks/$hook_name"
        done
        for hook_file in "$SCRIPT_DIR/hooks"/*.ps1; do
            [ -f "$hook_file" ] && echo "      - $(basename "$hook_file")" && cp "$hook_file" "$CLAUDE_DIR/hooks/"
        done
        for hook_file in "$SCRIPT_DIR/hooks"/*.js; do
            [ -f "$hook_file" ] && echo "      - $(basename "$hook_file")" && cp "$hook_file" "$CLAUDE_DIR/hooks/"
        done
        echo "      완료!"
    else
        echo "      [건너뜀] 훅 번들 미선택"
    fi

# CLAUDECODE 환경변수 임시 해제 (claude CLI 중첩 세션 방지)
SAVE_CLAUDECODE="${CLAUDECODE:-}"
unset CLAUDECODE

# ============================================
#   Phase 1: Claude (settings.json + CLAUDE.md + MCP + Orchestrator)
# ============================================
if [ "$HAS_CLAUDE" = "1" ]; then

# settings.json 훅 설정 (컴포넌트 기반 필터링)
echo ""
echo "[4/7] settings.json 훅 설정 중... (Claude)"
node "$SCRIPT_DIR/install-hooks-config.js" "$CLAUDE_DIR/hooks" "$CLAUDE_DIR/settings.json" --bash --components "$BUNDLES" --llms "$LLMS"

# CLAUDE.md 장기기억 규칙 (mnemo: 필수 설치)
echo ""
echo "[5/7] CLAUDE.md 장기기억 규칙 설치 중... (Claude) [필수]"
node "$SCRIPT_DIR/install-claude-md.js" "$CLAUDE_DIR/CLAUDE.md" "$SCRIPT_DIR/skills/mnemo/templates/claude-md-rules.md"

# MCP 서버 자동 설치 (코어)
echo ""
echo "[6/7] MCP 서버 설치 중... (Claude, 무료만 자동 설치) [코어]"
if true; then
    echo ""
    echo "      사용 가능한 MCP 서버:"
    node "$SCRIPT_DIR/install-mcp.js" --list
    echo ""
    echo "      무료 MCP 자동 설치를 시작합니다..."
    echo ""
    node "$SCRIPT_DIR/install-mcp.js" --all
    echo ""
    echo "      완료! (추가: node \"$SCRIPT_DIR/install-mcp.js\" --list)"
fi

# Orchestrator MCP 서버 등록 (필수 설치)
echo ""
echo "[7/7] Orchestrator MCP 서버 등록 중... (Claude) [필수]"
if true; then
    ORCH_DIST="$SCRIPT_DIR/skills/orchestrator/mcp-server/dist/index.js"
    ORCH_SDK="$SCRIPT_DIR/skills/orchestrator/mcp-server/node_modules/@modelcontextprotocol/sdk/package.json"
    if [ ! -f "$ORCH_DIST" ] || [ ! -f "$ORCH_SDK" ]; then
        echo "      MCP 서버 빌드 중..."
        (cd "$SCRIPT_DIR/skills/orchestrator/mcp-server" && npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1)
    fi
    if [ -f "$ORCH_DIST" ]; then
        claude mcp remove orchestrator -s user >/dev/null 2>&1 || true
        claude mcp add orchestrator --scope user -- node "$ORCH_DIST" >/dev/null 2>&1
        echo "      Orchestrator MCP 등록 완료"
    else
        echo "      [경고] MCP 서버 빌드 실패, 건너뜀"
    fi
fi

# Mnemo 헬스체크 + 실패 시 자동 복구 (Claude)
echo ""
echo "  [Mnemo 검증] Claude 장기기억 시스템 확인 중..."
if node "$SCRIPT_DIR/skills/mnemo/install.js" --check >/dev/null 2>&1; then
    echo "      Mnemo 정상"
else
    echo "      [복구] 문제 발견 - Mnemo 재설치 시도..."
    node "$SCRIPT_DIR/skills/mnemo/install.js"
    if node "$SCRIPT_DIR/skills/mnemo/install.js" --check >/dev/null 2>&1; then
        echo "      [복구 완료] Mnemo 정상 확인"
    else
        echo "      [경고] Mnemo 복구 실패! 수동 확인 필요:"
        echo "             node \"$SCRIPT_DIR/skills/mnemo/install.js\" --check"
    fi
fi

fi # HAS_CLAUDE

# ============================================
#   Phase 2: Codex
# ============================================
if [ "$HAS_CODEX" = "1" ]; then
echo ""
echo "  --- Codex CLI ---"

# Codex-Mnemo (필수 설치 + 실패 시 재시도)
echo ""
echo "  Codex-Mnemo 설치 중... [필수]"
if [ -f "$SCRIPT_DIR/skills/codex-mnemo/install.js" ]; then
    if node "$SCRIPT_DIR/skills/codex-mnemo/install.js"; then
        CODEX_MNEMO_RESULT="설치 완료"
    else
        echo "      [재시도] 첫 번째 시도 실패, 재설치..."
        if node "$SCRIPT_DIR/skills/codex-mnemo/install.js"; then
            CODEX_MNEMO_RESULT="재시도 후 설치 완료"
        else
            CODEX_MNEMO_RESULT="설치 실패 (재시도 포함)"
        fi
    fi
else
    CODEX_MNEMO_RESULT="스킵(install.js 없음)"
fi
echo "      $CODEX_MNEMO_RESULT"

# Codex Skills/Agents/Hooks 동기화 (zephermine 필수이므로 항상 실행)
if true; then
    echo ""
    echo "  Codex Skills/Agents/Hooks 동기화 중..."
    if [ -f "$SCRIPT_DIR/scripts/sync-codex-assets.js" ]; then
        node "$SCRIPT_DIR/scripts/sync-codex-assets.js" && CODEX_SYNC_RESULT="동기화 완료" || CODEX_SYNC_RESULT="동기화 실패"
    else
        CODEX_SYNC_RESULT="스킵(sync 스크립트 없음)"
    fi
    echo "      $CODEX_SYNC_RESULT"
fi

# Codex MCP (코어)
echo ""
echo "  Codex MCP 설치 중... [코어]"
if true; then
    if command -v codex >/dev/null 2>&1; then
        if [ -f "$SCRIPT_DIR/install-mcp-codex.js" ]; then
            node "$SCRIPT_DIR/install-mcp-codex.js" --all && CODEX_MCP_RESULT="설치 완료" || CODEX_MCP_RESULT="설치 실패"
        else
            CODEX_MCP_RESULT="스킵(install-mcp-codex.js 없음)"
        fi
        codex features enable multi_agent >/dev/null 2>&1 && CODEX_MULTI_AGENT_RESULT="활성화 완료" || CODEX_MULTI_AGENT_RESULT="활성화 실패"
    else
        CODEX_MCP_RESULT="스킵(codex CLI 없음)"
        CODEX_MULTI_AGENT_RESULT="스킵(codex CLI 없음)"
    fi
    echo "      MCP: $CODEX_MCP_RESULT, multi_agent: $CODEX_MULTI_AGENT_RESULT"
fi

# Codex Orchestrator MCP (필수 설치)
echo ""
echo "  Codex Orchestrator MCP 등록 중... [필수]"
if true; then
    CODEX_ORCH_DIST="$SCRIPT_DIR/skills/orchestrator/mcp-server/dist/index.js"
    CODEX_ORCH_SDK="$SCRIPT_DIR/skills/orchestrator/mcp-server/node_modules/@modelcontextprotocol/sdk/package.json"
    if [ ! -f "$CODEX_ORCH_DIST" ] || [ ! -f "$CODEX_ORCH_SDK" ]; then
        echo "      MCP 서버 빌드 중..."
        (cd "$SCRIPT_DIR/skills/orchestrator/mcp-server" && npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1)
    fi
    if command -v codex >/dev/null 2>&1; then
        if [ -f "$CODEX_ORCH_DIST" ]; then
            CODEX_ORCH_PROJECT_ROOT="${SCRIPT_DIR%/}"
            codex mcp remove orchestrator >/dev/null 2>&1 || true
            if codex mcp add --env "ORCHESTRATOR_PROJECT_ROOT=$CODEX_ORCH_PROJECT_ROOT" --env "ORCHESTRATOR_WORKER_ID=pm" orchestrator -- node "$CODEX_ORCH_DIST" >/dev/null 2>&1; then
                CODEX_ORCH_RESULT="등록 완료"
            else
                CODEX_ORCH_RESULT="등록 실패"
            fi
        else
            CODEX_ORCH_RESULT="스킵(빌드 실패)"
        fi
    else
        CODEX_ORCH_RESULT="스킵(codex CLI 없음)"
    fi
    echo "      $CODEX_ORCH_RESULT"
fi

fi # HAS_CODEX

# ============================================
#   Phase 3: Gemini
# ============================================
if [ "$HAS_GEMINI" = "1" ]; then
echo ""
echo "  --- Gemini CLI ---"

GEMINI_DIR="$HOME/.gemini"

# Gemini-Mnemo (필수 설치 + 실패 시 재시도) — AGENTS.md 규칙 + save-turn 훅 + context.fileName
echo ""
echo "  Gemini-Mnemo 설치 중... [필수]"
if [ -f "$SCRIPT_DIR/skills/gemini-mnemo/install.js" ]; then
    if node "$SCRIPT_DIR/skills/gemini-mnemo/install.js"; then
        GEMINI_MNEMO_RESULT="설치 완료"
    else
        echo "      [재시도] 첫 번째 시도 실패, 재설치..."
        if node "$SCRIPT_DIR/skills/gemini-mnemo/install.js"; then
            GEMINI_MNEMO_RESULT="재시도 후 설치 완료"
        else
            GEMINI_MNEMO_RESULT="설치 실패 (재시도 포함)"
        fi
    fi
else
    GEMINI_MNEMO_RESULT="스킵(install.js 없음)"
fi
echo "      $GEMINI_MNEMO_RESULT"

# Gemini Skills/Agents/Hooks 동기화 (zephermine 필수이므로 항상 실행)
if true; then
    echo ""
    echo "  Gemini Skills/Agents/Hooks 동기화 중..."
    if [ -f "$SCRIPT_DIR/scripts/sync-gemini-assets.js" ]; then
        node "$SCRIPT_DIR/scripts/sync-gemini-assets.js" && GEMINI_SYNC_RESULT="동기화 완료" || GEMINI_SYNC_RESULT="동기화 실패"
    else
        GEMINI_SYNC_RESULT="스킵(sync 스크립트 없음)"
    fi
    echo "      $GEMINI_SYNC_RESULT"
fi

# Gemini settings.json 훅 설정 (mnemo 필수이므로 항상 설정)
NEED_GEMINI_HOOKS=1
if [ "$NEED_GEMINI_HOOKS" = "1" ]; then
    echo ""
    echo "  Gemini settings.json 훅 설정 중..."
    # save-turn 훅을 gemini hooks 디렉토리에 복사
    mkdir -p "$GEMINI_DIR/hooks"
    if [ -f "$SCRIPT_DIR/skills/gemini-mnemo/hooks/save-turn.sh" ]; then
        cp "$SCRIPT_DIR/skills/gemini-mnemo/hooks/save-turn.sh" "$GEMINI_DIR/hooks/"
        chmod +x "$GEMINI_DIR/hooks/save-turn.sh"
    fi
    if [ -f "$SCRIPT_DIR/skills/gemini-mnemo/hooks/save-turn.ps1" ]; then
        cp "$SCRIPT_DIR/skills/gemini-mnemo/hooks/save-turn.ps1" "$GEMINI_DIR/hooks/"
    fi
    node "$SCRIPT_DIR/install-hooks-config.js" "$GEMINI_DIR/hooks" "$GEMINI_DIR/settings.json" --bash --components "$BUNDLES" --llms "$LLMS" --target gemini
    GEMINI_HOOKS_RESULT="설정 완료"
else
    GEMINI_HOOKS_RESULT="건너뜀: 훅 번들 미선택"
fi

# Gemini MCP (코어)
echo ""
echo "  Gemini MCP 설치 중... [코어]"
if true; then
    if command -v gemini >/dev/null 2>&1; then
        if [ -f "$SCRIPT_DIR/install-mcp-gemini.js" ]; then
            node "$SCRIPT_DIR/install-mcp-gemini.js" --all && GEMINI_MCP_RESULT="설치 완료" || GEMINI_MCP_RESULT="설치 실패"
        else
            GEMINI_MCP_RESULT="스킵(install-mcp-gemini.js 없음)"
        fi
    else
        GEMINI_MCP_RESULT="스킵(gemini CLI 없음)"
    fi
    echo "      MCP: $GEMINI_MCP_RESULT"
fi

# Gemini Orchestrator MCP (필수 설치)
echo ""
echo "  Gemini Orchestrator MCP 등록 중... [필수]"
if true; then
    GEMINI_ORCH_DIST="$SCRIPT_DIR/skills/orchestrator/mcp-server/dist/index.js"
    GEMINI_ORCH_SDK="$SCRIPT_DIR/skills/orchestrator/mcp-server/node_modules/@modelcontextprotocol/sdk/package.json"
    if [ ! -f "$GEMINI_ORCH_DIST" ] || [ ! -f "$GEMINI_ORCH_SDK" ]; then
        echo "      MCP 서버 빌드 중..."
        (cd "$SCRIPT_DIR/skills/orchestrator/mcp-server" && npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1)
    fi
    if command -v gemini >/dev/null 2>&1; then
        if [ -f "$GEMINI_ORCH_DIST" ]; then
            gemini mcp remove orchestrator >/dev/null 2>&1 || true
            if gemini mcp add orchestrator node "$GEMINI_ORCH_DIST" >/dev/null 2>&1; then
                GEMINI_ORCH_RESULT="등록 완료"
            else
                GEMINI_ORCH_RESULT="등록 실패"
            fi
        else
            GEMINI_ORCH_RESULT="스킵(빌드 실패)"
        fi
    else
        GEMINI_ORCH_RESULT="스킵(gemini CLI 없음)"
    fi
    echo "      $GEMINI_ORCH_RESULT"
fi

fi # HAS_GEMINI

# CLAUDECODE 환경변수 복원
if [ -n "$SAVE_CLAUDECODE" ]; then
    export CLAUDECODE="$SAVE_CLAUDECODE"
fi

echo ""
echo "============================================"
echo "  설치 완료!"
echo "============================================"
echo ""
echo "  LLM: $LLMS"
echo "  번들: $BUNDLES"
echo ""
if [ "$HAS_CLAUDE" = "1" ]; then
    echo "  [Claude]"
    echo "  - Skills: $CLAUDE_DIR/skills/"
    echo "  - Agents: $CLAUDE_DIR/agents/"
    echo "  - CLAUDE.md 장기기억 규칙 등록 완료"
    echo "  - MCP 서버 설치 완료"
    echo "  - Orchestrator MCP 등록 완료"
fi
if [ "$HAS_CODEX" = "1" ]; then
    echo "  [Codex]"
    echo "  - Mnemo: $CODEX_MNEMO_RESULT"
    echo "  - Skills/Agents/Hooks: $CODEX_SYNC_RESULT"
    echo "  - MCP: $CODEX_MCP_RESULT"
    echo "  - multi_agent: $CODEX_MULTI_AGENT_RESULT"
    echo "  - Orchestrator: $CODEX_ORCH_RESULT"
fi
if [ "$HAS_GEMINI" = "1" ]; then
    echo "  [Gemini]"
    echo "  - Mnemo: $GEMINI_MNEMO_RESULT"
    echo "  - Skills/Agents/Hooks: $GEMINI_SYNC_RESULT"
    echo "  - Hooks: $GEMINI_HOOKS_RESULT"
    echo "  - MCP: $GEMINI_MCP_RESULT"
    echo "  - Orchestrator: $GEMINI_ORCH_RESULT"
fi
echo ""
echo "  CLI를 재시작하면 적용됩니다."
echo ""
