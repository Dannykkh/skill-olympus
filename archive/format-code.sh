#!/bin/bash
# .claude/hooks/format-code.sh
# 파일 저장 후 자동 포맷팅 (PostToolUse 훅)

set -e

# 입력에서 파일 경로 추출 (JSON 형태로 전달됨)
TOOL_INPUT="$1"
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)

# 파일 경로가 없으면 종료
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" == "null" ]; then
    exit 0
fi

# 파일이 존재하지 않으면 종료
if [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

# Python 파일 포맷팅
if [[ "$FILE_PATH" == *.py ]]; then
    echo "[Hook] Formatting Python file: $FILE_PATH"

    # ruff가 설치되어 있으면 사용
    if command -v ruff &> /dev/null; then
        ruff format "$FILE_PATH" 2>/dev/null || true
        ruff check --fix "$FILE_PATH" 2>/dev/null || true
    # 아니면 black 사용
    elif command -v black &> /dev/null; then
        black "$FILE_PATH" 2>/dev/null || true
    fi
fi

# TypeScript/JavaScript 파일 포맷팅
if [[ "$FILE_PATH" == *.ts || "$FILE_PATH" == *.tsx || "$FILE_PATH" == *.js || "$FILE_PATH" == *.jsx ]]; then
    echo "[Hook] Formatting TypeScript/JavaScript file: $FILE_PATH"

    # Prettier 사용
    if command -v npx &> /dev/null; then
        npx prettier --write "$FILE_PATH" 2>/dev/null || true
    fi

    # ESLint 자동 수정
    if [ -f "$(dirname "$FILE_PATH")/../.eslintrc.js" ] || [ -f "$(dirname "$FILE_PATH")/../eslint.config.js" ]; then
        npx eslint --fix "$FILE_PATH" 2>/dev/null || true
    fi
fi

# JSON 파일 포맷팅
if [[ "$FILE_PATH" == *.json ]]; then
    echo "[Hook] Formatting JSON file: $FILE_PATH"
    if command -v npx &> /dev/null; then
        npx prettier --write "$FILE_PATH" 2>/dev/null || true
    fi
fi

# CSS/SCSS 파일 포맷팅
if [[ "$FILE_PATH" == *.css || "$FILE_PATH" == *.scss ]]; then
    echo "[Hook] Formatting CSS file: $FILE_PATH"
    if command -v npx &> /dev/null; then
        npx prettier --write "$FILE_PATH" 2>/dev/null || true
    fi
fi

exit 0
