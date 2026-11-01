#!/bin/bash
# 대화 로그 저장 (단순 append)
# Claude Code는 stdin으로 JSON을 전달함
#
# 에러 처리 (P1):
# - UserPromptSubmit 훅이라 crash 시 입력이 차단될 수 있음 → 반드시 fail-open
# - 실패는 .claude/mnemo-errors.log에 기록
# - $MNEMO_STRICT='1' 이면 실패 시 exit 1 (디버깅용)

# Grok 세션 가드: Grok Build는 ~/.claude/settings.json 훅도 로드함 (compat.claude).
# Grok에서는 grok-mnemo 훅이 저장을 전담하므로 이중/오분류 저장 방지 위해 즉시 종료.
[ -n "${GROK_HOOK_EVENT:-}" ] && exit 0
[ -n "${DEVIN_PROJECT_DIR:-}" ] && exit 0

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
    echo "[$ts] [save-conversation.sh] [$ctx] $msg" >> "$log_path" 2>/dev/null || true
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
    printf '%s' "$INPUT_JSON" | node "$helper" --claude 2>/dev/null || true
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

# stdin이 오지 않으면 입력에서 루트를 얻을 수 없다. 훅 실행 위치(CLAUDE_PROJECT_DIR, 없으면 cwd)로 정해
# 한 줄 남긴다. 이 로그가 없으면 프롬프트를 놓쳐도 아무도 모른다(gotcha 123).
log_stdin_miss() {
    local dir="${CLAUDE_PROJECT_DIR:-$(pwd -W 2>/dev/null || pwd)}"
    command -v jq >/dev/null 2>&1 || return 0
    PROJECT_ROOT=$(INPUT_JSON="$(jq -n --arg cwd "$dir" '{cwd:$cwd}')" get_claude_project_root)
    log_mnemo_error "$1" "$2"
}

# stdin 워치독: 활성 턴 진행 중 제출된 프롬프트는 stdin이 전달되지 않을 수 있어
# 무한 대기 → 훅 타임아웃(60s) 에러가 발생함. 15초 내 미도착 시 로그 한 줄을 남기고 fail-open으로 종료한다.
# 이 입력은 여기서 저장되지 않으며, Stop 훅이 원본 세션에서 따라잡고 SessionStart 복구가 한 번 더 확인한다.
if command -v timeout >/dev/null 2>&1; then
    if ! INPUT_JSON=$(timeout 15 cat); then
        log_stdin_miss 'stdin-timeout' 'UserPromptSubmit stdin이 15초 안에 오지 않아 이 입력을 훅에서 저장하지 못함; Stop 훅이 원본 세션에서 따라잡음'
        exit 0
    fi
else
    INPUT_JSON=$(cat)
fi
if [ -z "$INPUT_JSON" ]; then
    log_stdin_miss 'stdin-empty' 'UserPromptSubmit stdin이 비어 있어 이 입력을 훅에서 저장하지 못함; Stop 훅이 원본 세션에서 따라잡음'
    exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
    exit_mnemo_error 'missing-jq' 'jq가 설치되어 있지 않습니다'
fi

# JSON 유효성 먼저 확인 (깨진 JSON은 skip 아니라 에러)
if ! echo "$INPUT_JSON" | jq -e . >/dev/null 2>&1; then
    exit_mnemo_error 'stdin-json' 'stdin JSON 파싱 실패'
fi

PROMPT=$(echo "$INPUT_JSON" | jq -r '.prompt // empty' 2>/dev/null)
if [ -z "$PROMPT" ]; then exit 0; fi

# 백그라운드 작업 알림·채널 메시지처럼 기계가 넣은 턴은 사용자 발화가 아니다.
# Claude Code는 입력의 source로 알려 주고(system), 필드가 아직 빠질 수 있어 알림 태그로도 거른다.
PROMPT_SOURCE=$(echo "$INPUT_JSON" | jq -r '.source // empty' 2>/dev/null)
if [ "$PROMPT_SOURCE" = "system" ]; then exit 0; fi
case "${PROMPT#"${PROMPT%%[![:space:]]*}"}" in
    '<task-notification>'*) exit 0 ;;
esac

# <private> 블록 제거 (민감 정보 보호)
PROMPT=$(echo "$PROMPT" | perl -0pe 's/<private>.*?<\/private>/[PRIVATE]/gs' 2>/dev/null || echo "$PROMPT" | sed 's/<private>[^<]*<\/private>/[PRIVATE]/g')

# 프로젝트 루트 결정: 명시 workspace → payload cwd → transcript metadata
TRANSCRIPT_PATH=$(echo "$INPUT_JSON" | jq -r '.transcript_path // empty' 2>/dev/null)
PROJECT_ROOT=$(get_claude_project_root "$TRANSCRIPT_PATH")

# Temp/무효 루트면 저장 skip (fail-open) — gotcha 065
if [ -z "$PROJECT_ROOT" ]; then exit 0; fi

[ -f "$PROJECT_ROOT/.mnemo-root" ] || : > "$PROJECT_ROOT/.mnemo-root"
CONV_DIR="$PROJECT_ROOT/conversations"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="$CONV_DIR/$TODAY-claude.md"
PROJECT_NAME=$(basename "$PROJECT_ROOT")

ensure_memory_scaffold "$PROJECT_ROOT"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORE_RESULT="$(printf '%s' "$INPUT_JSON" | node "$SCRIPT_DIR/claude-event-store.js" "$PROJECT_ROOT" user)"
if [ "$?" -ne 0 ]; then exit_mnemo_error 'file-io' '사용자 입력 저장 대기 또는 실패'; fi
exit 0
