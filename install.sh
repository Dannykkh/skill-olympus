#!/bin/bash
# ============================================
#   Claude Code Customizations Installer
#   Skills, Agents, Hooks + MCP 자동 설치
#   사용법: install.sh [--uninstall] [--all] [--llm ...] [--only ...] [--skip ...] [--include-source-only-skills] [--include-source-only-agents]
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

show_help() {
    echo "Usage: bash install.sh [options]"
    echo ""
    echo "  --all                              Install four TermSnap default CLI targets"
    echo "  --llm claude,codex,antigravity,grok,openclaw,hermes"
    echo "                                     Install selected targets; OpenClaw/Hermes are skills-only"
    echo "  --uninstall                        Remove managed assets"
    echo "  --include-source-only-skills       Register optional source-only skills"
    echo "  --include-broad-coding-skills      Register legacy broad coding skills"
    echo "  --include-source-only-agents       Register optional custom agents"
    echo "  --help, -h                         Show this help without changing files"
}

for arg in "$@"; do
    case "$arg" in
        --help|-h)
            show_help
            exit 0
            ;;
    esac
done

CLAUDE_DIR="$HOME/.claude"
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
ANTIGRAVITY_ROOT="${ANTIGRAVITY_HOME:-$HOME/.gemini}"
OPENCLAW_DIR="${OPENCLAW_HOME:-$HOME/.openclaw}"
HERMES_DIR="${HERMES_HOME:-$HOME/.hermes}"
CODEX_MNEMO_RESULT="미실행"
CODEX_SYNC_RESULT="미실행"
CODEX_MCP_RESULT="미실행"
CODEX_MULTI_AGENT_RESULT="미실행"
CODEX_ORCH_RESULT="미실행"
ANTIGRAVITY_MNEMO_RESULT="미실행"
ANTIGRAVITY_SYNC_RESULT="미실행"
ANTIGRAVITY_MCP_RESULT="미실행"
ANTIGRAVITY_ORCH_RESULT="미실행"
ANTIGRAVITY_HOOKS_RESULT="미실행"
GROK_MNEMO_RESULT="미실행"
OPENCLAW_SYNC_RESULT="미실행"
HERMES_SYNC_RESULT="미실행"
CREATED_CLAUDE_DIR=0
HAS_CLAUDE_CLI=0
JQ_MISSING=0
CLAUDE_MCP_RESULT="미실행"
CLAUDE_ORCH_RESULT="미실행"
INCLUDE_SOURCE_ONLY_AGENTS=0
SOURCE_ONLY_AGENT_FLAG=""
INCLUDE_SOURCE_ONLY_SKILLS=0
INCLUDE_BROAD_CODING_SKILLS=0
SOURCE_ONLY_SKILL_FLAG=""

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
        --include-source-only-agents|--include-passive-agents|--include-broad-coding-agents) INCLUDE_SOURCE_ONLY_AGENTS=1 ;;
        --include-source-only-skills) INCLUDE_SOURCE_ONLY_SKILLS=1 ;;
        --include-broad-coding-skills) INCLUDE_BROAD_CODING_SKILLS=1 ;;
    esac
done
if [ "$INCLUDE_SOURCE_ONLY_AGENTS" = "1" ]; then
    SOURCE_ONLY_AGENT_FLAG="--include-source-only-agents"
fi
if [ "$INCLUDE_SOURCE_ONLY_SKILLS" = "1" ]; then
    SOURCE_ONLY_SKILL_FLAG="--include-source-only-skills"
fi
if [ "$INCLUDE_BROAD_CODING_SKILLS" = "1" ]; then
    SOURCE_ONLY_SKILL_FLAG="$SOURCE_ONLY_SKILL_FLAG --include-broad-coding-skills"
fi

echo ""
echo "============================================"
if [ "$MODE" = "uninstall" ]; then
    echo "  Claude Code Customizations Uninstaller"
else
    echo "  Claude Code Customizations Installer"
fi
echo "============================================"
echo ""

if [ "$MODE" != "uninstall" ]; then
    echo "  Skill registry migration notice:"
    echo "  - Unrelated third-party skill names are preserved."
    echo "  - Modified same-name conflicts move to <CLI_HOME>/_olympus-preserved/..."
    echo "  - The default keeps optional skills source-only."
    echo "  - Activate source-only skills: ./install.sh --all --include-source-only-skills"
    echo "  - Recovery guide: docs/skill-registry-migration.md"
    echo ""
fi

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
#   --uninstall 모드: Olympus 관리 런타임 자산 전체 정리
# ============================================
if [ "$MODE" = "uninstall" ]; then
    echo "[1/14] settings.json 훅 설정 제거 중..."
    if [ -f "$CLAUDE_DIR/settings.json" ]; then
        node "$SCRIPT_DIR/install-hooks-config.js" "$CLAUDE_DIR/hooks" "$CLAUDE_DIR/settings.json" --uninstall
        echo "      완료!"
    else
        echo "      [경고] Claude settings.json 없음, 건너뜀"
    fi

    echo ""
    echo "[2/14] CLAUDE.md 장기기억 규칙 제거 중..."
    if [ -f "$CLAUDE_DIR/CLAUDE.md" ]; then
        node "$SCRIPT_DIR/install-claude-md.js" "$CLAUDE_DIR/CLAUDE.md" "$SCRIPT_DIR/skills/mnemo/templates/claude-md-rules.md" --uninstall
        echo "      완료!"
    else
        echo "      [경고] Claude CLAUDE.md 없음, 건너뜀"
    fi
    rm -f "$CLAUDE_DIR/SKILLS-CATALOG.md" "$CLAUDE_DIR/AGENTS-CATALOG.md"
    if [ -f "$SCRIPT_DIR/scripts/sync-claude-skills.js" ]; then
        if ! node "$SCRIPT_DIR/scripts/sync-claude-skills.js" "$CLAUDE_DIR" --unlink; then
            echo "      [오류] Claude Skill 동기화 해제 실패"
            exit 1
        fi
    else
        echo "      [오류] sync-claude-skills.js 없음"
        exit 1
    fi
    if [ -f "$SCRIPT_DIR/scripts/sync-claude-agents.js" ]; then
        if ! node "$SCRIPT_DIR/scripts/sync-claude-agents.js" "$CLAUDE_DIR" --unlink; then
            echo "      [오류] Claude Agent 정리 실패"
            exit 1
        fi
        rm -f "$CLAUDE_DIR/AGENTS-CATALOG.md"
    else
        echo "      [오류] sync-claude-agents.js 없음"
        exit 1
    fi

    echo ""
    echo "[3/14] MCP 서버 설정은 별도 관리됩니다."
    echo "      제거: node \"$SCRIPT_DIR/install-mcp.js\" --uninstall <이름>"
    echo "      완료!"

    echo ""
    echo "[4/14] Orchestrator MCP 제거 중..."
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
    echo "[5/14] Codex-Mnemo 제거 중..."
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
    echo "[6/14] Codex Skills/Agents/Hooks 동기화 해제 중..."
    if [ -f "$SCRIPT_DIR/scripts/sync-codex-assets.js" ]; then
        if node "$SCRIPT_DIR/scripts/sync-codex-assets.js" --unlink; then
            CODEX_SYNC_RESULT="해제 완료"
            echo "      완료!"
        else
            CODEX_SYNC_RESULT="해제 실패"
            echo "      [오류] 해제 실패"
            exit 1
        fi
    else
        CODEX_SYNC_RESULT="실패(sync 스크립트 없음)"
        echo "      [오류] sync-codex-assets.js 없음"
        exit 1
    fi

    echo ""
    echo "[7/14] Codex MCP 제거 중..."
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
    echo "[8/14] Codex Orchestrator MCP 제거 중..."
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
    echo "[9/14] Antigravity-Mnemo 제거 중..."
    if [ -f "$SCRIPT_DIR/skills/antigravity-mnemo/install.js" ]; then
        if node "$SCRIPT_DIR/skills/antigravity-mnemo/install.js" --uninstall; then
            ANTIGRAVITY_MNEMO_RESULT="제거 완료"
            echo "      완료!"
        else
            ANTIGRAVITY_MNEMO_RESULT="제거 실패"
            echo "      [경고] 제거 실패"
        fi
    else
        ANTIGRAVITY_MNEMO_RESULT="스킵(install.js 없음)"
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
    echo "[10/14] Antigravity Skills/Agents/Hooks 동기화 해제 중..."
    if [ -f "$SCRIPT_DIR/scripts/sync-antigravity-assets.js" ]; then
        if node "$SCRIPT_DIR/scripts/sync-antigravity-assets.js" --unlink; then
            echo "      완료!"
        else
            echo "      [오류] 해제 실패"
            exit 1
        fi
    else
        echo "      [오류] sync-antigravity-assets.js 없음"
        exit 1
    fi

    echo ""
    echo "[11/14] Antigravity core hooks 제거 중..."
    if [ -f "$ANTIGRAVITY_ROOT/config/hooks.json" ]; then
        node "$SCRIPT_DIR/install-hooks-config.js" "$ANTIGRAVITY_ROOT/config/hooks" "$ANTIGRAVITY_ROOT/config/hooks.json" --uninstall --target antigravity
        echo "      완료!"
    else
        echo "      [경고] Antigravity hooks.json 없음, 건너뜀"
    fi

    echo ""
    echo "[12/14] Antigravity MCP/Orchestrator 제거 중..."
    if [ -f "$SCRIPT_DIR/install-mcp-antigravity.js" ]; then
        node "$SCRIPT_DIR/install-mcp-antigravity.js" --uninstall context7 playwright chrome-devtools sequential-thinking orchestrator
        echo "      완료!"
    else
        echo "      [경고] install-mcp-antigravity.js 없음, 건너뜀"
    fi

    echo ""
    echo "[13/14] OpenClaw skills-only 자산 제거 중..."
    if ! node "$SCRIPT_DIR/scripts/sync-portable-skills.js" openclaw --home "$OPENCLAW_DIR" --unlink; then
        echo "      [오류] OpenClaw Skill 동기화 해제 실패"
        exit 1
    fi

    echo ""
    echo "[14/14] Hermes Agent skills-only 자산 제거 중..."
    if ! node "$SCRIPT_DIR/scripts/sync-portable-skills.js" hermes --home "$HERMES_DIR" --unlink; then
        echo "      [오류] Hermes Skill 동기화 해제 실패"
        exit 1
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
HAS_ANTIGRAVITY=0; has_llm "antigravity" && HAS_ANTIGRAVITY=1
HAS_GROK=0; has_llm "grok" && HAS_GROK=1
HAS_OPENCLAW=0; has_llm "openclaw" && HAS_OPENCLAW=1
HAS_HERMES=0; has_llm "hermes" && HAS_HERMES=1

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
# 실행하지 않아 ~/.claude가 아직 없는 컴퓨터에서 Codex/Antigravity 자산까지 통째로
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
        if ! node "$SCRIPT_DIR/scripts/prune-stale-assets.js" "$CLAUDE_DIR" --label claude; then
            echo "      [오류] Claude stale asset 정리 실패"
            exit 1
        fi
    fi

    # Skills 설치 (기본 거부 런타임 정책)
    echo "[1/7] Skills 설치 중... (글로벌) [코어]"
    if [ -f "$SCRIPT_DIR/scripts/sync-claude-skills.js" ]; then
        if node "$SCRIPT_DIR/scripts/sync-claude-skills.js" "$CLAUDE_DIR" $SOURCE_ONLY_SKILL_FLAG; then
            echo "      완료!"
        else
            echo "      [오류] Skill 동기화 실패"
            exit 1
        fi
    else
        echo "      [오류] sync-claude-skills.js 없음"
        exit 1
    fi

    # Agents 설치 (코어)
    echo ""
    echo "[2/7] Agents 설치 중... (글로벌) [코어]"
    if [ -f "$SCRIPT_DIR/scripts/sync-claude-agents.js" ]; then
        if node "$SCRIPT_DIR/scripts/sync-claude-agents.js" "$CLAUDE_DIR" $SOURCE_ONLY_AGENT_FLAG; then
            echo "      완료!"
        else
            echo "      [오류] Agent 동기화 실패"
            exit 1
        fi
    else
        echo "      [오류] sync-claude-agents.js 없음"
        exit 1
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
    # source-only 모듈 라이브러리는 스킬 discovery 밖에 있지만 MCP 런타임은 여기서 직접 사용한다.
    ORCH_MODULE_DIR="$CLAUDE_DIR/.olympus/runtime-modules/orchestrator"
    ORCH_DIST="$ORCH_MODULE_DIR/mcp-server/dist/index.js"
    ORCH_SDK="$ORCH_MODULE_DIR/mcp-server/node_modules/@modelcontextprotocol/sdk/package.json"
    ORCH_SQLITE="$ORCH_MODULE_DIR/mcp-server/node_modules/better-sqlite3/package.json"
    if [ ! -f "$ORCH_DIST" ] || [ ! -f "$ORCH_SDK" ] || [ ! -f "$ORCH_SQLITE" ]; then
        echo "      MCP 서버 빌드 중..."
        (cd "$ORCH_MODULE_DIR/mcp-server" && npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1)
    fi
    # 빌드는 CLI 유무와 무관하게 해둔다 - Claude Code를 나중에 깔고 재실행하면
    # 등록만 하면 되도록. 등록 자체는 claude CLI가 있어야 한다.
    if [ -f "$ORCH_DIST" ] && [ -f "$ORCH_SDK" ] && [ -f "$ORCH_SQLITE" ]; then
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
        if node "$SCRIPT_DIR/scripts/sync-codex-assets.js" $SOURCE_ONLY_SKILL_FLAG $SOURCE_ONLY_AGENT_FLAG; then
            CODEX_SYNC_RESULT="동기화 완료"
        else
            CODEX_SYNC_RESULT="동기화 실패"
            echo "      [오류] 필수 정책 동기화 실패"
            exit 1
        fi
    else
        CODEX_SYNC_RESULT="실패(sync 스크립트 없음)"
        echo "      [오류] sync-codex-assets.js 없음"
        exit 1
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
        # Current Codex releases ship stable multi-agent enabled by default.
        # Preserve the user's feature configuration instead of mutating it.
        CODEX_MULTI_AGENT_RESULT="네이티브 기본값(설정 변경 없음)"
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
    CODEX_ORCH_MODULE_DIR="$CODEX_DIR/.olympus/runtime-modules/orchestrator"
    CODEX_ORCH_DIST="$CODEX_ORCH_MODULE_DIR/mcp-server/dist/index.js"
    CODEX_ORCH_SDK="$CODEX_ORCH_MODULE_DIR/mcp-server/node_modules/@modelcontextprotocol/sdk/package.json"
    CODEX_ORCH_SQLITE="$CODEX_ORCH_MODULE_DIR/mcp-server/node_modules/better-sqlite3/package.json"
    if [ ! -f "$CODEX_ORCH_DIST" ] || [ ! -f "$CODEX_ORCH_SDK" ] || [ ! -f "$CODEX_ORCH_SQLITE" ]; then
        echo "      MCP 서버 빌드 중..."
        (cd "$CODEX_ORCH_MODULE_DIR/mcp-server" && npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1)
    fi
    if command -v codex >/dev/null 2>&1; then
        if [ -f "$CODEX_ORCH_DIST" ] && [ -f "$CODEX_ORCH_SDK" ] && [ -f "$CODEX_ORCH_SQLITE" ]; then
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
#   Phase 3: Google Antigravity
# ============================================
if [ "$HAS_ANTIGRAVITY" = "1" ]; then
echo ""
echo "  --- Google Antigravity CLI ---"

if ! command -v agy >/dev/null 2>&1; then
    echo "      [경고] agy CLI 없음; 나중에 CLI를 설치해도 쓸 수 있도록 자산은 설치합니다."
fi

echo ""
echo "  Antigravity-Mnemo 설치 중... [필수]"
if [ -f "$SCRIPT_DIR/skills/antigravity-mnemo/install.js" ]; then
    if node "$SCRIPT_DIR/skills/antigravity-mnemo/install.js"; then
        ANTIGRAVITY_MNEMO_RESULT="설치 완료"
    else
        echo "      [재시도] 첫 번째 시도 실패, 재설치..."
        if node "$SCRIPT_DIR/skills/antigravity-mnemo/install.js"; then
            ANTIGRAVITY_MNEMO_RESULT="재시도 후 설치 완료"
        else
            ANTIGRAVITY_MNEMO_RESULT="설치 실패 (재시도 포함)"
        fi
    fi
else
    ANTIGRAVITY_MNEMO_RESULT="스킵(install.js 없음)"
fi
echo "      $ANTIGRAVITY_MNEMO_RESULT"

echo ""
echo "  Antigravity Skills/Agents/Hooks 동기화 중..."
if [ -f "$SCRIPT_DIR/scripts/sync-antigravity-assets.js" ]; then
    if node "$SCRIPT_DIR/scripts/sync-antigravity-assets.js" $SOURCE_ONLY_SKILL_FLAG $SOURCE_ONLY_AGENT_FLAG; then
        ANTIGRAVITY_SYNC_RESULT="동기화 완료"
    else
        ANTIGRAVITY_SYNC_RESULT="동기화 실패"
        echo "      [오류] 필수 정책 동기화 실패"
        exit 1
    fi
else
    ANTIGRAVITY_SYNC_RESULT="실패(sync 스크립트 없음)"
    echo "      [오류] sync-antigravity-assets.js 없음"
    exit 1
fi
echo "      $ANTIGRAVITY_SYNC_RESULT"

echo ""
echo "  Antigravity hooks.json 설정 중..."
if node "$SCRIPT_DIR/install-hooks-config.js" "$ANTIGRAVITY_ROOT/config/hooks" "$ANTIGRAVITY_ROOT/config/hooks.json" --bash --components "$BUNDLES" --llms "$LLMS" --target antigravity; then
    ANTIGRAVITY_HOOKS_RESULT="설정 완료"
else
    ANTIGRAVITY_HOOKS_RESULT="설정 실패"
    exit 1
fi

echo ""
echo "  Antigravity MCP 설치 중..."
if [ -f "$SCRIPT_DIR/install-mcp-antigravity.js" ]; then
    if node "$SCRIPT_DIR/install-mcp-antigravity.js" context7 playwright chrome-devtools; then
        ANTIGRAVITY_MCP_RESULT="설치 완료"
    else
        ANTIGRAVITY_MCP_RESULT="설치 실패"
    fi
else
    ANTIGRAVITY_MCP_RESULT="스킵(installer 없음)"
fi

echo ""
echo "  Antigravity Orchestrator MCP 등록 중... [필수]"
ANTIGRAVITY_ORCH_MODULE_DIR="$ANTIGRAVITY_ROOT/antigravity-cli/.olympus/runtime-modules/orchestrator"
ANTIGRAVITY_ORCH_DIST="$ANTIGRAVITY_ORCH_MODULE_DIR/mcp-server/dist/index.js"
ANTIGRAVITY_ORCH_SDK="$ANTIGRAVITY_ORCH_MODULE_DIR/mcp-server/node_modules/@modelcontextprotocol/sdk/package.json"
ANTIGRAVITY_ORCH_SQLITE="$ANTIGRAVITY_ORCH_MODULE_DIR/mcp-server/node_modules/better-sqlite3/package.json"
if [ ! -f "$ANTIGRAVITY_ORCH_DIST" ] || [ ! -f "$ANTIGRAVITY_ORCH_SDK" ] || [ ! -f "$ANTIGRAVITY_ORCH_SQLITE" ]; then
    echo "      MCP 서버 빌드 중..."
    (cd "$ANTIGRAVITY_ORCH_MODULE_DIR/mcp-server" && npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1)
fi
if [ -f "$ANTIGRAVITY_ORCH_DIST" ] && [ -f "$ANTIGRAVITY_ORCH_SDK" ] && [ -f "$ANTIGRAVITY_ORCH_SQLITE" ]; then
    if node "$SCRIPT_DIR/install-mcp-antigravity.js" --orchestrator "$ANTIGRAVITY_ORCH_DIST"; then
        ANTIGRAVITY_ORCH_RESULT="등록 완료"
    else
        ANTIGRAVITY_ORCH_RESULT="등록 실패"
    fi
else
    ANTIGRAVITY_ORCH_RESULT="스킵(빌드 실패)"
fi
echo "      $ANTIGRAVITY_ORCH_RESULT"

fi # HAS_ANTIGRAVITY

# ============================================
#   Grok Build
# ============================================
# Grok은 [compat.claude]로 ~/.claude/ 자산을 읽는다. Claude를 선택하지 않은
# 설치에서는 여기서 최소 공유 홈을 준비하고, 대화 훅만 grok-mnemo를 사용한다.
if [ "$HAS_GROK" = "1" ] || [ -d "$HOME/.grok" ]; then
echo ""
echo "  --- Grok Build ---"
echo ""
echo "  Grok-Mnemo 설치 중... [선택: Grok 미설치 시 자동 skip]"
if [ -f "$SCRIPT_DIR/skills/grok-mnemo/install.js" ]; then
    if [ -d "$HOME/.grok" ]; then
        if [ "$HAS_CLAUDE" = "0" ]; then
            if [ -f "$SCRIPT_DIR/scripts/prune-stale-assets.js" ]; then
                if ! node "$SCRIPT_DIR/scripts/prune-stale-assets.js" "$CLAUDE_DIR" --label grok-compat; then
                    echo "      [오류] Grok 호환 stale asset 정리 실패"
                    exit 1
                fi
            fi
            if [ -f "$SCRIPT_DIR/scripts/sync-claude-skills.js" ]; then
                if ! node "$SCRIPT_DIR/scripts/sync-claude-skills.js" "$CLAUDE_DIR" $SOURCE_ONLY_SKILL_FLAG; then
                    echo "      [오류] Grok 호환 Skill 동기화 실패"
                    exit 1
                fi
            else
                echo "      [오류] sync-claude-skills.js 없음"
                exit 1
            fi
            if [ -f "$SCRIPT_DIR/scripts/sync-claude-agents.js" ]; then
                if ! node "$SCRIPT_DIR/scripts/sync-claude-agents.js" "$CLAUDE_DIR" $SOURCE_ONLY_AGENT_FLAG; then
                    echo "      [오류] Grok 호환 Agent 동기화 실패"
                    exit 1
                fi
            else
                echo "      [오류] sync-claude-agents.js 없음"
                exit 1
            fi
            if [ -f "$SCRIPT_DIR/install-claude-md.js" ]; then
                node "$SCRIPT_DIR/install-claude-md.js" "$CLAUDE_DIR/CLAUDE.md" "$SCRIPT_DIR/skills/mnemo/templates/claude-md-rules.md"
            fi
        fi
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
fi # HAS_GROK

# ============================================
#   OpenClaw skills-only host
# ============================================
if [ "$HAS_OPENCLAW" = "1" ]; then
    echo ""
    echo "  --- OpenClaw (skills only) ---"
    if node "$SCRIPT_DIR/scripts/sync-portable-skills.js" openclaw --home "$OPENCLAW_DIR" $SOURCE_ONLY_SKILL_FLAG; then
        OPENCLAW_SYNC_RESULT="Skill 동기화 완료"
    else
        OPENCLAW_SYNC_RESULT="Skill 동기화 실패"
        echo "      [오류] OpenClaw Skill 동기화 실패"
        exit 1
    fi
fi

# ============================================
#   Hermes Agent skills-only host
# ============================================
if [ "$HAS_HERMES" = "1" ]; then
    echo ""
    echo "  --- Hermes Agent (skills only) ---"
    if node "$SCRIPT_DIR/scripts/sync-portable-skills.js" hermes --home "$HERMES_DIR" $SOURCE_ONLY_SKILL_FLAG; then
        HERMES_SYNC_RESULT="Skill 동기화 완료"
    else
        HERMES_SYNC_RESULT="Skill 동기화 실패"
        echo "      [오류] Hermes Skill 동기화 실패"
        exit 1
    fi
fi

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
if [ "$HAS_ANTIGRAVITY" = "1" ]; then
    echo "  [Antigravity]"
    echo "  - Mnemo: $ANTIGRAVITY_MNEMO_RESULT"
    echo "  - Skills/Agents/Hooks: $ANTIGRAVITY_SYNC_RESULT"
    echo "  - Hooks: $ANTIGRAVITY_HOOKS_RESULT"
    echo "  - MCP: $ANTIGRAVITY_MCP_RESULT"
    echo "  - Orchestrator: $ANTIGRAVITY_ORCH_RESULT"
fi
if [ "$HAS_GROK" = "1" ] || [ -d "$HOME/.grok" ]; then
    echo "  [Grok]"
    echo "  - Mnemo: $GROK_MNEMO_RESULT"
    echo "  - Skills/Agents/MCP: compat.claude 직접 읽기 (sync 불필요)"
fi
if [ "$HAS_OPENCLAW" = "1" ]; then
    echo "  [OpenClaw - skills only]"
    echo "  - Skills: $OPENCLAW_DIR/skills/"
    echo "  - Catalog: $OPENCLAW_DIR/SKILLS-CATALOG.md"
    echo "  - Plugins/Hooks/Mnemo/MCP: 설치 안 함"
    echo "  - 결과: $OPENCLAW_SYNC_RESULT"
fi
if [ "$HAS_HERMES" = "1" ]; then
    echo "  [Hermes Agent - skills only]"
    echo "  - Skills: $HERMES_DIR/skills/"
    echo "  - Catalog: $HERMES_DIR/SKILLS-CATALOG.md"
    echo "  - Plugins/Hooks/Mnemo/MCP: 설치 안 함"
    echo "  - 결과: $HERMES_SYNC_RESULT"
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
echo "  If a same-name asset was preserved, use the 'source -> backup' path printed above."
echo "  --uninstall does not restore preserved backups automatically; see docs/skill-registry-migration.md."
echo ""
echo "  CLI를 재시작하면 적용됩니다."
echo ""
