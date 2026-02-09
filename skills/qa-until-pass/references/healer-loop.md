# Healer Loop 프로토콜

테스트 실패 시 자동으로 원인을 분석하고 수정하는 반복 루프입니다.

## 루프 흐름

```
┌─────────────────────────────────────────┐
│ npx playwright test --reporter=list     │
└──────────────┬──────────────────────────┘
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
| 5 | **인증 실패** | `401 Unauthorized`, `403 Forbidden` | 테스트 코드 (토큰 설정) |
| 6 | **테스트 데이터** | `null`, `undefined`, 빈 배열 | 테스트 코드 (fixture) |
| 7 | **비즈니스 로직** | 잘못된 값 반환, 상태 불일치 | 구현 코드 |
| 8 | **인프라 문제** | `ECONNREFUSED`, `ENOTFOUND`, 포트 충돌 | 사용자 안내 |

### 수정 대상 결정 규칙

```
1. 테스트 코드 문제가 명백 → 테스트 코드 수정
   (잘못된 셀렉터, 잘못된 기대값, 누락된 대기)

2. 구현 코드 버그가 명백 → 구현 코드 수정
   (라우트 오타, 필수 필드 검증 누락, 잘못된 HTTP 상태 코드)

3. 원인이 불명확 → 테스트 코드 먼저 확인
   (구현이 의도대로라면 테스트 기대값이 잘못된 것)

4. 인프라 문제 → 수정하지 않고 사용자에게 보고
   (DB 연결, 외부 API, 포트 충돌)
```

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

// After: 실제 경로 (구현 코드 확인 후)
const response = await request.get('/api/v1/users');
```

```typescript
// Before: 잘못된 응답 구조 기대
expect(body.data).toBeDefined();

// After: 실제 응답 구조에 맞춤
expect(body.items).toBeDefined();
```

### 패턴 4: 인증 처리

```typescript
// Before: 인증 없이 API 호출
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
# 실패한 테스트만 재실행 (효율적)
npx playwright test --grep "실패한테스트패턴"

# 또는 실패한 파일만
npx playwright test tests/e2e/auth.spec.ts

# 마지막 실패 테스트만 재실행
npx playwright test --last-failed
```

## 종료 조건

### 성공 종료

```
모든 테스트 통과 → PASS
  결과: 수정 이력 기록 + Step 5 보고
```

### 최대 반복 도달

```
retry >= max_retries (기본 5) → 중단
  1. 남은 실패 테스트에 test.fixme() 마킹
  2. 실패 원인 요약
  3. 수동 확인 권장 사항 제시
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
  result: 'fixed' | 'still_failing'; // 수정 결과
}
```

## 안전장치

- **구현 코드 수정 시**: 수정 전 상태를 기억하고, 수정 후에도 실패하면 원복
- **무한 루프 방지**: 같은 에러가 3회 연속 발생하면 해당 테스트 fixme 처리
- **파일 수정 범위**: 테스트 파일 + 직접 관련된 구현 파일만 수정
- **`--fix-test-only`**: 구현 코드 수정을 완전히 금지하는 안전 모드
