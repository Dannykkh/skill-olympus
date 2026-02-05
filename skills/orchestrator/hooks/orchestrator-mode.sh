#!/bin/bash
# Orchestrator Mode Detection Hook
# PM 또는 Worker 모드 감지 및 컨텍스트 주입

PROMPT="$1"

# PM 모드 감지
if echo "$PROMPT" | grep -qiE '^workpm\b'; then
    cat << 'EOF'
[ORCHESTRATOR PM MODE ACTIVE]

당신은 PM (Project Manager) 역할입니다.

즉시 실행할 것:
1. orchestrator_detect_providers() - AI CLI 감지
2. orchestrator_analyze_codebase() - 프로젝트 분석
3. 사용자 요청 기반 태스크 분해 및 생성

AI 배정 가이드:
- 코드 생성 → codex
- 리팩토링/설계 → claude
- 대용량 분석 → gemini

태스크 생성 시 반드시 포함:
- id: 고유 식별자
- prompt: 상세 지시문
- scope: 수정 가능 파일 범위
- priority: 우선순위 (높을수록 먼저)
- ai_provider: 실행할 AI (선택)
- depends_on: 선행 태스크 (선택)
EOF
    exit 0
fi

# Worker 모드 감지
if echo "$PROMPT" | grep -qiE '^pmworker\b'; then
    cat << 'EOF'
[ORCHESTRATOR WORKER MODE ACTIVE]

당신은 Worker 역할입니다.

즉시 실행할 것:
1. orchestrator_get_available_tasks() - 가용 태스크 확인
2. 가장 높은 priority 태스크 선택
3. orchestrator_claim_task() - 태스크 담당

담당 후 워크플로우:
1. TaskCreate로 세부 TODO 작성 (내부 계획)
2. orchestrator_lock_file() - 파일 락 획득
3. 작업 수행 (각 TODO 완료 시 TaskUpdate)
4. orchestrator_complete_task() - 완료 보고

금지 사항:
- scope 외부 파일 수정 금지
- 락 없이 파일 수정 금지
- 다른 Worker 작업 간섭 금지
EOF
    exit 0
fi

# 매칭되지 않으면 그냥 통과
exit 0
