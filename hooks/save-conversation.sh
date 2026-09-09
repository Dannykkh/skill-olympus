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

# stdin 워치독: 활성 턴 진행 중 제출된 프롬프트는 stdin이 전달되지 않을 수 있어
# 무한 대기 → 훅 타임아웃(60s) 에러가 발생함. 15초 내 미도착 시 fail-open으로 조용히 종료.
# (미저장분은 SessionStart reconcile이 transcript에서 backfill)
if command -v timeout >/dev/null 2>&1; then
    INPUT_JSON=$(timeout 15 cat) || exit 0
else
    INPUT_JSON=$(cat)
fi
if [ -z "$INPUT_JSON" ]; then exit 0; fi

if ! command -v jq >/dev/null 2>&1; then
    exit_mnemo_error 'missing-jq' 'jq가 설치되어 있지 않습니다'
fi

# JSON 유효성 먼저 확인 (깨진 JSON은 skip 아니라 에러)
if ! echo "$INPUT_JSON" | jq -e . >/dev/null 2>&1; then
    exit_mnemo_error 'stdin-json' 'stdin JSON 파싱 실패'
fi

PROMPT=$(echo "$INPUT_JSON" | jq -r '.prompt // empty' 2>/dev/null)
if [ -z "$PROMPT" ]; then exit 0; fi

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

# 폴더 생성
mkdir -p "$CONV_DIR"

# 파일 없으면 헤더
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

# 중복 방지: 같은 분(minute)에 동일 프롬프트가 이미 저장되어 있으면 스킵
TIMESTAMP=$(date +%H:%M)
if [ -f "$CONV_FILE" ] && grep -qF "## [$TIMESTAMP] User" "$CONV_FILE" && grep -qF "$PROMPT" "$CONV_FILE"; then
    exit 0
fi

# append
echo -e "\n## [$TIMESTAMP] User\n\n$PROMPT\n" >> "$CONV_FILE"
