#!/bin/bash
# save-response.sh - Stop 훅: Assistant 응답을 대화 파일에 저장
# transcript_path에서 마지막 assistant 메시지를 추출하여 append
# AI 호출 없음 = 빠름

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

# transcript_path 추출
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
    exit 0
fi

# 프로젝트 루트 결정: git root → 없으면 CWD fallback
PROJECT_ROOT="$PWD"
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -n "$GIT_ROOT" ]; then
    PROJECT_ROOT="$GIT_ROOT"
fi

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

# JSONL 마지막 500줄에서 assistant text 메시지 찾기
# Claude Code는 thinking/text/tool_use를 별도 JSONL 줄로 분리함
# → "type":"assistant" AND "type":"text" 둘 다 포함된 줄을 찾아야 함
LAST_TEXT_LINE=$(tail -n 500 "$TRANSCRIPT_PATH" | grep '"type":"assistant"' | grep '"type":"text"' | tail -n 1)
if [ -z "$LAST_TEXT_LINE" ]; then
    # type 앞에 공백이 있을 수 있음
    LAST_TEXT_LINE=$(tail -n 500 "$TRANSCRIPT_PATH" | grep -E '"type"\s*:\s*"assistant"' | grep -E '"type"\s*:\s*"text"' | tail -n 1)
fi
if [ -z "$LAST_TEXT_LINE" ]; then
    exit 0
fi

# 텍스트 추출
RESPONSE=$(echo "$LAST_TEXT_LINE" | jq -r '[.message.content[] | select(.type=="text") | .text] | join("\n")' 2>/dev/null)
RESPONSE=$(echo "$RESPONSE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# <private> 블록 제거 (민감 정보 보호)
RESPONSE=$(echo "$RESPONSE" | perl -0pe 's/<private>.*?<\/private>/[PRIVATE]/gs' 2>/dev/null || echo "$RESPONSE" | sed 's/<private>[^<]*<\/private>/[PRIVATE]/g')

# 빈 응답이면 스킵
if [ -z "$RESPONSE" ] || [ ${#RESPONSE} -lt 5 ]; then
    exit 0
fi

# 4000자 제한 (코드 블록 포함 시 충분한 여유)
if [ ${#RESPONSE} -gt 4000 ]; then
    RESPONSE="${RESPONSE:0:4000}..."
fi

# 중복 방지: 타임스탬프 + 응답 내용 fingerprint 이중 체크
TIMESTAMP=$(date +%H:%M:%S)
# 1) 같은 초에 이미 저장되어 있으면 스킵
if grep -qF "## [$TIMESTAMP] Assistant" "$CONV_FILE" 2>/dev/null; then
    exit 0
fi
# 2) 응답 첫 80자가 이미 파일에 있으면 스킵 (다른 초에 같은 내용 방지)
FINGERPRINT="${RESPONSE:0:80}"
if [ -n "$FINGERPRINT" ] && grep -qF "$FINGERPRINT" "$CONV_FILE" 2>/dev/null; then
    exit 0
fi

# append
echo -e "\n## [$TIMESTAMP] Assistant\n\n$RESPONSE\n" >> "$CONV_FILE"
