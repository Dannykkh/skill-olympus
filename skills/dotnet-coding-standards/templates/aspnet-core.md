# ASP.NET Core 설정 & 패턴 상세 가이드

`agents/dotnet-coding-standards.md` 규칙의 ASP.NET Core 상세 코드 예시.

---

## Program.cs 전체 설정

```csharp
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog 설정
builder.Host.UseSerilog((context, config) =>
    config.ReadFrom.Configuration(context.Configuration));

// 서비스 등록
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// API 설정
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "My API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
});

// 예외 핸들러
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Health Checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database")
    .AddCheck<RedisHealthCheck>("redis");

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>()!)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

// 인증/인가
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// 미들웨어 파이프라인 (순서 중요!)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler();
app.UseSerilogRequestLogging();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
```

---

## Minimal API 상세

### 엔드포인트 그룹

```csharp
// Endpoints/ItemEndpoints.cs
public static class ItemEndpoints
{
    public static void MapItemEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/items")
            .WithTags("Items")
            .WithOpenApi()
            .RequireAuthorization();

        group.MapGet("/", GetAll)
            .WithSummary("아이템 목록 조회")
            .Produces<PagedResult<ItemResponse>>();

        group.MapGet("/{id:int}", GetById)
            .WithSummary("아이템 상세 조회")
            .Produces<ItemResponse>()
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/", Create)
            .WithSummary("아이템 생성")
            .Produces<ItemResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .AddEndpointFilter<ValidationFilter<CreateItemRequest>>();

        group.MapPut("/{id:int}", Update)
            .WithSummary("아이템 수정")
            .AddEndpointFilter<ValidationFilter<UpdateItemRequest>>();

        group.MapDelete("/{id:int}", Delete)
            .WithSummary("아이템 삭제")
            .Produces(StatusCodes.Status204NoContent);
    }

    private static async Task<Ok<PagedResult<ItemResponse>>> GetAll(
        [AsParameters] PagedQuery query, IItemService service, CancellationToken ct)
    {
        var result = await service.GetAllAsync(query.Page, query.Size, ct);
        return TypedResults.Ok(result);
    }

    private static async Task<Results<Ok<ItemResponse>, NotFound<ProblemDetails>>> GetById(
        int id, IItemService service, CancellationToken ct)
    {
        try
        {
            var result = await service.GetByIdAsync(id, ct);
            return TypedResults.Ok(result);
        }
        catch (NotFoundException)
        {
            return TypedResults.NotFound(new ProblemDetails { Detail = $"Item {id} not found" });
        }
    }

    private static async Task<Created<ItemResponse>> Create(
        CreateItemRequest request, IItemService service, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return TypedResults.Created($"/api/v1/items/{result.Id}", result);
    }

    private static async Task<Results<Ok<ItemResponse>, NotFound>> Update(
        int id, UpdateItemRequest request, IItemService service, CancellationToken ct)
    {
        var result = await service.UpdateAsync(id, request, ct);
        return TypedResults.Ok(result);
    }

    private static async Task<NoContent> Delete(
        int id, IItemService service, CancellationToken ct)
    {
        await service.DeleteAsync(id, ct);
        return TypedResults.NoContent();
    }
}

// 파라미터 바인딩
public record PagedQuery(int Page = 1, int Size = 20);
```

### Endpoint Filter (Validation)

```csharp
public class ValidationFilter<T>(IValidator<T> validator) : IEndpointFilter where T : class
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var argument = context.Arguments.OfType<T>().FirstOrDefault();
        if (argument is null)
            return TypedResults.BadRequest("Invalid request body");

        var result = await validator.ValidateAsync(argument);
        if (!result.IsValid)
        {
            return TypedResults.ValidationProblem(
                result.ToDictionary());
        }

        return await next(context);
    }
}
```

---

## Controller 상세

### 인증이 필요한 Controller

```csharp
[ApiController]
[Route("api/v1/[controller]")]
[Produces("application/json")]
[Authorize]
public class OrdersController(IOrderService orderService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<OrderResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        [FromQuery] OrderStatus? status = null,
        CancellationToken ct = default)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var result = await orderService.GetUserOrdersAsync(userId, page, size, status, ct);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(OrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateOrderRequest request, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var result = await orderService.CreateAsync(userId, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct)
    {
        var result = await orderService.GetByIdAsync(id, ct);
        return Ok(result);
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStatus(
        int id, [FromBody] UpdateStatusRequest request, CancellationToken ct)
    {
        var result = await orderService.UpdateStatusAsync(id, request.Status, ct);
        return Ok(result);
    }
}
```

---

## 미들웨어

### 요청 로깅 미들웨어

```csharp
public class RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            await next(context);
        }
        finally
        {
            stopwatch.Stop();
            if (stopwatch.ElapsedMilliseconds > 500)
            {
                logger.LogWarning(
                    "Slow request: {Method} {Path} took {Elapsed}ms (Status: {StatusCode})",
                    context.Request.Method,
                    context.Request.Path,
                    stopwatch.ElapsedMilliseconds,
                    context.Response.StatusCode);
            }
        }
    }
}

// 등록
app.UseMiddleware<RequestTimingMiddleware>();
```

---

## JWT 인증 서비스

```csharp
public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
}

public class TokenService(IConfiguration configuration) : ITokenService
{
    public string GenerateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!));

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"],
            audience: configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
}
```

---

## Options Pattern

```csharp
// 설정 클래스
public class JwtOptions
{
    public const string SectionName = "Jwt";
    public required string Key { get; init; }
    public required string Issuer { get; init; }
    public required string Audience { get; init; }
    public int ExpiryHours { get; init; } = 1;
}

public class DatabaseOptions
{
    public const string SectionName = "Database";
    public required string ConnectionString { get; init; }
    public int MaxRetryCount { get; init; } = 3;
    public int CommandTimeout { get; init; } = 30;
}

// 등록
builder.Services.Configure<JwtOptions>(
    builder.Configuration.GetSection(JwtOptions.SectionName));

// 사용 (IOptions<T>)
public class TokenService(IOptions<JwtOptions> jwtOptions) : ITokenService
{
    private readonly JwtOptions _jwt = jwtOptions.Value;
    // ...
}
```

---

## ProblemDetails 커스텀

```csharp
// 글로벌 예외 핸들러
public class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger,
    IHostEnvironment env) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context, Exception exception, CancellationToken ct)
    {
        var (statusCode, title, detail) = exception switch
        {
            NotFoundException e => (404, "Not Found", e.Message),
            ConflictException e => (409, "Conflict", e.Message),
            ForbiddenException e => (403, "Forbidden", e.Message),
            ValidationException e => (400, "Validation Error", e.Message),
            UnauthorizedAccessException e => (401, "Unauthorized", e.Message),
            _ => (500, "Internal Server Error",
                env.IsDevelopment() ? exception.ToString() : "An error occurred")
        };

        logger.LogError(exception, "Exception: {Title} - {Detail}", title, detail);

        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path,
            Extensions = { ["traceId"] = context.TraceIdentifier }
        }, ct);

        return true;
    }
}
```

---

## Health Checks

```csharp
// 커스텀 Health Check
public class RedisHealthCheck(IConnectionMultiplexer redis) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            var db = redis.GetDatabase();
            await db.PingAsync();
            return HealthCheckResult.Healthy("Redis is reachable");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Redis is unreachable", ex);
        }
    }
}

// 등록 + 엔드포인트
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database")
    .AddCheck<RedisHealthCheck>("redis");

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});
```

---

## Serilog 설정

```json
// appsettings.json
{
  "Serilog": {
    "Using": ["Serilog.Sinks.Console", "Serilog.Sinks.File"],
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft.AspNetCore": "Warning",
        "Microsoft.EntityFrameworkCore": "Warning"
      }
    },
    "WriteTo": [
      { "Name": "Console" },
      {
        "Name": "File",
        "Args": {
          "path": "logs/app-.log",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 30
        }
      }
    ],
    "Enrich": ["FromLogContext", "WithMachineName", "WithThreadId"]
  }
}
```

```csharp
// Program.cs
builder.Host.UseSerilog((context, config) =>
    config.ReadFrom.Configuration(context.Configuration));

app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("UserId",
            httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous");
    };
});
```

---

## appsettings.json 구조

```json
{
  "ConnectionStrings": {
    "Default": "Server=localhost;Database=MyApp;Trusted_Connection=true;TrustServerCertificate=true"
  },
  "Jwt": {
    "Key": "your-256-bit-secret-key-here-minimum-32-chars",
    "Issuer": "MyApp",
    "Audience": "MyApp",
    "ExpiryHours": 1
  },
  "Cors": {
    "Origins": ["http://localhost:3000", "http://localhost:5173"]
  },
  "Database": {
    "MaxRetryCount": 3,
    "CommandTimeout": 30
  }
}
```

> **주의**: `appsettings.json`에 민감 정보 직접 작성 금지.
> 개발: User Secrets (`dotnet user-secrets`), 운영: 환경변수 또는 Key Vault.
