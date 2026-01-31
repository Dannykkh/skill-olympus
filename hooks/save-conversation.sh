#!/bin/bash
# Session Conversation Logger Hook
# 모든 대화를 날짜별 .md 파일로 저장
#
# 사용법: hooks/save-conversation.sh "$PROMPT"
# 저장 위치: .claude/conversations/YYYY-MM-DD.md

PROMPT="$1"
PROJECT_DIR="${PWD}"
CONV_DIR="${PROJECT_DIR}/.claude/conversations"
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%H:%M:%S)
CONV_FILE="${CONV_DIR}/${TODAY}.md"

# conversations 폴더 생성
mkdir -p "$CONV_DIR"

# 파일이 없으면 헤더 추가
if [ ! -f "$CONV_FILE" ]; then
    cat > "$CONV_FILE" << EOF
# Conversation Log - ${TODAY}

프로젝트: $(basename "$PROJECT_DIR")
생성일: ${TODAY}

---

EOF
fi

# 사용자 프롬프트 추가
cat >> "$CONV_FILE" << EOF

## [${TIMESTAMP}] User

${PROMPT}

---
EOF

echo "[Session Logger] 대화 저장됨: ${CONV_FILE}"
