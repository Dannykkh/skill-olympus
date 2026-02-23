---
name: dotnet-coding-standards
description: ".NET 개발 코딩 표준. Clean Architecture 계층, NRT, async/await, DI 규칙. C# 파일 작성 시 자동 참조."
auto_apply:
  - "*.cs"
  - "*.csproj"
  - "*.razor"
---

# .NET Coding Standards (Passive)

C# / ASP.NET Core / EF Core 코드 작성 시 항상 적용되는 규칙.
상세 코드 예시 → `/dotnet-coding-standards` 스킬 참조.

---

## Clean Architecture 계층 규칙

```
Domain (엔티티, 인터페이스) ← 의존성 없음
    ↑
Application (서비스, DTO, Validator)
    ↑
Infrastructure (EF Core, 외부 서비스)
    ↑
Api (Controller / Minimal API)
```

- **Domain**: 다른 레이어에 의존하지 않음 (순수 C# 클래스)
- **Application**: Domain만 참조, Infrastructure/Api 참조 금지
- **Infrastructure**: Domain + Application 참조
- **Api**: Application + Infrastructure 참조 (DI 등록용)

---

## C# 코딩 규칙

### 필수 규칙

|규칙|설명|
|---|---|
|NRT 활성화|`<Nullable>enable</Nullable>` 항상|
|record DTO|불변 DTO는 `record` 사용|
|Primary Constructor|서비스 클래스에 primary constructor 사용 (.NET 8+)|
|async/await|DB 호출은 항상 비동기 + `CancellationToken` 전달|
|DateTime.UtcNow|`DateTime.Now` 사용 금지, UTC 기준|
|Entity 노출 금지|API 응답은 반드시 DTO 변환|
|Constructor Injection|Service Locator 패턴 금지|

### 네이밍 규칙

|대상|규칙|예시|
|---|---|---|
|클래스/레코드|PascalCase|`ItemService`, `ItemResponse`|
|인터페이스|I + PascalCase|`IItemService`, `IItemRepository`|
|메서드|PascalCase + Async|`GetByIdAsync`, `CreateAsync`|
|프로퍼티|PascalCase|`CreatedAt`, `IsActive`|
|private 필드|_camelCase|`_logger`, `_repository`|
|매개변수|camelCase|`itemRequest`, `cancellationToken`|
|상수|PascalCase|`MaxRetryCount`, `DefaultPageSize`|

---

## 서비스 계층 규칙

- 인터페이스 정의 → 구현 분리 (테스트 용이)
- 비즈니스 로직은 Service에 집중
- Controller/Endpoint는 요청 파싱 → 서비스 호출 → 응답 반환만
- Service 간 직접 의존 최소화 (필요 시 상위 Orchestrator 서비스)
- 트랜잭션은 Service 레이어에서 관리

---

## EF Core 규칙

- Fluent API 설정 (`IEntityTypeConfiguration<T>`)
- Lazy Loading 기본 사용 금지 → Eager Loading (`Include`)
- 읽기 전용 쿼리는 `AsNoTracking()` 사용
- Enum은 `HasConversion<string>()` (int 변환 금지)
- Migration으로 스키마 관리 (`dotnet ef migrations add`)

---

## 에러 처리 규칙

- `IExceptionHandler` (.NET 8+) 사용
- `ProblemDetails` RFC 7807 형식 응답
- 커스텀 예외: `NotFoundException`, `ConflictException`, `ForbiddenException`
- `catch (Exception)` 후 삼키기 금지 → 항상 로깅

---

## DI 등록 규칙

- Extension Method로 레이어별 DI 등록 분리
- `AddScoped` (요청 단위), `AddTransient` (매번 생성), `AddSingleton` (앱 수명)
- DB 관련: `AddScoped` 사용 (DbContext 수명과 일치)

---

## 체크리스트

**아키텍처:**
- [ ] Domain 레이어가 다른 레이어에 의존하지 않는가?
- [ ] Application 레이어가 Infrastructure를 직접 참조하지 않는가?
- [ ] DI가 Constructor Injection으로 되어 있는가?

**코드 품질:**
- [ ] NRT 활성화되어 있는가?
- [ ] Entity가 API 외부에 노출되지 않는가? (DTO 변환)
- [ ] 모든 DB 호출이 async + CancellationToken인가?
- [ ] DateTime.UtcNow 사용하고 있는가?

**EF Core:**
- [ ] Fluent API로 설정되어 있는가?
- [ ] 읽기 전용 쿼리에 AsNoTracking 적용했는가?
- [ ] N+1 쿼리가 없는가? (Include 또는 Select Projection)

**에러 처리:**
- [ ] IExceptionHandler가 등록되어 있는가?
- [ ] ProblemDetails 형식으로 응답하는가?
- [ ] 예외를 삼키지 않고 로깅하는가?
