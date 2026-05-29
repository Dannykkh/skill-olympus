# 브라우저 탐색 QA 프로토콜 (코드화 방식)

자동화 테스트(Step 4) 통과 후, **탐색용 Playwright 스크립트를 생성·실행**하여
실제 브라우저에서 탐색적 QA를 수행합니다. 자동화 테스트가 잡지 못하는 콘솔 에러,
네트워크 실패, 레이아웃 깨짐, 인터랙션 문제를 발견합니다.

## 설계 원칙 (gstack browser 차용)

minos는 Step 2에서 이미 Playwright 코드를 *생성*합니다. 탐색 QA도 같은 방식으로
**코드화**하여 일관성과 효율을 확보합니다.

| 원칙 | 의미 | 효과 |
|------|------|------|
| **코드화** | 페이지 순회·수집을 단일 Playwright 스크립트로 생성·실행 | Healer 반복 시 재탐색 비용 0 (스크립트 재실행) |
| **토큰 효율** | 수집 결과를 `report.json`으로 덤프, 컨텍스트엔 요약/이슈만 적재 | 페이지 수에 무관하게 컨텍스트 안정 |
| **MCP 비의존** | Playwright 이벤트 리스너로 console/network/error를 한 번에 수집 | Playwright MCP 설치 불필요 |

> 기존 Playwright MCP(`browser_*`) 방식은 `--explore-mcp` 옵션으로 fallback 제공.
> 페이지마다 도구를 직접 호출해 결과가 통째로 컨텍스트에 적재되는 단점이 있어 기본 경로에서 제외.

## 프로토콜

### Phase 1: 라우트 수집

소스 코드에서 페이지/라우트 목록을 추출합니다.

```
탐색 순서:
1. qa-scenarios.md의 시나리오에 언급된 URL 목록
2. 라우터 설정 파일 (React Router, Next.js pages/app, Vue Router 등)
3. 네비게이션 컴포넌트에서 링크 추출
4. API 엔드포인트 목록 (api-spec.md 또는 소스)
```

결과물: 방문할 페이지 목록 + 각 페이지의 주요 인터랙션 포인트.
인증이 필요한 라우트는 storageState(로그인 세션)를 재사용하도록 표시.

### Phase 2: 탐색 스크립트 생성 (패시브 수집)

라우트 목록을 입력으로 **단일 탐색 스크립트**를 생성합니다.
모든 페이지를 순회하며 이벤트 리스너로 문제를 자동 수집하고 JSON으로 덤프합니다.

파일 경로: `tests/explore/explore.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Phase 1에서 수집한 라우트 (생성 시 주입)
const ROUTES = [
  { name: 'home', url: '/' },
  { name: 'dashboard', url: '/dashboard' },
  // ...
];

const OUT_DIR = 'test-results/explorer';
fs.mkdirSync(OUT_DIR, { recursive: true });

const report: any[] = [];

for (const route of ROUTES) {
  test(`explore ${route.name}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: { url: string; status: number }[] = [];

    // 이벤트 리스너로 한 번에 수집 (MCP 왕복 불필요)
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 400) failedRequests.push({ url: res.url(), status: res.status() });
    });

    await page.goto(route.url, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000); // 지연 렌더링 대기

    // 시각적 캡처
    const shot = path.join(OUT_DIR, `${route.name}.png`);
    await page.screenshot({ path: shot, fullPage: true });

    // 접근성/구조 스냅샷 (AI가 Phase 3에서 읽음)
    const snapshot = await page.accessibility.snapshot();
    fs.writeFileSync(
      path.join(OUT_DIR, `${route.name}.snapshot.json`),
      JSON.stringify(snapshot, null, 2),
    );

    report.push({
      name: route.name,
      url: route.url,
      consoleErrors,
      pageErrors,
      failedRequests,
      screenshot: shot,
    });
    fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  });
}
```

#### 패시브 체크 항목

| 체크 | 수집 방법 | 감지 대상 |
|------|-----------|----------|
| JS 에러 | `page.on('pageerror')` | `Uncaught TypeError`, unhandled rejection |
| 콘솔 에러 | `page.on('console')` (type=error) | React warnings, deprecated API |
| 네트워크 실패 | `page.on('response')` (status>=400) | 4xx/5xx, CORS, 404 리소스 |
| 구조 검증 | `page.accessibility.snapshot()` | 빈 페이지, 접근성 누락 |
| 시각적 확인 | `page.screenshot({fullPage})` | 레이아웃 깨짐, overflow, 빈 화면 |

### Phase 3: 스크립트 실행 + 결과 회수 (토큰 효율)

```bash
npx playwright test tests/explore/explore.spec.ts --workers=50%
```

실행 후 **전체 결과를 컨텍스트에 올리지 않습니다.** 이슈가 있는 항목만 추출:

```bash
# 에러/실패가 있는 페이지만 추출 (jq 있을 때)
jq '[.[] | select((.consoleErrors|length>0) or (.pageErrors|length>0) or (.failedRequests|length>0))]' \
  test-results/explorer/report.json

# jq 없으면 grep으로 이슈 라인만
grep -E "TypeError|status.*[45][0-9][0-9]|pageError" test-results/explorer/report.json
```

- 이슈 없는 페이지: report.json에만 남기고 컨텍스트에 적재하지 않음
- 이슈 있는 페이지: 해당 항목 + 스크린샷 경로만 읽어 분석
- 스냅샷 JSON: Phase 4 인터랙션 대상 식별이 필요할 때만 해당 파일 읽기

### Phase 4: 액티브 체크 (인터랙션 — 선택)

AI 판단이 필요한 인터랙션 탐색. Phase 3에서 덤프한 `{name}.snapshot.json`을 읽어
인터랙션 대상을 식별하고, **인터랙션 스크립트를 추가 생성·실행**합니다.

파일 경로: `tests/explore/interact.spec.ts`

```
1. {name}.snapshot.json 읽기 → 버튼/폼/링크 등 인터랙션 가능 요소 파악
2. 우선순위 높은 요소에 대한 인터랙션 스크립트 생성
   - 클릭 → waitForTimeout → console/network 재수집
   - 폼 입력 → 제출 → 응답/에러 확인
3. 실행 → report.json에 인터랙션 결과 append
```

#### 인터랙션 우선순위

| 우선순위 | 대상 | 이유 |
|---------|------|------|
| P0 | 로그인/인증 폼 | 핵심 진입점 |
| P0 | CRUD 버튼 (생성/수정/삭제) | 핵심 비즈니스 로직 |
| P1 | 검색/필터 | 데이터 조회 |
| P1 | 모달/다이얼로그 | 오버레이 렌더링 이슈 |
| P2 | 페이지네이션, 드롭다운/셀렉트 | 동적 UI |
| P3 | 툴팁/호버 | 마이너 UI |

> 외부 부작용(결제, 메일 발송)이 있는 버튼은 조작하지 않고 패시브 체크만 수행.
> `--no-explore-active`로 Phase 4 전체 스킵 가능.

### Phase 5: 이슈 수집 + 분류

`report.json`에서 추출한 이슈를 분류합니다.

| 유형 | 심각도 | 예시 | 후속 조치 |
|------|--------|------|----------|
| **JS 에러** | P0 | `Uncaught TypeError`, unhandled rejection | Healer Loop로 전달 |
| **API 실패** | P0 | `POST /api/users → 500` | Healer Loop로 전달 |
| **404 리소스** | P1 | 이미지/폰트/스크립트 로드 실패 | Healer Loop로 전달 |
| **콘솔 경고** | P1 | React key warning, deprecated API | 보고서에 기록 |
| **레이아웃** | P2 | overflow, 겹침, 빈 화면 | 보고서에 기록 (스크린샷 첨부) |
| **UX 문제** | P3 | 로딩 스피너 미해제, 빈 상태 미처리 | 보고서에 기록 |

#### 이슈 기록 형식

```markdown
### [P0] JS 에러 — 대시보드 페이지
- **URL**: /dashboard
- **에러**: `Uncaught TypeError: Cannot read properties of undefined (reading 'map')`
- **출처**: test-results/explorer/report.json (dashboard.pageErrors[0])
- **스크린샷**: test-results/explorer/dashboard.png
- **추정 원인**: API 응답이 빈 배열 대신 null 반환
```

### Phase 6: Healer Loop 연계

P0/P1 이슈 중 코드 수정으로 해결 가능한 것은 Healer Loop(Step 6)에 전달합니다.

```
report.json 이슈 → 분류:
  ├── 코드 수정 가능 (JS 에러, API 실패, 404) → Healer Loop 큐에 추가
  └── 수동 확인 필요 (레이아웃, UX) → 보고서에만 기록
```

전달 정보: 에러 메시지 전문 + 발생 URL + report.json 경로 + 스크린샷 경로.

**Healer 반복 시 재탐색 캐시:** Healer가 코드를 수정한 뒤 탐색 QA를 다시 돌릴 때는
스크립트를 새로 생성하지 않고 `tests/explore/*.spec.ts`를 **재실행**만 합니다.
라우트가 바뀌지 않는 한 탐색 비용은 스크립트 실행 시간뿐입니다.

## 산출물 구조

```
tests/explore/
├── explore.spec.ts          # 패시브 수집 스크립트 (Phase 2)
└── interact.spec.ts         # 액티브 인터랙션 스크립트 (Phase 4, 선택)

test-results/explorer/
├── report.json              # 전체 수집 결과 (이슈 추출 대상)
├── {page-name}.png          # 페이지별 풀페이지 스크린샷
├── {page-name}.snapshot.json # 접근성 스냅샷 (인터랙션 식별용)
```

## 주의사항

- **Playwright만 있으면 동작** (MCP 불필요). MCP 방식이 필요하면 `--explore-mcp`로 fallback
- 서버가 이미 실행 중인 상태에서 수행 (Step 3에서 준비)
- 인증 페이지는 storageState(로그인 세션) 재사용 — Step 2 codegen의 `beforeEach` 로그인 또는 `playwright.config.ts`의 `storageState` 활용
- 외부 서비스 호출(결제, 메일) 페이지는 조작하지 않음 (패시브 체크만)
- `report.json`은 매 페이지마다 갱신 기록되므로, 스크립트가 중간에 죽어도 직전까지 결과 보존
- 컨텍스트 절약: report.json 전체를 Read하지 말고 jq/grep으로 이슈 항목만 추출
