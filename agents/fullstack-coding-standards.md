---
name: fullstack-coding-standards
description: 풀스택 개발 코딩 표준. 백엔드 오케스트레이션, 프론트엔드 API 추상화, 모듈화 규칙. 코드 작성 시 자동 참조.
auto_apply:
  - "*.ts"
  - "*.tsx"
  - "*.js"
  - "*.jsx"
  - "*.py"
  - "*.java"
  - "*.cs"
---

# Fullstack Coding Standards (Passive)

코드 작성 시 항상 적용되는 아키텍처 및 구조화 규칙.
상세 코드 예시 → `/fullstack-coding-standards` 스킬 참조.

---

## 코드 구조 원칙 (항상 적용)

|규칙|기준|위반 시|
|---|---|---|
|단일 책임|1 파일 = 1 역할|역할별 파일 분리|
|함수 단일 목적|1 함수 = 1 작업|헬퍼 추출|
|중복 코드|금지|공통 함수 추출|
|순환 의존|금지|의존 방향 정리 (단방향)|
|타입 안전성|필수|TypeScript / Type hints|

---

## 조립 원칙 (레고블록·하네스)

> 기능은 서로를 모르는 독립 블록으로 만들고, 연결은 조립 계층(하네스)에서만 한다.

- **수평 무지**: 같은 계층의 블록끼리는 서로의 존재를 모른다 — "Service 간 직접 호출 금지" 규칙의 일반화. 다른 블록이 필요하면 그 요구를 상위 계층으로 올린다
- **연결 지식은 하네스에만**: 블록 간 순서·분기·조합은 조립 계층이 전담 — Spring: Flow, NestJS: 모듈 DI 조합/OrchestratorService, FastAPI: Service 함수, C#: Application 레이어, 프론트: hooks/페이지 컴포넌트
- **인터페이스(연결면) 먼저**: 블록의 입출력 계약(DTO/타입/시그니처)을 먼저 정의하고 구현은 뒤에 — 블록 교체가 하네스 수정 없이 가능해야 진짜 레고블록
- **잘못 자른 신호**: 블록이 다른 블록의 내부 상태를 알아야 동작하면 경계가 틀린 것 — 합치거나 다시 자른다

---

## 백엔드 공통 원칙

- **Controller/Router는 얇게**: 요청 파싱 → 서비스 호출 → 응답 반환만
- 비즈니스 로직은 Service 레이어에 집중
- 데이터 접근은 Repository로 분리
- Service 간 직접 호출 체인 금지 (상위 레이어에서 조합)
- 교차 관심사(인증, 로깅)는 미들웨어/인터셉터로 처리
- Entity/Model을 API 외부에 직접 노출 금지 (DTO 변환)

---

## 프레임워크별 계층 구조

### Java/Spring Boot — 4계층

```
Controller → Flow → Service → Repository
```

- Flow는 **모든 모듈에 항상 존재** (단순 위임도 통일성 우선)
- Flow가 여러 Service 조합, Service는 자기 도메인만 담당
- Package-by-Feature: `domain/{feature}/{controller,dto,flow,model,repository,service,spec}`
- 상세 규칙(@Transactional, DTO변환, 예외처리 등) → `templates/java-spring-boot.md`

### Python/FastAPI — 3계층

```
Router → Service → Repository
```

- 함수 기반이 관례 — 별도 Flow 클래스 불필요
- Service 함수가 직접 여러 Repository를 조합
- 구조: `app/{routers,services,repositories,models,schemas,core,middleware}`

### Node.js/NestJS — 3계층

```
Controller → Service → Repository
```

- Service가 다른 Service를 주입받아 조합 (Module DI가 순환 방지)
- 복잡한 조합은 별도 OrchestratorService 분리 가능 (선택)
- 구조: `src/modules/{feature}/{controller,service,repository,module,dto,entities}`

### C#/ASP.NET Core — Clean Architecture

```
Api (Controller/Minimal API) → Application (Service) → Domain (Entity)
                                      ↓
                              Infrastructure (EF Core, 외부 서비스)
```

- Domain은 다른 레이어에 의존하지 않음 (순수 C# 클래스)
- Application은 Domain만 참조 (Infrastructure 참조 금지)
- record DTO 사용 (불변, 값 기반 동등성)
- 모든 DB 호출은 async + CancellationToken 전달
- 상세 규칙 → `skills/dotnet-coding-standards/` 참조

---

## 프론트엔드 규칙

- **모든 API 호출은 `apiClient.ts`를 통한다. URL 하드코딩 절대 금지.**
- 환경별 `.env` 파일 분리, 코드에 URL/포트/키 직접 작성 금지

### Feature-based 구조

```
src/
├── lib/apiClient.ts           # fetch 래퍼
├── features/{domain}/         # 기능별 모듈
│   ├── api/                   # Service + queries + mutations + keys
│   ├── components/            # 기능 전용 컴포넌트
│   ├── hooks/                 # 비즈니스 로직 훅
│   └── types/
├── components/                # 공통 UI (Button, Modal, Table 등)
├── hooks/                     # 공통 훅
├── pages/                     # 라우팅 단위
└── types/                     # 공통 타입
```

### API 호출 3계층 (TanStack Query)

```
apiClient.ts → {domain}Service.ts → queries.ts / mutations.ts
```

- **서버 상태**: TanStack Query | **클라이언트 상태**: Context/Zustand 등 별도
- Query Key Factory: `userKeys.all`, `userKeys.lists()`, `userKeys.detail(id)`
- 에러 3단계: apiClient(공통) → Query(onError) → ErrorBoundary(최후)

### 공통 컴포넌트

- 2개 이상 feature에서 사용 → 공통 추출
- 비즈니스 로직 금지 (순수 UI만)

---

## 공유 타입 (Contract-First)

- API 형상을 먼저 정의 → 백엔드/프론트 구현
- `shared/types/` 또는 `packages/types/` (모노레포)

---

## DB 연동 규칙

- DB는 `snake_case`, 코드는 `camelCase` — **자동 변환 전략으로 해결**
- BIGINT/DECIMAL → API에서 **`string`으로 전달** (JS 정밀도 한계)
- 날짜: **DB UTC 저장 → API ISO 8601 → 프론트 로컬 변환**
- Enum: 문자열로 저장 (Java: `@Enumerated(STRING)`, DB: `VARCHAR`)
- 운영: 마이그레이션 도구 필수 (Flyway/Alembic/Prisma Migrate)
- 프론트: Zod 등으로 API 응답 런타임 검증

> DB별 자료형 매핑 상세 → `templates/db-integration.md`

---

## 리소스 안전 규칙

> **핵심**: 리소스를 만드는 편집에서 해제 코드를 같이 쓴다.
> 생성은 있는데 해제 지점을 가리킬 수 없으면 누수다.
> 예외는 앱 수명 싱글톤뿐 — 사고가 아니라 명시된 결정이어야 한다.

### 생성-해제 짝 (스택별)

|스택|생성|해제|
|---|---|---|
|JS/TS|`addEventListener`|`removeEventListener` (익명 함수는 제거 불가 — 참조 유지)|
|JS/TS|`setInterval` / `setTimeout`|`clearInterval` / `clearTimeout`|
|JS/TS|진행 중 `fetch`|`AbortController.abort()`|
|JS/TS|`ResizeObserver` / `IntersectionObserver`|`disconnect()`|
|React|`useEffect` 안의 구독/타이머|cleanup 함수 반환 (`return () => ...`)|
|Node|스트림/소켓/파일 핸들|`close()` / `destroy()` — 에러 경로 포함|
|Python|파일/커넥션/락|`with` 컨텍스트 매니저|
|Python|asyncio task / `ThreadPoolExecutor`|`cancel()` / `shutdown()`|
|Java|`AutoCloseable` (파일/커넥션)|try-with-resources|
|Java|`ExecutorService` / 스케줄러|`shutdown()` (+ Spring `@PreDestroy`)|
|C#|—|`dotnet-coding-standards` / `wpf-coding-standards` 참조|

### 비동기 이후 상태 갱신

- await 뒤 상태 갱신은 살아있음 가드 필수 — React는 cleanup의 취소 플래그 또는 `AbortSignal`로 언마운트 후 setState 차단 (TanStack Query 훅 사용 시 자동 처리)
- 연속 요청(검색 자동완성 등)은 이전 요청 취소 + in-flight 가드로 중복 방지

### 무제한 증가 금지

- 캐시/맵/누적 배열에 상한 필수 (LRU, TTL, max size)
- 서버 상태 캐시는 TanStack Query가 관리(`gcTime`) — 별도 커스텀 캐시가 보이면 상한부터 의심
- Node `MaxListenersExceededWarning`은 리스너 누수 신호 — 상한을 올리지 말고 해제 누락을 찾는다

### 싱글톤 / 무거운 리소스 재사용

- DB 커넥션 풀, HTTP 클라이언트 등 무거운 리소스는 **싱글톤 재사용** — 요청마다 생성 금지
- 프론트: 모듈 스코프 싱글톤 (`apiClient` 패턴) | Node: 모듈 캐싱이 곧 싱글톤 | Python/FastAPI: 모듈 전역 + `Depends` 주입
- Java/Spring: 빈은 기본 싱글톤 → **가변 상태 필드 금지** (스레드 안전)
- 앱 수명 리소스는 해제 예외 — 단, 주석/네이밍으로 의도를 명시

---

## 체크리스트

**백엔드:**
- [ ] Controller/Router가 얇은가?
- [ ] 비즈니스 로직이 Service에 있는가?
- [ ] 데이터 접근이 Repository로 분리되었는가?
- [ ] Service 간 직접 호출 체인이 없는가?
- [ ] Entity가 API 외부에 노출되지 않는가?
- [ ] (Java) Flow가 존재하는가? @Transactional이 Flow/Service에만?

**프론트엔드:**
- [ ] 모든 API 호출이 apiClient를 통하는가?
- [ ] API 호출이 feature/api/ 안에 있는가?
- [ ] 서버 상태(Query) / 클라이언트 상태 분리되었는가?

**DB 연동:**
- [ ] snake_case ↔ camelCase 자동 변환 설정되었는가?
- [ ] BIGINT/DECIMAL이 string으로 전달되는가?
- [ ] 날짜가 UTC 저장 + ISO 8601 직렬화인가?
- [ ] 운영 환경에서 마이그레이션 도구 사용인가?

**조립:**
- [ ] 같은 계층 블록끼리 직접 호출이 없는가? (연결은 하네스에서만)
- [ ] 블록 교체 시 하네스 외 수정이 없는가? (계약 기반 연결)

**리소스 안전:**
- [ ] 리스너/타이머/옵저버/구독 등록에 해제가 짝으로 있는가?
- [ ] useEffect가 cleanup을 반환하는가? await 후 상태 갱신이 가드되는가?
- [ ] 캐시/누적 자료구조에 상한(LRU/TTL)이 있는가?
- [ ] DB 풀·HTTP 클라이언트가 싱글톤으로 재사용되는가?
- [ ] (Java/Spring) 싱글톤 빈에 가변 상태 필드가 없는가?
