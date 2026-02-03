# DB 연동 상세 코드 예시

프론트-백-DB 간 네이밍/자료형/타임존 불일치를 방지하는 전체 설정.

---

## DB별 자료형 매핑 테이블

### 정수형

| 용도 | PostgreSQL | MySQL | Oracle | SQLite | Java | TypeScript |
|------|-----------|-------|--------|--------|------|------------|
| 소 정수 | `SMALLINT` | `SMALLINT` | `NUMBER(5)` | `INTEGER` | `Short` | `number` |
| 기본 정수 | `INTEGER` | `INT` | `NUMBER(10)` | `INTEGER` | `Integer` | `number` |
| 대 정수 (PK) | `BIGINT` | `BIGINT` | `NUMBER(19)` | `INTEGER` | `Long` | **`string`** |
| 자동 증가 PK | `BIGINT GENERATED ALWAYS AS IDENTITY` | `BIGINT AUTO_INCREMENT` | `NUMBER GENERATED AS IDENTITY` | `INTEGER PRIMARY KEY AUTOINCREMENT` | `Long` | **`string`** |

### 실수/금액형

| 용도 | PostgreSQL | MySQL | Oracle | SQLite | Java | TypeScript |
|------|-----------|-------|--------|--------|------|------------|
| 금액 (정밀) | `NUMERIC(15,2)` | `DECIMAL(15,2)` | `NUMBER(15,2)` | `REAL` | `BigDecimal` | **`string`** |
| 부동소수 | `DOUBLE PRECISION` | `DOUBLE` | `BINARY_DOUBLE` | `REAL` | `Double` | `number` |

> SQLite는 고정 소수점 타입이 없음 — 금액 처리 시 정수(원 단위) 저장 권장

### 문자열형

| 용도 | PostgreSQL | MySQL | Oracle | SQLite | Java | TypeScript |
|------|-----------|-------|--------|--------|------|------------|
| 고정 길이 | `CHAR(n)` | `CHAR(n)` | `CHAR(n)` | `TEXT` | `String` | `string` |
| 가변 길이 | `VARCHAR(n)` | `VARCHAR(n)` | `VARCHAR2(n)` | `TEXT` | `String` | `string` |
| 긴 텍스트 | `TEXT` | `TEXT` / `LONGTEXT` | `CLOB` | `TEXT` | `String` | `string` |

> Oracle: `VARCHAR` 대신 `VARCHAR2` 사용 (Oracle 권장)

### 날짜/시간형

| 용도 | PostgreSQL | MySQL | Oracle | SQLite | Java | TypeScript |
|------|-----------|-------|--------|--------|------|------------|
| 날짜만 | `DATE` | `DATE` | `DATE` (시간 포함!) | `TEXT` | `LocalDate` | `string` |
| 날짜+시간 (UTC) | **`TIMESTAMPTZ`** | **`TIMESTAMP`** | **`TIMESTAMP WITH TIME ZONE`** | `TEXT` | **`Instant`** | **`string`** (ISO 8601) |
| 날짜+시간 (로컬) | `TIMESTAMP` | `DATETIME` | `TIMESTAMP` | `TEXT` | `LocalDateTime` | `string` |

> - PostgreSQL `TIMESTAMPTZ` = `TIMESTAMP WITH TIME ZONE` 약어
> - MySQL `TIMESTAMP`는 UTC 변환 지원, `DATETIME`은 변환 없음
> - Oracle `DATE`는 시간까지 포함 (YYYY-MM-DD HH:MI:SS) — 주의!
> - SQLite는 날짜 타입 없음 — ISO 8601 TEXT로 저장

### Boolean형

| DB | 타입 | 값 | 주의 |
|----|------|-----|------|
| **PostgreSQL** | `BOOLEAN` | `TRUE`/`FALSE` | 네이티브 지원 |
| **MySQL** | `BOOLEAN` (`TINYINT(1)`) | `1`/`0` | 실제로는 TINYINT 별칭 |
| **Oracle** | `NUMBER(1)` 또는 `CHAR(1)` | `1/0` 또는 `'Y'/'N'` | 네이티브 BOOLEAN 없음 (23c부터 지원) |
| **SQLite** | `INTEGER` | `1`/`0` | 네이티브 BOOLEAN 없음 |

```java
// JPA — DB별 자동 매핑 (Hibernate dialect이 처리)
@Column(nullable = false)
private Boolean isActive;

// Oracle 레거시: CHAR(1) 'Y'/'N' 매핑
@Column(nullable = false, length = 1)
@Convert(converter = YesNoConverter.class)
private Boolean isActive;

// YesNoConverter
@Converter
public class YesNoConverter implements AttributeConverter<Boolean, String> {
    @Override
    public String convertToDatabaseColumn(Boolean value) {
        return value != null && value ? "Y" : "N";
    }
    @Override
    public Boolean convertToEntityAttribute(String value) {
        return "Y".equalsIgnoreCase(value);
    }
}
```

### ENUM형

| DB | 방법 | 예시 |
|----|------|------|
| **PostgreSQL** | 네이티브 ENUM 또는 VARCHAR | `CREATE TYPE order_status AS ENUM ('PENDING', 'COMPLETED')` |
| **MySQL** | 네이티브 ENUM 또는 VARCHAR | `status ENUM('PENDING', 'COMPLETED')` |
| **Oracle** | VARCHAR + CHECK 제약 | `status VARCHAR2(20) CHECK (status IN ('PENDING', 'COMPLETED'))` |
| **SQLite** | TEXT + CHECK 제약 | `status TEXT CHECK (status IN ('PENDING', 'COMPLETED'))` |

```java
// 권장: DB 네이티브 ENUM 대신 VARCHAR + @Enumerated(STRING)
// → DB 이식성 확보, 마이그레이션 용이
@Enumerated(EnumType.STRING)
@Column(length = 20)
private OrderStatus status;
```

> **왜 VARCHAR 권장?** DB 네이티브 ENUM은 값 추가/삭제 시 ALTER TABLE 필요하고 DB마다 문법이 다름. VARCHAR + Java enum 조합이 이식성 최고.

### UUID형

| DB | 타입 | 저장 크기 |
|----|------|----------|
| **PostgreSQL** | `UUID` (네이티브) | 16 bytes |
| **MySQL** | `BINARY(16)` 또는 `CHAR(36)` | 16 또는 36 bytes |
| **Oracle** | `RAW(16)` 또는 `VARCHAR2(36)` | 16 또는 36 bytes |
| **SQLite** | `TEXT` 또는 `BLOB` | 36 또는 16 bytes |

```java
// PostgreSQL — 네이티브 UUID 지원
@Id
@GeneratedValue(strategy = GenerationType.UUID)
@Column(columnDefinition = "uuid")
private UUID id;

// MySQL — BINARY(16)으로 저장 (성능 최적)
@Id
@Column(columnDefinition = "BINARY(16)")
private UUID id;

// 범용 (모든 DB) — CHAR(36)
@Id
@Column(length = 36)
private String id = UUID.randomUUID().toString();
```

### JSON형

| DB | 타입 | 인덱싱 | 쿼리 |
|----|------|--------|------|
| **PostgreSQL** | `JSONB` (권장) / `JSON` | GIN 인덱스 가능 | `->`, `->>`, `@>` 연산자 |
| **MySQL** | `JSON` | 가상 컬럼 인덱스 | `->`, `->>` 연산자 |
| **Oracle** | `JSON` (21c+) / `CLOB` | JSON 인덱스 | `json_value()`, `json_query()` |
| **SQLite** | `TEXT` | 없음 | `json_extract()` (3.38+) |

```java
// JPA — JSON 컬럼 매핑 (Hibernate 6+)
@JdbcTypeCode(SqlTypes.JSON)
@Column(columnDefinition = "jsonb")  // PostgreSQL
private Map<String, Object> metadata;

// 또는 String으로 저장 + 수동 변환 (범용)
@Column(columnDefinition = "text")
private String metadataJson;
```

---

## DB별 대소문자 규칙

| DB | 기본 동작 | 주의사항 |
|----|----------|----------|
| **PostgreSQL** | 미인용 식별자 → **소문자로 변환** | `"UserProfile"` 인용 시 대소문자 구분 → 매번 인용 필요 → **금지** |
| **MySQL** | 테이블명: OS 의존 (Linux 대소문자 구분, Windows 무시) | `lower_case_table_names` 설정으로 통일 |
| **Oracle** | 미인용 식별자 → **대문자로 변환** | `"user_name"` 인용 시 소문자 유지 가능하지만 권장하지 않음 |
| **SQLite** | 대소문자 무시 | 제약 없음 |

**결론: 모든 DB에서 `snake_case` 소문자 + 인용 부호 없이 사용하면 이식성 최고**

---

## Hibernate Dialect 설정

```yaml
# application.yml — DB별 Dialect (Spring Boot 자동 감지하지만 명시 권장)
spring:
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect    # PostgreSQL
    # database-platform: org.hibernate.dialect.MySQLDialect       # MySQL
    # database-platform: org.hibernate.dialect.OracleDialect      # Oracle
    # database-platform: org.hibernate.dialect.SQLiteDialect      # SQLite (별도 의존성)
```

---

## Spring Boot 프로젝트 초기 설정

### application.yml (전체)

```yaml
spring:
  jpa:
    hibernate:
      naming:
        # 기본값 — camelCase → snake_case 자동 변환
        physical-strategy: org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy
      ddl-auto: validate          # 운영 필수 (개발은 update 가능)
    open-in-view: false           # OSIV 비활성화 (LazyInitializationException 방지)
    properties:
      hibernate:
        default_batch_fetch_size: 100
  jackson:
    serialization:
      write-dates-as-timestamps: false    # ISO 8601 문자열
    deserialization:
      fail-on-unknown-properties: false   # 알 수 없는 필드 무시
    default-property-inclusion: non_null  # null 필드 제외
    time-zone: UTC
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
```

### JVM 타임존 고정

```java
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(Application.class, args);
    }
}
```

### Jackson ObjectMapper 설정

```java
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return JsonMapper.builder()
            .addModule(new JavaTimeModule())                    // Java 8 날짜 지원
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)  // ISO 8601
            .serializationInclusion(JsonInclude.Include.NON_NULL)     // null 제외
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();
    }
}
```

---

## 네이밍 전략 설정

### Spring Boot/JPA (기본값 — 별도 설정 불필요)

```java
@Entity
@Table(name = "users")
public class User {
    private String firstName;       // → DB: first_name (자동)
    private String lastName;        // → DB: last_name (자동)
    private LocalDateTime createdAt; // → DB: created_at (자동)

    // 레거시 DB 컬럼명이 관례와 다를 때만 @Column
    @Column(name = "usr_email")
    private String email;
}
```

### TypeORM (NestJS)

```typescript
// app.module.ts
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // ...
      namingStrategy: new SnakeNamingStrategy(),  // 이 1줄로 해결
    }),
  ],
})
export class AppModule {}

// Entity — @Column 불필요
@Entity('users')
export class User {
  @Column()
  firstName: string;  // → DB: first_name (자동)

  @CreateDateColumn()
  createdAt: Date;    // → DB: created_at (자동)
}
```

### Prisma

```prisma
model User {
  id        Int      @id @default(autoincrement())
  firstName String   @map("first_name")     // 수동 매핑 필요
  lastName  String   @map("last_name")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("users")
}
```

---

## 자료형 매핑 상세

### BIGINT 처리

```java
// Java — BIGINT → Long (안전, 64-bit)
@Entity
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
}

// API Response — Long → String (JS 정밀도 보호)
public record OrderResponse(String id, ...) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(
            String.valueOf(order.getId()),  // Long → String
            ...
        );
    }
}
```

```typescript
// Frontend — string으로 수신
interface OrderResponse {
  id: string;  // "12345678901234567" — number로 하면 정밀도 손실
}
```

### DECIMAL / BigDecimal 처리

```java
// Entity
@Column(precision = 15, scale = 2)
private BigDecimal totalAmount;

// 생성 시 반드시 문자열 생성자
BigDecimal price = new BigDecimal("19.99");    // 정확
// BigDecimal price = new BigDecimal(19.99);   // 금지! 부정확

// 비교 시 compareTo (equals는 scale까지 비교해서 위험)
if (price.compareTo(BigDecimal.ZERO) > 0) { ... }

// Jackson 직렬화 — 개별 필드
@JsonSerialize(using = ToStringSerializer.class)
private BigDecimal totalAmount;

// 또는 DTO에서 String 변환
public record OrderResponse(String totalAmount) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(order.getTotalAmount().toPlainString());
    }
}
```

```typescript
// Frontend — 금액 표시
function formatCurrency(amountStr: string): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(Number(amountStr));
}

// 계산이 필요하면 decimal.js 사용
import Decimal from 'decimal.js';
const total = new Decimal(item.price).mul(item.quantity);
```

### ENUM 처리

```java
// Java — 반드시 STRING
public enum OrderStatus {
    PENDING, PROCESSING, COMPLETED, CANCELLED;
}

@Enumerated(EnumType.STRING)  // STRING 필수! ORDINAL은 순서 변경 시 DB 깨짐
@Column(length = 20)
private OrderStatus status;
```

```typescript
// TypeScript — union type
type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

// Zod 검증
const OrderStatusSchema = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED']);
```

### NULL 처리

```java
// Java Entity — nullable 컬럼
@Column                           // nullable = true (기본값)
private String nickname;

// Java Service — Optional 반환
public Optional<String> getNickname() {
    return Optional.ofNullable(nickname);
}

// DTO — @Nullable 또는 Optional 없이 null 허용
public record UserResponse(
    String id,
    String name,
    String nickname  // null 가능 — Jackson NON_NULL 설정으로 응답에서 제외
) {}
```

```typescript
// TypeScript — strictNullChecks 필수
// tsconfig.json: { "compilerOptions": { "strict": true } }

// Zod 스키마
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  nickname: z.string().nullable(),   // string | null
  bio: z.string().optional(),        // string | undefined
});
```

---

## 날짜/시간 처리

### DB 스키마

```sql
-- PostgreSQL — TIMESTAMP WITH TIME ZONE 사용
CREATE TABLE events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,     -- UTC 저장
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MySQL — DATETIME → TIMESTAMP 권장 (타임존 변환 지원)
CREATE TABLE events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Java Entity

```java
@Entity
public class Event {
    // Instant — UTC 기본, 타임존 정보 포함
    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant scheduledAt;

    // LocalDateTime은 타임존 정보가 없어 위험
    // 반드시 UTC 전제 하에서만 사용
}
```

### API 응답 (ISO 8601)

```json
{
  "createdAt": "2026-02-03T14:30:00.000Z",
  "scheduledAt": "2026-02-10T09:00:00.000Z"
}
```

### 프론트엔드 로컬 변환

```typescript
// 방법 1: 네이티브 Intl API
function formatDateTime(utcString: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(new Date(utcString));
}
// "2026-02-03T14:30:00.000Z" → "2026. 02. 03. 오후 11:30" (KST)

// 방법 2: dayjs
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

const local = dayjs.utc(utcString).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm');

// 사용자 입력 → UTC로 변환
const utcString = dayjs.tz(localInput, 'Asia/Seoul').utc().toISOString();
```

### 날짜 필터링 함정

```typescript
// 금지 — 로컬 날짜 그대로 전송 (타임존 오차)
fetch(`/api/orders?date=2026-02-03`);

// 올바른 예 — 로컬 날짜를 UTC 범위로 변환
function getLocalDayBoundsUTC(date: string, tz: string) {
  const start = dayjs.tz(date, tz).utc();
  const end = start.add(1, 'day');
  return { from: start.toISOString(), to: end.toISOString() };
}
// KST 2026-02-03 → UTC "2026-02-02T15:00:00Z" ~ "2026-02-03T15:00:00Z"
```

---

## Flyway 마이그레이션

### 파일 구조

```
src/main/resources/db/migration/
  V1__create_users_table.sql
  V2__create_orders_table.sql
  V3__add_index_on_orders_status.sql
```

### 네이밍 규칙

```sql
-- V1__create_users_table.sql
-- 모든 식별자 snake_case 소문자 (PostgreSQL 대소문자 함정 방지)
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_users_email UNIQUE (email)
);

-- 인덱스도 snake_case
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_email ON users (email);

-- 금지: "UserProfile", "firstName" 같은 대소문자 혼용
```

---

## Zod 스키마 전체 예시

```typescript
// schemas/order.ts
import { z } from 'zod';

export const OrderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.string(),    // DECIMAL → string
});

export const OrderSchema = z.object({
  id: z.string(),                // BIGINT → string
  orderNumber: z.string(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED']),
  totalAmount: z.string(),       // DECIMAL → string
  items: z.array(OrderItemSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export type Order = z.infer<typeof OrderSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;

// 페이징 응답 공통 스키마
export function paginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    content: z.array(itemSchema),
    page: z.number(),
    size: z.number(),
    totalElements: z.number(),
    totalPages: z.number(),
  });
}

export const PaginatedOrderSchema = paginatedSchema(OrderSchema);
export type PaginatedOrder = z.infer<typeof PaginatedOrderSchema>;
```

---

## 프로젝트 초기 설정 체크리스트

새 프로젝트 시작 시 한 번 설정하면 DB 연동 에러 대부분 예방:

| # | 항목 | 설정 |
|---|------|------|
| 1 | Hibernate 네이밍 | Spring Boot 기본값 (설정 불필요) |
| 2 | Jackson 날짜 | `write-dates-as-timestamps: false` |
| 3 | Jackson null | `default-property-inclusion: non_null` |
| 4 | JVM 타임존 | `TimeZone.setDefault(UTC)` |
| 5 | JavaTimeModule | ObjectMapper에 등록 |
| 6 | Flyway | `ddl-auto=validate` + Flyway enabled |
| 7 | tsconfig strict | `"strict": true` |
| 8 | Zod 스키마 | 각 API 엔드포인트별 정의 |
| 9 | OSIV | `open-in-view: false` |
