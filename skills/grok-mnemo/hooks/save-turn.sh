#!/bin/bash
# save-turn.sh - Grok Build 훅: User+Assistant 턴을 대화 파일에 저장
# 한 스크립트가 두 이벤트를 처리한다 (hookEventName으로 분기):
#   - user_prompt_submit: payload.prompt (<user_query> 래퍼 제거) -> User 저장
#   - stop (reason == end_turn): payload.lastAssistantMessage -> Assistant 저장
# Grok 훅 envelope는 camelCase (Claude snake_case와 다름). AI 호출 없음 = 빠름.
#
# 주의 (실측 근거, Grok Build 0.2.111):
# - Stop은 세션 종료 시 observe-only로 한 번 더 발화 -> reason == "end_turn"만 저장
# - Stop stdout에 JSON을 쓰면 stop 결정으로 파싱됨 -> stdout 출력 금지 (stderr만 사용)
# - prompt는 <user_query>...</user_query>로 래핑되어 옴 -> 스트립 필요
#
# 에러 처리 (P1 parity):
# - 실패는 .claude/mnemo-errors.log에 기록
# - $MNEMO_STRICT='1' 이면 실패 시 exit 1

# 저장 opt-out: MNEMO_DISABLE=1|true|yes 면 mnemo 자동 저장 전체 비활성화 (개인정보처리방침 거부 방법)
# (Grok Stop 이벤트는 stdout 출력 금지 규칙이 있으나, 조용한 exit 0은 안전)
case "${MNEMO_DISABLE:-}" in 1|[Tt][Rr][Uu][Ee]|[Yy][Ee][Ss]) exit 0 ;; esac

log_mnemo_error() {
    local ctx="$1"
    local msg="$2"
    [ -n "${PROJECT_ROOT:-}" ] || return
    local root="$PROJECT_ROOT"
    local err_dir="$root/.claude"
    mkdir -p "$err_dir" 2>/dev/null || true
    local log_path="$err_dir/mnemo-errors.log"
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$ts] [grok-mnemo/save-turn.sh] [$ctx] $msg" >> "$log_path" 2>/dev/null || true
}

exit_mnemo_error() {
    local ctx="$1"
    local msg="$2"
    log_mnemo_error "$ctx" "$msg"
    if [ "${MNEMO_STRICT:-}" = "1" ]; then exit 1; fi
    exit 0
}

ensure_memory_scaffold() {
    local base_dir="$1"
    local memory_dir="$base_dir/memory"
    local project_name
    local today

    project_name="$(basename "$base_dir")"
    today="$(date +%Y-%m-%d)"

    mkdir -p "$memory_dir"

    if [ ! -f "$base_dir/MEMORY.md" ]; then
        local category architecture_path patterns_path tools_path gotchas_path
        for category in architecture patterns tools gotchas; do
            if [ -f "$memory_dir/$category/index.md" ]; then
                printf -v "${category}_path" 'memory/%s/index.md' "$category"
            else
                printf -v "${category}_path" 'memory/%s.md' "$category"
            fi
        done
        cat > "$base_dir/MEMORY.md" << EOF
# MEMORY.md - 프로젝트 장기기억

## 프로젝트 목표

| 목표 | 상태 |
|------|------|
| $project_name 핵심 작업 추적 | 진행 중 |

---

## 키워드 인덱스

| 키워드 | 상세 파일 |
|--------|-----------|
| 프로젝트, 생성일 | #meta |

---

## architecture/
- [$architecture_path]($architecture_path)

## patterns/
- [$patterns_path]($patterns_path)

## tools/
- [$tools_path]($tools_path)

## gotchas/
- [$gotchas_path]($gotchas_path)

---

## meta/
- **프로젝트**: $project_name
- **생성일**: $today
- **마지막 업데이트**: $today
EOF
    fi

    if [ ! -f "$memory_dir/architecture.md" ] && [ ! -f "$memory_dir/architecture/index.md" ]; then
        cat > "$memory_dir/architecture.md" << 'EOF'
# Architecture - 설계 결정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/patterns.md" ] && [ ! -f "$memory_dir/patterns/index.md" ]; then
        cat > "$memory_dir/patterns.md" << 'EOF'
# Patterns - 작업 패턴, 워크플로우

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/tools.md" ] && [ ! -f "$memory_dir/tools/index.md" ]; then
        cat > "$memory_dir/tools.md" << 'EOF'
# Tools - MCP 서버, 외부 도구, 라이브러리

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/gotchas.md" ] && [ ! -f "$memory_dir/gotchas/index.md" ]; then
        cat > "$memory_dir/gotchas.md" << 'EOF'
# Gotchas - 주의사항, 함정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi
}

# stdin에서 JSON 페이로드 읽기
# stdin 워치독: stdin이 전달되지 않으면 무한 대기 -> 15초 내 미도착 시 fail-open (gotcha 046)
if command -v timeout >/dev/null 2>&1; then
    INPUT=$(timeout 15 cat) || exit 0
else
    INPUT=$(cat)
fi
if [ -z "$INPUT" ]; then
    exit 0
fi

# JSON 필드 추출 (jq 우선, python3 폴백)
json_field() {
    local field="$1"
    if command -v jq &>/dev/null; then
        echo "$INPUT" | jq -r ".$field // empty" 2>/dev/null
    elif command -v python3 &>/dev/null; then
        echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    v = d.get('$field', '')
    print(v if v is not None else '')
except: pass
" 2>/dev/null
    fi
}

if command -v jq &>/dev/null; then
    if ! echo "$INPUT" | jq -e . >/dev/null 2>&1; then
        exit_mnemo_error 'stdin-json' 'stdin JSON 파싱 실패 (jq)'
    fi
elif ! command -v python3 &>/dev/null; then
    exit_mnemo_error 'missing-parser' 'jq 또는 python3이 필요합니다'
fi

EVENT_NAME=$(json_field 'hookEventName')
USER_TEXT=""
RESPONSE=""

case "$EVENT_NAME" in
    user_prompt_submit)
        USER_TEXT=$(json_field 'prompt')
        # Grok은 prompt를 <user_query>...</user_query>로 래핑함 -> 스트립
        USER_TEXT=$(printf '%s' "$USER_TEXT" | perl -0pe 's/^\s*<user_query>\s*(.*?)\s*<\/user_query>\s*$/$1/s' 2>/dev/null || printf '%s' "$USER_TEXT")
        ;;
    stop)
        # 세션 종료 observe fire(channel_closed/shutdown)는 저장하지 않음 -> 중복 방지
        REASON=$(json_field 'reason')
        if [ "$REASON" != "end_turn" ]; then exit 0; fi
        RESPONSE=$(json_field 'lastAssistantMessage')
        ;;
    *)
        exit 0
        ;;
esac

USER_TEXT=$(echo "$USER_TEXT" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
RESPONSE=$(echo "$RESPONSE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# <private> 블록 제거 (민감 정보 보호)
if [ -n "$USER_TEXT" ]; then
    USER_TEXT=$(echo "$USER_TEXT" | perl -0pe 's/<private>.*?<\/private>/[PRIVATE]/gs' 2>/dev/null || echo "$USER_TEXT" | sed 's/<private>[^<]*<\/private>/[PRIVATE]/g')
fi
if [ -n "$RESPONSE" ]; then
    RESPONSE=$(echo "$RESPONSE" | perl -0pe 's/<private>.*?<\/private>/[PRIVATE]/gs' 2>/dev/null || echo "$RESPONSE" | sed 's/<private>[^<]*<\/private>/[PRIVATE]/g')
fi

# 둘 다 비어있으면 스킵
if [ -z "$USER_TEXT" ] && { [ -z "$RESPONSE" ] || [ ${#RESPONSE} -lt 5 ]; }; then
    exit 0
fi

# All adapters share one boundary; invalid workspace metadata must not fall back.
ROOT_HELPER="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/mnemo-project-root.js"
[ -f "$ROOT_HELPER" ] || ROOT_HELPER="${ROOT_HELPER%/mnemo-project-root.js}/../../../hooks/mnemo-project-root.js"
PROJECT_ROOT=$(printf '%s' "$INPUT" | node "$ROOT_HELPER" --grok 2>/dev/null) || exit 0
[ -n "$PROJECT_ROOT" ] || exit 0
[ -e "$PROJECT_ROOT/.mnemo-root" ] || : > "$PROJECT_ROOT/.mnemo-root"

# 대화 디렉토리 및 파일
CONV_DIR="$PROJECT_ROOT/conversations"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="$CONV_DIR/$TODAY-grok.md"
PROJECT_NAME=$(basename "$PROJECT_ROOT")

ensure_memory_scaffold "$PROJECT_ROOT"

# 폴더 생성
mkdir -p "$CONV_DIR"

# Keep persistence identical to the Windows adapter; stdout stays internal.
APPEND_HELPER="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/append-event.js"
if [ ! -f "$APPEND_HELPER" ]; then APPEND_HELPER="${APPEND_HELPER%/append-event.js}/grok-mnemo-append-event.js"; fi
APPEND_RESULT=$(printf '%s' "$INPUT" | node "$APPEND_HELPER" "$PROJECT_ROOT") || exit_mnemo_error 'append-event' 'event persistence failed'
[ "$APPEND_RESULT" = "saved" ] || exit 0

# ─────────────────────────────────────────────
# Gotchas/Learned 관찰 기록 (memory/gotchas/ + memory/learned/)
# stop 이벤트에서만 수행 (턴 단위 관찰)
# ─────────────────────────────────────────────
if [ -n "$RESPONSE" ] && [ ${#RESPONSE} -ge 5 ]; then
    OBS_TARGET_DIR=""
    OBS_EVENT_TYPE=""

    if echo "$RESPONSE" | grep -qE '^[[:space:]]*(([Ff]atal|[Ee]rror|ERR)[[:space:]]*:|Traceback \(most recent call last\)|[A-Za-z_.]*(Error|Exception)[[:space:]]*:|.{0,40}(command not found|No such file or directory|Permission denied)|ENOENT|ERR_[A-Z_]+|npm ERR!|error TS[0-9]+|error CS[0-9]+)' 2>/dev/null; then
        OBS_TARGET_DIR="$PROJECT_ROOT/memory/gotchas"
        OBS_EVENT_TYPE="turn_error"
    else
        OBS_TARGET_DIR="$PROJECT_ROOT/memory/learned"
        OBS_EVENT_TYPE="turn_success"
    fi

    mkdir -p "$OBS_TARGET_DIR"
    OBS_FILE="$OBS_TARGET_DIR/observations.jsonl"

    SAFE_RESPONSE="$(echo "$RESPONSE" | head -c 3000 | sed -E 's/(api[_-]?key|token|secret|password|authorization)([\"'"'"' :=]+)[A-Za-z0-9_\\/\\.+=]{8,}/\1\2[REDACTED]/gi' 2>/dev/null || echo "$RESPONSE" | head -c 3000)"
    OBS_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    SESSION_ID=$(json_field 'sessionId')
    [ -z "$SESSION_ID" ] && SESSION_ID="unknown"

    if command -v jq &>/dev/null; then
        jq -n -c \
            --arg ts "$OBS_TS" \
            --arg ev "$OBS_EVENT_TYPE" \
            --arg cli "grok" \
            --arg inp "" \
            --arg out "$SAFE_RESPONSE" \
            --arg sess "$SESSION_ID" \
            '{timestamp:$ts, event:$ev, cli:$cli, input:$inp, output:$out, session:$sess}' \
            >> "$OBS_FILE" 2>/dev/null
    fi

    # MNEMO_ROTATION_START
    # 기준값이 없거나 잘못됐으면 상태 알림의 초기화 이후에 회전한다.
    if [ -f "$OBS_FILE" ] && [ "$(wc -c < "$OBS_FILE")" -ge 10485760 ]; then
        ROTATION_MARKER="$(dirname "$OBS_TARGET_DIR")/.mnemo-distill-offset"
        ROTATION_TEXT=$(cat "$ROTATION_MARKER" 2>/dev/null || true)
        if [[ "$ROTATION_TEXT" =~ ^(-?[0-9]+)[[:space:]]+(-?[0-9]+)[[:space:]]+([0-9]+)$ ]]; then
            ROTATION_G=${BASH_REMATCH[1]}; ROTATION_L=${BASH_REMATCH[2]}; ROTATION_REF=${BASH_REMATCH[3]}
            ROTATION_COUNT=$(awk 'END { print NR }' "$OBS_FILE")
            if [ "$(basename "$OBS_TARGET_DIR")" = gotchas ]; then
                ROTATION_G=$((ROTATION_G - ROTATION_COUNT))
            else
                ROTATION_L=$((ROTATION_L - ROTATION_COUNT))
            fi
            ROTATION_ARCHIVE="$OBS_TARGET_DIR/archive"
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
fi

# ── mnemo status notify (LLM 호출 X, 비용 0) ──────────────────
# 주의: stop 이벤트의 stdout은 결정 JSON으로 파싱되므로 stderr만 사용한다.
notify_mnemo_status() {
    local root="$1"
    local g_jsonl="$root/memory/gotchas/observations.jsonl"
    local l_jsonl="$root/memory/learned/observations.jsonl"
    local handoff_dir="$root/docs/handoffs"
    local g_count=0 l_count=0
    [ -f "$g_jsonl" ] && g_count=$(wc -l < "$g_jsonl" 2>/dev/null | tr -d ' ' || echo 0)
    [ -f "$l_jsonl" ] && l_count=$(wc -l < "$l_jsonl" 2>/dev/null | tr -d ' ' || echo 0)
    local total=$((g_count + l_count))
    local days=999
    if [ -d "$handoff_dir" ]; then
        local latest mtime now
        latest=$(ls -t "$handoff_dir"/*.md 2>/dev/null | head -n 1)
        if [ -n "$latest" ]; then
            mtime=$(stat -c %Y "$latest" 2>/dev/null || stat -f %m "$latest" 2>/dev/null || echo 0)
            now=$(date +%s)
            [ "$mtime" -gt 0 ] && days=$(( (now - mtime) / 86400 ))
        fi
    fi
    # --- delta 기반 판정 (cumulative total -> 마지막 정제 이후 delta) ---
    local marker="$root/memory/.mnemo-distill-offset"
    local ref_epoch=0 e sub f
    for sub in gotchas learned; do
        [ -d "$root/memory/$sub" ] || continue
        for f in "$root/memory/$sub"/*.md; do
            [ -f "$f" ] || continue
            e=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f" 2>/dev/null || echo 0)
            [ "$e" -gt "$ref_epoch" ] && ref_epoch=$e
        done
    done
    local base_g=0 base_l=0 marker_ref=-1 marker_valid=0 marker_text
    marker_text=$(cat "$marker" 2>/dev/null || true)
    if [[ "$marker_text" =~ ^(-?[0-9]+)[[:space:]]+(-?[0-9]+)[[:space:]]+([0-9]+)$ ]]; then
        base_g=${BASH_REMATCH[1]}; base_l=${BASH_REMATCH[2]}; marker_ref=${BASH_REMATCH[3]}
        marker_valid=1
    fi
    if [ "$marker_valid" -eq 0 ] || [ "$ref_epoch" -gt "$marker_ref" ]; then
        base_g=$g_count; base_l=$l_count
        echo "$g_count $l_count $ref_epoch" > "$marker" 2>/dev/null || true
    fi
    local delta=$(( (g_count - base_g) + (l_count - base_l) ))
    [ "$delta" -lt 0 ] && delta=0
    # 임계: 마지막 정제 이후 새 관찰 200건 또는 마지막 핸드오프 14일 초과
    if [ "$delta" -lt 200 ] && [ "$days" -lt 14 ]; then
        rm -f "$root/memory/.mnemo-status.md" 2>/dev/null || true
        return 0
    fi
    local status_file="$root/memory/.mnemo-status.md"
    mkdir -p "$root/memory" 2>/dev/null || true
    {
        echo "# mnemo status"
        echo ""
        echo "- 새 관찰(정제 이후): **${delta}** / 누적 **${total}** (gotchas ${g_count} + learned ${l_count})"
        echo "- last handoff: **${days}일 전**"
        echo "- 권장: 카탈로그의 source-only \`memory-distill\` 모듈을 직접 읽어 rebuild 또는 핸드오프"
        echo "- updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    } > "$status_file" 2>/dev/null || true
    echo "[mnemo] 새 관찰 ${delta}건(누적 ${total}) / 마지막 핸드오프 ${days}일 전 → source-only memory-distill 모듈을 직접 읽어 rebuild 권장" >&2
}
if [ -n "$RESPONSE" ]; then
    notify_mnemo_status "$PROJECT_ROOT"
fi
