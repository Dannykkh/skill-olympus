# API Specification Guide

계획 단계에서 HTTP API를 쓰는 소비자(웹 화면, 모바일 앱, 외부 연동, MCP 서버)와 백엔드 간 계약서를 작성하는 가이드.

에이전트↔프로그램 계약(MCP 도구)은 [mcp-spec-guide.md](mcp-spec-guide.md)의 `mcp-spec.md`가 따로 다룹니다. MCP는 HTTP API가 없는 로컬 프로그램에도 들어가기 때문입니다. REST를 감싸는 MCP 도구는 이 문서의 엔드포인트를 참조하므로, 에이전트 작업에 필요한 엔드포인트는 Step 17A에서 이 문서로 역반영됩니다(Frontend Caller `mcp`).

## 언제 생성하나?

| 프로젝트 유형 | API Spec 생성 |
|--------------|---------------|
| 웹앱 (프론트+백엔드) | ✅ 필수 |
| REST/GraphQL API 서버 | ✅ 필수 |
| 모바일 앱 + API | ✅ 필수 |
| CLI 도구 | ❌ 건너뜀 (MCP는 mcp-spec.md) |
| 라이브러리/패키지 | ❌ 건너뜀 |
| 정적 사이트 (API 없음) | ❌ 건너뜀 |
| 데스크톱 앱 (로컬 전용) | ❌ 건너뜀 (MCP는 mcp-spec.md) |

**판단 기준**: `plan.md`에서 HTTP 엔드포인트, API 라우트, 서버-클라이언트 통신이 언급되면 생성. 로컬 프로그램 내부 통신(IPC)과 stdio MCP 연결은 여기서 말하는 통신이 아닙니다.

## 작성 순서

엔드포인트를 DB 테이블에서만 뽑으면 CRUD는 맞아도 화면이 실제로 쓰는 데이터(다른 테이블 필드, 집계값, 목록의 필터·정렬)가 빠지고, 화면을 구현하는 도중에 백엔드를 다시 만들게 됩니다. 그래서 화면 요구를 먼저 적고 엔드포인트를 거기서 도출합니다.

1. **화면 데이터 요구 표 작성** — 아래 재료 중 있는 것으로 화면마다 표시 데이터·액션·목록 조건을 적습니다. 재료에 없는 화면을 지어내지 않습니다.
   - `spec.md` 시스템 역할 표의 `화면` 열
   - `personas-and-journeys.md`의 여정 단계·터치포인트
   - `design-system.md` (UI 프로젝트)
   - `research.md`의 메뉴 구조·페이지 목록

   계획상 필요한데 재료에 화면이 없는 호출(로그인·토큰 발급 등)은 화면을 지어내지 말고 엔드포인트는 쓰되 Frontend Caller를 `TBD (화면 누락)`으로 두고 `integration-notes.md`에 미결로 올립니다.
2. **엔드포인트 도출** — `db-schema.md` 기준 CRUD에 화면 요구에서 나온 조회(조인·집계)를 더합니다. 화면 하나가 표시하는 데이터는 정해진 호출로 받을 수 있어야 하며, 목록의 행마다 추가 호출이 필요한 설계(N+1)는 만들지 않습니다. 화면 재료에 없는 테이블은 데이터가 들어오는 경로(생성과 그 결과를 확인하는 조회)만 엔드포인트로 쓰고 Frontend Caller를 `TBD (화면 누락)`으로 둡니다. 근거 없는 수정·삭제는 쓰지 않고 `integration-notes.md`에 미결로 올립니다 — CRUD를 기계적으로 채우면 아무도 부르지 않는 API와 정책 없는 삭제가 생깁니다.
3. **Conventions 적용** — 모든 목록 엔드포인트에 페이지네이션·정렬 허용 컬럼을, 모든 에러 응답에 공통 에러 형식을 적용합니다.
4. **인덱스 역반영** — 목록 엔드포인트의 필터·정렬·검색 컬럼이 `db-schema.md`에 없으면 인덱스 표와 DDL(`CREATE INDEX`, 필요한 확장 포함) 양쪽에 추가하고 `integration-notes.md`에 기록합니다. 요청 파라미터가 아니라 서버가 고정으로 거는 조건(본인 한정, 미반납 같은 상태 조건)도 필터 컬럼으로 봅니다.
5. **화면↔API 대응 검사** — 문서 끝의 체크리스트를 통과시킵니다.

화면 재료가 하나도 없는 프로젝트(UI 없는 API 서버)는 화면 표에 `NOT APPLICABLE: no UI`를 쓰고, 표 대신 소비자(클라이언트 앱·외부 시스템)별 호출 시나리오를 적습니다.

## api-spec.md 템플릿

```markdown
# API Specification

> 이 문서는 HTTP API 소비자(화면·앱·외부 연동·MCP 서버)↔백엔드 간의 계약서입니다.
> 구현 중 새 API를 추가하면 반드시 이 문서에도 추가하세요.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `{production_url}/api`

## Authentication

| 방식 | 설명 |
|------|------|
| {Bearer Token / Session / API Key} | {상세 설명} |

### Roles

| 역할 | 설명 |
|------|------|
| {admin} | {설명} |
| {operator} | {설명} |
| {user} | {설명} |

역할명은 `spec.md` Context Map의 **시스템 역할 표(Role Inventory)** 역할 ID를 그대로 사용합니다. 인증이 없거나 역할이 1개뿐이면 이 표를 생략하고 `NOT APPLICABLE: single role`을 기록합니다.

인증이 필요한 엔드포인트는 🔒 표시.

---

## Conventions

### 목록 (페이지네이션)

- **모든 목록 API는 페이지네이션 필수.** 전체 행을 한 번에 반환하는 목록 API를 만들지 않습니다.
- 기본은 offset 방식: `?page=1&size=20` — `page`는 1부터, `size` 기본 20·최대 100 (초과 요청은 100으로 제한).
- 응답 형태:
  ```json
  { "items": [], "page": 1, "size": 20, "total": 134 }
  ```
- 무한 스크롤·대용량 목록(피드, 로그, 알림 등)은 cursor 방식: `?cursor={opaque}&size=20` →
  ```json
  { "items": [], "nextCursor": "eyJpZCI6MTIzfQ" }
  ```
  마지막 페이지면 `nextCursor`는 `null`.
- 정렬: `?sort=createdAt,desc` — 엔드포인트마다 **허용 컬럼 목록**을 적고, 그 외 값은 `400 INVALID_SORT`.
- 필터·검색: 엔드포인트마다 파라미터를 명시합니다. 정의되지 않은 파라미터로 임의 컬럼을 거르지 않습니다. 부분 일치 검색(`%q%`)은 B-Tree 인덱스를 쓰지 못하므로 DB별 인덱스(PostgreSQL `pg_trgm` GIN, MySQL FULLTEXT 등)를 Index 줄에 명시합니다.
- 예외: 고정 소량 목록(코드표, 역할 목록 등)만 생략할 수 있으며 엔드포인트에 `Pagination: none (최대 {N}건 — {사유})`로 적습니다.

### 에러 형식

모든 에러 응답은 같은 형태를 씁니다:

```json
{ "error": "EMAIL_DUPLICATE", "message": "이미 존재하는 이메일입니다", "details": {} }
```

| 필드 | 의미 |
|------|------|
| `error` | 대문자 스네이크 코드. 프론트는 이 값으로 분기하며, 문구가 바뀌어도 코드는 유지 |
| `message` | 사용자에게 보여 줄 문구 |
| `details` | 선택. 검증 오류는 `{ "fields": { "email": "INVALID_FORMAT" } }`처럼 필드별 코드 |

### 이름·형식

- JSON 필드는 camelCase, 시각은 ISO-8601 UTC (`2026-01-01T00:00:00Z`)
- ID 타입은 `db-schema.md`를 따릅니다.

---

## Screen Data Requirements

| 화면 | 역할 | 표시 데이터 | 액션 | 목록 조건 (필터·정렬·검색) | 호출 API |
|------|------|-------------|------|---------------------------|----------|
| `SignUpPage` | 전체 | — (입력: 이름·이메일·비밀번호) | 가입 | — | `POST /api/users` |
| `UserListPage` | admin, operator | 이름, 이메일, 역할, 가입일, **주문 수(orders)** | 상세 이동, 삭제(admin) | 필터 `role` / 정렬 `createdAt`·`name` / 검색 `name`·`email` | `GET /api/users`, `DELETE /api/users/:id` |
| `UserProfilePage` | admin, operator, user(본인) | 이름, 이메일, 역할, 가입일 | 수정 | — | `GET /api/users/:id`, `PUT /api/users/:id` |

다른 엔티티의 값(위의 주문 수)은 목록 응답에 포함할지 별도 API로 받을지를 여기서 정합니다. 행마다 추가 호출하는 방식은 쓰지 않습니다.

---

## Endpoints

### 👤 Users

#### POST /api/users — 사용자 생성

| 항목 | 내용 |
|------|------|
| Auth | 불필요 |
| Frontend Caller | `SignUpPage` → `useCreateUser()` |

**Request:**
```json
{
  "name": "string (required, max 255)",
  "email": "string (required, email format)",
  "password": "string (required, min 8)"
}
```

**Response 201:**
```json
{
  "id": 1,
  "name": "홍길동",
  "email": "hong@test.com",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

**Error Responses:**
| Status | Condition | Body |
|--------|-----------|------|
| 400 | 필수값 누락 | `{ "error": "VALIDATION_ERROR", "message": "이름은 필수입니다", "details": { "fields": { "name": "REQUIRED" } } }` |
| 400 | 이메일 형식 오류 | `{ "error": "VALIDATION_ERROR", "message": "유효한 이메일 형식이 아닙니다", "details": { "fields": { "email": "INVALID_FORMAT" } } }` |
| 409 | 이메일 중복 | `{ "error": "EMAIL_DUPLICATE", "message": "이미 존재하는 이메일입니다" }` |

---

#### GET /api/users — 사용자 목록 🔒

| 항목 | 내용 |
|------|------|
| Auth | 🔒 Bearer Token — `admin`, `operator` |
| Frontend Caller | `UserListPage` → `useUsers(params)` |
| Pagination | offset — `page`, `size`(기본 20, 최대 100) |
| Sort | 허용: `createdAt`, `name` (기본 `createdAt,desc`) |
| Filter / Search | `role` (정확히 일치), `q` (name·email 부분 일치) |
| Index | `users(role)`, `users(created_at)`, `users(name)` B-Tree / `q` 부분 일치는 `users(name)`·`users(email)` `pg_trgm` GIN — `db-schema.md` 인덱스 표·DDL 반영 |

**Request:**
- Query: `?page=1&size=20&sort=createdAt,desc&role=operator&q=hong`

**Response 200:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "홍길동",
      "email": "hong@test.com",
      "role": "user",
      "orderCount": 3,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "page": 1,
  "size": 20,
  "total": 134
}
```

`orderCount`는 목록 쿼리에서 집계해 함께 반환합니다 (행마다 주문 API를 호출하지 않음).

**Error Responses:**
| Status | Condition | Body |
|--------|-----------|------|
| 400 | 허용되지 않은 정렬 컬럼 | `{ "error": "INVALID_SORT", "message": "정렬할 수 없는 항목입니다" }` |
| 401 | 인증 없음 | `{ "error": "UNAUTHORIZED", "message": "인증이 필요합니다" }` |
| 403 | 역할 권한 없음 | `{ "error": "FORBIDDEN", "message": "권한이 없습니다" }` |

---

#### GET /api/users/:id — 사용자 조회 🔒

| 항목 | 내용 |
|------|------|
| Auth | 🔒 Bearer Token — `admin`, `operator`, `user`(본인 한정) |
| Frontend Caller | `UserProfilePage` → `useUser(id)` |

**Request:**
- Path: `id` (number, required)
- Headers: `Authorization: Bearer {token}`

**Response 200:**
```json
{
  "id": 1,
  "name": "홍길동",
  "email": "hong@test.com",
  "role": "user",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

**Error Responses:**
| Status | Condition | Body |
|--------|-----------|------|
| 401 | 인증 없음 | `{ "error": "UNAUTHORIZED", "message": "인증이 필요합니다" }` |
| 403 | 역할 권한 없음 (타인 정보 조회) | `{ "error": "FORBIDDEN", "message": "권한이 없습니다" }` |
| 404 | 사용자 없음 | `{ "error": "USER_NOT_FOUND", "message": "사용자를 찾을 수 없습니다" }` |

---

## Summary

| Method | Path | Description | Auth | 허용 역할 | Pagination | MCP Tool |
|--------|------|-------------|------|-----------|------------|----------|
| POST | /api/users | 사용자 생성 | - | 전체 | - | - |
| GET | /api/users | 사용자 목록 | 🔒 | admin, operator | offset | `find_users` |
| GET | /api/users/:id | 사용자 조회 | 🔒 | admin, operator, user(본인) | - | - |
| PUT | /api/users/:id | 사용자 수정 | 🔒 | admin, user(본인) | - | `update_user_role` (`role`만) |
| DELETE | /api/users/:id | 사용자 삭제 | 🔒 | admin | - | - |

`MCP Tool` 열은 이 엔드포인트를 감싸는 도구 이름(정의는 `mcp-spec.md`)입니다. 엔드포인트를 바꿀 때 함께 고칠 도구를 찾는 용도이며, MCP 도구가 없으면 열을 생략합니다.
```

## 핵심 포함 항목

각 엔드포인트마다 반드시:

| 항목 | 설명 |
|------|------|
| **Method + Path** | `POST /api/users` |
| **Auth** | 인증 필요 여부 + 방식 + **허용 역할 목록** (역할이 둘 이상인 프로젝트). 조건부 허용은 `user(본인)`처럼 조건을 괄호로 명시 |
| **Frontend Caller** | 어떤 페이지/컴포넌트에서 호출하는지. Screen Data Requirements의 `호출 API` 열과 일치 |
| **Request** | headers, params, body (타입 + 필수 여부) |
| **Response** | 성공 응답 스키마 (JSON 예시). 목록은 Conventions의 응답 형태 |
| **Error Responses** | status code + 조건 + 공통 에러 형식 body |
| **Pagination / Sort / Filter / Index** | 목록 API만. 방식·크기 상한·정렬 허용 컬럼·필터 파라미터·관련 인덱스. 생략은 `Pagination: none (최대 N건 — 사유)`로만 |

## Frontend Caller가 중요한 이유

- 프론트↔백 연결 관계를 명시하여 **통합 테스트 시나리오** 생성 가능
- API 삭제/변경 시 영향받는 프론트 컴포넌트를 즉시 파악
- QA 시나리오에서 "이 화면에서 이 API를 호출하면" 테스트 작성

## 구현 중 API 추가/변경 규칙

**⚠️ 이 규칙은 섹션 파일과 실행 파일에 포함되어야 합니다:**

```
구현 중 새 API를 추가하거나 기존 API를 변경하면:
1. api-spec.md에 해당 엔드포인트를 추가/수정
2. 기존 API와 중복되지 않는지 확인 (같은 기능, 다른 이름 방지)
3. Frontend Caller와 Screen Data Requirements도 함께 업데이트
4. 목록 API면 Conventions의 페이지네이션·정렬 허용 컬럼을 지키고 인덱스를 확인
5. Summary의 `MCP Tool` 열에 도구가 적힌 엔드포인트를 바꾸면 `mcp-spec.md`의 그 도구 블록도 함께 수정

절대 하지 말 것:
- api-spec에 없는 API를 암묵적으로 추가
- 같은 데이터를 반환하는 다른 경로의 API 생성
  (예: GET /api/users/me와 GET /api/user/profile 둘 다 만들지 말 것)
- 페이지네이션 없이 전체 행을 반환하는 목록 API
- 목록의 행마다 추가 쿼리·API 호출 (N+1)
```

## 중복 API 방지 체크리스트

새 API 추가 전 확인:

- [ ] api-spec에 같은 기능의 API가 이미 있는가?
- [ ] 비슷한 경로의 API가 있는가? (단수/복수, 동사 차이)
- [ ] 같은 응답 스키마를 반환하는 다른 API가 있는가?
- [ ] 이 API의 Frontend Caller가 이미 다른 API를 사용하고 있는가?

## 화면↔API 대응 검사

api-spec.md를 마치기 전과 Step 23 Final Status에서 확인:

- [ ] Screen Data Requirements의 모든 표시 데이터·액션이 엔드포인트 1개 이상에 대응한다
- [ ] 모든 엔드포인트에 Frontend Caller가 있거나, 화면이 없는 호출은 `external` / `webhook` / `batch` / `system` / `mcp`(MCP 도구만 호출 — 화면도 부르면 화면을 적음)로, 화면 재료가 빠진 호출은 `TBD (화면 누락)`으로 표시하고 미결에 올렸다
- [ ] 모든 목록 엔드포인트가 Pagination을 선언했다 (`none`은 최대 건수와 사유가 있을 때만)
- [ ] 목록 엔드포인트의 필터·정렬·검색 컬럼(서버 고정 조건 포함)이 `db-schema.md` 인덱스 표와 DDL에 있다
- [ ] 모든 에러 응답이 공통 에러 형식(`error` 코드 + `message`)을 따른다

빠진 항목은 api-spec.md·db-schema.md에 보완하고 `integration-notes.md`에 기록합니다.
