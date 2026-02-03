#!/bin/bash
# .claude/hooks/protect-files.sh
# 중요 파일 수정 방지 (PreToolUse 훅)

set -e

# Claude Code는 stdin으로 JSON을 전달함
INPUT_JSON=$(cat)
FILE_PATH=$(echo "$INPUT_JSON" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# 파일 경로가 없으면 통과
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" == "null" ]; then
    exit 0
fi

# 보호할 파일/패턴 목록
PROTECTED_PATTERNS=(
    "*.env"
    "*.env.local"
    "*.env.production"
    ".git/*"
    "node_modules/*"
    "__pycache__/*"
    "*.pyc"
    "credentials.json"
    "secrets.yaml"
    "*.key"
    "*.pem"
    "*.p12"
)

# 보호할 디렉토리 목록
PROTECTED_DIRS=(
    ".git"
    "node_modules"
    "__pycache__"
    ".venv"
    "venv"
)

# 파일명 추출
FILENAME=$(basename "$FILE_PATH")
DIRNAME=$(dirname "$FILE_PATH")

# 패턴 매칭 검사
for pattern in "${PROTECTED_PATTERNS[@]}"; do
    if [[ "$FILE_PATH" == $pattern ]] || [[ "$FILENAME" == $pattern ]]; then
        echo "[Hook] BLOCKED: Cannot modify protected file: $FILE_PATH"
        echo "This file is protected for security reasons."
        exit 1
    fi
done

# 디렉토리 검사
for dir in "${PROTECTED_DIRS[@]}"; do
    if [[ "$FILE_PATH" == *"/$dir/"* ]] || [[ "$FILE_PATH" == "$dir/"* ]]; then
        echo "[Hook] BLOCKED: Cannot modify files in protected directory: $dir"
        exit 1
    fi
done

# 민감 정보 포함 여부 경고 (차단하지는 않음)
if [[ "$FILENAME" == *"secret"* ]] || [[ "$FILENAME" == *"credential"* ]] || [[ "$FILENAME" == *"password"* ]]; then
    echo "[Hook] WARNING: Modifying potentially sensitive file: $FILE_PATH"
    echo "Please ensure no secrets are being committed."
fi

exit 0
