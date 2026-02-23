# EF Core 패턴 상세 가이드

`agents/dotnet-coding-standards.md` 규칙의 EF Core 상세 코드 예시.

---

## DbContext 설정

### 기본 DbContext

```csharp
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Item> Items => Set<Item>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Customer> Customers => Set<Customer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 현재 어셈블리의 모든 IEntityTypeConfiguration 자동 적용
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // 글로벌 쿼리 필터 (Soft Delete)
        modelBuilder.Entity<Item>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Order>().HasQueryFilter(e => !e.IsDeleted);
    }

    // SaveChanges 오버라이드 (Audit Trail)
    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        ApplyAuditInfo();
        return await base.SaveChangesAsync(ct);
    }

    private void ApplyAuditInfo()
    {
        var entries = ChangeTracker.Entries<IAuditable>();
        var now = DateTime.UtcNow;

        foreach (var entry in entries)
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    entry.Entity.UpdatedAt = now;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    break;
            }
        }
    }
}
```

### DI 등록

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("Default"),
        sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null);
            sqlOptions.CommandTimeout(30);
            sqlOptions.MigrationsAssembly("Infrastructure");
        });

    // 개발 환경에서만 상세 로깅
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});
```

---

## Entity 설계 (DDD 스타일)

### Base Entity

```csharp
// Audit 인터페이스
public interface IAuditable
{
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
}

// Soft Delete 인터페이스
public interface ISoftDeletable
{
    bool IsDeleted { get; set; }
    DateTime? DeletedAt { get; set; }
}

// Base Entity
public abstract class BaseEntity : IAuditable, ISoftDeletable
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
}
```

### 도메인 엔티티

```csharp
public class Order : BaseEntity
{
    public int CustomerId { get; private set; }
    public Customer Customer { get; private set; } = null!;
    public decimal TotalAmount { get; private set; }
    public OrderStatus Status { get; private set; }
    public string? Notes { get; private set; }

    // 내비게이션 프로퍼티 (private set)
    private readonly List<OrderItem> _items = [];
    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();

    // 팩토리 메서드
    public static Order Create(int customerId, string? notes = null) => new()
    {
        CustomerId = customerId,
        Status = OrderStatus.Pending,
        Notes = notes,
        TotalAmount = 0
    };

    // 도메인 메서드 (비즈니스 규칙 캡슐화)
    public void AddItem(int productId, string productName, int quantity, decimal unitPrice)
    {
        if (Status != OrderStatus.Pending)
            throw new InvalidOperationException("주문이 확정된 후에는 항목을 추가할 수 없습니다");

        var existingItem = _items.FirstOrDefault(i => i.ProductId == productId);
        if (existingItem is not null)
        {
            existingItem.UpdateQuantity(existingItem.Quantity + quantity);
        }
        else
        {
            _items.Add(new OrderItem(productId, productName, quantity, unitPrice));
        }

        RecalculateTotal();
    }

    public void Confirm()
    {
        if (Status != OrderStatus.Pending)
            throw new InvalidOperationException("대기 중인 주문만 확정할 수 있습니다");

        if (!_items.Any())
            throw new InvalidOperationException("항목이 없는 주문은 확정할 수 없습니다");

        Status = OrderStatus.Confirmed;
    }

    public void Cancel(string reason)
    {
        if (Status is OrderStatus.Shipped or OrderStatus.Completed)
            throw new InvalidOperationException("배송 후에는 취소할 수 없습니다");

        Status = OrderStatus.Cancelled;
        Notes = $"취소 사유: {reason}";
    }

    private void RecalculateTotal()
    {
        TotalAmount = _items.Sum(i => i.Quantity * i.UnitPrice);
    }
}

public class OrderItem
{
    public int Id { get; private set; }
    public int OrderId { get; private set; }
    public int ProductId { get; private set; }
    public string ProductName { get; private set; } = string.Empty;
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }

    // EF Core용 파라미터 없는 생성자
    private OrderItem() { }

    public OrderItem(int productId, string productName, int quantity, decimal unitPrice)
    {
        ProductId = productId;
        ProductName = productName;
        Quantity = quantity;
        UnitPrice = unitPrice;
    }

    public void UpdateQuantity(int newQuantity)
    {
        if (newQuantity <= 0) throw new ArgumentException("수량은 1 이상이어야 합니다");
        Quantity = newQuantity;
    }
}
```

---

## Fluent API 설정

### Entity Configuration

```csharp
public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.TotalAmount)
            .HasPrecision(18, 2);

        builder.Property(e => e.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(e => e.Notes)
            .HasMaxLength(500);

        // 1:N 관계
        builder.HasOne(e => e.Customer)
            .WithMany(c => c.Orders)
            .HasForeignKey(e => e.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        // private 필드 매핑
        builder.HasMany(e => e.Items)
            .WithOne()
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(e => e.Items)
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        // 인덱스
        builder.HasIndex(e => e.Status);
        builder.HasIndex(e => e.CustomerId);
        builder.HasIndex(e => new { e.CustomerId, e.CreatedAt })
            .IsDescending(false, true);
    }
}

public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ProductName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(e => e.UnitPrice)
            .HasPrecision(18, 2);

        builder.HasIndex(e => e.ProductId);
    }
}
```

---

## N+1 방지 패턴

### Include (Eager Loading)

```csharp
// ❌ N+1: Order 조회 후 Items를 개별 로드
var orders = await context.Orders.ToListAsync(ct);
foreach (var order in orders)
{
    var items = order.Items; // 각 주문마다 추가 쿼리!
}

// ✅ Include: 한 번에 로드
var orders = await context.Orders
    .Include(o => o.Items)
    .Include(o => o.Customer)
    .Where(o => o.Status == OrderStatus.Pending)
    .ToListAsync(ct);

// ✅ 중첩 Include
var orders = await context.Orders
    .Include(o => o.Items)
        .ThenInclude(i => i.Product)
            .ThenInclude(p => p.Category)
    .ToListAsync(ct);
```

### Select Projection (가장 효율적)

```csharp
// ✅ 필요한 컬럼만 선택 → 불필요한 데이터 전송 방지
var orderSummaries = await context.Orders
    .AsNoTracking()
    .Where(o => o.Status == OrderStatus.Pending)
    .Select(o => new OrderSummaryResponse(
        o.Id,
        o.Customer.Name,
        o.TotalAmount,
        o.Status.ToString(),
        o.Items.Count,
        o.CreatedAt))
    .ToListAsync(ct);
```

### Split Query (대량 관계)

```csharp
// 관계가 많아 Cartesian Explosion 발생 시
var orders = await context.Orders
    .Include(o => o.Items)
    .Include(o => o.Payments)
    .AsSplitQuery() // 별도 쿼리로 분리
    .ToListAsync(ct);
```

---

## Migration

### 기본 명령어

```bash
# 마이그레이션 생성
dotnet ef migrations add InitialCreate --project Infrastructure --startup-project Api

# 마이그레이션 적용
dotnet ef database update --project Infrastructure --startup-project Api

# SQL 스크립트 생성 (운영 배포용)
dotnet ef migrations script --idempotent --project Infrastructure --startup-project Api -o migrations.sql

# 마이그레이션 롤백
dotnet ef database update PreviousMigrationName --project Infrastructure --startup-project Api
```

### 데이터 시딩

```csharp
public class AppDbContextSeed
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (!await context.Items.AnyAsync())
        {
            var items = new List<Item>
            {
                new() { Name = "기본 아이템 1", Status = ItemStatus.Active },
                new() { Name = "기본 아이템 2", Status = ItemStatus.Active }
            };

            context.Items.AddRange(items);
            await context.SaveChangesAsync();
        }
    }
}

// Program.cs에서 실행
using var scope = app.Services.CreateScope();
var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
await context.Database.MigrateAsync();
await AppDbContextSeed.SeedAsync(context);
```

---

## 인덱스 설계

### Fluent API 인덱스

```csharp
public class ItemConfiguration : IEntityTypeConfiguration<Item>
{
    public void Configure(EntityTypeBuilder<Item> builder)
    {
        // 단일 컬럼 인덱스
        builder.HasIndex(e => e.Status);

        // 복합 인덱스 (순서 중요: 카디널리티 높은 것 먼저)
        builder.HasIndex(e => new { e.Status, e.CreatedAt })
            .IsDescending(false, true);

        // 유니크 인덱스
        builder.HasIndex(e => e.Email).IsUnique();

        // 필터 인덱스 (활성 데이터만)
        builder.HasIndex(e => e.Name)
            .HasFilter("[IsDeleted] = 0");

        // 포함 인덱스 (커버링 인덱스)
        builder.HasIndex(e => e.Status)
            .IncludeProperties(e => new { e.Name, e.CreatedAt });
    }
}
```

---

## Soft Delete

### 글로벌 쿼리 필터

```csharp
// DbContext에서 글로벌 필터 설정
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // ISoftDeletable 인터페이스를 구현한 모든 엔티티에 필터 적용
    foreach (var entityType in modelBuilder.Model.GetEntityTypes())
    {
        if (typeof(ISoftDeletable).IsAssignableFrom(entityType.ClrType))
        {
            modelBuilder.Entity(entityType.ClrType)
                .HasQueryFilter(GenerateQueryFilter(entityType.ClrType));
        }
    }
}

private static LambdaExpression GenerateQueryFilter(Type entityType)
{
    var parameter = Expression.Parameter(entityType, "e");
    var property = Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted));
    var condition = Expression.Equal(property, Expression.Constant(false));
    return Expression.Lambda(condition, parameter);
}
```

### Soft Delete 실행

```csharp
// 삭제 시 플래그만 변경
public async Task SoftDeleteAsync(int id, CancellationToken ct = default)
{
    var item = await context.Items.FindAsync([id], ct)
        ?? throw new NotFoundException($"Item {id} not found");

    item.IsDeleted = true;
    item.DeletedAt = DateTime.UtcNow;
    await context.SaveChangesAsync(ct);
}

// 삭제된 항목 포함 조회 (관리자용)
var allItems = await context.Items
    .IgnoreQueryFilters()
    .ToListAsync(ct);
```

---

## Audit Trail

### SaveChanges 인터셉터

```csharp
public class AuditInterceptor(IHttpContextAccessor httpContextAccessor)
    : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
    {
        var context = eventData.Context;
        if (context is null) return base.SavingChangesAsync(eventData, result, ct);

        var userId = httpContextAccessor.HttpContext?.User
            .FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";

        foreach (var entry in context.ChangeTracker.Entries<IAuditable>())
        {
            var now = DateTime.UtcNow;
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    entry.Entity.UpdatedAt = now;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    entry.Property(nameof(IAuditable.CreatedAt)).IsModified = false;
                    break;
            }
        }

        return base.SavingChangesAsync(eventData, result, ct);
    }
}

// 등록
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
{
    options.UseSqlServer(connectionString)
        .AddInterceptors(sp.GetRequiredService<AuditInterceptor>());
});
```

---

## ValueConverter

```csharp
// Enum → string 변환 (전역)
protected override void ConfigureConventions(ModelConfigurationBuilder configBuilder)
{
    configBuilder.Properties<ItemStatus>()
        .HaveConversion<string>()
        .HaveMaxLength(20);

    configBuilder.Properties<OrderStatus>()
        .HaveConversion<string>()
        .HaveMaxLength(20);
}

// 커스텀 변환 (JSON 저장)
public class JsonValueConverter<T> : ValueConverter<T, string>
{
    public JsonValueConverter() : base(
        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
        v => JsonSerializer.Deserialize<T>(v, (JsonSerializerOptions?)null)!)
    { }
}

// 사용
builder.Property(e => e.Metadata)
    .HasConversion(new JsonValueConverter<Dictionary<string, string>>())
    .HasColumnType("nvarchar(max)");
```

---

## Compiled Queries (고성능)

```csharp
// 자주 실행되는 쿼리를 미리 컴파일
public static class CompiledQueries
{
    public static readonly Func<AppDbContext, int, CancellationToken, Task<Item?>>
        GetItemById = EF.CompileAsyncQuery(
            (AppDbContext ctx, int id, CancellationToken ct) =>
                ctx.Items.AsNoTracking().FirstOrDefault(i => i.Id == id));

    public static readonly Func<AppDbContext, ItemStatus, CancellationToken, IAsyncEnumerable<Item>>
        GetItemsByStatus = EF.CompileAsyncQuery(
            (AppDbContext ctx, ItemStatus status, CancellationToken ct) =>
                ctx.Items.AsNoTracking().Where(i => i.Status == status));
}

// 사용
var item = await CompiledQueries.GetItemById(context, id, ct);
```

---

## Connection Pool 설정

```json
// appsettings.json
{
  "ConnectionStrings": {
    "Default": "Server=localhost;Database=MyApp;Trusted_Connection=true;TrustServerCertificate=true;Max Pool Size=100;Min Pool Size=5;Connection Timeout=30;Command Timeout=30"
  }
}
```

|설정|권장값|설명|
|---|---|---|
|Max Pool Size|100|최대 동시 연결 수|
|Min Pool Size|5|유휴 연결 최소 수|
|Connection Timeout|30초|연결 대기 타임아웃|
|Command Timeout|30초|쿼리 실행 타임아웃|
|EnableRetryOnFailure|3회|일시적 오류 자동 재시도|
