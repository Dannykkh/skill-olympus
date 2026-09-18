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

# 저장 opt-out: MNEMO_DISABLE=1|true|yes 면 mnemo 자동 저장 전체 비활성화 (개인정보처리방침 거부 방법)
case "${MNEMO_DISABLE:-}" in 1|[Tt][Rr][Uu][Ee]|[Yy][Ee][Ss]) exit 0 ;; esac

log_mnemo_error() {
    local ctx="$1"
    local msg="$2"
    [ -n "${PROJECT_ROOT:-}" ] || return 0
    local root="$PROJECT_ROOT"
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

# Shared resolver rejects runtime storage directories and untrusted fallback cwd.
get_claude_project_root() {
    local helper
    helper="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/mnemo-project-root.js"
    [ -f "$helper" ] || return 0
    printf '%s' "$INPUT" | node "$helper" --claude 2>/dev/null || true
}

# MNEMO_RELPATH_START
# 기록에 남기는 경로는 프로젝트 루트 기준 상대경로(슬래시 구분)로 쓴다. 루트 밖 경로는 그대로 둔다.
# 절대경로를 그대로 남기면 프로젝트를 옮기거나 다른 컴퓨터에서 열었을 때 기록이 옛 위치를 가리킨다.
# 대상은 file_path·notebook_path·path 필드뿐이다. command·content 같은 본문은 내용이므로 손대지 않는다.
mnemo_relpath_defs() {
    cat << 'EOF'
def mnemo_relpath($root):
  if type != "string" or $root == "" then . else
    gsub("\\\\"; "/") as $p
    | ($root | gsub("\\\\"; "/") | sub("/+$"; "")) as $r
    | ($r | test("^[A-Za-z]:/")) as $windows
    | (if $windows then ($p | ascii_downcase) else $p end) as $pc
    | (if $windows then ($r | ascii_downcase) else $r end) as $rc
    | if $pc == $rc then "."
      elif ($pc | startswith($rc + "/")) then $p[($r | length) + 1:]
      else . end
  end;
def mnemo_relativize($root):
  if type == "object" then
    with_entries(if (.key == "file_path" or .key == "notebook_path" or .key == "path") then .value |= mnemo_relpath($root) else . end)
  else . end;
EOF
}
# MNEMO_RELPATH_END

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

# 프로젝트 루트 결정: 명시 workspace → payload cwd → transcript metadata
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
PROJECT_ROOT=$(get_claude_project_root "$TRANSCRIPT_PATH")

# Temp/무효 루트면 저장 skip (fail-open) — gotcha 065
if [ -z "$PROJECT_ROOT" ]; then exit 0; fi

# 기록용 도구 입력: 경로 필드를 루트 기준 상대경로로 바꾼 사본 (toollog·관찰 로그 공용)
TOOL_INPUT_JSON=$(echo "$INPUT" | jq -c --arg root "$PROJECT_ROOT" "$(mnemo_relpath_defs)"' (.tool_input // {}) | mnemo_relativize($root)' 2>/dev/null)
[ -n "$TOOL_INPUT_JSON" ] || TOOL_INPUT_JSON='{}'

# 대화 로그 경로
[ -f "$PROJECT_ROOT/.mnemo-root" ] || : > "$PROJECT_ROOT/.mnemo-root"
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
        DETAIL=$(echo "$TOOL_INPUT_JSON" | jq -r '.file_path // empty' 2>/dev/null)
        ;;
    Bash)
        CMD=$(echo "$TOOL_INPUT_JSON" | jq -r '.command // empty' 2>/dev/null)
        DETAIL="${CMD:0:80}"
        [ ${#CMD} -gt 80 ] && DETAIL="${DETAIL}..."
        ;;
    Agent)
        SUBTYPE=$(echo "$TOOL_INPUT_JSON" | jq -r '.subagent_type // empty' 2>/dev/null)
        DESC=$(echo "$TOOL_INPUT_JSON" | jq -r '.description // empty' 2>/dev/null)
        DETAIL="$SUBTYPE: $DESC"
        ;;
    Skill)
        DETAIL=$(echo "$TOOL_INPUT_JSON" | jq -r '.skill // empty' 2>/dev/null)
        ;;
    WebFetch)
        DETAIL=$(echo "$TOOL_INPUT_JSON" | jq -r '.url // empty' 2>/dev/null)
        ;;
    WebSearch)
        DETAIL=$(echo "$TOOL_INPUT_JSON" | jq -r '.query // empty' 2>/dev/null)
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

# 실패 판정은 '출력 어딘가에 error라는 단어가 있는가'가 아니라 '출력이 에러 형태인가'로 본다.
# 예전 규칙은 편집한 소스에 Failed( 나 Error enum이 있다는 이유로 성공을 gotchas에 넣었다.
# Edit/Write/Read는 응답이 파일 내용을 그대로 되돌려주므로 본문 매칭 자체를 하지 않는다.
HAS_ERROR=0
case "$TOOL_NAME" in
    Edit|Write|NotebookEdit|Read|NotebookRead) ;;
    *)
        if echo "$TOOL_OUTPUT" | grep -qE '^[[:space:]]*(([Ff]atal|[Ee]rror|ERR)[[:space:]]*:|Traceback \(most recent call last\)|[A-Za-z_.]*(Error|Exception)[[:space:]]*:|.{0,40}(command not found|No such file or directory|Permission denied)|ENOENT|ERR_[A-Z_]+|npm ERR!|error TS[0-9]+|error CS[0-9]+)' 2>/dev/null; then
            HAS_ERROR=1
        fi
        ;;
esac

if [ "$HAS_ERROR" -eq 1 ]; then
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
TOOL_INPUT_STR=$(printf '%s' "$TOOL_INPUT_JSON" | head -c 3000)
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

# MNEMO_ROTATION_START
# 기준값이 없거나 잘못됐으면 상태 알림의 초기화 이후에 회전한다.
if [ -f "$OBS_FILE" ] && [ "$(wc -c < "$OBS_FILE")" -ge 10485760 ]; then
    ROTATION_MARKER="$(dirname "$TARGET_DIR")/.mnemo-distill-offset"
    ROTATION_TEXT=$(cat "$ROTATION_MARKER" 2>/dev/null || true)
    if [[ "$ROTATION_TEXT" =~ ^(-?[0-9]+)[[:space:]]+(-?[0-9]+)[[:space:]]+([0-9]+)$ ]]; then
        ROTATION_G=${BASH_REMATCH[1]}; ROTATION_L=${BASH_REMATCH[2]}; ROTATION_REF=${BASH_REMATCH[3]}
        ROTATION_COUNT=$(awk 'END { print NR }' "$OBS_FILE")
        if [ "$(basename "$TARGET_DIR")" = gotchas ]; then
            ROTATION_G=$((ROTATION_G - ROTATION_COUNT))
        else
            ROTATION_L=$((ROTATION_L - ROTATION_COUNT))
        fi
        ROTATION_ARCHIVE="$TARGET_DIR/archive"
        if mkdir -p "$ROTATION_ARCHIVE"; then
            ROTATION_DEST=$(mktemp "$ROTATION_ARCHIVE/observations-$(date +%Y%m%d-%H%M%S)-XXXXXXXX") || ROTATION_DEST=""
            if [ -n "$ROTATION_DEST" ]; then
               if mv "$OBS_FILE" "$ROTATION_DEST.jsonl"; then
                    ROTATION_TEMP=$(mktemp "$ROTATION_MARKER.XXXXXXXX") || ROTATION_TEMP=""
                    if [ -z "$ROTATION_TEMP" ] || ! { printf '%s %s %s\n' "$ROTATION_G" "$ROTATION_L" "$ROTATION_REF" > "$ROTATION_TEMP" && mv "$ROTATION_TEMP" "$ROTATION_MARKER"; }; then
                       mv "$ROTATION_DEST.jsonl" "$OBS_FILE"
                   fi
                    [ -z "$ROTATION_TEMP" ] || rm -f "$ROTATION_TEMP"
               fi
                rm -f "$ROTATION_DEST"
            fi
        fi
    fi
fi
# MNEMO_ROTATION_END
