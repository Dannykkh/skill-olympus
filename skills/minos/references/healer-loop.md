# Healer Loop 프로토콜

테스트 실패 시 자동으로 원인을 분석하고 수정하는 반복 루프입니다.

## 루프 흐름

```
┌──────────────────────────────────────────────────────┐
│ npx playwright test --reporter=list --workers=50%    │
└──────────────┬───────────────────────────────────────┘
               │
         ┌─────▼─────┐
         │ 전체 통과? │──── Yes ──→ ✅ PASS → Step 5 보고
         └─────┬─────┘
               │ No
         ┌─────▼─────┐
         │ retry < 5? │──── No ──→ ⚠️ fixme 처리 → Step 5 보고
         └─────┬─────┘
               │ Yes
    ┌──────────▼──────────┐
    │ 1. 실패 로그 분석    │
    │ 2. 원인 분류         │
    │ 3. 수정 적용         │
    │ 4. 실패 테스트만 재실행│
    │ 5. retry++           │
    └──────────┬──────────┘
               │
         ┌─────▼─────┐
         │ 전체 통과? │──── Yes ──→ ✅ PASS
         └─────┬─────┘
               │ No
               └──→ 루프 반복
```

## Phase 1: 실패 로그 분석

실패한 테스트의 에러 메시지와 스택 트레이스를 분석합니다.

### 실패 정보 수집

```bash
# 실패한 테스트만 재실행 (상세 로그)
npx playwright test --grep "실패한테스트명" --reporter=line

# 또는 전체 실행 후 실패 목록 확인
npx playwright test --reporter=json > test-results.json
```

### 분석 포인트

```
1. 에러 메시지 (Error message)
   - "locator.click: Error: strict mode violation"
   - "expect(received).toBe(expected)"
   - "page.goto: net::ERR_CONNECTION_REFUSED"

2. 스택 트레이스 (Stack trace)
   - 어떤 파일의 몇 번째 줄인지
   - 어떤 액션에서 실패했는지

3. 스크린샷/트레이스 (있다면)
   - test-results/ 폴더에서 실패 스크린샷 확인
```

## Phase 2: 원인 분류

에러 패턴에 따라 원인을 분류합니다.

### 분류 체계

| # | 원인 | 에러 패턴 | 수정 대상 |
|---|------|----------|----------|
| 1 | **셀렉터 불일치** | `locator resolved to N elements`, `waiting for selector` | 테스트 코드 |
| 2 | **API 경로 오류** | `404 Not Found`, `405 Method Not Allowed` | 구현 또는 테스트 |
| 3 | **응답 스키마 불일치** | `expect(received).toEqual(expected)`, JSON 구조 차이 | 테스트 또는 구현 |
| 4 | **타이밍 이슈** | `Timeout`, `waiting for`, `net::ERR_CONNECTION_REFUSED` | 테스트 코드 |
| 5 | **인증 실패** | `401 Unauthorized`, `403 Forbidden` | 계약상 허용·거부 여부와 토큰 설정을 대조해 결정 |
| 6 | **테스트 데이터** | `null`, `undefined`, 빈 배열 | 테스트 코드 (fixture) |
| 7 | **비즈니스 로직** | 잘못된 값 반환, 상태 불일치 | 구현 코드 |
| 8 | **인프라 문제** | `ECONNREFUSED`, `ENOTFOUND`, 포트 충돌 | 사용자 안내 |

### 수정 대상 결정 규칙

현재 사용자 요구와 승인된 AC·QA 시나리오·API 명세에서 기대 동작을 먼저 찾습니다.
실제 응답과 구현 코드는 관측값이며, 그 자체가 정답의 근거는 아닙니다.

| 계약 대조 결과 | 행동 |
|---|---|
| 구현이 계약과 다름 | 구현 수정. 계약을 검증하는 assertion 유지 |
| 테스트가 현재 계약과 다름 | 테스트 수정. 기대값을 바꾼 계약의 위치·변경 근거를 수정 이력에 기록 |
| 셀렉터·대기·fixture만 잘못됨 | 검증하려는 동작과 assertion 강도를 유지하며 테스트 수정 |
| 계약이 없거나 서로 모순됨 | 기존 기대값을 보존하고 미해결로 보고. 필요한 결정만 사용자에게 확인 |
| 인프라 문제 | 환경 증거와 필요한 조치를 보고 |

통과를 위해 assertion 삭제·완화, 거부 테스트에 허용 토큰 추가, 실패 사례 제외를 하지 않습니다.
요구사항 자체를 바꾸는 일은 Healer 수정 범위 밖입니다. 이미 승인된 계약 변경은 그 근거로 반영합니다.
`--fix-test-only`에서 구현 결함을 발견하면 테스트를 맞추지 않고 미해결로 남깁니다.

## Phase 3: 수정 패턴

### 패턴 1: 셀렉터 수정

```typescript
// Before: CSS 셀렉터 (깨지기 쉬움)
await page.click('.btn-primary');

// After: Role 셀렉터 (안정적)
await page.getByRole('button', { name: '저장' }).click();
```

```typescript
// Before: strict mode 위반 (여러 요소 매칭)
await page.getByText('삭제').click();

// After: 범위 좁히기
await page.getByRole('row', { name: 'Test User' })
  .getByRole('button', { name: '삭제' }).click();
```

### 패턴 2: 대기 추가

```typescript
// Before: 즉시 검증 (타이밍 이슈)
await page.getByRole('button', { name: '저장' }).click();
expect(await page.textContent('.message')).toBe('저장 완료');

// After: 자동 대기 assertion
await page.getByRole('button', { name: '저장' }).click();
await expect(page.getByText('저장 완료')).toBeVisible();
```

```typescript
// Before: API 응답 대기 없음
await page.getByRole('button', { name: '검색' }).click();
// 결과가 로드되기 전에 검증

// After: 네트워크 응답 대기
const responsePromise = page.waitForResponse('**/api/search*');
await page.getByRole('button', { name: '검색' }).click();
await responsePromise;
await expect(page.getByRole('listitem')).toHaveCount(5);
```

### 패턴 3: API 경로/스키마 수정

```typescript
// Before: 잘못된 경로
const response = await request.get('/api/user');

// After: 현재 승인된 api-spec.md의 경로가 /api/v1/users인 경우
const response = await request.get('/api/v1/users');
```

```typescript
// api-spec.md가 items를 요구하고 테스트만 구버전 data를 검사하는 경우
expect(body.data).toBeDefined();

// After: 현재 계약의 위치를 수정 이력에 기록하고 테스트 수정
expect(body.items).toBeDefined();
```

반대로 명세가 `data`를 요구하는데 구현이 `items`를 반환한다면 구현을 고치고
`expect(body.data)`는 유지합니다. 응답에 키가 있다는 검사만으로 부족한 계약은 값·형식도 검증합니다.

### 패턴 4: 인증 처리

```typescript
// 성공 시나리오인데 fixture의 인증 토큰이 누락된 경우에만 적용
// 인증 없는 요청의 거부를 확인하는 시나리오에는 토큰을 추가하지 않음
const response = await request.get('/api/admin/users');

// After: 인증 토큰 포함
const loginRes = await request.post('/api/auth/login', {
  data: { email: 'admin@test.com', password: 'Admin123!' },
});
const token = (await loginRes.json()).token;

const response = await request.get('/api/admin/users', {
  headers: { Authorization: `Bearer ${token}` },
});
```

### 패턴 5: 비즈니스 로직 수정

```typescript
// 구현 코드에 유효성 검증 누락 시
// Before (구현):
app.post('/api/users', (req, res) => {
  const user = createUser(req.body);
  res.json(user);
});

// After (구현):
app.post('/api/users', (req, res) => {
  if (!req.body.email) {
    return res.status(400).json({ error: '이메일은 필수입니다' });
  }
  const user = createUser(req.body);
  res.status(201).json(user);
});
```

## Phase 4: 재실행

```bash
# 실패한 테스트만 재실행 (효율적, workers 유지)
npx playwright test --grep "실패한테스트패턴" --workers=50%

# 또는 실패한 파일만
npx playwright test tests/e2e/auth.spec.ts --workers=50%

# 마지막 실패 테스트만 재실행
npx playwright test --last-failed --workers=50%
```

> **참고**: `--workers` 값은 SKILL.md 옵션에서 사용자가 지정한 값을 사용합니다. 기본값 50%.

수정 중에는 실패 테스트를 좁혀 재실행합니다. 마지막 수정 후에는 영향받는 정상·거부·회귀
테스트를 함께 실행해 통과를 확인합니다. 같은 코드에서 이미 통과한 범위는 중복 실행하지 않습니다.

## 종료 조건

### 성공 종료

```
원래 대상 테스트 + 영향받는 회귀 테스트 통과, 미해결 0 → PASS
  결과: 수정 이력 기록 + Step 7 보고
```

### 최대 반복 도달

```
retry >= max_retries (기본 5) → 중단
  1. 남은 실패 테스트에 test.fixme() 마킹
  2. exhausted(미해결)로 집계하고 실패 원인 요약 — 통과로 세지 않음
  3. 수동 확인 권장 사항 제시. 최종 등급은 SKILL.md의 판정 기준 적용
```

### test.fixme() 처리

```typescript
// 자동 수정 불가 시 fixme로 마킹
test.fixme('TC-012: 외부 메일 서버 의존', async ({ page }) => {
  // 원래 테스트 코드 유지
  // 원인: 외부 SMTP 서버 연결 필요
  // 권장: mock 서버 도입 또는 통합 테스트 환경 구성
});
```

## 수정 이력 추적

매 반복마다 수정 내용을 기록합니다:

```typescript
interface HealerLog {
  retry: number;         // 반복 회차
  failedTest: string;    // 실패한 테스트 ID
  errorMessage: string;  // 에러 메시지
  rootCause: string;     // 원인 분류
  target: 'test' | 'impl'; // 수정 대상
  file: string;          // 수정한 파일
  change: string;        // 수정 내용 요약
  contractEvidence: string; // 기대 동작의 근거 위치; 없으면 미해결 사유
  result: 'fixed' | 'still_failing'; // 수정 결과
}
```

## 안전장치

- **구현 코드 수정 시**: 수정 전 상태를 기억하고, 수정 후에도 실패하면 원복
- **무한 루프 방지**: 같은 에러가 3회 연속 발생하면 해당 테스트 fixme 처리
- **파일 수정 범위**: 테스트 파일 + 직접 관련된 구현 파일만 수정
- **`--fix-test-only`**: 구현 코드 수정을 완전히 금지하는 안전 모드
