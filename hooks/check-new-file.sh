#!/bin/bash
# .claude/hooks/check-new-file.sh
# 새 파일 생성 전 reducing-entropy 원칙 확인 (PreToolUse 훅)
# 트리거: Write 도구 사용 전 (새 파일 생성 시)

set -e

# 입력에서 파일 경로 추출
TOOL_INPUT="$1"
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)

# 파일 경로가 없으면 통과
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" == "null" ]; then
    exit 0
fi

# 이미 존재하는 파일이면 통과 (수정이므로)
if [ -f "$FILE_PATH" ]; then
    exit 0
fi

# 파일명과 디렉토리 추출
FILENAME=$(basename "$FILE_PATH")
DIRNAME=$(dirname "$FILE_PATH")
EXTENSION="${FILENAME##*.}"

echo "[Hook] New file creation detected: $FILE_PATH"

WARNINGS=()

# === 1. Reducing Entropy 체크 ===
# 테스트/목/스텁 파일은 허용
case "$FILENAME" in
    *test*|*spec*|*mock*|*stub*|*fixture*|__init__.py)
        exit 0
        ;;
esac

# === 2. 유사한 파일 존재 여부 확인 ===
# 같은 디렉토리에서 유사한 이름의 파일 찾기
if [ -d "$DIRNAME" ]; then
    BASE_NAME="${FILENAME%.*}"

    # 유사한 파일 검색 (첫 5글자가 같은 파일)
    if [ ${#BASE_NAME} -ge 5 ]; then
        PREFIX="${BASE_NAME:0:5}"
        SIMILAR_FILES=$(find "$DIRNAME" -maxdepth 1 -name "${PREFIX}*" -type f 2>/dev/null | head -5)

        if [ -n "$SIMILAR_FILES" ]; then
            WARNINGS+=("[Reducing Entropy] Similar files exist in directory:")
            while IFS= read -r file; do
                WARNINGS+=("  → $(basename "$file")")
            done <<< "$SIMILAR_FILES"
            WARNINGS+=("Consider extending existing file instead of creating new one.")
        fi
    fi
fi

# === 3. 유틸/헬퍼 파일 생성 경고 ===
case "$FILENAME" in
    *util*|*utils*|*helper*|*helpers*|*common*|*shared*)
        WARNINGS+=("[Reducing Entropy] Utility file detected: $FILENAME")
        WARNINGS+=("  → Question: Can this logic be placed in the file that uses it?")
        WARNINGS+=("  → Consider: Is this truly reusable across 3+ files?")
        ;;
esac

# === 4. 새 모듈/패키지 생성 경고 ===
case "$FILENAME" in
    index.ts|index.js|__init__.py|mod.rs)
        if [ -d "$DIRNAME" ]; then
            FILE_COUNT=$(find "$DIRNAME" -maxdepth 1 -type f 2>/dev/null | wc -l)
            if [ "$FILE_COUNT" -eq 0 ]; then
                WARNINGS+=("[Reducing Entropy] Creating new module/package: $DIRNAME")
                WARNINGS+=("  → Question: Is a new module necessary, or can existing modules be extended?")
            fi
        fi
        ;;
esac

# === 5. 설정 파일 중복 경고 ===
case "$FILENAME" in
    *.config.*|*.conf|*.cfg|*rc.js|*rc.json)
        EXISTING_CONFIGS=$(find "." -maxdepth 2 -name "*.config.*" -o -name "*.conf" 2>/dev/null | head -5)
        if [ -n "$EXISTING_CONFIGS" ]; then
            WARNINGS+=("[Reducing Entropy] New config file: $FILENAME")
            WARNINGS+=("  → Existing configs found. Consider consolidating.")
        fi
        ;;
esac

# === 결과 출력 ===
if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║          REDUCING ENTROPY - Pre-Creation Check               ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  Before creating new files, ask:                             ║"
    echo "║  1. Can I extend an existing file instead?                   ║"
    echo "║  2. Will this file be used by 3+ other files?                ║"
    echo "║  3. Is this abstraction necessary NOW, or premature?         ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    for warn in "${WARNINGS[@]}"; do
        echo "  ⚠️  $warn"
    done
    echo ""
    echo "[Hook] Proceeding with file creation (warnings only, not blocking)"
fi

# 경고만 출력하고 차단하지 않음 (사용자 판단에 맡김)
exit 0
