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
[ -n "${DEVIN_PROJECT_DIR:-}" ] && exit 0

# stdin JSON 페이로드에서 transcript_path 추출
INPUT_JSON=$(cat 2>/dev/null || true)
TRANSCRIPT_PATH=""
if [ -n "$INPUT_JSON" ] && command -v jq >/dev/null 2>&1; then
    TRANSCRIPT_PATH=$(echo "$INPUT_JSON" | jq -r '.transcript_path // empty' 2>/dev/null)
fi

# Shared resolver rejects runtime storage directories and untrusted fallback cwd.
get_claude_project_root() {
    local helper
    helper="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/mnemo-project-root.js"
    [ -f "$helper" ] || return 0
    printf '%s' "$INPUT_JSON" | node "$helper" --claude 2>/dev/null || true
}

PROJECT_ROOT=$(get_claude_project_root "$TRANSCRIPT_PATH")

# Temp/무효 루트면 저장 skip (fail-open) — gotcha 065
if [ -z "$PROJECT_ROOT" ]; then exit 0; fi

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$HOOK_DIR/.."

# Claude reconcile 스크립트
CLAUDE_CANDIDATES=(
    "$REPO_ROOT/skills/mnemo/scripts/reconcile_conversations.py" \
    "$REPO_ROOT/scripts/reconcile_conversations.py"
    "$HOME/.claude/skills/mnemo/scripts/reconcile_conversations.py"
)
CLAUDE_SCRIPT=""
for c in "${CLAUDE_CANDIDATES[@]}"; do
    if [ -f "$c" ]; then CLAUDE_SCRIPT="$c"; break; fi
done

# Codex reconcile 스크립트 (여러 설치 경로 탐색)
# - repo 체크아웃 (dev)
# - codex-mnemo/install.js가 배치하는 <CODEX_HOME>/scripts/
# - sync-codex-assets.js가 전체 스킬을 복사하는 <CODEX_HOME>/skills/codex-mnemo/scripts/
# - Claude smart-setup이 동기화한 ~/.claude/skills/codex-mnemo/scripts/
CODEX_ROOT="${CODEX_HOME:-$HOME/.codex}"
CODEX_CANDIDATES=(
    "$REPO_ROOT/skills/codex-mnemo/scripts/reconcile_codex_conversations.py"
    "$CODEX_ROOT/scripts/reconcile_codex_conversations.py"
    "$CODEX_ROOT/skills/codex-mnemo/scripts/reconcile_codex_conversations.py"
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

# 저장 opt-out: MNEMO_DISABLE=1|true|yes 면 backfill 저장을 건너뛴다 (개인정보처리방침 거부 방법).
# 버전 체크·에러 배너는 저장이 아니므로 계속 실행 (버전 체크는 OLYMPUS_UPDATE_CHECK_DISABLE로 별도 제어).
case "${MNEMO_DISABLE:-}" in
    1|[Tt][Rr][Uu][Ee]|[Yy][Ee][Ss]) ;;
    *)
        invoke_reconcile "$CLAUDE_SCRIPT" 'claude'
        invoke_reconcile "$CODEX_SCRIPT" 'codex'
        ;;
esac

# 사용자에게 보일 안내를 모은다. 끝에서 systemMessage JSON 한 줄로 내보낸다.
# exit 0 훅의 stderr는 사용자 화면에 나온다는 보장이 없어서(공식 문서에 없음) 쓰지 않는다 (gotcha 127).
USER_NOTICES=""
add_notice() {
    if [ -n "$USER_NOTICES" ]; then
        USER_NOTICES="${USER_NOTICES}"$'\n'"$1"
    else
        USER_NOTICES="$1"
    fi
}

# ── 업데이트 체크 (하루 1회, non-blocking) ──
# 설치된 훅은 CLI 설정 폴더(~/.claude/hooks 등)에서 돌아 저장소를 모른다. 저장소에서 바로 돌면 형제
# scripts/, 아니면 OLYMPUS_DIR, 그다음 설치기가 남긴 저장소 위치(~/.skill-olympus/repo-root)를 쓴다.
find_olympus_root() {
    if [ -f "$REPO_ROOT/scripts/update-check.sh" ]; then echo "$REPO_ROOT"; return; fi
    if [ -n "${OLYMPUS_DIR:-}" ] && [ -f "$OLYMPUS_DIR/scripts/update-check.sh" ]; then echo "$OLYMPUS_DIR"; return; fi
    local record="${OLYMPUS_STATE_DIR:-$HOME/.skill-olympus}/repo-root" recorded
    if [ -f "$record" ]; then
        # Windows 설치기가 남긴 기록은 CRLF·역슬래시일 수 있다
        recorded="$(tr -d '\r\n' < "$record" 2>/dev/null)"
        recorded="${recorded//\\//}"
        if [ -n "$recorded" ] && [ -f "$recorded/scripts/update-check.sh" ]; then echo "$recorded"; return; fi
    fi
}

OLYMPUS_ROOT="$(find_olympus_root)"
if [ -n "$OLYMPUS_ROOT" ]; then
    UPDATE_RESULT=$(bash "$OLYMPUS_ROOT/scripts/update-check.sh" 2>/dev/null || true)
    if echo "$UPDATE_RESULT" | grep -q '^UPGRADE_AVAILABLE'; then
        OLD_VER=$(echo "$UPDATE_RESULT" | awk '{print $2}')
        NEW_VER=$(echo "$UPDATE_RESULT" | awk '{print $3}')
        add_notice "[skill-olympus] 새 버전 v${NEW_VER} 사용 가능 (현재 v${OLD_VER}). ${OLYMPUS_ROOT} 에서 git pull 후 ./install.sh --all 로 업데이트하세요."
    fi
fi

# 세션 시작 시 누적된 에러 수를 안내 (최근 24시간)
ERR_LOG="$PROJECT_ROOT/.claude/mnemo-errors.log"
if [ -f "$ERR_LOG" ]; then
    RECENT_COUNT=$(awk -v cutoff="$(date -d '24 hours ago' '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -v-24H '+%Y-%m-%d %H:%M:%S' 2>/dev/null)" '
        match($0, /^\[([0-9-]+ [0-9:]+)\]/, m) {
            if (cutoff == "" || m[1] >= cutoff) count++
        }
        END { print count+0 }
    ' "$ERR_LOG" 2>/dev/null)
    if [ -n "$RECENT_COUNT" ] && [ "$RECENT_COUNT" -gt 0 ]; then
        add_notice "[mnemo] 최근 24시간 내 mnemo 에러 ${RECENT_COUNT}건 (.claude/mnemo-errors.log 확인)"
    fi
fi

# SessionStart stdout은 JSON 객체 하나일 때만 구조화 출력으로 읽힌다. 안내가 없으면 아무것도 쓰지 않는다.
if [ -n "$USER_NOTICES" ]; then
    # JSON 문자열 이스케이프: 역슬래시·따옴표·줄바꿈 (안내 문구에 다른 제어 문자는 없다)
    escaped="${USER_NOTICES//\\/\\\\}"
    escaped="${escaped//\"/\\\"}"
    escaped="${escaped//$'\n'/\\n}"
    printf '{"systemMessage":"%s"}\n' "$escaped"
fi

exit 0
