#!/bin/bash
# .claude/hooks/validate-code.sh
# 코드 파일 수정 후 자동 검증 (PostToolUse 훅)
# 트리거: Edit, Write 도구 사용 후 (*.py, *.ts, *.tsx, *.jsx, *.java)

set -e

# Claude Code는 stdin으로 JSON을 전달함
INPUT_JSON=$(cat)
FILE_PATH=$(echo "$INPUT_JSON" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# 파일 경로가 없으면 통과
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" == "null" ]; then
    exit 0
fi

# 코드 파일 확장자 확인
case "$FILE_PATH" in
    *.py|*.ts|*.tsx|*.jsx|*.java|*.js)
        ;;
    *)
        exit 0  # 코드 파일이 아니면 통과
        ;;
esac

# 파일이 존재하는지 확인
if [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

echo "[Hook] Validating code: $FILE_PATH"

WARNINGS=()
ERRORS=()

# === 1. 파일 줄 수 검사 (500줄 제한) ===
LINE_COUNT=$(wc -l < "$FILE_PATH" 2>/dev/null || echo "0")
if [ "$LINE_COUNT" -gt 500 ]; then
    ERRORS+=("[Line Limit] File has $LINE_COUNT lines (max: 500). Split into modules.")
elif [ "$LINE_COUNT" -gt 400 ]; then
    WARNINGS+=("[Line Limit] File has $LINE_COUNT lines. Consider splitting soon (max: 500).")
fi

# === 2. 함수 길이 검사 (50줄 제한) ===
# Python 함수 검사
if [[ "$FILE_PATH" == *.py ]]; then
    # def로 시작하는 함수 블록 찾기 (간단한 휴리스틱)
    LONG_FUNCS=$(awk '
        /^[[:space:]]*def / {
            start = NR;
            fname = $0;
            gsub(/[[:space:]]*def /, "", fname);
            gsub(/\(.*/, "", fname);
        }
        /^[[:space:]]*def / && start > 0 {
            len = NR - start;
            if (len > 50) print fname " (" len " lines)";
        }
        END {
            if (start > 0) {
                len = NR - start;
                if (len > 50) print fname " (" len " lines)";
            }
        }
    ' "$FILE_PATH" 2>/dev/null)

    if [ -n "$LONG_FUNCS" ]; then
        WARNINGS+=("[Function Size] Long functions detected (>50 lines): $LONG_FUNCS")
    fi
fi

# TypeScript/JavaScript 함수 검사
if [[ "$FILE_PATH" == *.ts || "$FILE_PATH" == *.tsx || "$FILE_PATH" == *.js || "$FILE_PATH" == *.jsx ]]; then
    LONG_FUNCS=$(awk '
        /^[[:space:]]*(export )?(async )?(function|const.*=>|const.*function)/ {
            start = NR;
            fname = $0;
            gsub(/.*function[[:space:]]+/, "", fname);
            gsub(/.*const[[:space:]]+/, "", fname);
            gsub(/[[:space:]]*[=\(].*/, "", fname);
        }
        /^[[:space:]]*\}[;]?[[:space:]]*$/ && start > 0 {
            len = NR - start;
            if (len > 50) print fname " (" len " lines)";
            start = 0;
        }
    ' "$FILE_PATH" 2>/dev/null)

    if [ -n "$LONG_FUNCS" ]; then
        WARNINGS+=("[Function Size] Long functions detected (>50 lines): $LONG_FUNCS")
    fi
fi

# === 3. 보안 취약점 패턴 검사 ===
# SQL Injection 패턴
if grep -qE "(execute|query|raw)\s*\([^)]*\+|f['\"].*SELECT|f['\"].*INSERT|f['\"].*UPDATE|f['\"].*DELETE" "$FILE_PATH" 2>/dev/null; then
    ERRORS+=("[Security] Potential SQL Injection: Use parameterized queries instead of string concatenation")
fi

# XSS 패턴 (React dangerouslySetInnerHTML)
if grep -q "dangerouslySetInnerHTML" "$FILE_PATH" 2>/dev/null; then
    WARNINGS+=("[Security] dangerouslySetInnerHTML detected: Ensure input is sanitized")
fi

# eval() 사용
if grep -qE "\beval\s*\(" "$FILE_PATH" 2>/dev/null; then
    ERRORS+=("[Security] eval() detected: Avoid using eval() for security reasons")
fi

# 하드코딩된 시크릿 패턴
if grep -qEi "(password|secret|api_key|apikey|token)[[:space:]]*=[[:space:]]*['\"][^'\"]+['\"]" "$FILE_PATH" 2>/dev/null; then
    WARNINGS+=("[Security] Potential hardcoded secret detected: Use environment variables")
fi

# === 4. TODO/FIXME 없이 주석 처리된 코드 경고 ===
COMMENTED_CODE=$(grep -cE "^[[:space:]]*(#|//)[[:space:]]*(if|for|while|def|function|class|return|import|const|let|var)" "$FILE_PATH" 2>/dev/null || echo "0")
if [ "$COMMENTED_CODE" -gt 5 ]; then
    WARNINGS+=("[Clean Code] $COMMENTED_CODE lines of commented-out code detected: Remove or add TODO")
fi

# === 5. 타입 힌트 검사 (Python) ===
if [[ "$FILE_PATH" == *.py ]]; then
    UNTYPED_FUNCS=$(grep -cE "^[[:space:]]*def [^(]+\([^)]*\)[[:space:]]*:" "$FILE_PATH" 2>/dev/null || echo "0")
    TYPED_FUNCS=$(grep -cE "^[[:space:]]*def [^(]+\([^)]*\)[[:space:]]*->" "$FILE_PATH" 2>/dev/null || echo "0")

    if [ "$UNTYPED_FUNCS" -gt 0 ] && [ "$TYPED_FUNCS" -eq 0 ]; then
        WARNINGS+=("[Type Safety] No type hints found: Consider adding return type annotations")
    fi
fi

# === 결과 출력 ===
if [ ${#ERRORS[@]} -gt 0 ]; then
    echo ""
    echo "=== ERRORS (must fix) ==="
    for err in "${ERRORS[@]}"; do
        echo "  ❌ $err"
    done
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo "=== WARNINGS (recommend fix) ==="
    for warn in "${WARNINGS[@]}"; do
        echo "  ⚠️  $warn"
    done
fi

if [ ${#ERRORS[@]} -eq 0 ] && [ ${#WARNINGS[@]} -eq 0 ]; then
    echo "[Hook] ✅ Code validation passed: $FILE_PATH"
fi

# 에러가 있으면 실패 (차단), 경고만 있으면 통과
if [ ${#ERRORS[@]} -gt 0 ]; then
    echo ""
    echo "[Hook] BLOCKED: Fix errors before proceeding"
    exit 1
fi

exit 0
