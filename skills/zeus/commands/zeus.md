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

0. **메타 요청 구분** — Zeus 자체를 점검/수정/설명하라는 요청이면 제품 파이프라인을 시작하지 말고 스킬과 런타임만 점검합니다.
1. **인터랙티브 질문 도구 절대 호출 금지** — 모든 결정은 SKILL.md의 자동선택 규칙으로 처리 (`Recommended` 우선, 없으면 fallback)
2. **절대 멈추지 않는다** — 에러 발생 시 docs/zeus/zeus-log.md에 기록하고 다음 단계로 진행
3. **[ZEUS-AUTO] 태그** — 자동 결정에는 반드시 태그 표시
4. **모든 Phase 강제 실행** — Phase 0~6 모두 최소 1회 실행 시도 필수. 실행 불가 범위의 폴백·비성공 종결은 SKILL.md의 실행 보장 게이트를 따릅니다.
5. **완료 전 최종 응답 금지** — Phase 0~5 실행 증거가 없으면 "다음 구현 순서"를 사용자에게 넘기지 말고, 가능한 다음 작업을 즉시 수행합니다.

### CLI 자동 재개

제품/기능 파이프라인으로 `/zeus`가 실행되면 Phase 0 전에 Chronos 자동 재개 가드를 시작합니다. 이미 현재 CLI의 상태 파일(Claude: `.claude/loop-state.md`, Codex: `.codex/loop-state.md`, Antigravity: `.chronos/loop-state.md`)이 활성 상태면 새로 만들지 않습니다. 다른 CLI의 오래된 상태 파일은 현재 CLI의 Zeus 부트스트랩을 막지 않습니다.

기존 상태의 충돌 확인, 이미 설정된 사용자 goal의 우선순위, 가드 소유 근거 기록은 SKILL.md의 CLI Auto-Continue Contract를 따릅니다.

Claude Code는 Stop 훅으로, Codex는 notify 체인으로, Antigravity는 Stop/worker 루프로 같은 Zeus 파이프라인을 이어갑니다.
현재 프로젝트의 `skills/auto-continue-loop/`가 없으면 현재 CLI의 글로벌 스킬 경로에 설치된 `auto-continue-loop`를 사용합니다.

```powershell
pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File skills/auto-continue-loop/scripts/setup-loop.ps1 `
  --max-iterations 20 `
  --completion-promise "Zeus Phase 0-6 complete" `
  "Zeus pipeline: {사용자 원문}. Run zephermine through minos and final report. Execute missing Phase 0-6 from docs/zeus/zeus-state.json; do not stop at next steps."
```

```bash
bash skills/auto-continue-loop/scripts/setup-loop.sh \
  --max-iterations 20 \
  --completion-promise "Zeus Phase 0-6 complete" \
  "Zeus pipeline: {사용자 원문}. Run zephermine through minos and final report. Execute missing Phase 0-6 from docs/zeus/zeus-state.json; do not stop at next steps."
```

Phase 6의 최종 결과가 SUCCESS이고 모든 Phase 증거가 proved일 때만 `<promise>Zeus Phase 0-6 complete</promise>`를 출력합니다. PARTIAL/BLOCKED/FAILED 리포트 작성은 성공 완료가 아닙니다.
더 진행할 작업·원래 예산이 없을 때의 폴백 해제는 [SKILL.md의 비성공 종료 규칙](../SKILL.md#비성공-종료와-자동-재개-해제)을 따릅니다. 재사용한 사용자 루프나 goal을 임의로 종료하지 않습니다.

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
5. **Testing** — minos Step 1~7: 자동 테스트·탐색 QA·기존 예산 내 Healer·최종 등급 보고
6. **Report** — docs/zeus/zeus-report.md 최종 보고서

**CRITICAL**: 각 Phase 사이에 사용자에게 "다음 단계를 진행합니다" 같은 확인을 구하지 마세요. 바로 다음 Phase 코드를 실행하세요. 중간에 멈추는 것은 zeus의 목적에 반합니다.

### 실행 완료 체크리스트 (Phase 6 진입 전 필수 확인)

- Phase 1: `plan.md` 존재
- Phase 2: `docs/zeus/zeus-log.md`에 agent-team/daedalus 실행 기록
- Phase 3: `docs/zeus/zeus-log.md`에 argos 실행 기록 (최소 정적 분석)
- Phase 4: `docs/zeus/zeus-log.md`에 Docker/dev-server 시도 기록
- Phase 5: QA 결과 파일 또는 `docs/zeus/zeus-log.md`에 minos 실행 기록
- 누락되었어도 진행 가능한 작업·원래 예산이 남으면 먼저 실행합니다. 초기 BLOCKED를 포함해 더 진행할 수 없을 때는 [비성공 종결 보고 규칙](../references/final-report-format.md#phase-6-진입-조건-필수-체크)을 적용합니다.

### 재개

Phase 0 아카이브 전에 SKILL.md와 `references/phase-transitions.md`의 재개 규칙으로 대상 프로젝트 루트의 `docs/zeus/zeus-state.json`을 확인합니다. 기존 이슈·증거·사용 예산을 이어받고, 구경로와 정본이 충돌하면 파일을 보존한 채 BLOCKED로 보고합니다. 무중단 진행을 이유로 자식 FAIL/CONDITIONAL을 성공으로 바꾸거나 소진된 수리를 다시 시작하지 않습니다.

Start now: Read skills/zeus/SKILL.md — then execute Phase 0 through Phase 6 without stopping. If any phase fails, apply fallback and continue.
