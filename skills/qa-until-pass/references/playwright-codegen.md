# Playwright 코드 생성 가이드

시나리오 테이블을 Playwright TypeScript 테스트 코드로 변환하는 규칙입니다.

## 파일 구조

```
tests/
├── e2e/                      # UI 테스트
│   ├── auth.spec.ts          # 인증 관련
│   ├── crud-{entity}.spec.ts # CRUD 엔티티별
│   └── navigation.spec.ts    # 페이지 이동
├── api/                      # API 테스트
│   ├── auth-api.spec.ts
│   └── {entity}-api.spec.ts
└── fixtures/                 # 테스트 데이터
    └── test-data.ts
```

## 코드 생성 템플릿

### UI 테스트 (E2E)

```typescript
import { test, expect } from '@playwright/test';

test.describe('기능명', () => {
  test.beforeEach(async ({ page }) => {
    // 공통 사전 조건 (로그인, 페이지 이동 등)
    await page.goto('/target-page');
  });

  // TC-001: 정상 케이스
  test('시나리오 이름 - 정상', async ({ page }) => {
    // 1. 입력
    await page.getByLabel('이메일').fill('test@example.com');
    await page.getByLabel('비밀번호').fill('Password123!');

    // 2. 액션
    await page.getByRole('button', { name: '로그인' }).click();

    // 3. 검증
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('환영합니다')).toBeVisible();
  });

  // TC-002: 에러 케이스
  test('시나리오 이름 - 에러', async ({ page }) => {
    await page.getByLabel('이메일').fill('invalid@email.com');
    await page.getByLabel('비밀번호').fill('wrong');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByText('이메일 또는 비밀번호가 올바르지 않습니다')).toBeVisible();
  });

  // TC-003: 엣지 케이스
  test('시나리오 이름 - 엣지', async ({ page }) => {
    // 빈 입력 제출
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page.getByText('필수 항목입니다')).toBeVisible();
  });
});
```

### API 테스트

```typescript
import { test, expect } from '@playwright/test';

test.describe('API: 엔티티명', () => {
  const baseUrl = '/api/v1/entities';
  let createdId: string;

  // CREATE
  test('POST - 생성 성공', async ({ request }) => {
    const response = await request.post(baseUrl, {
      data: {
        name: 'Test Entity',
        description: 'Test Description',
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.name).toBe('Test Entity');
    createdId = body.id;
  });

  // READ
  test('GET - 목록 조회', async ({ request }) => {
    const response = await request.get(baseUrl);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  // READ (단건)
  test('GET - 단건 조회', async ({ request }) => {
    const response = await request.get(`${baseUrl}/${createdId}`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(createdId);
  });

  // UPDATE
  test('PUT - 수정 성공', async ({ request }) => {
    const response = await request.put(`${baseUrl}/${createdId}`, {
      data: { name: 'Updated Entity' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('Updated Entity');
  });

  // DELETE
  test('DELETE - 삭제 성공', async ({ request }) => {
    const response = await request.delete(`${baseUrl}/${createdId}`);
    expect(response.status()).toBe(204);
  });

  // 에러 케이스
  test('GET - 존재하지 않는 ID → 404', async ({ request }) => {
    const response = await request.get(`${baseUrl}/nonexistent-id`);
    expect(response.status()).toBe(404);
  });

  test('POST - 필수 필드 누락 → 400', async ({ request }) => {
    const response = await request.post(baseUrl, {
      data: {},
    });
    expect(response.status()).toBe(400);
  });
});
```

## Selector 우선순위

Playwright 공식 권장 순서를 따릅니다:

| 순위 | Selector | 예시 | 사용 시점 |
|------|----------|------|----------|
| 1 | `getByRole` | `getByRole('button', { name: '저장' })` | 접근성 속성 있는 요소 |
| 2 | `getByLabel` | `getByLabel('이메일')` | 폼 필드 (label 연결) |
| 3 | `getByPlaceholder` | `getByPlaceholder('검색어 입력')` | placeholder 있는 input |
| 4 | `getByText` | `getByText('환영합니다')` | 텍스트 콘텐츠로 찾기 |
| 5 | `getByTestId` | `getByTestId('submit-btn')` | data-testid 속성 |
| 6 | CSS/XPath | `page.locator('.btn-primary')` | 최후 수단 |

## Assertion 패턴

```typescript
// 가시성
await expect(element).toBeVisible();
await expect(element).toBeHidden();

// 텍스트
await expect(element).toHaveText('정확한 텍스트');
await expect(element).toContainText('부분 텍스트');

// URL
await expect(page).toHaveURL('/expected-path');
await expect(page).toHaveURL(/\/users\/\d+/);

// 폼 상태
await expect(input).toHaveValue('입력값');
await expect(checkbox).toBeChecked();
await expect(button).toBeDisabled();

// 개수
await expect(page.getByRole('listitem')).toHaveCount(5);

// API 응답
expect(response.status()).toBe(200);
expect(await response.json()).toMatchObject({ key: 'value' });
```

## 대기 전략

```typescript
// 네비게이션 대기
await page.waitForURL('/dashboard');

// 네트워크 요청 대기
const responsePromise = page.waitForResponse('**/api/users');
await page.getByRole('button', { name: '저장' }).click();
const response = await responsePromise;

// 요소 대기
await page.getByText('로딩 완료').waitFor({ state: 'visible' });

// 로딩 스피너 사라짐 대기
await page.getByTestId('loading').waitFor({ state: 'hidden' });
```

## 시나리오→코드 매핑 규칙

| 시나리오 요소 | 코드 매핑 |
|-------------|----------|
| 기능명 | `test.describe('기능명')` |
| TC-ID | 주석 `// TC-001` |
| 시나리오명 | `test('시나리오명')` |
| 전제조건 | `test.beforeEach()` 또는 테스트 초반부 |
| 입력 데이터 | `fill()`, `click()`, `request.post()` 파라미터 |
| 기대 결과 | `expect()` assertion |
| 우선순위 P0 | `test()` (기본) |
| 우선순위 P2/P3 | `test()` (동일, 판정 시 구분) |
