#!/bin/bash
# reconcile-conversations.sh
# SessionStart 훅: Claude + Codex 두 CLI의 JSONL 원본을 source of truth로 선언하고,
# save-response/save-turn이 놓친 턴을 conversations/YYYY-MM-DD-{claude,codex}.md에 backfill한다.
#
# 동작 원칙
# - 빠르게: 오늘자 날짜만 reconcile (기본값)
# - 조용히: 에러가 발생해도 세션 시작을 막지 않음 (fail-open)
# - 멱등: 각 CLI의 사이드카 인덱스(.mnemo-index.json)가 Claude/Codex 네임스페이스 공유

# Grok 세션 가드: Grok SessionStart마다 Claude/Codex reconcile 비용을 지불하지 않도록 즉시 종료.
[ -n "${GROK_HOOK_EVENT:-}" ] && exit 0

# stdin JSON 페이로드에서 transcript_path 추출
INPUT_JSON=$(cat 2>/dev/null || true)
TRANSCRIPT_PATH=""
if [ -n "$INPUT_JSON" ] && command -v jq >/dev/null 2>&1; then
    TRANSCRIPT_PATH=$(echo "$INPUT_JSON" | jq -r '.transcript_path // empty' 2>/dev/null)
fi

# ── 프로젝트 루트 결정 (save-response.sh와 동일 로직) ──────────
# ── 비-git 프로젝트 루트 보정 (gotcha 047) ──────────────────────
# git이 없어도 프로젝트 루트를 지킨다. 빌드 출력 폴더(bin/Debug 등)에서 실행된
# 세션이 그 폴더를 루트로 삼아 conversations/가 흩어지는 것을 방지.
# Pass A: 상위로 걸어 올라가며 기존 mnemo 루트 마커(MEMORY.md 또는 conversations/) 탐색 (HOME 제외)
# Pass B: 빌드 출력 세그먼트(bin|obj|dist|build|out|target|node_modules) 첫 등장 앞에서 절단
get_nongit_project_root() {
    local start="$1"
    if [ -z "$start" ]; then printf '%s\n' "$start"; return; fi
    local home_dir="${HOME:-$USERPROFILE}"
    home_dir="${home_dir%/}"
    local cur="$start"
    while [ -n "$cur" ] && [ "$cur" != "/" ] && [ "$cur" != "." ]; do
        if [ -n "$home_dir" ] && [ "${cur%/}" = "$home_dir" ]; then break; fi
        if [ -f "$cur/MEMORY.md" ] || [ -d "$cur/conversations" ]; then
            printf '%s\n' "$cur"; return
        fi
        local parent
        parent=$(dirname "$cur")
        [ "$parent" = "$cur" ] && break
        cur="$parent"
    done
    local stripped="$start"
    while printf '%s' "$stripped" | grep -qE '[/\\](bin|obj|dist|build|out|target|node_modules)([/\\]|$)'; do
        stripped=$(printf '%s' "$stripped" | sed -E 's#[/\\](bin|obj|dist|build|out|target|node_modules)([/\\].*)?$##')
    done
    if [ -n "$stripped" ] && [ "$stripped" != "$start" ] && [ -d "$stripped" ] && { [ -z "$home_dir" ] || [ "${stripped%/}" != "$home_dir" ]; }; then
        printf '%s\n' "$stripped"
    else
        printf '%s\n' "$start"
    fi
}

get_claude_project_root() {
    local transcript_path="$1"
    local home_dir="${HOME:-$USERPROFILE}"

    _w2u() {
        local p="$1"
        if [[ "$p" =~ ^([A-Za-z]): ]]; then
            local d="${BASH_REMATCH[1],,}"; p="/${d}/${p:3}"; p="${p//\\//}"
        fi
        printf '%s' "$p"
    }

    local first_cwd="" last_cwd="" decoded=""
    if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
        first_cwd=$(grep -m 1 -oE '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' "$transcript_path" 2>/dev/null \
            | sed -E 's/"cwd"[[:space:]]*:[[:space:]]*"(.*)"/\1/' | sed 's|\\\\|\\|g')
        last_cwd=$(tail -n 200 "$transcript_path" 2>/dev/null \
            | grep -oE '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' \
            | tail -n 1 | sed -E 's/"cwd"[[:space:]]*:[[:space:]]*"(.*)"/\1/' | sed 's|\\\\|\\|g')
    fi
    if [ -n "$transcript_path" ]; then
        local parent; parent=$(basename "$(dirname "$transcript_path")")
        if [[ "$parent" =~ ^([A-Za-z])--(.+)$ ]]; then
            decoded="/${BASH_REMATCH[1],,}/${BASH_REMATCH[2]//-//}"
        fi
    fi

    # 후보: launch cwd -> last cwd -> decoded -> PWD (HOME은 후보에서 제외)
    local home_u; home_u=$(_w2u "$home_dir")
    local -a candidates=()
    local c
    for c in "$first_cwd" "$last_cwd" "$decoded"; do
        [ -z "$c" ] && continue
        c=$(_w2u "$c")
        [ "${c%/}" = "${home_u%/}" ] && continue
        candidates+=("$c")
    done
    candidates+=("$PWD")

    # Pass 1: git 루트가 잡히는 첫 후보 (단, git 루트가 HOME이면 dotfiles repo로 간주해 제외)
    local git_root gr_u
    for c in "${candidates[@]}"; do
        if [ -d "$c" ]; then
            git_root=$(git -C "$c" rev-parse --show-toplevel 2>/dev/null)
            if [ -n "$git_root" ]; then
                gr_u=$(_w2u "$git_root")
                [ "${gr_u%/}" = "${home_u%/}" ] || { echo "$git_root"; return 0; }
            fi
        fi
    done
    # Pass 2: git 없음(비-git) -> 첫 유효 후보(= launch cwd)를 비-git 루트 보정 후 반환
    for c in "${candidates[@]}"; do
        [ -d "$c" ] && { get_nongit_project_root "$c"; return 0; }
    done
    get_nongit_project_root "$PWD"
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

# ── 업데이트 체크 (하루 1회, non-blocking) ──
UPDATE_SCRIPT="$REPO_ROOT/scripts/update-check.sh"
if [ ! -f "$UPDATE_SCRIPT" ]; then
    UPDATE_SCRIPT="$HOME/.claude/skills/update-check.sh"
fi
if [ -f "$UPDATE_SCRIPT" ]; then
    UPDATE_RESULT=$(bash "$UPDATE_SCRIPT" 2>/dev/null || true)
    if echo "$UPDATE_RESULT" | grep -q '^UPGRADE_AVAILABLE'; then
        OLD_VER=$(echo "$UPDATE_RESULT" | awk '{print $2}')
        NEW_VER=$(echo "$UPDATE_RESULT" | awk '{print $3}')
        echo "[skill-olympus] 새 버전 v${NEW_VER} 사용 가능 (현재 v${OLD_VER}). git pull && ./install.sh --all 로 업데이트하세요." >&2
    fi
fi

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
