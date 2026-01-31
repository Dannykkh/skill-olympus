#!/bin/bash
# .claude/hooks/validate-docs.sh
# 마크다운 문서 작성 후 AI 글쓰기 패턴 검출 (PostToolUse 훅)
# 트리거: Write 도구 사용 후 (*.md 파일)
# 기반: Wikipedia "Signs of AI writing" + humanizer 스킬

set -e

# 입력에서 파일 경로 추출
TOOL_INPUT="$1"
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)

# 파일 경로가 없으면 통과
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" == "null" ]; then
    exit 0
fi

# 마크다운 파일만 검사
case "$FILE_PATH" in
    *.md|*.mdx)
        ;;
    *)
        exit 0
        ;;
esac

# 파일이 존재하는지 확인
if [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

echo "[Hook] Checking documentation: $FILE_PATH"

WARNINGS=()
CONTENT=$(cat "$FILE_PATH")

# === 1. AI 과잉 어휘 검출 ===
AI_WORDS=(
    "delve"
    "crucial"
    "pivotal"
    "moreover"
    "furthermore"
    "comprehensive"
    "cutting-edge"
    "groundbreaking"
    "game-changing"
    "revolutionary"
    "paradigm"
    "synergy"
    "leverage"
    "robust"
    "seamless"
    "streamline"
    "utilize"
    "facilitate"
    "endeavor"
    "paramount"
    "plethora"
    "myriad"
    "embark"
    "foster"
    "bolster"
)

FOUND_AI_WORDS=()
for word in "${AI_WORDS[@]}"; do
    if echo "$CONTENT" | grep -qi "\b${word}\b"; then
        FOUND_AI_WORDS+=("$word")
    fi
done

if [ ${#FOUND_AI_WORDS[@]} -ge 3 ]; then
    WARNINGS+=("[AI Pattern] Overused AI vocabulary detected (${#FOUND_AI_WORDS[@]} words):")
    WARNINGS+=("  → Found: ${FOUND_AI_WORDS[*]}")
    WARNINGS+=("  → Consider using simpler, more direct language")
fi

# === 2. Em-dash 과다 사용 검출 ===
EM_DASH_COUNT=$(echo "$CONTENT" | grep -o "—" | wc -l)
WORD_COUNT=$(echo "$CONTENT" | wc -w)

if [ "$WORD_COUNT" -gt 100 ]; then
    EM_DASH_RATIO=$((EM_DASH_COUNT * 1000 / WORD_COUNT))
    if [ "$EM_DASH_RATIO" -gt 10 ]; then  # > 1%
        WARNINGS+=("[AI Pattern] Excessive em-dash usage: $EM_DASH_COUNT em-dashes in $WORD_COUNT words")
        WARNINGS+=("  → Consider using commas, parentheses, or separate sentences")
    fi
fi

# === 3. Rule of Three 패턴 검출 ===
TRIPLE_PATTERN_COUNT=$(echo "$CONTENT" | grep -cE "[a-zA-Z]+,\s+[a-zA-Z]+,\s+(and|or)\s+[a-zA-Z]+" || echo "0")
if [ "$TRIPLE_PATTERN_COUNT" -gt 3 ]; then
    WARNINGS+=("[AI Pattern] Excessive 'rule of three' patterns: $TRIPLE_PATTERN_COUNT instances")
    WARNINGS+=("  → Vary your list lengths for more natural writing")
fi

# === 4. 과잉 부사 검출 ===
EXCESSIVE_ADVERBS=(
    "extremely"
    "incredibly"
    "absolutely"
    "definitely"
    "certainly"
    "undoubtedly"
    "remarkably"
    "exceptionally"
    "tremendously"
    "significantly"
)

FOUND_ADVERBS=()
for adverb in "${EXCESSIVE_ADVERBS[@]}"; do
    if echo "$CONTENT" | grep -qi "\b${adverb}\b"; then
        FOUND_ADVERBS+=("$adverb")
    fi
done

if [ ${#FOUND_ADVERBS[@]} -ge 3 ]; then
    WARNINGS+=("[AI Pattern] Excessive intensifying adverbs (${#FOUND_ADVERBS[@]} found):")
    WARNINGS+=("  → Found: ${FOUND_ADVERBS[*]}")
    WARNINGS+=("  → Let facts speak for themselves without amplification")
fi

# === 5. 판촉성 문구 검출 ===
PROMOTIONAL_PATTERNS=(
    "take .* to the next level"
    "stands out"
    "best practices"
    "industry-leading"
    "world-class"
    "state-of-the-art"
    "unlock .* potential"
    "empower"
)

for pattern in "${PROMOTIONAL_PATTERNS[@]}"; do
    if echo "$CONTENT" | grep -qiE "$pattern"; then
        WARNINGS+=("[AI Pattern] Promotional language detected: '$pattern'")
        WARNINGS+=("  → Use neutral, factual descriptions instead")
        break  # 하나만 찾으면 경고
    fi
done

# === 6. 시작 문장 단조로움 검출 ===
SENTENCE_STARTS=$(echo "$CONTENT" | grep -oE "^[A-Z][a-z]+" | sort | uniq -c | sort -rn | head -3)
REPEATED_START=$(echo "$SENTENCE_STARTS" | awk '$1 > 3 {print $2 " (" $1 " times)"}')

if [ -n "$REPEATED_START" ]; then
    WARNINGS+=("[Writing Style] Repetitive sentence starts detected:")
    WARNINGS+=("  → $REPEATED_START")
    WARNINGS+=("  → Vary your sentence openings")
fi

# === 7. 수동태 과다 사용 검출 ===
PASSIVE_COUNT=$(echo "$CONTENT" | grep -ciE "\b(is|are|was|were|be|been|being)\s+[a-z]+ed\b" || echo "0")
SENTENCE_COUNT=$(echo "$CONTENT" | grep -c "\." || echo "1")

if [ "$SENTENCE_COUNT" -gt 5 ]; then
    PASSIVE_RATIO=$((PASSIVE_COUNT * 100 / SENTENCE_COUNT))
    if [ "$PASSIVE_RATIO" -gt 30 ]; then
        WARNINGS+=("[Writing Style] High passive voice usage: ~$PASSIVE_RATIO%")
        WARNINGS+=("  → Consider using active voice for clearer writing")
    fi
fi

# === 결과 출력 ===
if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           HUMANIZER - AI Writing Pattern Check               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    for warn in "${WARNINGS[@]}"; do
        echo "  $warn"
    done
    echo ""
    echo "Tip: Review and revise to sound more natural and human-written."
    echo ""
fi

# 경고만 출력하고 차단하지 않음
if [ ${#WARNINGS[@]} -eq 0 ]; then
    echo "[Hook] ✅ Documentation check passed: $FILE_PATH"
fi

exit 0
