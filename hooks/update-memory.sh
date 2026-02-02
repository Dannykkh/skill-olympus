#!/bin/bash
# Memory Update Hook - 세션 종료 시 MEMORY.md 및 키워드 자동 업데이트
#
# 사용법: Stop 훅에서 실행
# 기능:
#   1. keyword-extractor 에이전트로 대화 키워드 추출
#   2. memory-writer 에이전트로 MEMORY.md 업데이트
#   3. index.json 업데이트

PROJECT_DIR="${PWD}"
PROJECT_NAME=$(basename "$PROJECT_DIR")
TODAY=$(date +%Y-%m-%d)
CONV_DIR="${PROJECT_DIR}/.claude/conversations"
CONV_FILE="${CONV_DIR}/${TODAY}.md"
MEMORY_FILE="${PROJECT_DIR}/MEMORY.md"
INDEX_FILE="${CONV_DIR}/index.json"

# 대화 로그가 있는 경우만 실행
if [ -f "$CONV_FILE" ]; then

    # 1. 키워드 추출 및 frontmatter 업데이트
    echo "[Keyword Extractor] 대화 키워드 추출 중..."

    claude --print --max-turns 5 "keyword-extractor 에이전트로 오늘 대화(.claude/conversations/${TODAY}.md)를 분석해서:
1. 핵심 키워드 10-20개 추출 (기술, 기능, 파일명, 작업 유형)
2. 1-2문장 요약 생성
3. 파일의 frontmatter(keywords, summary) 업데이트
4. .claude/conversations/index.json 업데이트 (없으면 생성)

frontmatter 형식:
---
date: ${TODAY}
project: ${PROJECT_NAME}
keywords: [keyword1, keyword2, ...]
summary: \"요약문\"
---" 2>/dev/null

    echo "[Keyword Extractor] 키워드 추출 완료"

    # 2. MEMORY.md 업데이트 (파일이 있는 경우)
    if [ -f "$MEMORY_FILE" ]; then
        echo "[Memory Writer] 세션 대화 분석 중..."

        claude --print --max-turns 3 \
            "memory-writer 에이전트로 오늘 대화(.claude/conversations/${TODAY}.md)를 분석해서 MEMORY.md에 중요한 내용을 추가해줘. 중복은 피하고 간결하게." 2>/dev/null

        echo "[Memory Writer] MEMORY.md 업데이트 완료"
    fi

else
    echo "[Memory Hook] 오늘 대화 로그 없음 - 스킵"
fi
