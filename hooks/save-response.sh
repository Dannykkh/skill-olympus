#!/bin/bash
# save-response.sh - Stop 훅: Assistant 응답을 대화 파일에 저장
# transcript_path에서 마지막 assistant 메시지를 추출하여 append
# AI 호출 없음 = 빠름

INPUT=$(cat)

# transcript_path 추출
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
    exit 0
fi

# 대화 파일 확인
CONV_DIR="$PWD/.claude/conversations"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="$CONV_DIR/$TODAY.md"
if [ ! -f "$CONV_FILE" ]; then
    exit 0
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

# 빈 응답이면 스킵
if [ -z "$RESPONSE" ] || [ ${#RESPONSE} -lt 5 ]; then
    exit 0
fi

# 코드 블록 제거 (```...``` 사이의 내용을 [code block] 으로 대체)
RESPONSE=$(echo "$RESPONSE" | perl -0777 -pe 's/```[^\n]*\n.*?```/[code block]/gs' 2>/dev/null || echo "$RESPONSE")

# 2000자 제한
if [ ${#RESPONSE} -gt 2000 ]; then
    RESPONSE="${RESPONSE:0:2000}..."
fi

# 중복 방지: 같은 초에 이미 Assistant 저장되어 있으면 스킵
TIMESTAMP=$(date +%H:%M:%S)
if grep -qF "## [$TIMESTAMP] Assistant" "$CONV_FILE" 2>/dev/null; then
    exit 0
fi

# append
echo -e "\n## [$TIMESTAMP] Assistant\n\n$RESPONSE\n" >> "$CONV_FILE"
