# Description Parser - 설명문 파싱 규칙

사용자의 한 줄 설명에서 구조화된 데이터를 추출하는 규칙.

---

## 추출 대상

```
{
  industry: string,         // 산업군
  techStack: {
    frontend: string | null,
    backend: string | null,
    db: string | null,
    mobile: string | null,
    infra: string | null
  },
  features: string[],       // 핵심 기능 목록
  projectType: string,      // fullstack-web | api-only | static-site | cli | mobile | library
  hasUI: boolean,
  hasDB: boolean,
  hasAPI: boolean,
  projectName: string       // 추론된 프로젝트명 (kebab-case)
}
```

---

## 1. 산업군 매칭 테이블

| 키워드 | 산업군 | 기본 기능 세트 |
|--------|--------|----------------|
| 쇼핑몰, 이커머스, 마켓, 상점, 스토어 | ecommerce | 상품관리, 장바구니, 결제, 주문, 회원, 검색, 리뷰 |
| 병원, 의료, 진료, 예약 | healthcare | 환자관리, 예약, 진료기록, 처방, 대시보드 |
| 은행, 금융, 핀테크, 계좌 | finance | 계좌관리, 거래내역, 이체, 대시보드, 알림 |
| 학교, 교육, LMS, 강의, 학원 | education | 강의관리, 수강생, 출석, 과제, 성적, 대시보드 |
| 음식, 배달, 레스토랑, 주문 | food-delivery | 메뉴관리, 주문, 배달추적, 결제, 리뷰, 가게관리 |
| 소셜, SNS, 커뮤니티, 게시판 | social | 게시글, 댓글, 좋아요, 팔로우, 알림, 프로필 |
| 예약, 호텔, 숙소, 펜션 | booking | 숙소관리, 예약, 결제, 리뷰, 캘린더, 대시보드 |
| 뉴스, 블로그, CMS, 콘텐츠 | content | 글작성, 카테고리, 태그, 검색, 댓글, 관리자 |
| 채팅, 메신저, 실시간 | messaging | 채팅방, 메시지, 파일공유, 알림, 사용자관리 |
| 할일, 투두, 태스크, 프로젝트관리, 칸반 | productivity | 태스크CRUD, 카테고리, 우선순위, 마감일, 대시보드 |
| 게임, RPG | gaming | 캐릭터, 인벤토리, 점수, 랭킹, 설정 |
| 물류, 재고, 창고, 입출고 | logistics | 재고관리, 입출고, 거래처, 대시보드, 보고서 |
| IoT, 센서, 디바이스, 모니터링 | iot | 디바이스관리, 데이터수집, 대시보드, 알림, 설정 |

**매칭 안 될 경우**: industry = "general", 기능은 설명에서 직접 추출

---

## 2. 기술스택 추출 정규식

### 프론트엔드

| 패턴 | 매칭 기술 |
|------|-----------|
| `react|리액트` | React |
| `next\.?js|넥스트` | Next.js |
| `vue|뷰` | Vue.js |
| `angular|앵귤러` | Angular |
| `svelte|스벨트` | Svelte |

### 백엔드

| 패턴 | 매칭 기술 |
|------|-----------|
| `spring\s*boot|스프링` | Spring Boot |
| `express|익스프레스` | Express.js |
| `nestjs|네스트` | NestJS |
| `fastapi|파이썬` | FastAPI |
| `django|장고` | Django |
| `flask|플라스크` | Flask |
| `rails|루비` | Ruby on Rails |
| `go|golang` | Go |

### 데이터베이스

| 패턴 | 매칭 기술 |
|------|-----------|
| `postgres|postgresql|포스트그레` | PostgreSQL |
| `mysql|마이에스큐엘` | MySQL |
| `mongodb|몽고` | MongoDB |
| `sqlite` | SQLite |
| `supabase|수파베이스` | Supabase (PostgreSQL) |
| `redis|레디스` | Redis |

### 모바일

| 패턴 | 매칭 기술 |
|------|-----------|
| `react\s*native|RN` | React Native |
| `flutter|플러터` | Flutter |
| `swift|ios` | Swift (iOS) |
| `kotlin|android` | Kotlin (Android) |

---

## 3. DB 미명시 시 추론 규칙

| 백엔드 | 기본 DB |
|--------|---------|
| Spring Boot | PostgreSQL |
| Express.js / NestJS | PostgreSQL |
| FastAPI / Django | PostgreSQL |
| Flask | SQLite |
| Ruby on Rails | PostgreSQL |
| Go | PostgreSQL |
| 미명시 | PostgreSQL |

---

## 4. 프로젝트 타입 판별

```
if (techStack.frontend && techStack.backend) → "fullstack-web"
if (techStack.frontend && !techStack.backend) → "static-site"
if (!techStack.frontend && techStack.backend) → "api-only"
if (techStack.mobile) → "mobile"
if (키워드에 "CLI" 또는 "명령어") → "cli"
if (키워드에 "라이브러리" 또는 "패키지") → "library"
기본값 → "fullstack-web"
```

---

## 5. 프로젝트명 추론

설명에서 핵심 명사를 추출하여 kebab-case로 변환:

```
"쇼핑몰 만들어줘" → "shopping-mall"
"할일 관리 앱" → "todo-app"
"병원 예약 시스템" → "hospital-booking"
```

---

## 6. 기능 추출 우선순위

1. 설명에 명시된 기능 키워드 (최우선)
2. 산업군 기본 기능 세트
3. 공통 기능 자동 추가:
   - hasUI → 회원가입/로그인
   - hasDB → CRUD 기본
   - hasAPI → 에러 핸들링, 인증

---

## 7. 파싱 결과 예시

### 입력: "쇼핑몰 만들어줘. React+Spring Boot"

```
{
  industry: "ecommerce",
  techStack: {
    frontend: "React",
    backend: "Spring Boot",
    db: "PostgreSQL",
    mobile: null,
    infra: null
  },
  features: ["상품관리", "장바구니", "결제", "주문", "회원", "검색", "리뷰"],
  projectType: "fullstack-web",
  hasUI: true,
  hasDB: true,
  hasAPI: true,
  projectName: "shopping-mall"
}
```

### 입력: "할일 관리 앱 만들어줘. React+Express"

```
{
  industry: "productivity",
  techStack: {
    frontend: "React",
    backend: "Express.js",
    db: "PostgreSQL",
    mobile: null,
    infra: null
  },
  features: ["태스크CRUD", "카테고리", "우선순위", "마감일", "대시보드"],
  projectType: "fullstack-web",
  hasUI: true,
  hasDB: true,
  hasAPI: true,
  projectName: "todo-app"
}
```

### 입력: "FastAPI로 REST API 서버 만들어줘"

```
{
  industry: "general",
  techStack: {
    frontend: null,
    backend: "FastAPI",
    db: "PostgreSQL",
    mobile: null,
    infra: null
  },
  features: ["CRUD API", "인증", "에러 핸들링"],
  projectType: "api-only",
  hasUI: false,
  hasDB: true,
  hasAPI: true,
  projectName: "api-server"
}
```
