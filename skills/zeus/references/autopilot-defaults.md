# Autopilot Defaults - 산업별 기본값 프리셋

Zeus가 인터뷰를 자동 생성할 때 사용하는 산업별 기본값.

---

## 공통 기본값 (모든 프로젝트)

### 비기능 요구사항

| 항목 | 기본값 |
|------|--------|
| 동시 사용자 | 100명 |
| 응답 시간 | < 2초 |
| 가용성 | 99% |
| 데이터 보존 | 1년 |
| 언어 | 한국어 (i18n 미적용) |
| 인증 | JWT + 이메일/비밀번호 |
| 권한 | ADMIN / USER 2단계 |

### UI/UX 기본값

| 항목 | 기본값 |
|------|--------|
| 디자인 톤 | 깔끔하고 모던한 미니멀 |
| 컬러 | Primary: #3B82F6 (Blue), Accent: #10B981 (Green) |
| 폰트 | Pretendard (한글), Inter (영문) |
| 레이아웃 | 반응형 (모바일 우선) |
| 다크모드 | 미지원 (v1) |
| 컴포넌트 | shadcn/ui 또는 MUI |

### 기술 공통

| 항목 | 기본값 |
|------|--------|
| 상태관리 (React) | Zustand + TanStack Query |
| ORM (Spring Boot) | Spring Data JPA |
| ORM (Node.js) | Prisma |
| ORM (Python) | SQLAlchemy |
| 마이그레이션 | Flyway (Java), Prisma Migrate (Node), Alembic (Python) |
| 테스트 | Jest/Vitest (FE), JUnit/Pytest (BE), Playwright (E2E) |
| 배포 | Docker Compose (개발), 프로덕션은 v2 |

---

## 산업별 프리셋

### ecommerce (이커머스)

```yaml
roles:
  - ADMIN: 상품관리, 주문관리, 회원관리, 대시보드
  - SELLER: 상품등록, 주문처리, 정산 (멀티셀러 시)
  - USER: 상품검색, 장바구니, 주문, 리뷰

entities:
  - Product: name, description, price, stock, images[], category
  - Category: name, parentId (계층구조)
  - Cart: userId, items[{productId, quantity}]
  - Order: userId, items[], totalPrice, status, shippingAddress
  - OrderStatus: PENDING → PAID → SHIPPING → DELIVERED → CANCELLED
  - Review: userId, productId, rating(1-5), content
  - User: email, password, name, address, role

pages:
  - /: 메인 (인기 상품, 카테고리)
  - /products: 상품 목록 (검색, 필터, 정렬)
  - /products/:id: 상품 상세 (이미지, 설명, 리뷰)
  - /cart: 장바구니
  - /checkout: 결제
  - /orders: 주문 내역
  - /admin: 관리자 대시보드
  - /auth: 로그인/회원가입

api_count: ~25개
estimated_sections: 6~8
```

### healthcare (의료)

```yaml
roles:
  - ADMIN: 시스템관리, 의사관리, 통계
  - DOCTOR: 진료, 처방, 환자기록 조회
  - PATIENT: 예약, 진료기록 조회, 처방전 확인

entities:
  - Patient: name, birthDate, phone, medicalHistory
  - Doctor: name, specialty, schedule
  - Appointment: patientId, doctorId, dateTime, status, notes
  - MedicalRecord: patientId, doctorId, diagnosis, prescription, date
  - Prescription: recordId, medications[], instructions

pages:
  - /: 대시보드 (오늘 예약, 통계)
  - /appointments: 예약 관리 (캘린더 뷰)
  - /patients: 환자 목록/검색
  - /patients/:id: 환자 상세 (진료 이력)
  - /records: 진료기록
  - /auth: 로그인

api_count: ~20개
estimated_sections: 5~7
```

### education (교육/LMS)

```yaml
roles:
  - ADMIN: 시스템관리, 강사관리, 통계
  - INSTRUCTOR: 강의생성, 과제관리, 성적입력
  - STUDENT: 수강, 과제제출, 성적확인

entities:
  - Course: title, description, instructorId, schedule, capacity
  - Enrollment: studentId, courseId, status, enrolledAt
  - Lesson: courseId, title, content, order, materials[]
  - Assignment: courseId, title, description, dueDate
  - Submission: assignmentId, studentId, content, grade, feedback
  - Attendance: studentId, courseId, date, status

pages:
  - /: 대시보드 (내 강의, 공지)
  - /courses: 강의 목록
  - /courses/:id: 강의 상세 (커리큘럼, 수강생)
  - /assignments: 과제 목록
  - /grades: 성적 확인
  - /admin: 관리자 대시보드

api_count: ~22개
estimated_sections: 5~7
```

### productivity (생산성/할일)

```yaml
roles:
  - USER: 태스크CRUD, 카테고리관리

entities:
  - Task: title, description, status, priority, dueDate, categoryId, userId
  - TaskStatus: TODO → IN_PROGRESS → DONE
  - Priority: LOW / MEDIUM / HIGH / URGENT
  - Category: name, color, userId

pages:
  - /: 대시보드 (오늘 할일, 통계)
  - /tasks: 태스크 목록 (필터, 정렬, 검색)
  - /tasks/:id: 태스크 상세/편집
  - /categories: 카테고리 관리
  - /auth: 로그인/회원가입

api_count: ~12개
estimated_sections: 3~5
```

### social (소셜/커뮤니티)

```yaml
roles:
  - ADMIN: 콘텐츠 관리, 사용자 관리, 신고 처리
  - USER: 글쓰기, 댓글, 좋아요, 팔로우

entities:
  - Post: authorId, content, images[], likes, createdAt
  - Comment: postId, authorId, content, createdAt
  - Like: userId, postId
  - Follow: followerId, followingId
  - User: email, password, name, bio, avatar
  - Notification: userId, type, content, isRead

pages:
  - /: 피드 (팔로우한 사람 글)
  - /explore: 인기 게시글
  - /post/:id: 게시글 상세
  - /profile/:id: 프로필 (글 목록, 팔로워)
  - /notifications: 알림
  - /auth: 로그인/회원가입

api_count: ~20개
estimated_sections: 5~7
```

### food-delivery (배달)

```yaml
roles:
  - ADMIN: 전체 관리, 통계
  - OWNER: 가게관리, 메뉴관리, 주문처리
  - USER: 메뉴검색, 주문, 리뷰

entities:
  - Restaurant: name, address, phone, category, ownerId
  - Menu: restaurantId, name, description, price, image, isAvailable
  - Order: userId, restaurantId, items[], totalPrice, status, deliveryAddress
  - OrderStatus: PENDING → ACCEPTED → PREPARING → DELIVERING → DELIVERED
  - Review: userId, restaurantId, rating, content

pages:
  - /: 메인 (인근 가게, 인기 메뉴)
  - /restaurants: 가게 목록 (카테고리, 거리순)
  - /restaurants/:id: 가게 상세 (메뉴)
  - /cart: 장바구니
  - /orders: 주문 내역
  - /orders/:id: 주문 상세 (배달 추적)
  - /owner: 가게 관리 대시보드

api_count: ~25개
estimated_sections: 6~8
```

### booking (예약/숙소)

```yaml
roles:
  - ADMIN: 전체 관리, 통계
  - HOST: 숙소등록, 예약관리, 정산
  - GUEST: 검색, 예약, 리뷰

entities:
  - Property: hostId, name, description, address, price, images[], amenities[]
  - Booking: guestId, propertyId, checkIn, checkOut, guests, totalPrice, status
  - BookingStatus: PENDING → CONFIRMED → CHECKED_IN → COMPLETED → CANCELLED
  - Review: guestId, propertyId, rating, content
  - Availability: propertyId, date, isAvailable, price

pages:
  - /: 검색 (지역, 날짜, 인원)
  - /properties: 숙소 목록 (지도 뷰, 필터)
  - /properties/:id: 숙소 상세 (사진, 설명, 리뷰, 캘린더)
  - /bookings: 예약 내역
  - /host: 호스트 대시보드
  - /auth: 로그인/회원가입

api_count: ~22개
estimated_sections: 5~7
```

### general (범용)

```yaml
roles:
  - ADMIN: 시스템관리
  - USER: 기본 CRUD

entities:
  - (설명에서 추출)
  - User: email, password, name, role

pages:
  - /: 메인
  - /auth: 로그인/회원가입
  - /admin: 관리자 (hasUI일 때)
  - (설명에서 추출)

api_count: ~10개
estimated_sections: 3~5
```

---

## 기술스택별 추가 기본값

### React + Spring Boot

```yaml
frontend:
  build: Vite
  state: Zustand + TanStack Query
  router: React Router v7
  ui: shadcn/ui + Tailwind CSS
  test: Vitest + Playwright

backend:
  java: 21
  spring: 3.x
  build: Gradle (Kotlin DSL)
  db: PostgreSQL 16
  orm: Spring Data JPA
  auth: Spring Security + JWT
  test: JUnit 5 + Mockito
  migration: Flyway
  api-docs: SpringDoc (OpenAPI 3)
```

### React + Express/NestJS

```yaml
frontend:
  build: Vite
  state: Zustand + TanStack Query
  router: React Router v7
  ui: shadcn/ui + Tailwind CSS
  test: Vitest + Playwright

backend:
  runtime: Node.js 22
  language: TypeScript 5.x
  orm: Prisma
  auth: Passport.js + JWT
  test: Jest + Supertest
  migration: Prisma Migrate
  validation: Zod (Express) / class-validator (NestJS)
```

### React + FastAPI

```yaml
frontend:
  build: Vite
  state: Zustand + TanStack Query
  router: React Router v7
  ui: shadcn/ui + Tailwind CSS
  test: Vitest + Playwright

backend:
  python: 3.12+
  orm: SQLAlchemy 2.0 + async
  auth: python-jose + bcrypt
  test: pytest + httpx
  migration: Alembic
  validation: Pydantic v2
```
