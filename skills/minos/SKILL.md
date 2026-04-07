---
name: minos
description: QA 시나리오 기반 Playwright 테스트 자동 생성 + fix-until-pass 루프 (미노스). qa-writer → 코드 생성 → 실행 → 수정 반복. /minos로 실행.
triggers:
  - "minos"
  - "미노스"
  - "qpassenger"
  - "큐패신저"
  - "qa-until-pass"
  - "QA 통과할 때까지"
  - "테스트 통과까지"
  - "playwright test until pass"
auto_apply: false
---

# Minos (미노스)

> **미노스(Minos)**: 그리스 신화의 저승 심판자. 죽은 자의 영혼을 심판해 합격/불합격을 가립니다.
> 코드를 심판대에 세워 모든 테스트가 통과할 때까지 fix 루프를 반복하는 이 스킬의 본성과 일치합니다.

QA 시나리오를 Playwright 테스트 코드로 변환하고, 모든 테스트가 통과할 때까지 자동으로 수정을 반복합니다.

## Quick Start

```
/minos                           # 자동 감지 (qa-scenarios.md 또는 docs/qa/)
/minos @qa-scenarios.md          # 특정 QA 문서 지정
/minos --api-only                # API 테스트만
/minos --ui-only                 # UI 테스트만
```

**공식 호출명:** `/minos` (별칭: `미노스`, 레거시: `/qpassenger`, `큐패신저`)

## 워크플로우 (7단계)

```
Step 1: 시나리오 수집
  ↓
Step 2: Playwright 코드 생성
  ↓
Step 3: 서버 준비 (자동 감지 + 실행)
  ↓
Step 4: 테스트 실행
  ↓
Step 5: 브라우저 탐색 QA (Playwright MCP로 실제 브라우저 검증)
  ↓
Step 6: Healer Loop (실패 → 수정 → 재실행, max 5회)
  ↓
Step 7: 결과 보고 + 서버 정리
```

---

## Step 1: 시나리오 수집

QA 시나리오를 수집합니다. 우선순위 순으로 탐색:

1. `$ARGUMENTS`로 전달된 QA 문서 경로
2. `qa-scenarios.md` (zephermine 산출물)
3. `docs/qa/*.md` (qa-writer 산출물)
4. 위 모두 없으면 → qa-writer 패턴으로 현장 생성

### 시나리오 파싱 규칙

QA 문서에서 테스트 케이스 테이블을 추출합니다:

```markdown
<!-- 이 형식을 인식 -->
| TC-ID | 시나리오 | 입력 | 기대 결과 | 우선순위 |
|-------|---------|------|----------|---------|
| TC-001 | 로그인 성공 | valid@email.com / Pass123! | 대시보드 이동 | P0 |
| TC-002 | 로그인 실패 | invalid@email.com / wrong | 에러 메시지 | P0 |
```

### 보충 시나리오 소스

`qa-scenarios.md`의 테스트 케이스가 부족하면 추가 소스를 참조합니다:

1. `operation-scenarios.md` (운영 시나리오) — qa-scenarios의 근거 문서. 메뉴별/업무별 흐름에서 누락된 테스트 케이스를 보충
2. `api-spec.md` — API 엔드포인트 중 qa-scenarios에 없는 것을 추가

### 시나리오 없을 때 현장 생성

qa-scenarios.md가 전혀 없으면 `qa-test-planner` 스킬을 활용하여 시나리오를 생성합니다:

1. `operation-scenarios.md` 존재 시 → 업무 흐름 기반 TC 작성 (우선), 없으면 Glob으로 라우트/API 탐색
2. qa-test-planner 템플릿으로 CRUD별 정상/에러/엣지 케이스 작성 (우선순위, 전제조건, 테스트 데이터 포함)
3. `qa-scenarios.md`로 저장

---

## Step 2: Playwright 코드 생성

시나리오 → Playwright TypeScript 테스트 코드로 변환합니다.

> 상세 변환 규칙: [references/playwright-codegen.md](references/playwright-codegen.md)

### 프로젝트 감지

```
# 테스트 프레임워크 자동 감지
playwright.config.ts 존재 → Playwright 설정 재사용
package.json "playwright" → 버전 확인
없으면 → npx playwright install 안내
```

파일 구조: `tests/e2e/{feature}.spec.ts` + `tests/api/{feature}-api.spec.ts` (기능 단위 분리)

### 코드 생성 원칙

- 각 기능별 `describe` 블록, TC-ID 주석 포함
- Role-based selector 우선, 하드코딩 URL 금지, `beforeEach`로 상태 초기화

---

## Step 3: 서버 준비 (자동 감지 + 실행)

테스트 전에 앱 서버를 자동으로 준비합니다. 사용자 개입 없이 진행합니다.

감지 순서: docker-compose.yml → Dev Server → Django → 사용자 안내

환경별 서버 실행, 포트 정리, 헬스체크 상세: See [server-setup.md](references/server-setup.md)

---

## Step 4: 테스트 실행

### Worker 수 제한 (CPU 보호)

**기본값: CPU 논리코어의 50%** (`--workers=50%`)
사용자가 `--workers` 옵션으로 오버라이드 가능합니다.

```bash
# 기본 실행 (CPU 50% 제한)
npx playwright test --reporter=list --workers=50%

# 사용자가 --workers 지정 시 해당 값 사용
npx playwright test --reporter=list --workers=3      # 고정 3개
npx playwright test --reporter=list --workers=25%    # CPU 25%
npx playwright test --reporter=list --workers=1      # 직렬 (디버깅)

# headed 모드 (디버깅 필요 시)
npx playwright test --headed --workers=50%

# 특정 파일만
npx playwright test tests/e2e/auth.spec.ts --workers=50%
```

### 사전 조건 확인

테스트 실행 전 머신 상태(CPU 코어, workers 수, 예상 RAM)를 감지하여 사용자에게 보여줍니다.

CPU 감지 명령어 및 출력 형식: See [server-setup.md](references/server-setup.md)

추가 사전 조건: 서버 실행(Step 3 완료), DB 시드, `.env.test`, Playwright 브라우저 설치

---

## Step 5: 브라우저 탐색 QA

자동화 테스트(Step 4) 이후, Playwright MCP로 실제 브라우저를 열어 탐색적 QA를 수행합니다.
자동화 테스트가 잡지 못하는 콘솔 에러, 네트워크 실패, 레이아웃 깨짐을 발견합니다.

> 상세 프로토콜: [references/browser-explorer.md](references/browser-explorer.md)

### 실행 조건

- Playwright MCP가 설치되어 있을 때 기본 실행
- `--no-explore` 옵션으로 스킵 가능
- `--explore-only` 옵션으로 Step 2~4를 건너뛰고 이 단계만 실행 가능

### 체크 항목

| 체크 | Playwright MCP 도구 | 감지 대상 |
|------|---------------------|----------|
| 콘솔 에러 | `browser_console_messages` | JS 에러, React warnings, unhandled rejection |
| 네트워크 실패 | `browser_network_requests` | 4xx/5xx 응답, CORS, timeout |
| 구조 검증 | `browser_snapshot` | 빈 페이지, 접근성 누락, 깨진 구조 |
| 시각적 확인 | `browser_take_screenshot` | 레이아웃 깨짐, overflow, 빈 화면 |
| 인터랙션 | `browser_click`, `browser_fill_form` | 버튼 미반응, 폼 제출 실패 |

### 순회 흐름

```
FOREACH page IN 라우트_목록:
  1. browser_navigate(url)           # 페이지 이동
  2. browser_wait_for(time: 3)       # 렌더링 대기
  3. browser_console_messages()      # 콘솔 에러 수집
  4. browser_network_requests()      # 실패 요청 수집
  5. browser_snapshot()              # 접근성/구조 확인
  6. browser_take_screenshot()       # 시각적 캡처
  7. 주요 인터랙션 시도 (AI 판단)
  8. 이슈 기록
```

### 발견 이슈 처리

- **P0/P1 코드 수정 가능** (JS 에러, API 실패) → Healer Loop(Step 6)에 전달
- **수동 확인 필요** (레이아웃, UX) → 결과 보고서(Step 7)에만 기록

---

## Step 6: Healer Loop

테스트 실패(Step 4) + 브라우저 탐색 QA 발견 이슈(Step 5)를 자동으로 분석하고 수정을 반복합니다.

> 상세 프로토콜: [references/healer-loop.md](references/healer-loop.md)

### 루프 구조

```
max_retries = 5
retry = 0

WHILE (실패한 테스트 존재) AND (retry < max_retries):
  1. 실패 로그 분석 (에러 메시지, 스택 트레이스)
  2. 원인 분류 → 수정 대상 결정
  3. 수정 적용 (Edit 도구)
  4. 재실행 (실패한 테스트만)
  5. retry++

IF retry >= max_retries:
  남은 실패 → test.fixme() 표시 + 사용자 보고
```

### 원인 분류 체계

| 원인 | 수정 대상 | 예시 |
|------|----------|------|
| 셀렉터 변경 | 테스트 코드 | `button[name]` → `getByRole('button')` |
| API 응답 불일치 | 구현 코드 | 404 → 엔드포인트 경로 오류 |
| 타이밍 이슈 | 테스트 코드 | `waitForResponse`, `waitForSelector` 추가 |
| 비즈니스 로직 버그 | 구현 코드 | 유효성 검증 누락 |
| 테스트 데이터 문제 | 테스트 코드 | fixture/seed 데이터 수정 |
| 콘솔 JS 에러 | 구현 코드 | `TypeError`, `Unhandled Rejection` (Step 5 발견) |
| 404 리소스 | 구현 코드 | 이미지/폰트/API 경로 오류 (Step 5 발견) |
| 인프라 문제 | 사용자 안내 | DB 연결, 포트 충돌 |

### 수정 원칙

- **테스트 코드 수정 우선**: 구현이 정확하면 테스트를 맞춤
- **구현 코드 수정은 신중하게**: 명백한 버그만 수정
- **수정 범위 최소화**: 실패한 부분만 정확히 수정
- **인프라 문제는 수정하지 않음**: 사용자에게 보고

---

## Step 7: 결과 보고 + 서버 정리

### 결과 보고서 생성

요약·수정 이력·미통과 항목·브라우저 탐색 발견 이슈 4섹션으로 구성합니다.
보고서 마크다운 템플릿 및 QA 문서 업데이트 형식: See [result-report.md](references/result-report.md)

### 판정 기준 (qa-engineer 기준 적용)

| Grade | 조건 | 판정 |
|-------|------|------|
| **PASS** | 자동 테스트 + 탐색 QA 전체 통과 | 배포 가능 |
| **CONDITIONAL** | P0/P1 통과, P2/P3 일부 fixme 또는 탐색 QA 경고만 | 조건부 진행 |
| **FAIL** | P0 또는 P1 실패 존재 (자동 테스트 또는 탐색 QA) | 수정 필수 |

### QA 문서 업데이트

원본 시나리오 문서에 `✅ / ⚠️ fixme` 결과를 반영합니다.

---

## 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--workers N` | Playwright worker 수 (숫자 또는 퍼센트) | 50% |
| `--api-only` | API 테스트만 생성/실행 | false |
| `--ui-only` | UI E2E 테스트만 생성/실행 | false |
| `--max-retries N` | Healer 최대 반복 횟수 | 5 |
| `--headed` | 브라우저 화면 표시 | false |
| `--skip-generate` | 기존 테스트 코드 사용 (Step 2 건너뜀) | false |
| `--no-explore` | 브라우저 탐색 QA 스킵 (Step 5 건너뜀) | false |
| `--explore-only` | 브라우저 탐색 QA만 실행 (Step 2~4 건너뜀) | false |
| `--fix-code` | 구현 코드 수정도 허용 | true |
| `--fix-test-only` | 테스트 코드만 수정 (구현 코드 수정 금지) | false |

---

## 연관 에이전트/스킬

| 리소스 | 역할 | 연결 |
|--------|------|------|
| qa-writer (에이전트) | 테스트 시나리오 작성 | Step 1 입력 |
| qa-engineer (에이전트) | 품질 판정 기준 | Step 7 판정 |
| qa-test-planner (스킬) | 테스트 계획 수립 | 선행 스킬 |
| zephermine (스킬) | qa-scenarios.md + operation-scenarios.md 생성 | Step 1 입력 |

---

### 서버 정리

테스트 완료 후 Step 3에서 실행한 서버를 정리합니다.

서버 정리 명령어 상세: See [server-setup.md](references/server-setup.md)

---

## 주의사항

- Playwright 미설치 시 `npx playwright install` 필요
- 브라우저 탐색 QA(Step 5)는 Playwright MCP가 설치되어 있어야 실행 가능
- Healer가 구현 코드를 수정하므로, 커밋되지 않은 변경사항이 있으면 주의
- 외부 의존성(메일, 결제 등) 테스트는 mock 대체 권장

---

## 다음 단계 안내

QA가 완료되면 사용자에게 다음 단계를 안내합니다:

```
✅ Minos 완료! (결과: {PASS/CONDITIONAL/FAIL})

👉 다음 단계 (선택):
  /docker-deploy       → Docker 배포 환경 생성
  /review              → 코드 리뷰 (아직 안 했다면)
  /write-api-docs      → API 문서 생성
  /commit              → 변경사항 커밋
  /wrap-up             → 세션 요약 + MEMORY.md 업데이트

📎 참고: docs/workflow-guide.md
```
