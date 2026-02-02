#!/bin/bash
# Session Conversation Logger Hook
# 모든 대화를 날짜별 .md 파일로 저장 (frontmatter 형식)
# 해시태그(#keyword) 자동 추출하여 keywords에 추가
#
# 사용법: hooks/save-conversation.sh "$PROMPT"
# 저장 위치: .claude/conversations/YYYY-MM-DD.md
#
# 해시태그 예시:
#   "jwt 인증 구현해줘 #authentication #security"
#   → keywords: [authentication, security]

PROMPT="$1"
PROJECT_DIR="${PWD}"
CONV_DIR="${PROJECT_DIR}/.claude/conversations"
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%H:%M:%S)
CONV_FILE="${CONV_DIR}/${TODAY}.md"
PROJECT_NAME=$(basename "$PROJECT_DIR")

# conversations 폴더 생성
mkdir -p "$CONV_DIR"

# 프롬프트에서 해시태그 추출 (#keyword 형식)
NEW_KEYWORDS=$(echo "$PROMPT" | grep -oE '#[a-zA-Z가-힣0-9_-]+' | sed 's/#//g' | tr '[:upper:]' '[:lower:]' | sort -u | tr '\n' ',' | sed 's/,$//')

# 파일이 없으면 frontmatter 헤더 추가
if [ ! -f "$CONV_FILE" ]; then
    # 키워드가 있으면 JSON 배열 형식으로 변환
    if [ -n "$NEW_KEYWORDS" ]; then
        KEYWORDS_JSON=$(echo "$NEW_KEYWORDS" | sed 's/,/", "/g' | sed 's/^/["/' | sed 's/$/"]/')
    else
        KEYWORDS_JSON="[]"
    fi

    cat > "$CONV_FILE" << EOF
---
date: ${TODAY}
project: ${PROJECT_NAME}
keywords: ${KEYWORDS_JSON}
summary: ""
---

# Conversation Log - ${TODAY}

프로젝트: ${PROJECT_NAME}

---

EOF
elif [ -n "$NEW_KEYWORDS" ]; then
    # 기존 파일에서 keywords 업데이트
    EXISTING_KEYWORDS=$(grep -oP 'keywords:\s*\[\K[^\]]*' "$CONV_FILE" | tr -d '"' | tr -d "'" | tr ',' '\n' | sed 's/^ *//' | sed 's/ *$//')

    # 새 키워드와 기존 키워드 병합 (중복 제거)
    ALL_KEYWORDS=$(echo -e "${EXISTING_KEYWORDS}\n${NEW_KEYWORDS}" | tr ',' '\n' | sed 's/^ *//' | sed 's/ *$//' | grep -v '^$' | sort -u | tr '\n' ',' | sed 's/,$//')

    if [ -n "$ALL_KEYWORDS" ]; then
        KEYWORDS_JSON=$(echo "$ALL_KEYWORDS" | sed 's/,/", "/g' | sed 's/^/["/' | sed 's/$/"]/')
        # frontmatter 업데이트
        sed -i "s/keywords:.*$/keywords: ${KEYWORDS_JSON}/" "$CONV_FILE"
    fi
fi

# 사용자 프롬프트 추가
cat >> "$CONV_FILE" << EOF

## [${TIMESTAMP}] User

${PROMPT}

---
EOF

# 로그 출력
if [ -n "$NEW_KEYWORDS" ]; then
    echo "[Session Logger] 대화 저장됨 + 키워드: ${NEW_KEYWORDS}"
else
    echo "[Session Logger] 대화 저장됨: ${CONV_FILE}"
fi
