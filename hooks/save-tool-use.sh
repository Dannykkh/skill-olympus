#!/bin/bash
# save-tool-use.sh - PostToolUse 훅: 도구 호출을 한 줄로 기록
# 도구명 + 파일경로만 append. AI 호출 없음 = 빠름
# claude-mem의 관찰 캡처 아이디어를 차용하되, 파일 기반으로 단순 구현
#
# 에러 처리 (P1 parity):
# - 정상 skip 케이스(빈 stdin, skipTools): 조용히 exit 0
# - 진짜 실패(파싱 에러): .claude/mnemo-errors.log 기록 후 exit 0
# - $MNEMO_STRICT='1' 이면 실패 시 exit 1

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
