---
name: zeus
description: >
  Zero-interaction full pipeline skill. 사용자가 한 줄 설명만 제공하면
  설계(zephermine) → 구현(workpm) → 테스트(qpassenger) 전체를 자동 완료.
  AskUserQuestion 절대 호출 금지. /zeus로 실행. 제우스.
---

# Zeus (제우스) — Zero-Interaction Full Pipeline

> "이런 프로그램 만들어줘" 한 줄이면 설계부터 구현, 테스트까지 전부 자동으로.

---

## Pipeline Overview

```
/zeus "쇼핑몰 만들어줘. React+Spring Boot"
    │
    ▼
Phase 0: Description Parsing ─── 산업군, 기술스택, 기능 추출
    │
    ▼
Phase 1: Planning (zephermine) ─ 합성 인터뷰 → 24단계 설계 자동 완료
    │
    ▼
Phase 2: Implementation (workpm) ─ PM이 task 분해 → workers 병렬 구현
    │
    ▼
Phase 3: Testing (qpassenger) ─ E2E 테스트 + Healer 루프
    │
    ▼
Phase 4: Final Report ─────────── zeus-report.md 생성
```

---

## CRITICAL RULES

1. **NEVER call AskUserQuestion** — 모든 결정은 자동 응답 테이블로 처리
2. **절대 멈추지 않는다** — 에러 시 기록하고 계속 진행
3. **[ZEUS-AUTO] 태그** — 자동 결정에는 반드시 태그 표시
4. **재개 지원** — zeus-state.json으로 중단 지점부터 재개

---

## Phase 0: Description Parsing

사용자 한 줄 설명에서 구조화된 데이터 추출.

### 절차

1. 사용자 입력 원문 저장
2. **산업군 매칭**: 키워드 테이블로 산업군 판별 (쇼핑몰→ecommerce, 병원→healthcare 등)
3. **기술스택 추출**: 정규식으로 frontend/backend/db/mobile 추출
4. **DB 추론**: 미명시 시 백엔드에서 추론 (Spring Boot→PostgreSQL 등)
5. **기능 목록 생성**: 산업별 기본 기능 세트 + 설명에서 명시된 기능
6. **프로젝트 타입 판별**: fullstack-web / api-only / static-site / cli / mobile / library
7. **프로젝트명 추론**: 핵심 명사 → kebab-case

**상세 규칙**: [references/description-parser.md](references/description-parser.md)

### 파싱 결과 예시

```
입력: "쇼핑몰 만들어줘. React+Spring Boot"
→ industry: "ecommerce"
→ techStack: { frontend: "React", backend: "Spring Boot", db: "PostgreSQL" }
→ features: ["상품관리", "장바구니", "결제", "주문", "회원", "검색", "리뷰"]
→ projectType: "fullstack-web"
→ projectName: "shopping-mall"
```

### zeus-state.json 초기화

파싱 완료 시 `zeus-state.json` 생성 (재개 지원용).
**상세 스키마**: [references/phase-transitions.md](references/phase-transitions.md)

---

## Phase 1: Planning (zephermine 24단계)

zephermine SKILL.md를 읽고 24단계를 따르되, **모든 AskUserQuestion을 자동 응답으로 대체**.

### Step 1~5: 리서치 단계

- Step 1~3: 초기화, 프로젝트 디렉토리 설정 → **그대로 실행**
- Step 4.2 (코드베이스 리서치?): 코드 파일 존재하면 YES, 없으면 NO
- Step 4.3 (GitHub 유사 프로젝트?): **YES** → WebSearch로 유사 프로젝트 검색
- Step 4.4 (웹 리서치 토픽?): **ALL** 선택

### Step 6: 인터뷰 — 합성 트랜스크립트 자동 생성

**이것이 Zeus의 핵심 차별점.**

AskUserQuestion 대신 합성 인터뷰를 자동 생성:

1. Phase 0 파싱 결과 + 산업별 프리셋 조합
2. A~G 카테고리 질문-답변 쌍을 템플릿으로 생성
3. 모든 답변에 `[ZEUS-AUTO]` 태그
4. `claude-interview.md`에 저장

**산업별 프리셋**: [references/autopilot-defaults.md](references/autopilot-defaults.md)
**생성 로직**: [references/auto-interview-generator.md](references/auto-interview-generator.md)

### Step 7~11: 분석 & 스펙 작성

- Step 7 (도메인 전문가 분석): **그대로 실행** (Claude가 WebSearch로 수행)
- Step 8 (스펙 작성): **그대로 실행**
- Step 9 (팀 리뷰): **건너뜀** (컨텍스트 절약, zeus-log.md에 "[ZEUS-AUTO] Step 9 건너뜀" 기록)
- Step 10~11: **그대로 실행**

### Step 12~13: 피드백 & 승인

- Step 12 (외부 피드백 통합?): **전부 수용**
- Step 13 (계획 리뷰 완료?): **즉시 승인**

### Step 14~24: 산출물 생성

- Step 14 (DB 스키마): **그대로 실행** (hasDB=true일 때)
- Step 15 (API 스펙): **그대로 실행** (hasAPI=true일 때)
- Step 16~20: **그대로 실행** (섹션 분리, 디자인 시스템 등)
- Step 21 (스킬 탐색): **건너뜀** (외부 스킬 설치 불필요)
- Step 22 (스킬 설치?): **건너뜀**
- Step 23 (검증): **그대로 실행**
- Step 24 (검증 결과?): **즉시 승인**

### Phase 1 완료 조건

- `claude-plan.md` 존재
- `sections/` 디렉토리에 1개 이상 섹션 파일 존재

---

## AskUserQuestion 자동 응답 테이블 (전체)

| 스킬 | 단계 | 질문 | 자동 응답 |
|------|------|------|----------|
| zephermine | Step 4.2 | 코드베이스 리서치? | 코드 있으면 YES, 없으면 NO |
| zephermine | Step 4.3 | GitHub 유사 프로젝트? | YES |
| zephermine | Step 4.4 | 웹 리서치 토픽? | ALL 선택 |
| zephermine | Step 6 | 인터뷰 (A~G) | **합성 트랜스크립트 생성** |
| zephermine | Step 9 | 팀 리뷰? | **건너뜀** |
| zephermine | Step 12 | 외부 피드백? | 전부 수용 |
| zephermine | Step 13 | 계획 리뷰? | 즉시 승인 |
| zephermine | Step 21 | 외부 스킬? | 건너뜀 |
| zephermine | Step 22 | 스킬 설치? | 건너뜀 |
| zephermine | Step 24 | 검증 결과? | 즉시 승인 |
| workpm | 시작 | AI provider 선택? | 자동 감지 |
| qpassenger | 시작 | 테스트 범위? | 전체 시나리오 |

---

## Phase 2: Implementation (workpm — Orchestrator PM-Worker)

zephermine이 생성한 plan을 workpm(Orchestrator)으로 구현.

### 연결 흐름

```
Phase 1 완료
    │  claude-plan.md + sections/ 생성됨
    ▼
1. claude-plan.md → .claude/plans/zeus-{projectName}.md 로 복사
    │  (orchestrator_get_latest_plan이 자동 감지)
    ▼
2. orchestrator_detect_providers 호출
    │  설치된 AI CLI 확인 (claude, codex, gemini)
    ▼
3. orchestrator_analyze_codebase 호출
    │  프로젝트 구조 분석
    ▼
4. sections/ 기반으로 orchestrator_create_task 반복 호출
    │  각 섹션 = 1 task, depends_on으로 의존성 설정
    │  scope: 섹션의 "Files to Create/Modify" 목록
    │  ai_provider: 파일 패턴으로 자동 매칭
    ▼
5. orchestrator_spawn_workers({ count: 2~3 }) 호출
    │  Workers가 자동으로 task claim → 구현 → complete
    ▼
6. orchestrator_get_progress 폴링 (30초 간격, 최대 30분)
    │  전체 완료 시 Phase 3으로 전환
    ▼
7. 실패 task 있으면 1회 재생성 후 재시도
```

### AI Provider 자동 매칭

| 파일 패턴 | 추천 AI | 이유 |
|-----------|---------|------|
| *.tsx, *.jsx, components/** | claude | UI 컴포넌트 생성 강점 |
| *.java, *.kt, api/** | codex (있으면) | 코드 생성 빠름 |
| *.sql, migrations/** | claude | 스키마 정확도 |
| *.md, docs/** | claude | 문서 품질 |
| 기본값 | claude | 범용 |

### Task 설계 원칙

Workers는 PM과 대화할 수 없으므로 task 프롬프트가 완전해야 함:
- 목표 (한 문장)
- 구현 항목 목록
- 입출력 사양
- 성공 기준
- 범위 밖 항목

---

## Phase 3: Testing (qpassenger)

구현 완료 후 자동 E2E 테스트.

### 절차

1. `claude-qa-scenarios.md` 존재 확인 (Phase 1에서 생성됨)
2. package.json scripts에서 서버 시작 스크립트 감지
   - `dev`, `start`, `serve` 등 탐색
3. 서버 시작 시도 (최대 60초 대기)
4. Playwright 미설치 시 `npx playwright install` 자동 실행
5. qpassenger 워크플로우 실행:
   - 시나리오 → Playwright 코드 생성
   - 실행 → 실패 시 Healer 루프 (최대 5회)
6. 결과 집계

### 건너뜀 조건

- 서버 시작 불가 → Phase 3 건너뜀 (리포트에 기록)
- QA 시나리오 미존재 → Phase 3 건너뜀
- Playwright 설치 실패 → Phase 3 건너뜀

---

## Phase 4: Final Report (zeus-report.md)

### 리포트 형식

```markdown
# Zeus Report
- 입력: "{원본 설명}"
- 총 소요: {duration}
- 결과: SUCCESS / PARTIAL / FAILED

## Phase 0: Description Parsing — ✅
- 산업군: {industry}
- 기술스택: {techStack}
- 기능: {features.length}개

## Phase 1: Planning — ✅ / ❌
- 섹션: N개, 에러: N건

## Phase 2: Implementation (workpm) — ✅ / ❌
- Tasks: N개, 성공: N, 실패: N
- Workers: {provider별 수}
- 생성 파일: N개

## Phase 3: Testing — ✅ / ⚠️ 건너뜀
- 통과: N, 실패: N, 통과율: N%

## Errors & Skipped
| Phase | Step | Error | Recovery |
|-------|------|-------|----------|
| ... | ... | ... | ... |

## Next Steps
- [ ] zeus-report.md 검토
- [ ] 자동 생성 코드 리뷰
- [ ] git commit && push
- [ ] /docker-deploy (배포 시)
```

### 결과 판정

| 조건 | 결과 |
|------|------|
| Phase 1~3 모두 성공 | SUCCESS |
| Phase 2 또는 3 일부 실패 | PARTIAL |
| Phase 1 실패 (plan 미생성) | FAILED |

---

## Error Handling Policy

**절대 멈추지 않는다 — 기록하고 계속한다.**

| 등급 | 예시 | 대응 |
|------|------|------|
| FATAL | 디스크 쓰기 불가 | 즉시 중단 + 메시지 |
| PHASE_SKIP | plan 미생성, 서버 시작 불가 | 해당 phase 건너뜀 + 로그 |
| STEP_SKIP | 개별 task 실패, 테스트 실패 | 해당 step 건너뜀 + 로그 |
| RECOVERABLE | 네트워크 타임아웃 | 1회 재시도 후 skip |

모든 에러는 `zeus-log.md`에 타임스탬프와 함께 기록.

---

## Resume Support (재개)

`/zeus` 재실행 시:

1. `zeus-state.json` 존재 확인
2. 존재하면: 현재 phase 확인 → 해당 phase부터 재개
3. 존재하지 않으면: 새로 시작

**상세 전환 규칙**: [references/phase-transitions.md](references/phase-transitions.md)

---

## Quick Start

```
# 기본 사용
/zeus "할일 관리 앱 만들어줘. React+Express"

# 기술스택 상세 지정
/zeus "병원 예약 시스템. Next.js+FastAPI+PostgreSQL"

# 간단한 요청
/zeus "블로그 만들어줘"
```

---

## Related Files

| 파일 | 역할 |
|------|------|
| `skills/zeus/SKILL.md` | 메인 오케스트레이션 (이 파일) |
| `skills/zeus/commands/zeus.md` | /zeus 슬래시 명령어 |
| `skills/zeus/references/description-parser.md` | 설명문 파싱 규칙 |
| `skills/zeus/references/autopilot-defaults.md` | 산업별 기본값 프리셋 |
| `skills/zeus/references/auto-interview-generator.md` | 합성 인터뷰 생성 |
| `skills/zeus/references/phase-transitions.md` | 상태 전환/재개 규칙 |
| `skills/zephermine/SKILL.md` | Phase 1에서 호출 (설계) |
| `skills/orchestrator/` | Phase 2에서 호출 (구현) |
| `skills/qpassenger/SKILL.md` | Phase 3에서 호출 (테스트) |
| `hooks/orchestrator-detector.js` | zeus 키워드 감지 훅 |

---

## Output Artifacts

| 파일 | 생성 시점 | 설명 |
|------|-----------|------|
| `zeus-state.json` | Phase 0 | 상태 파일 (재개용) |
| `zeus-log.md` | Phase 0~ | 실행 로그 |
| `claude-interview.md` | Phase 1 | 합성 인터뷰 |
| `claude-plan.md` | Phase 1 | 구현 계획 |
| `sections/` | Phase 1 | 섹션별 상세 스펙 |
| `claude-qa-scenarios.md` | Phase 1 | QA 시나리오 |
| `zeus-report.md` | Phase 4 | 최종 보고서 |
