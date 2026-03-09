#!/bin/bash
# save-turn.sh - Gemini CLI AfterAgent 훅: User+Assistant 턴을 대화 파일에 저장
# Gemini는 stdin으로 JSON 페이로드를 전달함 (prompt + prompt_response)
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

# stdin에서 JSON 페이로드 읽기
INPUT=$(cat)
if [ -z "$INPUT" ]; then
    exit 0
fi

# User 입력 추출: prompt 필드
if command -v jq &>/dev/null; then
    USER_TEXT=$(echo "$INPUT" | jq -r '.prompt // empty' 2>/dev/null)
    RESPONSE=$(echo "$INPUT" | jq -r '.prompt_response // empty' 2>/dev/null)
elif command -v python3 &>/dev/null; then
    USER_TEXT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('prompt', ''))
except: pass
" 2>/dev/null)
    RESPONSE=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('prompt_response', ''))
except: pass
" 2>/dev/null)
else
    exit 0
fi

USER_TEXT=$(echo "$USER_TEXT" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
RESPONSE=$(echo "$RESPONSE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# 둘 다 비어있으면 스킵
if [ -z "$USER_TEXT" ] && { [ -z "$RESPONSE" ] || [ ${#RESPONSE} -lt 5 ]; }; then
    exit 0
fi

# 대화 디렉토리 및 파일
CONV_DIR="$PWD/conversations"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="$CONV_DIR/$TODAY-gemini.md"
PROJECT_NAME=$(basename "$PWD")

ensure_memory_scaffold "$PWD"

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

# 중복 방지: 같은 초에 동일 User 저장되어 있으면 스킵
if [ -n "$USER_TEXT" ] && [ -f "$CONV_FILE" ] && grep -qF "## [$TIMESTAMP] User" "$CONV_FILE" 2>/dev/null; then
    exit 0
fi

# User 입력 기록
if [ -n "$USER_TEXT" ]; then
    echo -e "\n## [$TIMESTAMP] User\n\n$USER_TEXT\n" >> "$CONV_FILE"
fi

# Assistant 응답 처리
if [ -n "$RESPONSE" ] && [ ${#RESPONSE} -ge 5 ]; then
    # 4000자 제한 (코드 블록 포함 시 충분한 여유)
    if [ ${#RESPONSE} -gt 4000 ]; then
        RESPONSE="${RESPONSE:0:4000}..."
    fi

    echo -e "\n## [$TIMESTAMP] Assistant\n\n$RESPONSE\n" >> "$CONV_FILE"
fi
