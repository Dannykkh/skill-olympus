# Healer Loop 프로토콜

테스트 실패 시 자동으로 원인을 분석하고 수정하는 반복 루프입니다.

## 디버깅 모듈 연결

실제 실패 또는 수리 가능한 탐색 이슈를 처리할 때 한 번 `systematic-debugging`을 해석한다.
프로젝트의 `skills/systematic-debugging/SKILL.md` → 현재 CLI 활성 스킬 루트 → 전역
`SKILLS-CATALOG.md`의 첫 셀이 정확히 `systematic-debugging`인 유일한 행의 `읽을 경로` 순서다.
파일 존재와 frontmatter 이름을 확인한 exact `SKILL.md` 전체를 읽고 `Harness Integration`을 적용한다.
참조는 읽은 파일의 부모인 `module_root` 기준이며 slash 호출·전역 활성화는 하지 않는다.

모듈이 없으면 `debugging module: NOT RUN`을 기록하고 네이티브 기능으로 재현·계약/관측 대조·
근거 있는 가설 하나·최소 수정·원래 검사와 관련 회귀만 수행한다. 그 검사도 못 하면
해당 이슈는 `UNVERIFIED`로 남긴다. 모듈 읽기가 성공했다는 사실을 결함 해결로 세지 않는다.
새 장부 없이 아래 수정 이력에 기록하며 기존 수정 권한·상한·사용 횟수를 그대로 이어간다.

## 루프 흐름

```
┌──────────────────────────────────────────────────────┐
│ npx playwright test --reporter=list --workers=50%    │
└──────────────┬───────────────────────────────────────┘
               │
         ┌─────▼─────┐
         │ 미해결 0? │──── Yes ──→ 회귀 확인 → Step 7 보고
         └─────┬─────┘
               │ No
         ┌─────▼─────┐
         │ 남은 예산? │──── No ──→ exhausted 기록 → Step 7 보고
         └─────┬─────┘
               │ Yes
    ┌──────────▼──────────┐
    │ 1. 원래 재현·증거 확인 │
    │ 2. 계약 대조·가설 확인 │
    │ 3. 허용된 최소 수정    │
    │ 4. 원래 검사/탐색 재현 │
    │ 5. retry++           │
    └──────────┬──────────┘
               │
         ┌─────▼─────┐
         │ 미해결 0? │──── Yes ──→ 영향 회귀 확인 → Step 7 보고
         └─────┬─────┘
               │ No
               └──→ 루프 반복
```

미해결 집합에는 테스트 실패와 Step 5의 수리 가능한 탐색 이슈가 모두 들어간다.
테스트가 green이어도 탐색 이슈가 남으면 종료하지 않는다. 소스 수정 전 그 이슈를 다시 확인할
재현 명령·요청·화면 관찰을 정하고, 해당 증거와 관련 회귀까지 확인한 뒤 해결로 바꾼다.
실행할 수 없으면 환경 차단으로 남기며 재현 없는 추측 수정을 반복하지 않는다.
권한 밖·전제 부족으로 차단된 이슈는 실행 대기에서 빼고 미해결 집계에는 유지한다.
다른 수리 가능한 이슈를 계속 처리하고, 그런 이슈가 없으면 현재 근거로 결과를 보고한다.

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

에러 패턴은 조사 후보를 정합니다. 실행 증거로 원인을 확인한 뒤 수정 대상을 결정합니다.

### 분류 체계

| # | 원인 | 에러 패턴 | 수정 대상 |
|---|------|----------|----------|
| 1 | **셀렉터 불일치** | `locator resolved to N elements`, `waiting for selector` | 테스트 코드 |
| 2 | **API 경로 오류** | `404 Not Found`, `405 Method Not Allowed` | 구현 또는 테스트 |
| 3 | **응답 스키마 불일치** | `expect(received).toEqual(expected)`, JSON 구조 차이 | 테스트 또는 구현 |
| 4 | **타이밍 이슈 후보** | `Timeout`, `waiting for` | 서버·요청·UI 진행 상태를 확인한 뒤 결정 |
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
  1. 남은 테스트/탐색 이슈를 기존 보고서에 미해결로 기록
  2. exhausted(미해결)로 집계하고 실패 원인 요약 — 통과로 세지 않음
  3. 수동 확인 권장 사항 제시. 최종 등급은 SKILL.md의 판정 기준 적용
```

### 테스트 제외와 미해결 상태

예산 소진이나 환경 문제만으로 테스트를 `skip`/`fixme`로 바꾸지 않는다. 원래 실패 검사를
남겨 다음 실행에서도 드러나게 한다. 기존 또는 별도 승인된 제외 사례도 미해결 집계에서 지우지
않으며, 테스트가 없는 탐색 이슈는 원래 issue ID와 재현 증거로 추적한다.

## 수정 이력 추적

매 반복마다 수정 내용을 기록합니다:

```typescript
interface HealerLog {
  retry: number;         // 반복 회차
  failedTest: string;    // 실패한 테스트 또는 탐색 이슈 ID
  reproduction: string; // 원래 실패 명령/요청/관찰, 코드·환경 참조
  errorMessage: string;  // 에러 메시지
  rootCause: string;     // 확인된 원인 또는 미확인 가설
  causeEvidence: string; // 가설을 지지/반박한 실행 근거
  target: 'test' | 'impl'; // 수정 대상
  file: string;          // 수정한 파일
  change: string;        // 수정 내용 요약
  contractEvidence: string; // 기대 동작의 근거 위치; 없으면 미해결 사유
  verification: string; // 원래 검사 및 영향받는 회귀 명령·결과
  remainingRetries: number; // 원래 실행에서 남은 수정 횟수
  result: 'fixed' | 'still_failing' | 'blocked' | 'unverified';
}
```

## 안전장치

- **구현 코드 수정 시**: 사용자·다른 작업자 변경을 보존한다. 복구가 필요하면 확인된 기준점에 대한 이번 시도의 변경만 복구
- **무한 루프 방지**: 새 근거 없이 같은 실패를 반복하지 않는다. 사용자 지정 상한(기본 5)과 기존 더 작은 상한을 지키며, 작업자·세션·모듈 전환으로 사용 횟수를 초기화하지 않음
- **파일 수정 범위**: 테스트 파일 + 직접 관련된 구현 파일만 수정
- **`--fix-test-only`**: 구현 코드 수정을 완전히 금지하는 안전 모드
