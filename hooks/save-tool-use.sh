#!/bin/bash
# save-tool-use.sh - PostToolUse 훅: 도구 호출을 한 줄로 기록
# 도구명 + 파일경로만 append. AI 호출 없음 = 빠름
# claude-mem의 관찰 캡처 아이디어를 차용하되, 파일 기반으로 단순 구현
#
# 에러 처리 (P1 parity):
# - 정상 skip 케이스(빈 stdin, skipTools): 조용히 exit 0
# - 진짜 실패(파싱 에러): .claude/mnemo-errors.log 기록 후 exit 0
# - $MNEMO_STRICT='1' 이면 실패 시 exit 1

# Grok 세션 가드: Grok envelope는 camelCase(toolName)라 오동작 가능 -> grok-mnemo가 전담.
[ -n "${GROK_HOOK_EVENT:-}" ] && exit 0

log_mnemo_error() {
    local ctx="$1"
    local msg="$2"
    local root="$PWD"
    local git_root
    git_root=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$git_root" ]; then root="$git_root"; fi
    local err_dir="$root/.claude"
    mkdir -p "$err_dir" 2>/dev/null || true
    local log_path="$err_dir/mnemo-errors.log"
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$ts] [save-tool-use.sh] [$ctx] $msg" >> "$log_path" 2>/dev/null || true
}

exit_mnemo_error() {
    local ctx="$1"
    local msg="$2"
    log_mnemo_error "$ctx" "$msg"
    if [ "${MNEMO_STRICT:-}" = "1" ]; then exit 1; fi
    exit 0
}

# ── 프로젝트 루트 결정 (save-response.sh와 동일 로직) ──────────
# ── 비-git 프로젝트 루트 보정 (gotcha 047) ──────────────────────
# git이 없어도 프로젝트 루트를 지킨다. 빌드 출력 폴더(bin/Debug 등)에서 실행된
# 세션이 그 폴더를 루트로 삼아 conversations/가 흩어지는 것을 방지.
# Pass A: 상위로 걸어 올라가며 기존 mnemo 루트 마커(MEMORY.md 또는 conversations/) 탐색 (HOME 제외)
# Pass B: 빌드 출력 세그먼트(bin|obj|dist|build|out|target|node_modules) 첫 등장 앞에서 절단
# Temp 계열 경로는 프로젝트 루트로 승격 금지 (gotcha 065): Temp에서 뜬 세션이
# Temp에 스캐폴드를 만들면 그 마커가 이후 세션까지 끌어당긴다. Temp 루트면 저장 skip.
is_mnemo_temp_path() {
    local p="${1%/}"
    case "$p" in
        /tmp|/tmp/*|/private/tmp|/private/tmp/*|/var/tmp|/var/tmp/*) return 0 ;;
        */AppData/Local/Temp|*/AppData/Local/Temp/*) return 0 ;;
    esac
    if [ -n "${TMPDIR:-}" ]; then
        local t="${TMPDIR%/}"
        case "$p" in "$t"|"$t"/*) return 0 ;; esac
    fi
    return 1
}

get_nongit_project_root() {
    local start="$1"
    if [ -z "$start" ]; then printf '%s\n' "$start"; return; fi
    local home_dir="${HOME:-$USERPROFILE}"
    home_dir="${home_dir%/}"
    local cur="$start"
    while [ -n "$cur" ] && [ "$cur" != "/" ] && [ "$cur" != "." ]; do
        if [ -n "$home_dir" ] && [ "${cur%/}" = "$home_dir" ]; then break; fi
        if is_mnemo_temp_path "$cur"; then break; fi
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
    if [ -n "$stripped" ] && [ "$stripped" != "$start" ] && [ -d "$stripped" ] && { [ -z "$home_dir" ] || [ "${stripped%/}" != "$home_dir" ]; } && ! is_mnemo_temp_path "$stripped"; then
        printf '%s\n' "$stripped"
    elif is_mnemo_temp_path "$start"; then
        printf '%s\n' ""
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
        is_mnemo_temp_path "$c" && continue
        candidates+=("$c")
    done
    is_mnemo_temp_path "$PWD" || candidates+=("$PWD")

    # Pass 1: git 루트가 잡히는 첫 후보 (단, git 루트가 HOME이면 dotfiles repo로 간주해 제외)
    local git_root gr_u
    for c in "${candidates[@]}"; do
        if [ -d "$c" ]; then
            git_root=$(git -C "$c" rev-parse --show-toplevel 2>/dev/null)
            if [ -n "$git_root" ]; then
                gr_u=$(_w2u "$git_root")
                if [ "${gr_u%/}" != "${home_u%/}" ] && ! is_mnemo_temp_path "$gr_u"; then echo "$git_root"; return 0; fi
            fi
        fi
    done
    # Pass 2: git 없음(비-git) -> 첫 유효 후보(= launch cwd)를 비-git 루트 보정 후 반환
    for c in "${candidates[@]}"; do
        [ -d "$c" ] && { get_nongit_project_root "$c"; return 0; }
    done
    get_nongit_project_root "$PWD"
}

INPUT=$(cat)
if [ -z "$INPUT" ]; then exit 0; fi

if ! command -v jq >/dev/null 2>&1; then
    exit_mnemo_error 'missing-jq' 'jq가 설치되어 있지 않습니다'
fi

# JSON 유효성 먼저 확인
if ! echo "$INPUT" | jq -e . >/dev/null 2>&1; then
    exit_mnemo_error 'stdin-json' 'stdin JSON 파싱 실패'
fi

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
if [ -z "$TOOL_NAME" ]; then exit 0; fi

# 기록하지 않을 도구 (너무 빈번하거나 노이즈)
case "$TOOL_NAME" in
    Glob|Grep|Read|LS|TaskCreate|TaskUpdate|TaskGet|TaskList|TaskOutput|TeamCreate|TeamDelete|SendMessage) exit 0 ;;
esac

# 프로젝트 루트 결정: JSONL cwd → transcript path 디코딩 → PWD fallback
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
PROJECT_ROOT=$(get_claude_project_root "$TRANSCRIPT_PATH")

# Temp/무효 루트면 저장 skip (fail-open) — gotcha 065
if [ -z "$PROJECT_ROOT" ]; then exit 0; fi

# 대화 로그 경로
CONV_DIR="$PROJECT_ROOT/conversations"
TODAY=$(date +%Y-%m-%d)
LOG_FILE="$CONV_DIR/$TODAY-toollog.md"

# conversations 폴더 자동 생성
mkdir -p "$CONV_DIR"

# 파일 없으면 헤더
if [ ! -f "$LOG_FILE" ]; then
    cat > "$LOG_FILE" << EOF
---
date: $TODAY
type: tool-log
---

# Tool Usage Log - $TODAY

EOF
fi

# 도구별 핵심 정보 추출
DETAIL=""
case "$TOOL_NAME" in
    Edit|Write)
        DETAIL=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
        ;;
    Bash)
        CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
        DETAIL="${CMD:0:80}"
        [ ${#CMD} -gt 80 ] && DETAIL="${DETAIL}..."
        ;;
    Agent)
        SUBTYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // empty' 2>/dev/null)
        DESC=$(echo "$INPUT" | jq -r '.tool_input.description // empty' 2>/dev/null)
        DETAIL="$SUBTYPE: $DESC"
        ;;
    Skill)
        DETAIL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty' 2>/dev/null)
        ;;
    WebFetch)
        DETAIL=$(echo "$INPUT" | jq -r '.tool_input.url // empty' 2>/dev/null)
        ;;
    WebSearch)
        DETAIL=$(echo "$INPUT" | jq -r '.tool_input.query // empty' 2>/dev/null)
        ;;
esac

TIMESTAMP=$(date +%H:%M:%S)

# 중복 방지: 같은 초에 같은 도구가 있으면 스킵
if [ -f "$LOG_FILE" ] && grep -qF "[\`$TIMESTAMP\`] **$TOOL_NAME**" "$LOG_FILE" 2>/dev/null; then
    exit 0
fi

echo "- \`[$TIMESTAMP]\` **$TOOL_NAME** $DETAIL" >> "$LOG_FILE"

# ─────────────────────────────────────────────
# 학습 관찰 기록 (memory/gotchas/ + memory/learned/)
# 에러 → gotchas, 성공 → learned 에 각각 기록
# ─────────────────────────────────────────────

TOOL_OUTPUT=$(echo "$INPUT" | jq -r '.tool_response // .tool_output // .output // empty' 2>/dev/null)
TOOL_OUTPUT_STR=$(echo "$TOOL_OUTPUT" | head -c 3000)

# 기록 대상 판단
TARGET_DIR=""
EVENT_TYPE=""

if echo "$TOOL_OUTPUT" | grep -qiE '(error|fail|exception|denied|not found|cannot|unable|ENOENT|ERR_)' 2>/dev/null; then
    # 실패 → memory/gotchas/
    TARGET_DIR="$PROJECT_ROOT/memory/gotchas"
    EVENT_TYPE="tool_error"
else
    # 수정/실행 도구가 에러 없이 성공 → memory/learned/
    case "$TOOL_NAME" in
        Edit|Write|Bash|Agent|Skill)
            TARGET_DIR="$PROJECT_ROOT/memory/learned"
            EVENT_TYPE="tool_success"
            ;;
        *) exit 0 ;;
    esac
fi

mkdir -p "$TARGET_DIR"
OBS_FILE="$TARGET_DIR/observations.jsonl"

# 입력/출력 truncate + 시크릿 스크러빙
TOOL_INPUT_STR=$(echo "$INPUT" | jq -c '.tool_input // {}' 2>/dev/null | head -c 3000)
TOOL_INPUT_STR=$(echo "$TOOL_INPUT_STR" | sed -E "s/(api[_-]?key|token|secret|password|authorization)([\"' :=]+)[A-Za-z0-9_\\/\\.+=]{8,}/\1\2[REDACTED]/gi" 2>/dev/null || echo "$TOOL_INPUT_STR")
TOOL_OUTPUT_STR=$(echo "$TOOL_OUTPUT_STR" | sed -E "s/(api[_-]?key|token|secret|password|authorization)([\"' :=]+)[A-Za-z0-9_\\/\\.+=]{8,}/\1\2[REDACTED]/gi" 2>/dev/null || echo "$TOOL_OUTPUT_STR")

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null)
OBS_TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# jq로 안전하게 JSON 생성
jq -n -c \
    --arg ts "$OBS_TS" \
    --arg ev "$EVENT_TYPE" \
    --arg tl "$TOOL_NAME" \
    --arg inp "$TOOL_INPUT_STR" \
    --arg out "$TOOL_OUTPUT_STR" \
    --arg sess "$SESSION_ID" \
    '{timestamp:$ts, event:$ev, tool:$tl, input:$inp, output:$out, session:$sess}' \
    >> "$OBS_FILE" 2>/dev/null

# 파일 크기 제한 (10MB 초과 시 아카이브)
if [ -f "$OBS_FILE" ]; then
    FILE_SIZE_MB=$(du -m "$OBS_FILE" 2>/dev/null | cut -f1)
    if [ "${FILE_SIZE_MB:-0}" -ge 10 ]; then
        ARCHIVE_DIR="$TARGET_DIR/archive"
        mkdir -p "$ARCHIVE_DIR"
        mv "$OBS_FILE" "$ARCHIVE_DIR/observations-$(date +%Y%m%d-%H%M%S).jsonl" 2>/dev/null || true
    fi
fi
