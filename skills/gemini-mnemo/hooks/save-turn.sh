#!/bin/bash
# save-turn.sh - Gemini CLI AfterAgent 훅: User+Assistant 턴을 대화 파일에 저장
# Gemini는 stdin으로 JSON 페이로드를 전달함 (prompt + prompt_response)
# AI 호출 없음 = 빠름

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
CONV_DIR="$PWD/.gemini/conversations"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="$CONV_DIR/$TODAY.md"
PROJECT_NAME=$(basename "$PWD")

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
    # 코드 블록 제거 (```...``` 사이의 내용을 [code block] 으로 대체)
    RESPONSE=$(echo "$RESPONSE" | perl -0777 -pe 's/```[^\n]*\n.*?```/[code block]/gs' 2>/dev/null || echo "$RESPONSE")

    # 2000자 제한
    if [ ${#RESPONSE} -gt 2000 ]; then
        RESPONSE="${RESPONSE:0:2000}..."
    fi

    echo -e "\n## [$TIMESTAMP] Assistant\n\n$RESPONSE\n" >> "$CONV_FILE"
fi
