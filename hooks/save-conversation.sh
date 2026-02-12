#!/bin/bash
# 대화 로그 저장 (단순 append)
# Claude Code는 stdin으로 JSON을 전달함

INPUT_JSON=$(cat)
PROMPT=$(echo "$INPUT_JSON" | jq -r '.prompt // empty' 2>/dev/null)
CONV_DIR="$PWD/conversations"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="$CONV_DIR/$TODAY-claude.md"
PROJECT_NAME=$(basename "$PWD")

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
