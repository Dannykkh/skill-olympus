---
name: qpassenger
description: QA 시나리오 기반 Playwright 테스트 자동 생성 + fix-until-pass 루프 (큐패신저). qa-writer → 코드 생성 → 실행 → 수정 반복. /qpassenger로 실행.
triggers:
  - "qpassenger"
  - "큐패신저"
  - "qa-until-pass"
  - "QA 통과할 때까지"
  - "테스트 통과까지"
  - "playwright test until pass"
auto_apply: false
---

# QPassenger (큐패신저)

QA 시나리오를 Playwright 테스트 코드로 변환하고, 모든 테스트가 통과할 때까지 자동으로 수정을 반복합니다.

## Quick Start

```
/qpassenger                           # 자동 감지 (qa-scenarios.md 또는 docs/qa/)
/qpassenger @qa-scenarios.md   # 특정 QA 문서 지정
/qpassenger --api-only                # API 테스트만
/qpassenger --ui-only                 # UI 테스트만
```

**공식 호출명:** `/qpassenger` (별칭: `큐패신저`)

## 워크플로우 (6단계)

```
Step 1: 시나리오 수집
  ↓
Step 2: Playwright 코드 생성
  ↓
Step 3: 서버 준비 (자동 감지 + 실행)
  ↓
Step 4: 테스트 실행
  ↓
Step 5: Healer Loop (실패 → 수정 → 재실행, max 5회)
  ↓
Step 6: 결과 보고 + 서버 정리
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

qa-scenarios.md가 전혀 없으면 프로젝트를 분석하여 기본 시나리오를 생성합니다:

```
1. operation-scenarios.md 존재 시 → 업무 시나리오 기반으로 TC 작성 (우선)
2. 없으면 → 프로젝트 구조 분석 (Glob으로 라우트/API 탐색)
3. CRUD 엔드포인트 식별
4. 기능별 정상/에러/엣지 케이스 TC 작성
5. qa-scenarios.md로 저장
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

## Step 3: 서버 준비 (자동 감지 + 실행)

테스트 전에 앱 서버를 자동으로 준비합니다. 사용자 개입 없이 진행합니다.

### 3-1. 서버 환경 감지

```
판단 순서:
1. docker-compose.yml (또는 docker-compose.yaml, compose.yml) 존재?
   → Docker 모드 (DB, 백엔드, 프론트 통합 실행)
2. package.json의 "dev" 또는 "start" 스크립트 존재?
   → Dev Server 모드
3. manage.py 존재? (Django)
   → python manage.py runserver
4. 전부 없음 → 사용자에게 안내
```

### 3-2. 포트 정리

**타겟 포트를 확인하고, 점유 중이면 해당 프로세스를 종료합니다.**
새 포트로 열리면 baseURL이 꼬이므로 반드시 지정 포트로 실행해야 합니다.

```
타겟 포트 결정:
1. playwright.config.ts의 baseURL에서 포트 추출
2. .env 또는 .env.test의 PORT 값
3. docker-compose.yml의 ports 매핑
4. 기본값: 3000 (프론트), 8080 (백엔드)
```

**포트 점유 프로세스 종료 (Bash):**
- **Windows**: `powershell -Command "Get-NetTCPConnection -LocalPort {PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`
- **Linux/Mac**: `lsof -ti:{PORT} | xargs kill -9 2>/dev/null`

### 3-3. 서버 실행

#### Docker 모드 (우선)

```bash
# 기존 컨테이너 정리 + 빌드 + 실행
docker compose down --remove-orphans 2>/dev/null
docker compose up -d --build

# 헬스체크 대기 (최대 120초)
# docker-compose.yml에 healthcheck가 있으면 그것을 사용
# 없으면 baseURL에 HTTP 요청으로 확인
```

장점:
- DB (PostgreSQL, MySQL 등)가 함께 올라옴
- Redis, 큐 등 인프라 의존성 해결
- 프로덕션과 동일한 환경에서 테스트

#### Dev Server 모드 (fallback)

```bash
# 백그라운드로 dev 서버 실행
npm run dev &    # 또는 yarn dev, pnpm dev
DEV_SERVER_PID=$!

# 헬스체크 대기 (최대 60초, 2초 간격)
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}" http://localhost:{PORT} | grep -q "200\|301\|302" && break
  sleep 2
done
```

### 3-4. 헬스체크

```
baseURL에 HTTP GET 요청:
├── 200/301/302 → ✅ 서버 준비 완료
├── 타임아웃 (120초 초과) → ❌ 실패 보고 후 테스트 중단
└── 연결 거부 → 재시도 (2초 간격)
```

헬스체크 통과 시 표시:
```
🚀 서버 준비 완료
  모드: {Docker / Dev Server}
  URL: http://localhost:{PORT}
  DB: {PostgreSQL 15 / MySQL 8 / 없음}
```

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

테스트 실행 전 **머신 상태를 감지하여 사용자에게 보여줍니다**.

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
```

추가 사전 조건:

```
1. 서버 실행 확인 (Step 3에서 완료)
2. DB 시드 데이터 필요 여부
3. 환경 변수 (.env.test) 설정
4. Playwright 브라우저 설치 여부
```

---

## Step 5: Healer Loop

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

## Step 6: 결과 보고 + 서버 정리

### 결과 보고서 생성

```markdown
# QPassenger 결과

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
| qa-engineer (에이전트) | 품질 판정 기준 | Step 6 판정 |
| qa-test-planner (스킬) | 테스트 계획 수립 | 선행 스킬 |
| zephermine (스킬) | qa-scenarios.md + operation-scenarios.md 생성 | Step 1 입력 |

---

### 서버 정리

테스트 완료 후 Step 3에서 실행한 서버를 정리합니다:

```
Docker 모드:
  → docker compose down (컨테이너 중지 + 제거)
  → 볼륨은 유지 (다음 테스트에서 재사용)

Dev Server 모드:
  → $DEV_SERVER_PID 프로세스 종료
  → kill $DEV_SERVER_PID 2>/dev/null
```

---

## 주의사항

- Playwright가 설치되어 있어야 합니다 (`npx playwright install`)
- Step 3에서 서버를 자동 실행합니다 (수동 실행 불필요)
- 포트 충돌 시 기존 프로세스를 종료하고 해당 포트로 실행합니다
- Healer는 구현 코드를 수정할 수 있으므로, 커밋되지 않은 변경사항이 있으면 주의하세요
- 외부 의존성(메일, 결제 등)이 필요한 테스트는 mock으로 대체를 권장합니다

---

## 다음 단계 안내

QA가 완료되면 사용자에게 다음 단계를 안내합니다:

```
✅ QPassenger 완료! (결과: {PASS/CONDITIONAL/FAIL})

👉 다음 단계 (선택):
  /docker-deploy       → Docker 배포 환경 생성
  /review              → 코드 리뷰 (아직 안 했다면)
  /write-api-docs      → API 문서 생성
  /commit              → 변경사항 커밋
  /wrap-up             → 세션 요약 + MEMORY.md 업데이트

📎 참고: docs/workflow-guide.md
```
