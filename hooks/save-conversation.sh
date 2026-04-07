#!/bin/bash
# 대화 로그 저장 (단순 append)
# Claude Code는 stdin으로 JSON을 전달함
#
# 에러 처리 (P1):
# - UserPromptSubmit 훅이라 crash 시 입력이 차단될 수 있음 → 반드시 fail-open
# - 실패는 .claude/mnemo-errors.log에 기록
# - $MNEMO_STRICT='1' 이면 실패 시 exit 1 (디버깅용)

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
    echo "[$ts] [save-conversation.sh] [$ctx] $msg" >> "$log_path" 2>/dev/null || true
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

INPUT_JSON=$(cat)
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

# 프로젝트 루트 결정: JSONL cwd → transcript path 디코딩 → PWD fallback
TRANSCRIPT_PATH=$(echo "$INPUT_JSON" | jq -r '.transcript_path // empty' 2>/dev/null)
PROJECT_ROOT=$(get_claude_project_root "$TRANSCRIPT_PATH")

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
