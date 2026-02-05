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
