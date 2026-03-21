# 브라우저 탐색 QA 프로토콜

자동화 테스트(Step 4) 통과 후, Playwright MCP로 실제 브라우저를 열어 탐색적 QA를 수행합니다.
자동화 테스트가 잡지 못하는 콘솔 에러, 네트워크 실패, 레이아웃 깨짐, 인터랙션 문제를 발견합니다.

## 왜 필요한가

자동화 테스트는 **사전 정의된 시나리오만** 검증합니다. 실제 브라우저에서는:

- JS 콘솔 에러/경고 (React warnings, unhandled promise rejection)
- 404 리소스 (이미지, 폰트, API)
- 레이아웃 깨짐 (overflow, z-index, 반응형)
- 로딩 스피너가 안 사라지는 문제
- 빈 상태(empty state) 미처리
- CORS 에러, mixed content 경고

이런 문제들이 자동화 테스트를 통과하고도 남아 있습니다.

## 프로토콜

### Phase 1: 라우트 수집

소스 코드에서 페이지/라우트 목록을 추출합니다.

```
탐색 순서:
1. qa-scenarios.md의 시나리오에 언급된 URL 목록
2. 라우터 설정 파일 (React Router, Next.js pages, Vue Router 등)
3. 네비게이션 컴포넌트에서 링크 추출
4. API 엔드포인트 목록 (api-spec.md 또는 소스)
```

결과물: 방문할 페이지 목록 + 각 페이지의 주요 인터랙션 포인트

### Phase 2: 페이지 순회 + 패시브 체크

각 페이지를 방문하며 **자동으로** 문제를 수집합니다.

```
FOREACH page IN 라우트_목록:
  1. browser_navigate(page.url)
  2. browser_wait_for(time: 3)              # 렌더링 대기
  3. browser_console_messages(level: "error") # 콘솔 에러 수집
  4. browser_network_requests()              # 실패 요청 수집
  5. browser_snapshot()                      # 접근성/구조 확인
  6. browser_take_screenshot()               # 시각적 상태 캡처
  7. 이슈 기록
```

#### 패시브 체크 항목

| 체크 | 도구 | 감지 대상 |
|------|------|----------|
| 콘솔 에러 | `browser_console_messages` | JS 에러, React warnings, unhandled rejection |
| 네트워크 실패 | `browser_network_requests` | 4xx/5xx 응답, CORS, timeout |
| 구조 검증 | `browser_snapshot` | 빈 페이지, 접근성 누락, 깨진 구조 |
| 시각적 확인 | `browser_take_screenshot` | 레이아웃 깨짐, overflow, 빈 화면 |

### Phase 3: 액티브 체크 (인터랙션 탐색)

AI가 주요 UI 요소를 직접 조작하며 문제를 탐색합니다.

```
각 페이지에서:
1. browser_snapshot()으로 인터랙션 가능한 요소 파악
2. 주요 버튼 클릭 → 결과 확인
3. 폼 필드 입력 → 제출 → 응답 확인
4. 네비게이션 링크 → 이동 확인
5. 각 액션 후 console_messages + network_requests 재확인
```

#### 인터랙션 우선순위

| 우선순위 | 대상 | 이유 |
|---------|------|------|
| P0 | 로그인/인증 폼 | 핵심 진입점 |
| P0 | CRUD 버튼 (생성/수정/삭제) | 핵심 비즈니스 로직 |
| P1 | 검색/필터 | 데이터 조회 기능 |
| P1 | 모달/다이얼로그 | 오버레이 렌더링 이슈 |
| P2 | 페이지네이션 | 데이터 로딩 |
| P2 | 드롭다운/셀렉트 | 동적 UI |
| P3 | 툴팁/호버 | 마이너 UI |

#### 인터랙션 시 체크 패턴

```
# 버튼 클릭 패턴
browser_snapshot()                          # 클릭 전 상태
browser_click(ref, element)                 # 클릭
browser_wait_for(time: 2)                   # 반응 대기
browser_console_messages(level: "error")    # 에러 발생 여부
browser_snapshot()                          # 클릭 후 상태 변화 확인

# 폼 입력 패턴
browser_snapshot()                          # 폼 구조 파악
browser_fill_form(fields)                   # 입력
browser_click(submit_button)               # 제출
browser_wait_for(text: "성공" or time: 3)  # 응답 대기
browser_console_messages(level: "error")    # 에러 확인
browser_network_requests()                  # API 응답 확인
```

### Phase 4: 이슈 수집 + 분류

발견된 이슈를 분류하고 기록합니다.

#### 이슈 분류 체계

| 유형 | 심각도 | 예시 | 후속 조치 |
|------|--------|------|----------|
| **JS 에러** | P0 | `Uncaught TypeError`, `Unhandled Rejection` | Healer Loop로 전달 |
| **API 실패** | P0 | `POST /api/users → 500` | Healer Loop로 전달 |
| **콘솔 경고** | P1 | `React key warning`, `deprecated API` | 보고서에 기록 |
| **404 리소스** | P1 | 이미지/폰트/스크립트 로드 실패 | Healer Loop로 전달 |
| **레이아웃** | P2 | overflow, 겹침, 빈 화면 | 보고서에 기록 |
| **UX 문제** | P3 | 로딩 스피너 미해제, 빈 상태 미처리 | 보고서에 기록 |

#### 이슈 기록 형식

```markdown
### [P0] JS 에러 — 대시보드 페이지
- **URL**: /dashboard
- **에러**: `Uncaught TypeError: Cannot read properties of undefined (reading 'map')`
- **재현**: 페이지 로드 시 즉시 발생
- **스크린샷**: screenshots/dashboard-error.png
- **추정 원인**: API 응답이 빈 배열 대신 null 반환
```

### Phase 5: Healer Loop 연계

P0/P1 이슈 중 코드 수정으로 해결 가능한 것은 Healer Loop(Step 6)에 전달합니다.

```
탐색 QA 발견 이슈 → 분류:
  ├── 코드 수정 가능 (JS 에러, API 실패, 404) → Healer Loop 큐에 추가
  └── 수동 확인 필요 (레이아웃, UX) → 보고서에만 기록
```

Healer Loop에 전달할 때 포함할 정보:
- 에러 메시지 전문
- 발생 URL + 재현 경로
- 콘솔/네트워크 로그
- 스크린샷 경로

## 스크린샷 저장

```
test-results/
└── explorer/
    ├── {page-name}.png              # 페이지별 스크린샷
    ├── {page-name}-error.png        # 에러 발생 시 스크린샷
    └── {page-name}-after-{action}.png  # 인터랙션 후 스크린샷
```

## 주의사항

- Playwright MCP가 설치되어 있어야 실행 가능 (미설치 시 이 단계 스킵)
- 서버가 이미 실행 중인 상태에서 수행 (Step 3에서 준비)
- 인증이 필요한 페이지는 먼저 로그인 수행
- 외부 서비스 호출(결제, 메일) 페이지는 조작하지 않음 (패시브 체크만)
- 각 페이지 탐색 후 `browser_navigate_back()` 또는 직접 URL 이동으로 복귀
