#!/bin/bash
# save-tool-use.sh - PostToolUse 훅: 도구 호출을 한 줄로 기록
# 도구명 + 파일경로만 append. AI 호출 없음 = 빠름
# claude-mem의 관찰 캡처 아이디어를 차용하되, 파일 기반으로 단순 구현

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
if [ -z "$TOOL_NAME" ]; then exit 0; fi

# 기록하지 않을 도구 (너무 빈번하거나 노이즈)
case "$TOOL_NAME" in
    Glob|Grep|Read|LS|TaskCreate|TaskUpdate|TaskGet|TaskList|TaskOutput) exit 0 ;;
esac

# 대화 로그 경로
CONV_DIR="$PWD/conversations"
TODAY=$(date +%Y-%m-%d)
LOG_FILE="$CONV_DIR/$TODAY-toollog.md"

# conversations 폴더 자동 생성
mkdir -p "$CONV_DIR"

# 파일 없으면 헤더
if [ ! -f "$LOG_FILE" ]; then
    cat > "$LOG_FILE" << EOF
---
date: $TODAY
type: tool-log
---

# Tool Usage Log - $TODAY

EOF
fi

# 도구별 핵심 정보 추출
DETAIL=""
case "$TOOL_NAME" in
    Edit|Write)
        DETAIL=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
        ;;
    Bash)
        CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
        DETAIL="${CMD:0:80}"
        [ ${#CMD} -gt 80 ] && DETAIL="${DETAIL}..."
        ;;
    Agent)
        SUBTYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // empty' 2>/dev/null)
        DESC=$(echo "$INPUT" | jq -r '.tool_input.description // empty' 2>/dev/null)
        DETAIL="$SUBTYPE: $DESC"
        ;;
    Skill)
        DETAIL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty' 2>/dev/null)
        ;;
    WebFetch)
        DETAIL=$(echo "$INPUT" | jq -r '.tool_input.url // empty' 2>/dev/null)
        ;;
    WebSearch)
        DETAIL=$(echo "$INPUT" | jq -r '.tool_input.query // empty' 2>/dev/null)
        ;;
esac

TIMESTAMP=$(date +%H:%M:%S)

# 중복 방지: 같은 초에 같은 도구가 있으면 스킵
if [ -f "$LOG_FILE" ] && grep -qF "[\`$TIMESTAMP\`] **$TOOL_NAME**" "$LOG_FILE" 2>/dev/null; then
    exit 0
fi

echo "- \`[$TIMESTAMP]\` **$TOOL_NAME** $DETAIL" >> "$LOG_FILE"
