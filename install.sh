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
GROK_MNEMO_RESULT="미실행"
CREATED_CLAUDE_DIR=0
HAS_CLAUDE_CLI=0
JQ_MISSING=0
CLAUDE_MCP_RESULT="미실행"
CLAUDE_ORCH_RESULT="미실행"

# ============================================
#   사전 조건 확인
# ============================================
# Node.js는 대체가 없다 - 설치 로직 전체가 node 스크립트(install-select.js,
# safe-copy.js, install-hooks-config.js 등)라 여기서 중단하는 것이 맞다.
# 자동 설치는 하지 않는다. 대신 설치 명령어를 그대로 알려준다.
if ! command -v node >/dev/null 2>&1; then
    echo "[오류] Node.js가 필요하지만 설치되어 있지 않습니다."
    echo ""
    echo "       설치 방법 (택 1):"
    echo "         brew install node"
    echo "         sudo apt install -y nodejs npm"
    echo "         https://nodejs.org/"
    echo ""
    echo "       설치 후 새 셸에서 이 스크립트를 다시 실행하세요."
    exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
    echo "[사전조건] jq가 없습니다. 설치 중..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get install -y jq 2>/dev/null
    elif command -v brew >/dev/null 2>&1; then
        brew install jq 2>/dev/null
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y jq 2>/dev/null
    elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -S --noconfirm jq 2>/dev/null
    fi
    # jq가 없어도 중단하지 않는다. 자산 설치(스킬/에이전트/훅 복사, settings.json,
    # CLAUDE.md)는 전부 node로 돌아가 jq와 무관하다. 다만 이 플랫폼의 훅은 .sh라
    # jq 없이는 훅이 동작하지 않으므로 경고 강도는 Windows보다 높다.
    if ! command -v jq >/dev/null 2>&1; then
        echo "  [경고] jq 설치 실패 - jq 없이 계속합니다."
        echo "         자산 설치는 정상 진행되지만, .sh 훅(대화 저장 등)은"
        echo "         JSON 파싱에 jq를 쓰므로 동작하지 않습니다."
        echo "         수동 설치: brew install jq / sudo apt install -y jq"
        JQ_MISSING=1
    else
        echo "[사전조건] jq 설치 완료."
    fi
fi

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

# ============================================
#   업데이트 체크 (non-blocking)
# ============================================
if [ "$MODE" != "uninstall" ]; then
    UPDATE_RESULT=$(bash "$SCRIPT_DIR/scripts/update-check.sh" 2>/dev/null || true)
    if echo "$UPDATE_RESULT" | grep -q '^UPGRADE_AVAILABLE'; then
        OLD_VER=$(echo "$UPDATE_RESULT" | awk '{print $2}')
        NEW_VER=$(echo "$UPDATE_RESULT" | awk '{print $3}')
        echo "  ╔══════════════════════════════════════════════╗"
        echo "  ║  New version available: v${OLD_VER} → v${NEW_VER}          ║"
        echo "  ║  Run: git pull && ./install.sh --all         ║"
        echo "  ╚══════════════════════════════════════════════╝"
        echo ""
    fi
fi

# ============================================
#   --uninstall 모드: 설정 정리 (MCP, Mnemo, Hooks, Codex, Gemini)
# ============================================
if [ "$MODE" = "uninstall" ]; then
    echo "[1/12] settings.json 훅 설정 제거 중..."
    if [ -f "$CLAUDE_DIR/settings.json" ]; then
        node "$SCRIPT_DIR/install-hooks-config.js" "$CLAUDE_DIR/hooks" "$CLAUDE_DIR/settings.json" --uninstall
        echo "      완료!"
    else
        echo "      [경고] Claude settings.json 없음, 건너뜀"
    fi

    echo ""
    echo "[2/12] CLAUDE.md 장기기억 규칙 제거 중..."
    if [ -f "$CLAUDE_DIR/CLAUDE.md" ]; then
        node "$SCRIPT_DIR/install-claude-md.js" "$CLAUDE_DIR/CLAUDE.md" "$SCRIPT_DIR/skills/mnemo/templates/claude-md-rules.md" --uninstall
        echo "      완료!"
    else
        echo "      [경고] Claude CLAUDE.md 없음, 건너뜀"
    fi
    rm -f "$CLAUDE_DIR/SKILLS-CATALOG.md" "$CLAUDE_DIR/AGENTS-CATALOG.md"

    echo ""
    echo "[3/12] MCP 서버 설정은 별도 관리됩니다."
    echo "      제거: node \"$SCRIPT_DIR/install-mcp.js\" --uninstall <이름>"
    echo "      완료!"

    echo ""
    echo "[4/12] Orchestrator MCP 제거 중..."
    SAVE_CLAUDECODE="${CLAUDECODE:-}"
    unset CLAUDECODE
    if command -v claude >/dev/null 2>&1; then
        claude mcp remove orchestrator -s user >/dev/null 2>&1 || true
        echo "      완료!"
    else
        echo "      [경고] claude CLI 없음, 건너뜀"
    fi
    if [ -n "$SAVE_CLAUDECODE" ]; then
        export CLAUDECODE="$SAVE_CLAUDECODE"
    fi

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
            if node "$SCRIPT_DIR/install-mcp-codex.js" --uninstall context7 playwright chrome-devtools sequential-thinking; then
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
    echo "  Grok-Mnemo 제거 중... (Grok 미설치 시 자동 skip)"
    if [ -f "$SCRIPT_DIR/skills/grok-mnemo/install.js" ]; then
        if node "$SCRIPT_DIR/skills/grok-mnemo/install.js" --uninstall; then
            GROK_MNEMO_RESULT="제거 완료"
            echo "      완료!"
        else
            GROK_MNEMO_RESULT="제거 실패"
            echo "      [경고] 제거 실패"
        fi
    else
        GROK_MNEMO_RESULT="스킵(install.js 없음)"
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
            node "$SCRIPT_DIR/install-mcp-gemini.js" --uninstall context7 playwright chrome-devtools sequential-thinking
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

# $CLAUDE_DIR가 없으면 만들어서 설치한다.
# 예전에는 여기서 exit 1로 중단했다. 그러면 Claude Code를 안 깔았거나 깔고 한 번도
# 실행하지 않아 ~/.claude가 아직 없는 컴퓨터에서 Codex/Gemini 자산까지 통째로
# 설치되지 않았다. 자동 설치(비대화형)는 LLM을 전부 선택하므로 새 컴퓨터에서
# 아무것도 안 깔리는 원인이 됐다.
#
# skills/agents/hooks/CLAUDE.md/settings.json은 전부 파일 복사라 claude CLI 없이도
# 유효하다. Grok Build는 compat.claude로 이 디렉터리를 직접 읽으므로 Claude Code가
# 없어도 실제로 쓰이고, 나중에 Claude Code를 깔면 재설치 없이 그대로 적용된다.
# claude CLI가 실제로 필요한 것은 MCP 등록뿐이므로 그 단계만 따로 판정한다
# (아래 HAS_CLAUDE_CLI — Codex의 `command -v codex` 가드와 같은 방식).
if [ "$HAS_CLAUDE" = "1" ] && [ ! -d "$CLAUDE_DIR" ]; then
    echo "  [안내] $CLAUDE_DIR 폴더가 없어 새로 만듭니다."
    echo "         자산을 여기에 설치하며, Claude Code는 첫 실행 시 그대로 사용합니다."
    mkdir -p "$CLAUDE_DIR"
    CREATED_CLAUDE_DIR=1
fi

# ============================================
#   복사 모드: Skills/Agents/Hooks 설치
# ============================================

if [ "$HAS_CLAUDE" = "1" ]; then
    # Move deprecated Olympus agents/skills out of active Claude paths, with backup.
    if [ -f "$SCRIPT_DIR/scripts/prune-stale-assets.js" ]; then
        node "$SCRIPT_DIR/scripts/prune-stale-assets.js" "$CLAUDE_DIR" --label claude
    fi

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
            if [ -f "$agent_file" ]; then
                agent_name=$(basename "$agent_file")
                agent_name_lc=$(printf '%s' "$agent_name" | tr '[:upper:]' '[:lower:]')
                if [ "$agent_name_lc" = "memory.md" ]; then
                    echo "      - $agent_name [skipped: not an agent]"
                else
                    echo "      - $agent_name"
                    cp "$agent_file" "$CLAUDE_DIR/agents/"
                fi
            fi
        done
    fi
    for skill_dir in "$SCRIPT_DIR/skills"/*/; do
        if [ -d "${skill_dir}agents" ]; then
            skill_name=$(basename "$skill_dir")
            for agent_file in "${skill_dir}agents"/*.md; do
                if [ -f "$agent_file" ]; then
                    agent_name=$(basename "$agent_file")
                    if [ -f "$SCRIPT_DIR/agents/$agent_name" ]; then
                        echo "      - $agent_name [$skill_name skipped: root agent wins]"
                    else
                        echo "      - $agent_name [$skill_name]"
                        cp "$agent_file" "$CLAUDE_DIR/agents/"
                    fi
                fi
            done
        fi
    done
    echo "      완료!"

    # Catalogs 생성 (글로벌)
    echo ""
    echo "[2.5/7] Catalogs 생성 중... (글로벌) [코어]"
    if [ -f "$SCRIPT_DIR/scripts/generate-catalogs.js" ]; then
        if node "$SCRIPT_DIR/scripts/generate-catalogs.js" "$CLAUDE_DIR" --source claude --exclude agent-team-codex --exclude deploymonitor; then
            echo "      완료!"
        else
            echo "      [경고] Catalog 생성 실패"
        fi
    else
        echo "      [경고] generate-catalogs.js 없음, 건너뜀"
    fi

    # Hooks 설치 (mnemo 필수이므로 항상 설치)
    echo ""
    echo "[3/7] Hooks 설치 중... (글로벌) [mnemo 필수]"
    NEED_HOOKS=1
    if [ "$NEED_HOOKS" = "1" ] && [ -d "$SCRIPT_DIR/hooks" ]; then
        mkdir -p "$CLAUDE_DIR/hooks"
        for hook_file in "$SCRIPT_DIR/hooks"/*.sh; do
            [ -f "$hook_file" ] || continue
            hook_name=$(basename "$hook_file")
            # 디버그 훅 스킵 (install.bat과 동일)
            if [[ "$hook_name" == *debug* ]]; then
                echo "      - $hook_name [skip: debug]"
                continue
            fi
            echo "      - $hook_name" && cp "$hook_file" "$CLAUDE_DIR/hooks/" && chmod +x "$CLAUDE_DIR/hooks/$hook_name"
        done
        for hook_file in "$SCRIPT_DIR/hooks"/*.ps1; do
            [ -f "$hook_file" ] || continue
            hook_name=$(basename "$hook_file")
            if [[ "$hook_name" == *debug* ]]; then
                echo "      - $hook_name [skip: debug]"
                continue
            fi
            echo "      - $hook_name" && cp "$hook_file" "$CLAUDE_DIR/hooks/"
        done
        for hook_file in "$SCRIPT_DIR/hooks"/*.js; do
            [ -f "$hook_file" ] && echo "      - $(basename "$hook_file")" && cp "$hook_file" "$CLAUDE_DIR/hooks/"
        done
        echo "      완료!"
    else
        echo "      [건너뜀] 훅 번들 미선택"
    fi
else
    echo "[1/7] Claude 글로벌 Skills 설치 건너뜀... (Claude 미선택)"
    echo ""
    echo "[2/7] Claude 글로벌 Agents 설치 건너뜀... (Claude 미선택)"
    echo ""
    echo "[3/7] Claude 글로벌 Hooks 설치 건너뜀... (Claude 미선택)"
fi

# CLAUDECODE 환경변수 임시 해제 (claude CLI 중첩 세션 방지)
SAVE_CLAUDECODE="${CLAUDECODE:-}"
unset CLAUDECODE

# ============================================
#   Phase 1: Claude (settings.json + CLAUDE.md + MCP + Orchestrator)
# ============================================
if [ "$HAS_CLAUDE" = "1" ]; then

# MCP 등록은 claude CLI(`claude mcp add`)가 있어야 한다. 디렉터리 존재 여부와
# 무관하게 PATH로 판정한다 - Claude Code 미설치 상태에서 자산만 깐 경우가 있다.
command -v claude >/dev/null 2>&1 && HAS_CLAUDE_CLI=1

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
if [ "$HAS_CLAUDE_CLI" = "1" ]; then
    echo ""
    echo "      사용 가능한 MCP 서버:"
    node "$SCRIPT_DIR/install-mcp.js" --list
    echo ""
    echo "      무료 MCP 자동 설치를 시작합니다..."
    echo ""
    node "$SCRIPT_DIR/install-mcp.js" context7 playwright chrome-devtools
    echo ""
    echo "      완료! (추가: node \"$SCRIPT_DIR/install-mcp.js\" --list)"
    CLAUDE_MCP_RESULT="설치 완료"
else
    CLAUDE_MCP_RESULT="스킵(claude CLI 없음)"
    echo "      $CLAUDE_MCP_RESULT"
fi

# Orchestrator MCP 서버 등록 (필수 설치)
echo ""
echo "[7/7] Orchestrator MCP 서버 등록 중... (Claude) [필수]"
if true; then
    # 글로벌 설치 경로 사용 (레포 경로가 아닌 ~/.claude/skills/ — 다른 PC에서도 동작)
    ORCH_DIST="$CLAUDE_DIR/skills/orchestrator/mcp-server/dist/index.js"
    ORCH_SDK="$CLAUDE_DIR/skills/orchestrator/mcp-server/node_modules/@modelcontextprotocol/sdk/package.json"
    if [ ! -f "$ORCH_DIST" ] || [ ! -f "$ORCH_SDK" ]; then
        echo "      MCP 서버 빌드 중..."
        (cd "$SCRIPT_DIR/skills/orchestrator/mcp-server" && npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1)
    fi
    # 빌드는 CLI 유무와 무관하게 해둔다 - Claude Code를 나중에 깔고 재실행하면
    # 등록만 하면 되도록. 등록 자체는 claude CLI가 있어야 한다.
    if [ -f "$ORCH_DIST" ]; then
        if [ "$HAS_CLAUDE_CLI" = "1" ]; then
            claude mcp remove orchestrator -s user >/dev/null 2>&1 || true
            claude mcp add orchestrator --scope user -- node "$ORCH_DIST" >/dev/null 2>&1
            CLAUDE_ORCH_RESULT="등록 완료"
        else
            CLAUDE_ORCH_RESULT="스킵(claude CLI 없음)"
        fi
    else
        CLAUDE_ORCH_RESULT="스킵(빌드 실패)"
    fi
    echo "      $CLAUDE_ORCH_RESULT"
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
            node "$SCRIPT_DIR/install-mcp-codex.js" context7 playwright chrome-devtools && CODEX_MCP_RESULT="설치 완료" || CODEX_MCP_RESULT="설치 실패"
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
    CODEX_ORCH_DIST="$CODEX_DIR/skills/orchestrator/mcp-server/dist/index.js"
    CODEX_ORCH_SDK="$CODEX_DIR/skills/orchestrator/mcp-server/node_modules/@modelcontextprotocol/sdk/package.json"
    CODEX_ORCH_SQLITE="$CODEX_DIR/skills/orchestrator/mcp-server/node_modules/better-sqlite3/package.json"
    if [ ! -f "$CODEX_ORCH_DIST" ] || [ ! -f "$CODEX_ORCH_SDK" ] || [ ! -f "$CODEX_ORCH_SQLITE" ]; then
        echo "      MCP 서버 빌드 중..."
        (cd "$SCRIPT_DIR/skills/orchestrator/mcp-server" && npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1)
    fi
    if command -v codex >/dev/null 2>&1; then
        if [ -f "$CODEX_ORCH_DIST" ]; then
            codex mcp remove orchestrator >/dev/null 2>&1 || true
            if codex mcp add --env "ORCHESTRATOR_WORKER_ID=pm" orchestrator -- node "$CODEX_ORCH_DIST" >/dev/null 2>&1; then
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

# Gemini MCP (비활성화 — gemini CLI의 MCP 지원이 불안정하여 설치 루틴 제외)
echo ""
echo "  Gemini MCP 설치... [건너뜀: gemini CLI MCP 미지원]"
GEMINI_MCP_RESULT="건너뜀(비활성화)"

# Gemini Orchestrator MCP (필수 설치)
echo ""
echo "  Gemini Orchestrator MCP 등록 중... [필수]"
if true; then
    GEMINI_ORCH_DIST="$GEMINI_DIR/skills/orchestrator/mcp-server/dist/index.js"
    GEMINI_ORCH_SDK="$GEMINI_DIR/skills/orchestrator/mcp-server/node_modules/@modelcontextprotocol/sdk/package.json"
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

# ============================================
#   Grok Build
# ============================================
# Grok은 스킬/에이전트/MCP/규칙을 [compat.claude] 기본값으로 ~/.claude/에서 직접 읽으므로
# sync가 필요 없다 (memory/learned/018 실측). mnemo 훅만 어댑터를 설치한다.
echo ""
echo "  --- Grok Build ---"
echo ""
echo "  Grok-Mnemo 설치 중... [선택: Grok 미설치 시 자동 skip]"
if [ -f "$SCRIPT_DIR/skills/grok-mnemo/install.js" ]; then
    if [ -d "$HOME/.grok" ]; then
        if node "$SCRIPT_DIR/skills/grok-mnemo/install.js"; then
            GROK_MNEMO_RESULT="설치 완료"
        else
            GROK_MNEMO_RESULT="설치 실패"
        fi
    else
        GROK_MNEMO_RESULT="스킵(Grok CLI 없음)"
    fi
else
    GROK_MNEMO_RESULT="스킵(install.js 없음)"
fi
echo "      $GROK_MNEMO_RESULT"

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
    echo "  - Catalogs: $CLAUDE_DIR/SKILLS-CATALOG.md, $CLAUDE_DIR/AGENTS-CATALOG.md"
    echo "  - CLAUDE.md 장기기억 규칙 등록 완료"
    echo "  - MCP: $CLAUDE_MCP_RESULT"
    echo "  - Orchestrator: $CLAUDE_ORCH_RESULT"
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
if [ -d "$HOME/.grok" ]; then
    echo "  [Grok]"
    echo "  - Mnemo: $GROK_MNEMO_RESULT"
    echo "  - Skills/Agents/MCP: compat.claude 직접 읽기 (sync 불필요)"
fi
if [ "$CREATED_CLAUDE_DIR" = "1" ]; then
    echo ""
    echo "  [안내] $CLAUDE_DIR 폴더가 없어 이 설치 스크립트가 새로 만들었습니다."
    echo "         자산은 준비됐고, Claude Code는 첫 실행 시 그대로 사용합니다."
fi
if [ "$HAS_CLAUDE" = "1" ] && [ "$HAS_CLAUDE_CLI" = "0" ]; then
    echo ""
    echo "  [건너뜀] Claude MCP 등록 - PATH에서 claude CLI를 찾지 못했습니다."
    echo "           Claude Code 설치 후 이 스크립트를 다시 실행하면 등록됩니다."
fi
if [ "$JQ_MISSING" = "1" ]; then
    echo ""
    echo "  [경고] jq가 설치되지 않았습니다."
    echo "         자산은 설치됐지만 .sh 훅(대화 저장 등)은 동작하지 않습니다."
    echo "         설치: brew install jq / sudo apt install -y jq"
fi
echo ""
echo "  CLI를 재시작하면 적용됩니다."
echo ""
