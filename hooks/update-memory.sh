#!/bin/bash
# Memory Update Hook - 세션 종료 시 MEMORY.md 자동 업데이트
#
# 사용법: Stop 훅에서 실행
# 기능: claude CLI로 memory-writer 에이전트 호출

PROJECT_DIR="${PWD}"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="${PROJECT_DIR}/.claude/conversations/${TODAY}.md"
MEMORY_FILE="${PROJECT_DIR}/MEMORY.md"

# 대화 로그가 있고, MEMORY.md가 있는 경우만 실행
if [ -f "$CONV_FILE" ] && [ -f "$MEMORY_FILE" ]; then
    echo "[Memory Writer] 세션 대화 분석 중..."

    # claude CLI로 memory-writer 에이전트 호출
    # --print: 비대화형 모드
    # --max-turns 3: 최대 3턴으로 제한 (빠른 완료)
    claude --print --max-turns 3 \
        "memory-writer 에이전트로 오늘 대화(.claude/conversations/${TODAY}.md)를 분석해서 MEMORY.md에 중요한 내용을 추가해줘. 중복은 피하고 간결하게."

    echo "[Memory Writer] MEMORY.md 업데이트 완료"
else
    echo "[Memory Writer] 대화 로그 또는 MEMORY.md 없음 - 스킵"
fi
