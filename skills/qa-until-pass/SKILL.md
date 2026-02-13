---
name: qa-until-pass
description: QA 시나리오 기반 Playwright 테스트 자동 생성 + fix-until-pass 루프. qa-writer → 코드 생성 → 실행 → 수정 반복.
triggers:
  - "qa-until-pass"
  - "QA 통과할 때까지"
  - "테스트 통과까지"
  - "playwright test until pass"
auto_apply: false
---

# QA Until Pass

QA 시나리오를 Playwright 테스트 코드로 변환하고, 모든 테스트가 통과할 때까지 자동으로 수정을 반복합니다.

## Quick Start

```
/qa-until-pass                           # 자동 감지 (qa-scenarios.md 또는 docs/qa/)
/qa-until-pass @claude-qa-scenarios.md   # 특정 QA 문서 지정
/qa-until-pass --api-only                # API 테스트만
/qa-until-pass --ui-only                 # UI 테스트만
```

## 워크플로우 (5단계)

```
Step 1: 시나리오 수집
  ↓
Step 2: Playwright 코드 생성
  ↓
Step 3: 테스트 실행
  ↓
Step 4: Healer Loop (실패 → 수정 → 재실행, max 5회)
  ↓
Step 5: 결과 보고
```

---

## Step 1: 시나리오 수집

QA 시나리오를 수집합니다. 우선순위 순으로 탐색:

1. `$ARGUMENTS`로 전달된 QA 문서 경로
2. `claude-qa-scenarios.md` (zephermine 산출물)
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

### 시나리오 없을 때 현장 생성

프로젝트를 분석하여 기본 시나리오를 생성합니다:

```
1. 프로젝트 구조 분석 (Glob으로 라우트/API 탐색)
2. CRUD 엔드포인트 식별
3. 기능별 정상/에러/엣지 케이스 TC 작성
4. claude-qa-scenarios.md로 저장
```

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

### 파일 생성 규칙

```
tests/
├── e2e/
│   ├── auth.spec.ts        # 기능 단위로 파일 분리
│   ├── crud-users.spec.ts
│   └── crud-posts.spec.ts
└── api/
    ├── auth-api.spec.ts    # API 테스트
    └── users-api.spec.ts
```

### 코드 생성 원칙

- 각 기능별 `describe` 블록
- 정상/에러/엣지 케이스별 `test` 블록
- `test.describe`에 TC-ID 주석 포함
- Role-based selector 우선 (`getByRole`, `getByLabel`, `getByText`)
- 하드코딩 URL 금지 → `baseURL` 사용
- 테스트 간 독립성 보장 (`beforeEach`로 상태 초기화)

---

## Step 3: 테스트 실행

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

테스트 실행 전 **머신 상태를 감지하여 사용자에게 보여주고** workers 수를 확인합니다.

**CPU 코어 감지 (Bash):**
- **Windows**: `powershell -Command "(Get-CimInstance Win32_Processor).NumberOfLogicalProcessors"`
- **Linux**: `nproc`
- **Mac**: `sysctl -n hw.logicalcpu`

감지 결과를 기반으로 표시:

```
🖥️ 머신 상태:
  CPU: {감지된 코어}코어 (논리 프로세서)
  Workers (50%): {코어/2}개 동시 실행
  예상 RAM: ~{코어/2 * 200}MB (Worker당 ~200MB)

  Workers 수를 조정하시겠습니까?
  [50% 유지 (Recommended)] [25%로 줄이기] [직접 입력]
```

추가 사전 조건:

```
1. 앱 서버 실행 중인지 확인 (baseURL 접근 가능)
2. DB 시드 데이터 필요 여부
3. 환경 변수 (.env.test) 설정
4. Playwright 브라우저 설치 여부
```

서버가 실행 중이지 않으면 사용자에게 알립니다:

```
⚠️ 앱 서버가 실행되지 않았습니다.
다른 터미널에서 서버를 실행해주세요:
  npm run dev (또는 프로젝트에 맞는 명령어)

서버가 준비되면 Enter를 눌러주세요.
```

---

## Step 4: Healer Loop

테스트 실패 시 자동으로 원인을 분석하고 수정을 반복합니다.

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
| 인프라 문제 | 사용자 안내 | DB 연결, 포트 충돌 |

### 수정 원칙

- **테스트 코드 수정 우선**: 구현이 정확하면 테스트를 맞춤
- **구현 코드 수정은 신중하게**: 명백한 버그만 수정
- **수정 범위 최소화**: 실패한 부분만 정확히 수정
- **인프라 문제는 수정하지 않음**: 사용자에게 보고

---

## Step 5: 결과 보고

### 결과 보고서 생성

```markdown
# QA Until Pass 결과

## 요약
- 총 시나리오: N개
- 즉시 통과: N개
- Healer 수정 후 통과: N개
- 미통과 (fixme): N개
- 통과율: N%
- 총 Healer 반복: N회

## 수정 이력
| 회차 | 실패 테스트 | 원인 | 수정 대상 | 수정 내용 |
|------|------------|------|----------|-----------|
| 1 | TC-003 | 셀렉터 변경 | 테스트 | button[name] → role selector |
| 2 | TC-007 | API 409 미처리 | 구현 | 중복 체크 로직 추가 |

## 미통과 항목 (수동 확인 필요)
| TC-ID | 에러 | 추정 원인 | 권장 조치 |
|-------|------|----------|-----------|
| TC-012 | timeout | 외부 API 의존 | mock 서버 도입 검토 |
```

### 판정 기준 (qa-engineer 기준 적용)

| Grade | 조건 | 판정 |
|-------|------|------|
| **PASS** | 전체 통과 | 배포 가능 |
| **CONDITIONAL** | P0/P1 통과, P2/P3 일부 fixme | 조건부 진행 |
| **FAIL** | P0 또는 P1 실패 존재 | 수정 필수 |

### QA 문서 업데이트

원본 시나리오 문서에 결과를 반영합니다:

```markdown
| TC-ID | 시나리오 | 결과 | 비고 |
|-------|---------|------|------|
| TC-001 | 로그인 성공 | ✅ | |
| TC-002 | 로그인 실패 | ✅ | Healer 1회 수정 |
| TC-003 | 비밀번호 찾기 | ⚠️ fixme | 외부 메일 서버 필요 |
```

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
| `--fix-code` | 구현 코드 수정도 허용 | true |
| `--fix-test-only` | 테스트 코드만 수정 (구현 코드 수정 금지) | false |

---

## 연관 에이전트/스킬

| 리소스 | 역할 | 연결 |
|--------|------|------|
| qa-writer (에이전트) | 테스트 시나리오 작성 | Step 1 입력 |
| qa-engineer (에이전트) | 품질 판정 기준 | Step 5 판정 |
| qa-test-planner (스킬) | 테스트 계획 수립 | 선행 스킬 |
| zephermine (스킬) | claude-qa-scenarios.md 생성 | Step 1 입력 |

---

## 주의사항

- Playwright가 설치되어 있어야 합니다 (`npx playwright install`)
- 앱 서버가 실행 중이어야 UI 테스트가 가능합니다
- API 테스트는 서버 URL이 필요합니다 (baseURL 설정)
- Healer는 구현 코드를 수정할 수 있으므로, 커밋되지 않은 변경사항이 있으면 주의하세요
- 외부 의존성(메일, 결제 등)이 필요한 테스트는 mock으로 대체를 권장합니다

---

## 다음 단계 안내

QA가 완료되면 사용자에게 다음 단계를 안내합니다:

```
✅ QA Until Pass 완료! (결과: {PASS/CONDITIONAL/FAIL})

👉 다음 단계 (선택):
  /docker-deploy       → Docker 배포 환경 생성
  /review              → 코드 리뷰 (아직 안 했다면)
  /write-api-docs      → API 문서 생성
  /commit              → 변경사항 커밋
  /wrap-up             → 세션 요약 + MEMORY.md 업데이트

📎 참고: docs/workflow-guide.md
```
