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
    local root="$PWD"
    local git_root
    git_root=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$git_root" ]; then root="$git_root"; fi
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
- [memory/architecture.md](memory/architecture.md)

## patterns/
- [memory/patterns.md](memory/patterns.md)

## tools/
- [memory/tools.md](memory/tools.md)

## gotchas/
- [memory/gotchas.md](memory/gotchas.md)

---

## meta/
- **프로젝트**: $project_name
- **생성일**: $today
- **마지막 업데이트**: $today
EOF
    fi

    if [ ! -f "$memory_dir/architecture.md" ]; then
        cat > "$memory_dir/architecture.md" << 'EOF'
# Architecture - 설계 결정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/patterns.md" ]; then
        cat > "$memory_dir/patterns.md" << 'EOF'
# Patterns - 작업 패턴, 워크플로우

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/tools.md" ]; then
        cat > "$memory_dir/tools.md" << 'EOF'
# Tools - MCP 서버, 외부 도구, 라이브러리

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/gotchas.md" ]; then
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

# 프로젝트 루트 결정
# Grok payload는 workspaceRoot/cwd(camelCase)를 제공한다. transcriptPath는
# ~/.grok/sessions/ 내부 경로라 프로젝트 루트 추정에 쓰지 않는다.
PROJECT_ROOT=""
for k in workspaceRoot cwd; do
    v=$(json_field "$k")
    if [ -n "$v" ] && [ -d "$v" ]; then
        PROJECT_ROOT="$v"
        break
    fi
done
if [ -z "$PROJECT_ROOT" ]; then
    PROJECT_ROOT="$PWD"
fi
# ── 비-git 프로젝트 루트 보정 (gotcha 047) ──────────────────────
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

GIT_ROOT_ADOPTED=""
GIT_ROOT_NORMALIZED=$(git -C "$PROJECT_ROOT" rev-parse --show-toplevel 2>/dev/null)
if [ -n "$GIT_ROOT_NORMALIZED" ]; then
    # HOME 자체가 git repo(dotfiles)면 채택 금지 — HOME 오배치 방지 (gotcha 033)
    HOME_NORM="${HOME:-$USERPROFILE}"
    HOME_NORM="${HOME_NORM%/}"
    if [ -z "$HOME_NORM" ] || [ "${GIT_ROOT_NORMALIZED%/}" != "$HOME_NORM" ]; then
        PROJECT_ROOT="$GIT_ROOT_NORMALIZED"
        GIT_ROOT_ADOPTED=1
    fi
fi
if [ -n "$PROJECT_ROOT" ] && [ -z "$GIT_ROOT_ADOPTED" ]; then
    PROJECT_ROOT="$(get_nongit_project_root "$PROJECT_ROOT")"
fi

# 대화 디렉토리 및 파일
CONV_DIR="$PROJECT_ROOT/conversations"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="$CONV_DIR/$TODAY-grok.md"
PROJECT_NAME=$(basename "$PROJECT_ROOT")

ensure_memory_scaffold "$PROJECT_ROOT"

# 폴더 생성
mkdir -p "$CONV_DIR"

# 파일 없으면 frontmatter 헤더 생성
if [ ! -f "$CONV_FILE" ]; then
    cat > "$CONV_FILE" << EOF
---
date: $TODAY
project: $PROJECT_NAME
keywords: []
summary: ""
---

# $TODAY

EOF
fi

TIMESTAMP=$(date +%H:%M:%S)

# User 입력 기록 (같은 초 동일 User 중복 방지)
if [ -n "$USER_TEXT" ]; then
    if [ -f "$CONV_FILE" ] && grep -qF "## [$TIMESTAMP] User" "$CONV_FILE" 2>/dev/null; then
        exit 0
    fi
    printf '\n## [%s] User\n\n%s\n' "$TIMESTAMP" "$USER_TEXT" >> "$CONV_FILE"
fi

# Assistant 응답 기록 (같은 초 동일 Assistant 중복 방지)
# truncation 없음: lastAssistantMessage가 유일한 원문 소스이므로 온전히 저장.
if [ -n "$RESPONSE" ] && [ ${#RESPONSE} -ge 5 ]; then
    if [ -f "$CONV_FILE" ] && grep -qF "## [$TIMESTAMP] Assistant" "$CONV_FILE" 2>/dev/null; then
        exit 0
    fi
    printf '\n## [%s] Assistant\n\n%s\n' "$TIMESTAMP" "$RESPONSE" >> "$CONV_FILE"
fi

# ─────────────────────────────────────────────
# Gotchas/Learned 관찰 기록 (memory/gotchas/ + memory/learned/)
# stop 이벤트에서만 수행 (턴 단위 관찰)
# ─────────────────────────────────────────────
if [ -n "$RESPONSE" ] && [ ${#RESPONSE} -ge 5 ]; then
    OBS_TARGET_DIR=""
    OBS_EVENT_TYPE=""

    if echo "$RESPONSE" | grep -qiE '(error|fail|exception|denied|not found|cannot|unable|ENOENT|ERR_)' 2>/dev/null; then
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

    # 파일 크기 제한 (10MB)
    if [ -f "$OBS_FILE" ]; then
        OBS_SIZE_MB=$(du -m "$OBS_FILE" 2>/dev/null | cut -f1)
        if [ "${OBS_SIZE_MB:-0}" -ge 10 ]; then
            OBS_ARCHIVE_DIR="$OBS_TARGET_DIR/archive"
            mkdir -p "$OBS_ARCHIVE_DIR"
            mv "$OBS_FILE" "$OBS_ARCHIVE_DIR/observations-$(date +%Y%m%d-%H%M%S).jsonl" 2>/dev/null || true
        fi
    fi
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
    local base_g=-1 base_l=-1 marker_ref=-1
    if [ -f "$marker" ]; then
        read -r base_g base_l marker_ref < "$marker" 2>/dev/null
        [ -z "$base_g" ] && base_g=-1
        [ -z "$base_l" ] && base_l=-1
        [ -z "$marker_ref" ] && marker_ref=-1
    fi
    if [ "$base_g" -lt 0 ] || [ "$ref_epoch" -gt "$marker_ref" ]; then
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
