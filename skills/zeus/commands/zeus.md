---
name: zeus
description: >
  Zero-interaction full pipeline. 한 줄 설명으로 설계→구현→테스트 전자동 완료.
  "쇼핑몰 만들어줘. React+Spring Boot" 같은 입력만으로 전체 파이프라인 실행.
  제우스.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, WebSearch, WebFetch, AskUserQuestion
---

# /zeus — Zero-Interaction Full Pipeline

사용자가 제공한 한 줄 설명으로 설계부터 구현, 테스트까지 전부 자동 완료합니다.

## 사용법

```
/zeus "할일 관리 앱 만들어줘. React+Express"
/zeus "쇼핑몰 만들어줘. React+Spring Boot"
/zeus "병원 예약 시스템. Next.js+FastAPI"
```

## 실행 절차

**Read `skills/zeus/SKILL.md` and follow the complete workflow.**

### 핵심 원칙

1. **AskUserQuestion 절대 호출 금지** — 모든 결정은 SKILL.md의 자동 응답 테이블로 처리
2. **절대 멈추지 않는다** — 에러 발생 시 zeus-log.md에 기록하고 다음 단계로 진행
3. **[ZEUS-AUTO] 태그** — 자동 결정에는 반드시 태그 표시

### Phase 순서 — 자동 루프

Phase 0~4를 **연속으로 실행**합니다. 각 Phase가 끝나면 멈추지 말고 즉시 다음 Phase로 진입하세요.

```
LOOP:
  Phase 0 → 완료 → 즉시 Phase 1 시작
  Phase 1 → 완료 → 즉시 Phase 2 시작
  Phase 2 → 완료 → 즉시 Phase 3 시작
  Phase 3 → 완료 → 즉시 Phase 4 시작
  Phase 4 → 완료 → 종료
```

0. **Description Parsing** — 산업군, 기술스택, 기능 추출
1. **Planning** — zephermine 24단계 자동 실행 (인터뷰는 합성 생성)
2. **Implementation** — workpm으로 병렬 구현 (orchestrator MCP)
3. **Testing** — qpassenger로 E2E 테스트
4. **Report** — zeus-report.md 최종 보고서

**CRITICAL**: 각 Phase 사이에 사용자에게 "다음 단계를 진행합니다" 같은 확인을 구하지 마세요. 바로 다음 Phase 코드를 실행하세요. 중간에 멈추는 것은 zeus의 목적에 반합니다.

### 재개

이전 실행이 중단된 경우, `/zeus`를 다시 실행하면 zeus-state.json에서 마지막 완료 지점부터 자동 재개합니다.

Start now: Read skills/zeus/SKILL.md — then execute Phase 0 through Phase 4 without stopping.
