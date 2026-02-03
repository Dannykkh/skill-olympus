# Java/Spring Boot 상세 코드 예시

4계층(Controller → Flow → Service → Repository) 구조의 전체 코드 예시.

---

## 패키지 구조

```
com.project/
├── domain/
│   └── order/
│       ├── controller/
│       │   └── OrderController.java
│       ├── dto/
│       │   ├── CreateOrderRequest.java
│       │   ├── OrderResponse.java
│       │   └── OrderItemRequest.java
│       ├── flow/
│       │   └── OrderFlow.java
│       ├── model/
│       │   ├── Order.java
│       │   └── OrderItem.java
│       ├── repository/
│       │   └── OrderRepository.java
│       ├── service/
│       │   └── OrderService.java
│       └── spec/
│           └── OrderSpec.java
├── global/
│   ├── config/
│   │   ├── SecurityConfig.java
│   │   └── JpaConfig.java
│   ├── exception/
│   │   ├── BusinessException.java
│   │   ├── EntityNotFoundException.java
│   │   ├── BusinessRuleViolationException.java
│   │   ├── ErrorCode.java
│   │   ├── ErrorResponse.java
│   │   └── GlobalExceptionHandler.java
│   └── common/
│       └── ApiResponse.java
└── infra/
    └── payment/
        └── PaymentGateway.java
```

---

## Controller (얇은 진입점)

```java
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderFlow orderFlow;

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        OrderResponse response = orderFlow.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ApiResponse<OrderResponse> getOrder(@PathVariable Long id) {
        return ApiResponse.success(orderFlow.getOrder(id));
    }

    @GetMapping
    public ApiResponse<Page<OrderResponse>> getOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(orderFlow.getOrders(PageRequest.of(page, size)));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> cancelOrder(@PathVariable Long id) {
        orderFlow.cancelOrder(id);
        return ApiResponse.success();
    }
}
```

---

## Flow (비즈니스 흐름 조정)

```java
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderFlow {

    private final OrderService orderService;
    private final ProductService productService;
    private final PaymentService paymentService;
    private final NotificationService notificationService;

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        // 1. 상품 검증 및 재고 확인
        List<Product> products = productService.validateAndGetProducts(
            request.items().stream().map(OrderItemRequest::productId).toList()
        );

        // 2. 재고 차감
        productService.decreaseStock(request.items());

        // 3. 주문 생성
        Order order = orderService.create(request, products);

        // 4. 결제 처리
        paymentService.processPayment(order);

        // 5. 알림 발송
        notificationService.sendOrderConfirmation(order);

        return OrderResponse.from(order);
    }

    public OrderResponse getOrder(Long id) {
        // 단순 위임도 Flow를 거침 (통일성)
        Order order = orderService.getById(id);
        return OrderResponse.from(order);
    }

    public Page<OrderResponse> getOrders(Pageable pageable) {
        return orderService.findAll(pageable).map(OrderResponse::from);
    }

    @Transactional
    public void cancelOrder(Long id) {
        Order order = orderService.getById(id);
        orderService.cancel(order);
        paymentService.refund(order);
        productService.restoreStock(order.getItems());
    }
}
```

---

## Service (단일 도메인 로직)

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;

    public Order getById(Long id) {
        return orderRepository.findById(id)
            .orElseThrow(() -> new OrderNotFoundException(id));
    }

    public Page<Order> findAll(Pageable pageable) {
        return orderRepository.findAll(pageable);
    }

    @Transactional
    public Order create(CreateOrderRequest request, List<Product> products) {
        Order order = Order.builder()
            .memberId(request.memberId())
            .orderNumber(generateOrderNumber())
            .status(OrderStatus.CREATED)
            .build();

        request.items().forEach(item -> {
            Product product = products.stream()
                .filter(p -> p.getId().equals(item.productId()))
                .findFirst()
                .orElseThrow(() -> new ProductNotFoundException(item.productId()));

            order.addItem(product, item.quantity());
        });

        return orderRepository.save(order);
    }

    @Transactional
    public void cancel(Order order) {
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new OrderAlreadyCancelledException(order.getId());
        }
        order.cancel();
    }

    private String generateOrderNumber() {
        return "ORD-" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE)
            + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
```

---

## DTO (record 사용)

```java
// Request DTO
public record CreateOrderRequest(
    @NotNull(message = "회원 ID는 필수입니다")
    Long memberId,

    @NotBlank(message = "배송지 주소는 필수입니다")
    @Size(max = 200, message = "배송지 주소는 200자 이내입니다")
    String shippingAddress,

    @NotEmpty(message = "주문 항목은 최소 1개 이상이어야 합니다")
    @Valid
    List<OrderItemRequest> items
) {}

public record OrderItemRequest(
    @NotNull(message = "상품 ID는 필수입니다")
    Long productId,

    @Min(value = 1, message = "수량은 1 이상이어야 합니다")
    @Max(value = 999, message = "수량은 999 이하여야 합니다")
    int quantity
) {}

// Response DTO
public record OrderResponse(
    Long id,
    String orderNumber,
    BigDecimal totalAmount,
    OrderStatus status,
    List<OrderItemResponse> items,
    LocalDateTime createdAt
) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(
            order.getId(),
            order.getOrderNumber(),
            order.getTotalAmount(),
            order.getStatus(),
            order.getItems().stream().map(OrderItemResponse::from).toList(),
            order.getCreatedAt()
        );
    }
}
```

---

## 예외 처리 계층

```java
// 최상위 비즈니스 예외
public abstract class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;

    protected BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() { return errorCode; }
}

// 404 계열
public class EntityNotFoundException extends BusinessException {
    public EntityNotFoundException(ErrorCode errorCode) {
        super(errorCode);
    }
}

// 409 계열
public class BusinessRuleViolationException extends BusinessException {
    public BusinessRuleViolationException(ErrorCode errorCode) {
        super(errorCode);
    }
}

// 구체 예외
public class OrderNotFoundException extends EntityNotFoundException {
    public OrderNotFoundException(Long id) {
        super(ErrorCode.ORDER_NOT_FOUND);
    }
}

public class OrderAlreadyCancelledException extends BusinessRuleViolationException {
    public OrderAlreadyCancelledException(Long id) {
        super(ErrorCode.ORDER_ALREADY_CANCELLED);
    }
}
```

```java
// ErrorCode enum
@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    INVALID_INPUT("C001", "잘못된 입력입니다"),
    INTERNAL_ERROR("C002", "내부 서버 오류입니다"),

    ORDER_NOT_FOUND("O001", "주문을 찾을 수 없습니다"),
    ORDER_ALREADY_CANCELLED("O002", "이미 취소된 주문입니다"),
    INSUFFICIENT_STOCK("O003", "재고가 부족합니다"),

    PRODUCT_NOT_FOUND("P001", "상품을 찾을 수 없습니다"),
    MEMBER_NOT_FOUND("M001", "회원을 찾을 수 없습니다"),
    DUPLICATE_EMAIL("M002", "이미 사용 중인 이메일입니다");

    private final String code;
    private final String message;
}
```

```java
// 글로벌 예외 핸들러
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(EntityNotFoundException e) {
        log.warn("Entity not found: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.error(e.getErrorCode()));
    }

    @ExceptionHandler(BusinessRuleViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConflict(BusinessRuleViolationException e) {
        log.warn("Business rule violation: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiResponse.error(e.getErrorCode()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e) {
        log.warn("Validation failed: {}", e.getMessage());
        List<FieldError> fieldErrors = e.getBindingResult().getFieldErrors().stream()
            .map(fe -> new FieldError(fe.getField(), fe.getDefaultMessage()))
            .toList();
        return ResponseEntity.badRequest()
            .body(ApiResponse.error(ErrorCode.INVALID_INPUT, fieldErrors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception e) {
        log.error("Unexpected error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error(ErrorCode.INTERNAL_ERROR));
    }
}
```

---

## 공통 응답 (ApiResponse)

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
    boolean success,
    T data,
    ErrorDetail error
) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static ApiResponse<Void> success() {
        return new ApiResponse<>(true, null, null);
    }

    public static ApiResponse<Void> error(ErrorCode errorCode) {
        return new ApiResponse<>(false, null,
            new ErrorDetail(errorCode.getCode(), errorCode.getMessage(), null));
    }

    public static ApiResponse<Void> error(ErrorCode errorCode, List<FieldError> fieldErrors) {
        return new ApiResponse<>(false, null,
            new ErrorDetail(errorCode.getCode(), errorCode.getMessage(), fieldErrors));
    }
}

public record ErrorDetail(String code, String message, List<FieldError> fieldErrors) {}
public record FieldError(String field, String message) {}
```

---

## 테스트 예시

### 단위 테스트 (Service)

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @InjectMocks
    private OrderService orderService;

    @Mock
    private OrderRepository orderRepository;

    @Test
    @DisplayName("존재하지 않는 주문 조회 시 예외가 발생한다")
    void getById_nonExistent_throwsException() {
        // given
        given(orderRepository.findById(999L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> orderService.getById(999L))
            .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    @DisplayName("이미 취소된 주문 취소 시 예외가 발생한다")
    void cancel_alreadyCancelled_throwsException() {
        // given
        Order order = OrderFixture.cancelled();

        // when & then
        assertThatThrownBy(() -> orderService.cancel(order))
            .isInstanceOf(OrderAlreadyCancelledException.class);
    }
}
```

### 슬라이스 테스트 (Controller)

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderFlow orderFlow;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("유효한 요청으로 주문 생성 시 201을 반환한다")
    void createOrder_valid_returns201() throws Exception {
        var request = new CreateOrderRequest(1L, "서울시 강남구",
            List.of(new OrderItemRequest(100L, 2)));
        var response = new OrderResponse(1L, "ORD-001",
            BigDecimal.valueOf(20000), OrderStatus.CREATED, List.of(), LocalDateTime.now());

        given(orderFlow.createOrder(any())).willReturn(response);

        mockMvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.orderNumber").value("ORD-001"));
    }

    @Test
    @DisplayName("필수 값 누락 시 400을 반환한다")
    void createOrder_invalid_returns400() throws Exception {
        var request = new CreateOrderRequest(null, "", List.of());

        mockMvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.fieldErrors").isArray());
    }
}
```

### 슬라이스 테스트 (Repository)

```java
@DataJpaTest
class OrderRepositoryTest {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("회원 ID로 주문 목록을 최신순으로 조회한다")
    void findByMemberId_returnsOrders() {
        // given - TestEntityManager로 데이터 삽입
        // when
        List<Order> orders = orderRepository.findByMemberIdOrderByCreatedAtDesc(1L);
        // then
        assertThat(orders).hasSize(2)
            .extracting(Order::getStatus)
            .containsExactly(OrderStatus.CREATED, OrderStatus.COMPLETED);
    }
}
```

---

## 로깅 패턴

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {

    public PaymentResult processPayment(Order order) {
        log.info("결제 처리 시작: orderId={}, amount={}", order.getId(), order.getTotalAmount());

        try {
            PaymentResult result = paymentGateway.charge(order);
            log.info("결제 완료: orderId={}, txId={}", order.getId(), result.transactionId());
            return result;
        } catch (PaymentGatewayException e) {
            log.warn("결제 실패: orderId={}, reason={}", order.getId(), e.getMessage());
            throw new PaymentFailedException(order.getId(), e);
        } catch (Exception e) {
            log.error("결제 처리 중 예상치 못한 오류: orderId={}", order.getId(), e);
            throw e;
        }
    }
}
```

**로그 레벨 기준:**
- `ERROR`: 즉각 대응 필요 (DB 연결 실패, 예상치 못한 예외) — 스택트레이스 포함
- `WARN`: 비즈니스 예외 (결제 실패, 재시도 성공)
- `INFO`: 비즈니스 이벤트 (주문 생성, 결제 완료, 배치 시작/종료)
- `DEBUG`: 개발 정보 (메서드 파라미터, 쿼리 결과)
