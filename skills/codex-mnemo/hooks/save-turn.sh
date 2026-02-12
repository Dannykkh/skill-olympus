#!/bin/bash
# save-turn.sh - Codex CLI notify 훅: User+Assistant 턴을 대화 파일에 저장
# Codex는 argv 마지막 인자로 JSON 페이로드를 전달함
# AI 호출 없음 = 빠름

# argv 마지막 인자에서 JSON 페이로드 추출
PAYLOAD="${@: -1}"
if [ -z "$PAYLOAD" ]; then
    exit 0
fi

# JSON 파싱 함수 (jq 우선, python3 폴백)
json_get() {
    local key="$1"
    if command -v jq &>/dev/null; then
        echo "$PAYLOAD" | jq -r "$key // empty" 2>/dev/null
    elif command -v python3 &>/dev/null; then
        echo "$PAYLOAD" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    keys = '$key'.strip('.').split('.')
    # jq 키 형식 변환: .\"input-messages\" → input-messages
    val = d
    for k in keys:
        k = k.strip('\"')
        if k == '[]':
            val = '\n'.join(str(v) for v in val) if isinstance(val, list) else str(val)
            break
        val = val.get(k, '')
        if val == '': break
    print(val if val else '')
except: pass
" 2>/dev/null
    else
        exit 0
    fi
}

# JSON 배열 → 줄바꿈 연결 함수
json_join_array() {
    local key="$1"
    if command -v jq &>/dev/null; then
        echo "$PAYLOAD" | jq -r ".[\"$key\"] // [] | if type == \"array\" then .[] else . end" 2>/dev/null
    elif command -v python3 &>/dev/null; then
        echo "$PAYLOAD" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    val = d.get('$key', [])
    if isinstance(val, list):
        print('\n'.join(str(v) for v in val))
    else:
        print(str(val))
except: pass
" 2>/dev/null
    fi
}

# agent-turn-complete 이벤트만 처리
EVENT_TYPE=$(json_get '.type')
if [ "$EVENT_TYPE" != "agent-turn-complete" ]; then
    exit 0
fi

# turn-id 추출 (중복 방지용)
TURN_ID=$(json_get '."turn-id"')

# User 입력 추출: input-messages 배열 → join
USER_TEXT=$(json_join_array "input-messages")
USER_TEXT=$(echo "$USER_TEXT" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# Assistant 응답 추출: last-assistant-message 문자열
RESPONSE=$(json_get '."last-assistant-message"')
RESPONSE=$(echo "$RESPONSE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# 둘 다 비어있으면 스킵
if [ -z "$USER_TEXT" ] && { [ -z "$RESPONSE" ] || [ ${#RESPONSE} -lt 5 ]; }; then
    exit 0
fi

# 대화 디렉토리 및 파일
CONV_DIR="$PWD/conversations"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="$CONV_DIR/$TODAY-codex.md"
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

# turn-id 기반 중복 방지
if [ -n "$TURN_ID" ] && [ -f "$CONV_FILE" ] && grep -qF "<!-- turn:$TURN_ID -->" "$CONV_FILE" 2>/dev/null; then
    exit 0
fi

TIMESTAMP=$(date +%H:%M:%S)

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

# turn-id 주석 추가 (중복 방지 마커)
if [ -n "$TURN_ID" ]; then
    echo "<!-- turn:$TURN_ID -->" >> "$CONV_FILE"
fi
