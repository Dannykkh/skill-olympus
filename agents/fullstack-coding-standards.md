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
상세 코드 예시가 필요하면 `/fullstack-coding-standards` 스킬을 참조.

---

## 백엔드 공통 원칙

프레임워크에 관계없이 적용:

- **Controller/Router는 얇게**: 요청 파싱 → 서비스 호출 → 응답 반환만
- Controller에 비즈니스 로직 금지
- 비즈니스 로직은 Service 레이어에 집중
- 데이터 접근은 Repository/DAO로 분리
- Service 간 직접 호출 체인 금지 (상위 레이어에서 조합)
- 교차 관심사(인증, 로깅)는 미들웨어/인터셉터로 처리

---

## Java/Spring Boot

### 4계층 오케스트레이션

```
Controller (얇은 진입점)
    ↓
Flow (비즈니스 흐름 조정, 여러 Service 조합, @Transactional 경계)
    ↓
Service (단일 도메인 비즈니스 로직, 재사용 단위)
    ↓
Repository (데이터 접근)
```

- Flow는 **모든 모듈에 항상 존재** (단순 위임도 통일성 우선)
- Flow가 여러 Service를 조합, Service는 자기 도메인만 담당

### Package-by-Feature 구조

```
com.project/
├── domain/{feature}/          # 기능별 패키지 (= 대메뉴 = 모듈)
│   ├── controller/            # REST 엔드포인트 (서브메뉴 기능 구현)
│   ├── dto/                   # Request/Response DTO (record 사용)
│   ├── flow/                  # 비즈니스 흐름 조정 (항상 존재)
│   ├── model/                 # JPA Entity
│   ├── repository/            # JPA Repository
│   ├── service/               # 단일 도메인 로직
│   └── spec/                  # JPA Specification (검색 조건)
├── global/
│   ├── config/                # Security, JPA, CORS 등
│   ├── exception/             # 전역 예외 처리
│   ├── common/                # 공통 응답, 페이징 등
│   └── util/
└── infra/                     # 외부 시스템 연동
```

### Java/Spring Boot 코딩 규칙

**@Transactional:**
- Flow 클래스에 `@Transactional(readOnly = true)` 기본, 쓰기만 오버라이드
- Controller/Repository에 @Transactional 금지
- private 메서드에 선언 금지 (프록시 우회)
- 체크 예외 롤백: `@Transactional(rollbackFor = Exception.class)`

**DTO 변환:**
- Service/Flow가 DTO 반환, Entity 외부 노출 금지
- 변환은 `DTO.from(entity)` 정적 팩토리 메서드 (단순) 또는 별도 Mapper (복잡)
- DTO는 `record` 사용 (Java 17+), Entity는 `class`

**예외 처리:**
- `BusinessException` (추상) → `EntityNotFoundException`, `BusinessRuleViolationException` 계층
- `ErrorCode` enum으로 코드+메시지 관리
- `@RestControllerAdvice` 글로벌 핸들러에서 HTTP 상태 변환
- Service에서 throw, Controller에서 잡지 않음

**Validation:**
- Controller: `@Valid` + Bean Validation (형식 검증)
- Service/Flow: 비즈니스 규칙 검증 (재고, 중복, 권한)
- 크로스 필드 검증은 커스텀 Validator

**의존성 주입:**
- 생성자 주입만 사용 (`@RequiredArgsConstructor` + `final`)
- 필드 주입(`@Autowired`) 금지

**Optional:**
- 반환 타입에만 사용, 파라미터/필드 금지
- 컬렉션은 Optional 대신 빈 리스트 반환
- `isPresent() + get()` 대신 `orElseThrow()`, `map()` 사용

**Response 표준화:**
- `ApiResponse<T>` 공통 wrapper: `{ success, data, error }`
- 에러: `{ code, message, fieldErrors }`

**API 설계:**
- URL Path 버저닝: `/api/v1/`
- RESTful 명명: 복수형 명사 (`/orders`, `/users`)
- `@DisplayName` 테스트 한글 설명 필수

**로깅:**
- SLF4J `@Slf4j` + 파라미터 바인딩 (문자열 연결 금지)
- `log.error`: 예상치 못한 오류만 (스택트레이스 포함)
- `log.warn`: 비즈니스 예외 (처리 가능한 실패)
- `log.info`: 비즈니스 이벤트 (주문 생성, 결제 완료)
- 민감 정보(비밀번호, 토큰) 로깅 금지

**테스트:**
- 단위(JUnit+Mockito) 70% + 슬라이스(@WebMvcTest, @DataJpaTest) 20% + 통합 10%
- `@SpringBootTest` 최소화 (핵심 플로우만)
- given-when-then 구조, `@DisplayName` 한글 설명

**명명 규칙:**
- Controller: `{Domain}Controller`, Service: `{Domain}Service`
- Request: `{Action}{Domain}Request`, Response: `{Domain}Response`
- 메서드: `create/get/find/update/delete` + 비즈니스 동작 (`cancel`, `approve`)

---

## Python/FastAPI

### 3계층 (Router → Service → Repository)

```
Router (얇은 진입점)
    ↓
Service (비즈니스 로직 + 오케스트레이션)
    ↓
Repository (데이터 접근)
```

- Python은 함수 기반이 관례 — 별도 Flow 클래스 불필요
- Service 함수가 직접 여러 Repository/다른 Service를 조합
- 복잡한 조합이 필요하면 Service 함수를 분리 (별도 클래스 대신)

```
app/
├── routers/          # API 라우터 (얇은 진입점)
├── services/         # 비즈니스 로직 + 오케스트레이션
├── repositories/     # 데이터 접근
├── models/           # SQLAlchemy 모델
├── schemas/          # Pydantic 스키마 (Request/Response)
├── core/             # 설정, 보안, DB 연결
└── middleware/        # 인증, 로깅
```

---

## Node.js/NestJS

### 3계층 (Controller → Service → Repository)

```
Controller (얇은 진입점)
    ↓
Service (비즈니스 로직 + 오케스트레이션)
    ↓
Repository (데이터 접근)
```

- NestJS는 클래스 기반이지만 Java처럼 Flow를 분리하는 관례는 없음
- Service가 다른 Service를 주입받아 조합 (Module DI가 순환 방지)
- 복잡한 조합은 별도 OrchestratorService 분리 가능 (선택)

```
src/modules/{feature}/
├── {feature}.controller.ts    # 얇은 진입점
├── {feature}.service.ts       # 비즈니스 로직 + 오케스트레이션
├── {feature}.repository.ts    # 데이터 접근
├── {feature}.module.ts
├── dto/                       # Request/Response DTO
└── entities/                  # DB 엔티티
```

---

## 프론트엔드 규칙

### API 추상화 레이어

- **모든 API 호출은 `apiClient.ts`를 통한다. URL 하드코딩 절대 금지.**
- `apiClient` = fetch 래퍼 (공통 헤더, 인증, 에러 처리)
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
├── hooks/                     # 공통 훅 (useDebounce 등)
├── pages/                     # 라우팅 단위
└── types/                     # 공통 타입
```

### API 호출 3계층 (TanStack Query)

```
apiClient.ts → {domain}Service.ts → queries.ts / mutations.ts
(HTTP 클라이언트)  (엔드포인트 정의)   (캐싱/로딩/리페치)
```

- **서버 상태**: TanStack Query (캐싱, 리페치, 로딩)
- **클라이언트 상태**: 별도 관리 (Context, Zustand 등)
- Query Key Factory 패턴: `userKeys.all`, `userKeys.lists()`, `userKeys.detail(id)`

### 에러 처리 3단계

```
apiClient.ts (401/403/500 공통) → TanStack Query (onError 토스트) → ErrorBoundary (최후 방어)
```

### 공통 컴포넌트

- 2개 이상 feature에서 사용 → 공통 추출
- 비즈니스 로직 금지 (순수 UI만)
- Props로 제어, 합성(Composition) 우선

---

## 공유 타입 (Contract-First)

- API 형상을 먼저 정의 → 백엔드/프론트 구현
- `shared/types/` 또는 `packages/types/` (모노레포)
- `ApiResponse<T>`, `PaginatedResponse<T>` 공유

---

## DB 연동 규칙

### 네이밍 컨벤션 (자동 변환으로 해결)

| 레이어 | 컨벤션 | 예시 |
|--------|--------|------|
| DB | `snake_case` | `first_name`, `created_at` |
| Java/TypeScript | `camelCase` | `firstName`, `createdAt` |
| API Response | `camelCase` | 프론트엔드 친화적 |

- **Spring Boot**: 기본 `CamelCaseToUnderscoresNamingStrategy` 사용 (설정 불필요)
- **TypeORM**: `SnakeNamingStrategy` 1줄 설정
- **Prisma**: `@map("snake_name")` 수동 매핑
- `@Column(name="...")` 은 예외 케이스에만 사용

### 자료형 매핑 (에러 다발 지점)

| 용도 | PostgreSQL | MySQL | Oracle | Java | TypeScript |
|------|-----------|-------|--------|------|------------|
| PK (대 정수) | `BIGINT` | `BIGINT` | `NUMBER(19)` | `Long` | **`string`** |
| 금액 | `NUMERIC(15,2)` | `DECIMAL(15,2)` | `NUMBER(15,2)` | `BigDecimal` | **`string`** |
| 날짜시간 (UTC) | `TIMESTAMPTZ` | `TIMESTAMP` | `TIMESTAMP WITH TIME ZONE` | `Instant` | **`string`** (ISO 8601) |
| Boolean | `BOOLEAN` | `TINYINT(1)` | `NUMBER(1)` | `Boolean` | `boolean` |
| ENUM | `VARCHAR(20)` | `VARCHAR(20)` | `VARCHAR2(20)` | Java `enum` | union type |
| UUID | `UUID` | `BINARY(16)` | `RAW(16)` | `UUID` | `string` |

> DB별 상세 매핑(SQLite, JSON, 커스텀 변환 등)은 `templates/db-integration.md` 참조

**금지:**
- `BigDecimal(19.99)` → `BigDecimal("19.99")` 문자열 생성자 필수
- `@Enumerated(EnumType.ORDINAL)` → 반드시 `STRING` 사용
- JS에서 BIGINT를 `number`로 처리 → `string`으로 전달
- DB 네이티브 ENUM → VARCHAR + Java enum (이식성 우선)
- Oracle `DATE` = 시간 포함 주의 (DATE ≠ Java LocalDate)

### 날짜/시간 3원칙

1. **DB**: UTC 저장 (`TIMESTAMP WITH TIME ZONE`)
2. **Backend/API**: UTC 처리 + ISO 8601 직렬화 (`write-dates-as-timestamps: false`)
3. **Frontend**: 표시 시점에만 로컬 변환 (`Intl.DateTimeFormat` 또는 `dayjs.tz()`)

### 스키마 관리

| 환경 | `ddl-auto` | 마이그레이션 |
|------|-----------|-------------|
| 개발 | `update` | 선택 |
| **운영** | **`validate`** | **Flyway/Liquibase 필수** |

- 마이그레이션 파일: `V1__create_users_table.sql` (Flyway 네이밍)
- DB 식별자는 항상 `snake_case` 소문자 (PostgreSQL 대소문자 함정 방지)
- 인용 부호(`"UserProfile"`) 사용 금지 → `user_profile`로 통일

### 프론트엔드 API 응답 검증 (Zod)

- API 응답을 Zod 스키마로 런타임 검증 → 타입 불일치 즉시 발견
- 타입은 `z.infer<typeof Schema>`로 추론 (중복 정의 금지)
- `safeParse()`로 검증, 실패 시 에러 로깅

---

## 체크리스트

**백엔드 (공통):**
- [ ] Controller/Router가 얇은가? (파싱 → 서비스 호출 → 응답만)
- [ ] 비즈니스 로직이 Service에 있는가?
- [ ] 데이터 접근이 Repository로 분리되었는가?
- [ ] Service 간 직접 호출 체인이 없는가?
- [ ] Entity/Model이 API 외부에 노출되지 않는가?

**백엔드 (Java/Spring Boot 추가):**
- [ ] Flow가 존재하는가? (단순 위임도 통일성 위해 유지)
- [ ] @Transactional이 Flow/Service에만 있는가?
- [ ] 생성자 주입 + final인가?
- [ ] 예외가 BusinessException 계층인가?

**프론트엔드:**
- [ ] 모든 API 호출이 apiClient를 통하는가?
- [ ] URL 하드코딩 없는가?
- [ ] API 호출이 feature/api/ 안에 있는가?
- [ ] 서버 상태(Query) / 클라이언트 상태 분리되었는가?
- [ ] 2회 이상 사용 UI가 공통 컴포넌트인가?

**DB 연동:**
- [ ] DB snake_case → 코드 camelCase 자동 변환이 설정되었는가?
- [ ] BIGINT/DECIMAL이 API에서 string으로 전달되는가?
- [ ] 날짜가 UTC로 저장되고 ISO 8601로 직렬화되는가?
- [ ] Enum이 문자열로 저장되는가? (Java: `@Enumerated(STRING)`)
- [ ] 운영 환경에서 마이그레이션 도구 사용인가? (Flyway/Alembic/Prisma Migrate)
- [ ] 프론트에서 Zod 등으로 API 응답 런타임 검증하는가?

**공통:**
- [ ] 순환 의존 없는가?
- [ ] 단일 책임 원칙 준수하는가?
- [ ] 에러 처리가 표준화되어 있는가?
- [ ] 프론트-백 공유 타입이 정의되어 있는가?
