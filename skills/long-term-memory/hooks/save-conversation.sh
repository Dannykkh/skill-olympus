#!/bin/bash
# 대화 로그 저장 (단순 append)

PROMPT="$1"
CONV_DIR="$PWD/.claude/conversations"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="$CONV_DIR/$TODAY.md"
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

# append
echo -e "\n## [$(date +%H:%M)] User\n\n$PROMPT\n" >> "$CONV_FILE"
