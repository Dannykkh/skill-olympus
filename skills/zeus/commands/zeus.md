---
name: zeus
description: >
  Zero-interaction full pipeline. 한 줄 설명으로 설계→구현→감리→Docker→테스트 전자동 완료.
  "쇼핑몰 만들어줘. React+Spring Boot" 같은 입력만으로 전체 파이프라인 실행.
  제우스.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, WebSearch, WebFetch
---

# /zeus — Zero-Interaction Full Pipeline

사용자가 제공한 한 줄 설명으로 설계부터 구현, 감리, 테스트까지 전부 자동 완료합니다.

## 사용법

```
/zeus "할일 관리 앱 만들어줘. React+Express"
/zeus "쇼핑몰 만들어줘. React+Spring Boot"
/zeus "병원 예약 시스템. Next.js+FastAPI"
```

## 실행 절차

**Read `skills/zeus/SKILL.md` and follow the complete workflow.**

### 핵심 원칙

1. **AskUserQuestion 절대 호출 금지** — 모든 결정은 SKILL.md의 자동선택 규칙으로 처리 (`Recommended` 우선, 없으면 fallback)
2. **절대 멈추지 않는다** — 에러 발생 시 docs/zeus/zeus-log.md에 기록하고 다음 단계로 진행
3. **[ZEUS-AUTO] 태그** — 자동 결정에는 반드시 태그 표시
4. **모든 Phase 강제 실행** — Phase 0~6 모두 최소 1회 실행 시도 필수. "건너뜀"은 물리적 불가(Docker 미설치 등)일 때만 허용하며, 그 경우에도 폴백 경로를 실행

### Phase 순서 — 자동 루프

Phase 0~6을 **연속으로 실행**합니다. 각 Phase가 끝나면 멈추지 말고 즉시 다음 Phase로 진입하세요.

```
LOOP:
  Phase 0 → 완료 → 즉시 Phase 1 시작
  Phase 1 → 완료 → 즉시 Phase 2 시작
  Phase 2 → 완료 → 즉시 Phase 3 시작
  Phase 3 → 완료 → 즉시 Phase 4 시작
  Phase 4 → 완료 → 즉시 Phase 5 시작
  Phase 5 → 완료 → 즉시 Phase 6 시작
  Phase 6 → 완료 → 종료
```

0. **Description Parsing** — 산업군, 기술스택, 기능 추출
1. **Planning** — zephermine 26단계 자동 실행 (인터뷰는 CPS Gate 구조로 합성 생성)
2. **Implementation** — agent-team(포세이돈) 또는 daedalus(다이달로스)로 병렬 구현
3. **Verification** — argos(아르고스) 감리: 설계 대비 준공검사
4. **Docker Setup** — Docker 환경 구성 + 컨테이너 실행 (미설치 시 dev server fallback)
5. **Testing** — minos(미노스)로 E2E 테스트 + Healer 루프
6. **Report** — docs/zeus/zeus-report.md 최종 보고서

**CRITICAL**: 각 Phase 사이에 사용자에게 "다음 단계를 진행합니다" 같은 확인을 구하지 마세요. 바로 다음 Phase 코드를 실행하세요. 중간에 멈추는 것은 zeus의 목적에 반합니다.

### 실행 완료 체크리스트 (Phase 6 진입 전 필수 확인)

- Phase 1: `plan.md` 존재
- Phase 2: `docs/zeus/zeus-log.md`에 agent-team/daedalus 실행 기록
- Phase 3: `docs/zeus/zeus-log.md`에 argos 실행 기록 (최소 정적 분석)
- Phase 4: `docs/zeus/zeus-log.md`에 Docker/dev-server 시도 기록
- Phase 5: QA 결과 파일 또는 `docs/zeus/zeus-log.md`에 minos 실행 기록
- 위 중 하나라도 없으면 **Phase 6을 시작하지 말고 누락된 Phase 먼저 실행**

### 재개

이전 실행이 중단된 경우, `/zeus`를 다시 실행하면 zeus-state.json에서 마지막 완료 지점부터 자동 재개합니다.

Start now: Read skills/zeus/SKILL.md — then execute Phase 0 through Phase 6 without stopping. If any phase fails, apply fallback and continue.
