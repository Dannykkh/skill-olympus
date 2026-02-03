#!/bin/bash
# .claude/hooks/validate-api.sh
# API 엔드포인트 파일 수정 시 유효성 검사

set -e

# Claude Code는 stdin으로 JSON을 전달함
INPUT_JSON=$(cat)
FILE_PATH=$(echo "$INPUT_JSON" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# 파일 경로가 없으면 통과
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" == "null" ]; then
    exit 0
fi

# API 라우터 파일인지 확인
if [[ "$FILE_PATH" != *"/api/"* ]] && [[ "$FILE_PATH" != *"/routes/"* ]]; then
    exit 0
fi

echo "[Hook] Validating API file: $FILE_PATH"

# Python 파일 검증
if [[ "$FILE_PATH" == *.py ]]; then
    # 구문 검사
    if command -v python3 &> /dev/null; then
        python3 -m py_compile "$FILE_PATH" 2>&1 || {
            echo "[Hook] ERROR: Python syntax error in $FILE_PATH"
            exit 1
        }
    fi

    # 타입 힌트 검사 (mypy가 있으면)
    if command -v mypy &> /dev/null; then
        mypy "$FILE_PATH" --ignore-missing-imports 2>&1 || {
            echo "[Hook] WARNING: Type hint issues found (not blocking)"
        }
    fi
fi

# TypeScript 파일 검증
if [[ "$FILE_PATH" == *.ts || "$FILE_PATH" == *.tsx ]]; then
    # TypeScript 컴파일 검사
    if command -v npx &> /dev/null; then
        npx tsc --noEmit "$FILE_PATH" 2>&1 || {
            echo "[Hook] WARNING: TypeScript errors found (not blocking)"
        }
    fi
fi

echo "[Hook] API validation passed: $FILE_PATH"
exit 0
