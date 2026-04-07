#!/bin/bash
# reconcile-conversations.sh
# SessionStart 훅: Claude + Codex 두 CLI의 JSONL 원본을 source of truth로 선언하고,
# save-response/save-turn이 놓친 턴을 conversations/YYYY-MM-DD-{claude,codex}.md에 backfill한다.
#
# 동작 원칙
# - 빠르게: 오늘자 날짜만 reconcile (기본값)
# - 조용히: 에러가 발생해도 세션 시작을 막지 않음 (fail-open)
# - 멱등: 각 CLI의 사이드카 인덱스(.mnemo-index.json)가 Claude/Codex 네임스페이스 공유

# stdin JSON 페이로드에서 transcript_path 추출
INPUT_JSON=$(cat 2>/dev/null || true)
TRANSCRIPT_PATH=""
if [ -n "$INPUT_JSON" ] && command -v jq >/dev/null 2>&1; then
    TRANSCRIPT_PATH=$(echo "$INPUT_JSON" | jq -r '.transcript_path // empty' 2>/dev/null)
fi

# ── 프로젝트 루트 결정 (save-response.sh와 동일 로직) ──────────
get_claude_project_root() {
    local transcript_path="$1"

    if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
        local cwd
        cwd=$(tail -n 200 "$transcript_path" 2>/dev/null \
            | grep -oE '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' \
            | tail -n 1 \
            | sed -E 's/"cwd"[[:space:]]*:[[:space:]]*"(.*)"/\1/' \
            | sed 's|\\\\|\\|g')
        if [ -n "$cwd" ]; then
            local cwd_unix="$cwd"
            if [[ "$cwd" =~ ^([A-Za-z]):\\ ]]; then
                local drive="${BASH_REMATCH[1]}"
                cwd_unix="/${drive,,}/${cwd:3}"
                cwd_unix="${cwd_unix//\\//}"
            fi
            if [ -d "$cwd_unix" ]; then
                local git_root
                git_root=$(git -C "$cwd_unix" rev-parse --show-toplevel 2>/dev/null)
                if [ -n "$git_root" ]; then
                    echo "$git_root"
                    return 0
                fi
                echo "$cwd_unix"
                return 0
            fi
        fi
    fi

    if [ -n "$transcript_path" ]; then
        local parent
        parent=$(basename "$(dirname "$transcript_path")")
        if [[ "$parent" =~ ^([A-Za-z])--(.+)$ ]]; then
            local drive="${BASH_REMATCH[1],,}"
            local rest="${BASH_REMATCH[2]//-//}"
            local decoded="/$drive/$rest"
            if [ -d "$decoded" ]; then
                local git_root
                git_root=$(git -C "$decoded" rev-parse --show-toplevel 2>/dev/null)
                if [ -n "$git_root" ]; then
                    echo "$git_root"
                    return 0
                fi
                echo "$decoded"
                return 0
            fi
        fi
    fi

    local root="$PWD"
    local git_root
    git_root=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$git_root" ]; then
        root="$git_root"
    fi
    echo "$root"
}

PROJECT_ROOT=$(get_claude_project_root "$TRANSCRIPT_PATH")

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$HOOK_DIR/.."

# Claude reconcile 스크립트
CLAUDE_CANDIDATES=(
    "$REPO_ROOT/skills/mnemo/scripts/reconcile_conversations.py"
    "$HOME/.claude/skills/mnemo/scripts/reconcile_conversations.py"
)
CLAUDE_SCRIPT=""
for c in "${CLAUDE_CANDIDATES[@]}"; do
    if [ -f "$c" ]; then CLAUDE_SCRIPT="$c"; break; fi
done

# Codex reconcile 스크립트 (여러 설치 경로 탐색)
# - repo 체크아웃 (dev)
# - codex-mnemo/install.js가 배치하는 ~/.codex/scripts/
# - sync-codex-assets.js가 전체 스킬을 복사하는 ~/.codex/skills/codex-mnemo/scripts/
# - Claude smart-setup이 동기화한 ~/.claude/skills/codex-mnemo/scripts/
CODEX_CANDIDATES=(
    "$REPO_ROOT/skills/codex-mnemo/scripts/reconcile_codex_conversations.py"
    "$HOME/.codex/scripts/reconcile_codex_conversations.py"
    "$HOME/.codex/skills/codex-mnemo/scripts/reconcile_codex_conversations.py"
    "$HOME/.claude/skills/codex-mnemo/scripts/reconcile_codex_conversations.py"
)
CODEX_SCRIPT=""
for c in "${CODEX_CANDIDATES[@]}"; do
    if [ -f "$c" ]; then CODEX_SCRIPT="$c"; break; fi
done

if [ -z "$CLAUDE_SCRIPT" ] && [ -z "$CODEX_SCRIPT" ]; then
    exit 0
fi

# Python 실행 파일 결정
# Windows App Store의 python3 stub는 실행 시 exit 49로 Store로 리다이렉트하므로
# python을 먼저 시도한다. (Linux/Mac은 python3가 정답이지만 command -v가 둘 다 잡음)
PYTHON=""
for cmd in python python3 py; do
    if command -v "$cmd" >/dev/null 2>&1; then
        # 실제 실행 가능한지 --version으로 확인 (stub 제외)
        if "$cmd" --version >/dev/null 2>&1; then
            PYTHON="$cmd"
            break
        fi
    fi
done

if [ -z "$PYTHON" ]; then
    exit 0
fi

log_reconcile_error() {
    local ctx="$1"
    local msg="$2"
    local err_dir="$PROJECT_ROOT/.claude"
    mkdir -p "$err_dir" 2>/dev/null || true
    local log_path="$err_dir/mnemo-errors.log"
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$ts] [reconcile-conversations.sh] [$ctx] $msg" >> "$log_path" 2>/dev/null || true
}

invoke_reconcile() {
    local script="$1"
    local label="$2"
    if [ -z "$script" ]; then return 0; fi
    local out
    out=$("$PYTHON" "$script" --project-root "$PROJECT_ROOT" --quiet 2>&1)
    local rc=$?
    if [ $rc -ne 0 ]; then
        log_reconcile_error "$label-nonzero" "exit=$rc output=$out"
    fi
}

invoke_reconcile "$CLAUDE_SCRIPT" 'claude'
invoke_reconcile "$CODEX_SCRIPT" 'codex'

# 세션 시작 시 누적된 에러 수를 STDERR로 안내 (최근 24시간)
ERR_LOG="$PROJECT_ROOT/.claude/mnemo-errors.log"
if [ -f "$ERR_LOG" ]; then
    RECENT_COUNT=$(awk -v cutoff="$(date -d '24 hours ago' '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -v-24H '+%Y-%m-%d %H:%M:%S' 2>/dev/null)" '
        match($0, /^\[([0-9-]+ [0-9:]+)\]/, m) {
            if (cutoff == "" || m[1] >= cutoff) count++
        }
        END { print count+0 }
    ' "$ERR_LOG" 2>/dev/null)
    if [ -n "$RECENT_COUNT" ] && [ "$RECENT_COUNT" -gt 0 ]; then
        echo "[mnemo] 최근 24시간 내 mnemo 에러 ${RECENT_COUNT}건 (.claude/mnemo-errors.log 확인)" >&2
    fi
fi

exit 0
