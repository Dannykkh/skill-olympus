#!/bin/bash
# save-response.sh - Stop 훅: Assistant 응답을 대화 파일에 저장
# transcript_path에서 마지막 assistant 메시지를 추출하여 append
# AI 호출 없음 = 빠름
#
# 에러 처리 철학 (P1):
# - 정상 skip 케이스(빈 응답, 중복, transcript 없음): 조용히 exit 0
# - 진짜 실패(파싱 에러, IO 에러): .claude/mnemo-errors.log에 기록 후 exit 0
# - $MNEMO_STRICT = '1' 이면 실패 시 exit 1 (디버깅용)

# ── mnemo 에러 로깅 ──────────────────────────────────────────────
log_mnemo_error() {
    local ctx="$1"
    local msg="$2"
    local root="$PWD"
    local git_root
    git_root=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$git_root" ]; then
        root="$git_root"
    fi
    local err_dir="$root/.claude"
    mkdir -p "$err_dir" 2>/dev/null || true
    local log_path="$err_dir/mnemo-errors.log"
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$ts] [save-response.sh] [$ctx] $msg" >> "$log_path" 2>/dev/null || true
}

exit_mnemo_error() {
    local ctx="$1"
    local msg="$2"
    log_mnemo_error "$ctx" "$msg"
    if [ "${MNEMO_STRICT:-}" = "1" ]; then
        exit 1
    fi
    exit 0
}

# ── 프로젝트 루트 결정 ────────────────────────────────────────
# 문제: hook 실행 시점의 PWD가 bin/Debug 같은 sub-directory면 git rev-parse도
# 부모 git을 못 찾고 PWD fallback이 작동해 conversations/가 잘못된 위치에 생긴다.
# 해결: JSONL transcript의 마지막 메시지에 있는 "cwd" 필드를 1순위로 사용한다.
get_claude_project_root() {
    local transcript_path="$1"

    # 1순위: JSONL의 마지막 cwd 필드 → git root
    if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
        local cwd
        # 마지막 200줄에서 cwd 필드 찾기 (JSON 이스케이프 \\ 처리)
        cwd=$(tail -n 200 "$transcript_path" 2>/dev/null \
            | grep -oE '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' \
            | tail -n 1 \
            | sed -E 's/"cwd"[[:space:]]*:[[:space:]]*"(.*)"/\1/' \
            | sed 's|\\\\|\\|g')
        if [ -n "$cwd" ]; then
            # Windows 경로(C:\...)를 git bash 형식(/c/...)으로도 시도
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

    # 2순위: transcript_path 부모 디렉토리 디코딩
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

    # 3순위 (fallback): 기존 PWD + git rev-parse
    local root="$PWD"
    local git_root
    git_root=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$git_root" ]; then
        root="$git_root"
    fi
    echo "$root"
}

# ── 사이드카 인덱스 I/O (reconcile과 공유) ─────────────────────
# conversations/.mnemo-index.json 포맷:
#   { "version": 1, "claude": { "YYYY-MM-DD": ["uuid", "uuid", ...] } }
is_uuid_in_index() {
    local index_path="$1"
    local today="$2"
    local uuid="$3"
    [ -z "$uuid" ] && return 1
    [ ! -f "$index_path" ] && return 1
    jq -e --arg d "$today" --arg u "$uuid" \
        '.claude[$d] // [] | index($u) != null' \
        "$index_path" >/dev/null 2>&1
}

add_uuid_to_index() {
    local index_path="$1"
    local today="$2"
    local uuid="$3"
    [ -z "$uuid" ] && return 0
    local tmp
    tmp=$(mktemp 2>/dev/null || echo "${index_path}.tmp.$$")
    if [ -f "$index_path" ]; then
        jq --arg d "$today" --arg u "$uuid" \
            '.version //= 1 | .claude //= {} | .claude[$d] //= [] | .claude[$d] |= (. + [$u] | unique)' \
            "$index_path" > "$tmp" 2>/dev/null
    else
        jq -n --arg d "$today" --arg u "$uuid" \
            '{version: 1, claude: {($d): [$u]}}' > "$tmp" 2>/dev/null
    fi
    if [ -s "$tmp" ]; then
        mv "$tmp" "$index_path" 2>/dev/null || rm -f "$tmp"
    else
        rm -f "$tmp"
        log_mnemo_error 'index-write' 'jq 인덱스 생성 실패'
    fi
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

INPUT=$(cat)

# transcript_path 추출 (jq 없거나 JSON 깨졌을 때를 구분)
if ! command -v jq >/dev/null 2>&1; then
    exit_mnemo_error 'missing-jq' 'jq가 설치되어 있지 않습니다'
fi
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
JQ_STATUS=$?
if [ $JQ_STATUS -ne 0 ]; then
    exit_mnemo_error 'stdin-json' "stdin JSON 파싱 실패 (jq exit=$JQ_STATUS)"
fi
# transcript_path 자체가 없거나 파일이 없는 건 정상 skip (로그 X)
if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
    exit 0
fi

# 프로젝트 루트 결정: JSONL cwd → transcript path 디코딩 → PWD fallback
PROJECT_ROOT=$(get_claude_project_root "$TRANSCRIPT_PATH")

# 대화 파일 경로 결정
CONV_DIR="$PROJECT_ROOT/conversations"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="$CONV_DIR/$TODAY-claude.md"

ensure_memory_scaffold "$PROJECT_ROOT"

# conversations 폴더 자동 생성
if [ ! -d "$CONV_DIR" ]; then
    mkdir -p "$CONV_DIR"
fi

# 파일 없으면 헤더 자동 생성 (save-conversation이 아직 안 돌았을 수 있음)
if [ ! -f "$CONV_FILE" ]; then
    PROJECT_NAME=$(basename "$PROJECT_ROOT")
    cat > "$CONV_FILE" << HEADER
---
date: $TODAY
project: $PROJECT_NAME
keywords: []
summary: ""
---

# $TODAY

HEADER
fi

# JSONL 전체 스캔 — 마지막 assistant text 메시지 찾기
# P3: 이전에는 tail -n 500으로 마지막 500줄만 봤는데, tool_use가 많은 긴 turn에서는
#     assistant text가 500줄 경계 밖으로 밀려 누락됐다. 오늘자 JSONL은 보통 수 MB라
#     grep 전체 스캔이 수십 ms 안에 끝난다.
# Claude Code는 thinking/text/tool_use를 별도 JSONL 줄로 분리함
# → "type":"assistant" AND "type":"text" 둘 다 포함된 줄을 찾아야 함
LAST_TEXT_LINE=$(grep '"type":"assistant"' "$TRANSCRIPT_PATH" 2>/dev/null | grep '"type":"text"' | tail -n 1)
if [ -z "$LAST_TEXT_LINE" ]; then
    # type 앞에 공백이 있을 수 있음 (JSON formatter 차이)
    LAST_TEXT_LINE=$(grep -E '"type"[[:space:]]*:[[:space:]]*"assistant"' "$TRANSCRIPT_PATH" 2>/dev/null | grep -E '"type"[[:space:]]*:[[:space:]]*"text"' | tail -n 1)
fi
if [ -z "$LAST_TEXT_LINE" ]; then
    # 이상 상황: 전체 스캔 후에도 assistant text가 없음.
    # reconcile-conversations가 다음 세션 시작 시 JSONL 전체에서 복구한다.
    log_mnemo_error 'no-assistant-text' "transcript=$TRANSCRIPT_PATH 에서 assistant text 줄을 찾지 못함 (전체 스캔)"
    exit 0
fi

# 텍스트 + uuid 추출
# JSONL 전체 라인 파싱 → text 블록과 라인 uuid를 함께 추출
# uuid는 JSONL 줄마다 고유 (dedup 키), message.id는 여러 줄 공유 가능
if ! echo "$LAST_TEXT_LINE" | jq -e . >/dev/null 2>&1; then
    exit_mnemo_error 'message-json' 'assistant 라인 JSON 파싱 실패'
fi
RESPONSE=$(echo "$LAST_TEXT_LINE" | jq -r '[.message.content[] | select(.type=="text") | .text] | join("\n")' 2>/dev/null)
LINE_UUID=$(echo "$LAST_TEXT_LINE" | jq -r '.uuid // empty' 2>/dev/null)
RESPONSE=$(echo "$RESPONSE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# <private> 블록 제거 (민감 정보 보호)
RESPONSE=$(echo "$RESPONSE" | perl -0pe 's/<private>.*?<\/private>/[PRIVATE]/gs' 2>/dev/null || echo "$RESPONSE" | sed 's/<private>[^<]*<\/private>/[PRIVATE]/g')

# 빈 응답이면 스킵
if [ -z "$RESPONSE" ] || [ ${#RESPONSE} -lt 5 ]; then
    exit 0
fi

# P2: 4000자 truncation 제거. JSONL 원본에 온전히 있으니 미러도 온전히 저장.

# 중복 방지 (P2): uuid 기반 사이드카 인덱스가 1순위, 레거시 fingerprint는 fallback
INDEX_PATH="$CONV_DIR/.mnemo-index.json"
if [ -n "$LINE_UUID" ] && is_uuid_in_index "$INDEX_PATH" "$TODAY" "$LINE_UUID"; then
    exit 0
fi

# 레거시 호환: 인덱스 도입 전에 저장된 파일은 fingerprint로 매칭
FINGERPRINT="${RESPONSE:0:80}"
if [ -n "$FINGERPRINT" ] && grep -qF "$FINGERPRINT" "$CONV_FILE" 2>/dev/null; then
    # 이미 저장되어 있음 → 인덱스에만 등록하고 종료
    if [ -n "$LINE_UUID" ]; then
        add_uuid_to_index "$INDEX_PATH" "$TODAY" "$LINE_UUID"
    fi
    exit 0
fi

# append
TIMESTAMP=$(date +%H:%M:%S)
printf '\n## [%s] Assistant\n\n%s\n' "$TIMESTAMP" "$RESPONSE" >> "$CONV_FILE"

# 인덱스에 uuid 등록 (다음 Stop 훅과 reconcile이 이걸 보고 skip)
if [ -n "$LINE_UUID" ]; then
    add_uuid_to_index "$INDEX_PATH" "$TODAY" "$LINE_UUID"
fi
