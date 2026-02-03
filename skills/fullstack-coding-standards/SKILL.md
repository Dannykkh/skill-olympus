---
name: fullstack-coding-standards
description: 풀스택 개발 코딩 표준 상세 가이드. 프론트엔드/백엔드 코드 예시 및 구조 템플릿 제공.
---

# Fullstack Coding Standards - 상세 가이드

패시브 에이전트(`agents/fullstack-coding-standards.md`)의 규칙에 대한 **상세 코드 예시**를 제공합니다.

---

## 프론트엔드 코드 예시

### apiClient.ts (fetch 래퍼)

```typescript
// src/lib/apiClient.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      ...options,
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login';
        throw new ApiError(401, 'Unauthorized');
      }
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  get<T>(endpoint: string) { return this.request<T>(endpoint); }
  post<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) });
  }
  put<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) });
  }
  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
```

### TanStack Query 3계층 예시

```typescript
// [1] features/user/api/userService.ts
import { apiClient } from '@/lib/apiClient';
import type { User, CreateUserDto } from '../types/user';

export const userService = {
  getAll: () => apiClient.get<User[]>('/users'),
  getById: (id: string) => apiClient.get<User>(`/users/${id}`),
  create: (data: CreateUserDto) => apiClient.post<User>('/users', data),
  update: (id: string, data: Partial<User>) => apiClient.put<User>(`/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
};
```

```typescript
// [2] features/user/api/keys.ts — Query Key Factory
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};
```

```typescript
// [3] features/user/api/queries.ts
import { useQuery } from '@tanstack/react-query';
import { userService } from './userService';
import { userKeys } from './keys';

export const useGetUsers = () =>
  useQuery({ queryKey: userKeys.lists(), queryFn: userService.getAll });

export const useGetUser = (id: string) =>
  useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userService.getById(id),
    enabled: !!id,
  });
```

```typescript
// [3] features/user/api/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from './userService';
import { userKeys } from './keys';

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
  });
};
```

### 공유 타입 예시

```typescript
// shared/types/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
}

// shared/types/common.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string; fieldErrors?: FieldError[] };
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FieldError {
  field: string;
  message: string;
}
```

---

## 백엔드 코드 예시

Java/Spring Boot 상세 코드 예시는 `templates/` 폴더 참조:

- **`templates/java-spring-boot.md`** — 4계층 구조, @Transactional, DTO 변환, 예외 처리, Validation, 테스트 패턴 전체 코드

---

## DB 연동 코드 예시

DB 설정 전체 코드는 `templates/db-integration.md` 참조.

### Spring Boot 필수 설정 (application.yml)

```yaml
spring:
  jpa:
    hibernate:
      # 기본값 — snake_case 자동 변환 (명시 안 해도 됨)
      naming:
        physical-strategy: org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy
      ddl-auto: validate          # 운영: validate, 개발: update
  jackson:
    serialization:
      write-dates-as-timestamps: false  # ISO 8601 문자열로 출력
    time-zone: UTC
  flyway:
    enabled: true
    locations: classpath:db/migration
```

### 자료형 매핑 예시

```java
// Entity - 올바른 타입 매핑
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                    // BIGINT → Long

    private BigDecimal totalAmount;     // DECIMAL → BigDecimal

    @Enumerated(EnumType.STRING)        // ENUM → STRING (ORDINAL 금지!)
    @Column(length = 20)
    private OrderStatus status;

    private Instant createdAt;          // TIMESTAMP WITH TIME ZONE → Instant

    private String firstName;           // → DB: first_name (자동 변환)
}
```

```java
// Response DTO - BIGINT/DECIMAL은 string으로 직렬화
public record OrderResponse(
    String id,                          // Long → String (JS 정밀도 보호)
    String totalAmount,                 // BigDecimal → String
    OrderStatus status,
    String createdAt                    // Instant → ISO 8601 String
) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(
            String.valueOf(order.getId()),
            order.getTotalAmount().toPlainString(),
            order.getStatus(),
            order.getCreatedAt().toString()
        );
    }
}
```

### 프론트엔드 Zod 검증

```typescript
import { z } from 'zod';

const OrderSchema = z.object({
  id: z.string(),                                    // BIGINT → string
  totalAmount: z.string(),                           // DECIMAL → string
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED']),
  createdAt: z.string().datetime(),                  // ISO 8601
  deletedAt: z.string().datetime().nullable(),       // NULL 허용
});

type Order = z.infer<typeof OrderSchema>;            // 타입 자동 추론

// API 호출 시 검증
async function fetchOrder(id: string): Promise<Order> {
  const data = await apiClient.get(`/orders/${id}`);
  const result = OrderSchema.safeParse(data);
  if (!result.success) {
    console.error('API 응답 스키마 불일치:', result.error.flatten());
    throw new Error('Invalid API response');
  }
  return result.data;
}
```

### 날짜 로컬 변환 (프론트엔드)

```typescript
// UTC → 로컬 표시
function formatDateTime(utcString: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(utcString));
}

// 사용자 입력 → UTC로 변환 후 API 전송
function toUTCString(localDate: Date): string {
  return localDate.toISOString();  // 항상 UTC
}
```

---

## 환경 설정 예시

```
# .env.development
VITE_API_URL=http://localhost:8000/api

# .env.production
VITE_API_URL=/api

# .env.staging
VITE_API_URL=https://staging-api.example.com/api
```

- 환경별 `.env` 파일 분리
- `.env`는 `.gitignore`에 추가 (`.env.example`만 커밋)

---

## 잘못된 예시 (금지 패턴)

```typescript
// 금지 - URL 하드코딩
fetch('http://localhost:8000/api/users');

// 금지 - apiClient를 거치지 않는 직접 fetch
fetch('/api/users');

// 금지 - 컴포넌트에서 직접 API 호출
function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers); // 금지
  }, []);
}

// 올바른 예
function UserList() {
  const { data: users, isLoading } = useGetUsers();  // TanStack Query 훅
  if (isLoading) return <Loading />;
  return <ul>{users?.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```
