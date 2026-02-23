# C# 코드 패턴 상세 가이드

`agents/dotnet-coding-standards.md` 규칙의 상세 코드 예시.

---

## Record DTO 패턴

### 기본 Record

```csharp
// 불변 Request/Response DTO
public record CreateItemRequest(
    [Required] [StringLength(200)] string Name,
    [StringLength(2000)] string? Description,
    [Range(0, double.MaxValue)] decimal Price);

public record UpdateItemRequest(
    [Required] [StringLength(200)] string Name,
    [StringLength(2000)] string? Description);

public record ItemResponse(
    int Id,
    string Name,
    string? Description,
    decimal Price,
    string Status,
    DateTime CreatedAt);

// 중첩 응답
public record OrderResponse(
    int Id,
    string CustomerName,
    decimal TotalAmount,
    string Status,
    List<OrderItemResponse> Items,
    DateTime CreatedAt);

public record OrderItemResponse(
    int ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice);
```

### DTO 변환 (Extension Method)

```csharp
public static class ItemMappingExtensions
{
    public static ItemResponse ToResponse(this Item item) => new(
        item.Id,
        item.Name,
        item.Description,
        item.Price,
        item.Status.ToString(),
        item.CreatedAt);

    public static Item ToEntity(this CreateItemRequest request) => new()
    {
        Name = request.Name,
        Description = request.Description ?? string.Empty,
        Price = request.Price,
        Status = ItemStatus.Active,
        CreatedAt = DateTime.UtcNow
    };

    public static List<ItemResponse> ToResponseList(this IEnumerable<Item> items)
        => items.Select(i => i.ToResponse()).ToList();
}
```

---

## Result 패턴 (예외 대신 반환값)

```csharp
// 제네릭 Result
public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
    public int? ErrorCode { get; }

    private Result(T value) { IsSuccess = true; Value = value; }
    private Result(string error, int? errorCode = null)
    {
        IsSuccess = false; Error = error; ErrorCode = errorCode;
    }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(string error, int? code = null) => new(error, code);

    public TResult Match<TResult>(
        Func<T, TResult> onSuccess,
        Func<string, TResult> onFailure)
        => IsSuccess ? onSuccess(Value!) : onFailure(Error!);
}

// 서비스에서 사용
public async Task<Result<ItemResponse>> CreateAsync(CreateItemRequest request, CancellationToken ct)
{
    if (await repository.ExistsByNameAsync(request.Name, ct))
        return Result<ItemResponse>.Failure("이름이 이미 존재합니다", 409);

    var item = request.ToEntity();
    await repository.AddAsync(item, ct);
    return Result<ItemResponse>.Success(item.ToResponse());
}

// Controller에서 처리
[HttpPost]
public async Task<IActionResult> Create(CreateItemRequest request, CancellationToken ct)
{
    var result = await itemService.CreateAsync(request, ct);
    return result.Match<IActionResult>(
        onSuccess: value => CreatedAtAction(nameof(GetById), new { id = value.Id }, value),
        onFailure: error => BadRequest(new ProblemDetails { Detail = error }));
}
```

---

## Pattern Matching 고급 예시

```csharp
// switch 식
public decimal CalculateDiscount(Customer customer, Order order) => customer.Tier switch
{
    CustomerTier.Gold when order.Total > 100_000m => order.Total * 0.15m,
    CustomerTier.Gold => order.Total * 0.10m,
    CustomerTier.Silver when order.Total > 50_000m => order.Total * 0.08m,
    CustomerTier.Silver => order.Total * 0.05m,
    CustomerTier.Bronze => order.Total * 0.02m,
    _ => 0m
};

// 프로퍼티 패턴
public string GetShippingLabel(Address address) => address switch
{
    { Country: "KR", City: "Seoul" } => "서울 당일배송",
    { Country: "KR" } => "국내 일반배송",
    { Country: "JP" or "CN" } => "아시아 국제배송",
    _ => "해외 국제배송"
};

// is 패턴 + 타입 검사
public IActionResult HandleResult(object result) => result switch
{
    NotFoundException e => NotFound(new ProblemDetails { Detail = e.Message }),
    ValidationException e => BadRequest(new ProblemDetails { Detail = e.Message }),
    null => NotFound(),
    _ => Ok(result)
};
```

---

## Extension Methods

```csharp
// 문자열 확장
public static class StringExtensions
{
    public static string ToSlug(this string value)
        => Regex.Replace(value.ToLower().Trim(), @"[^a-z0-9\s-]", "")
            .Replace(" ", "-");

    public static string Truncate(this string value, int maxLength)
        => value.Length <= maxLength ? value : value[..maxLength] + "...";
}

// IQueryable 확장 (페이징)
public static class QueryableExtensions
{
    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> query, int page, int pageSize, CancellationToken ct = default)
    {
        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return new PagedResult<T>(items, total, page, pageSize);
    }
}

// 사용
var result = await context.Items
    .AsNoTracking()
    .Where(i => i.Status == ItemStatus.Active)
    .OrderByDescending(i => i.CreatedAt)
    .Select(i => i.ToResponse())
    .ToPagedResultAsync(page, size, ct);
```

---

## Generic Repository (선택적)

```csharp
// 기본 인터페이스
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<List<T>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(T entity, CancellationToken ct = default);
    Task UpdateAsync(T entity, CancellationToken ct = default);
    Task DeleteAsync(T entity, CancellationToken ct = default);
}

// 기본 구현
public class Repository<T>(AppDbContext context) : IRepository<T> where T : class
{
    protected readonly DbSet<T> DbSet = context.Set<T>();

    public virtual async Task<T?> GetByIdAsync(int id, CancellationToken ct = default)
        => await DbSet.FindAsync([id], ct);

    public virtual async Task<List<T>> GetAllAsync(CancellationToken ct = default)
        => await DbSet.AsNoTracking().ToListAsync(ct);

    public async Task AddAsync(T entity, CancellationToken ct = default)
    {
        DbSet.Add(entity);
        await context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(T entity, CancellationToken ct = default)
    {
        DbSet.Update(entity);
        await context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(T entity, CancellationToken ct = default)
    {
        DbSet.Remove(entity);
        await context.SaveChangesAsync(ct);
    }
}

// 도메인별 확장
public interface IItemRepository : IRepository<Item>
{
    Task<bool> ExistsByNameAsync(string name, CancellationToken ct = default);
    Task<List<Item>> GetByStatusAsync(ItemStatus status, CancellationToken ct = default);
}

public class ItemRepository(AppDbContext context) : Repository<Item>(context), IItemRepository
{
    public async Task<bool> ExistsByNameAsync(string name, CancellationToken ct = default)
        => await DbSet.AnyAsync(i => i.Name == name, ct);

    public async Task<List<Item>> GetByStatusAsync(ItemStatus status, CancellationToken ct = default)
        => await DbSet.AsNoTracking().Where(i => i.Status == status).ToListAsync(ct);
}
```

---

## Domain Events

```csharp
// 이벤트 정의
public record OrderCreatedEvent(int OrderId, int CustomerId, decimal Total);
public record OrderStatusChangedEvent(int OrderId, OrderStatus OldStatus, OrderStatus NewStatus);

// MediatR Notification
public class OrderCreatedHandler(
    INotificationService notifications,
    ILogger<OrderCreatedHandler> logger) : INotificationHandler<OrderCreatedEvent>
{
    public async Task Handle(OrderCreatedEvent notification, CancellationToken ct)
    {
        logger.LogInformation("Order {OrderId} created for customer {CustomerId}",
            notification.OrderId, notification.CustomerId);

        await notifications.SendAsync(
            $"새 주문이 접수되었습니다. 주문번호: {notification.OrderId}", ct);
    }
}
```

---

## FluentValidation 고급

```csharp
public class CreateOrderRequestValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderRequestValidator()
    {
        RuleFor(x => x.CustomerId)
            .GreaterThan(0).WithMessage("유효한 고객 ID가 필요합니다");

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("주문 항목이 필요합니다")
            .Must(items => items.Count <= 50).WithMessage("주문 항목은 최대 50개입니다");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).GreaterThan(0);
            item.RuleFor(i => i.Quantity).InclusiveBetween(1, 999);
        });

        RuleFor(x => x.ShippingAddress)
            .NotNull().WithMessage("배송 주소가 필요합니다")
            .SetValidator(new AddressValidator());
    }
}
```

---

## xUnit 테스트 패턴

```csharp
public class ItemServiceTests
{
    private readonly Mock<IItemRepository> _repository = new();
    private readonly Mock<ILogger<ItemService>> _logger = new();
    private readonly ItemService _sut;

    public ItemServiceTests()
    {
        _sut = new ItemService(_repository.Object, _logger.Object);
    }

    [Fact]
    public async Task GetByIdAsync_ExistingItem_ReturnsResponse()
    {
        // Arrange
        var item = new Item { Id = 1, Name = "Test", Status = ItemStatus.Active };
        _repository.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(item);

        // Act
        var result = await _sut.GetByIdAsync(1);

        // Assert
        Assert.Equal(1, result.Id);
        Assert.Equal("Test", result.Name);
    }

    [Fact]
    public async Task GetByIdAsync_NonExisting_ThrowsNotFoundException()
    {
        // Arrange
        _repository.Setup(r => r.GetByIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Item?)null);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(
            () => _sut.GetByIdAsync(999));
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public async Task CreateAsync_InvalidName_ThrowsValidationException(string? name)
    {
        // Arrange
        var request = new CreateItemRequest(name!, null, 0);

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.CreateAsync(request));
    }
}
```
