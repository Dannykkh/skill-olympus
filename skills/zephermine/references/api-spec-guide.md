# API Specification Guide

계획 단계에서 프론트엔드↔백엔드 간 API 계약서를 작성하는 가이드.

## 언제 생성하나?

| 프로젝트 유형 | API Spec 생성 |
|--------------|---------------|
| 웹앱 (프론트+백엔드) | ✅ 필수 |
| REST/GraphQL API 서버 | ✅ 필수 |
| 모바일 앱 + API | ✅ 필수 |
| CLI 도구 | ❌ 건너뜀 |
| 라이브러리/패키지 | ❌ 건너뜀 |
| 정적 사이트 (API 없음) | ❌ 건너뜀 |
| 데스크톱 앱 (로컬 전용) | ❌ 건너뜀 |

**판단 기준**: `plan.md`에서 HTTP 엔드포인트, API 라우트, 서버-클라이언트 통신이 언급되면 생성.

## api-spec.md 템플릿

```markdown
# API Specification

> 이 문서는 프론트엔드↔백엔드 간의 계약서입니다.
> 구현 중 새 API를 추가하면 반드시 이 문서에도 추가하세요.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `{production_url}/api`

## Authentication

| 방식 | 설명 |
|------|------|
| {Bearer Token / Session / API Key} | {상세 설명} |

인증이 필요한 엔드포인트는 🔒 표시.

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
| 400 | 필수값 누락 | `{ "error": "이름은 필수입니다" }` |
| 400 | 이메일 형식 오류 | `{ "error": "유효한 이메일 형식이 아닙니다" }` |
| 409 | 이메일 중복 | `{ "error": "이미 존재하는 이메일입니다" }` |

---

#### GET /api/users/:id — 사용자 조회 🔒

| 항목 | 내용 |
|------|------|
| Auth | Bearer Token |
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
| 401 | 인증 없음 | `{ "error": "인증이 필요합니다" }` |
| 404 | 사용자 없음 | `{ "error": "사용자를 찾을 수 없습니다" }` |

---

## Summary

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/users | 사용자 생성 | - |
| GET | /api/users/:id | 사용자 조회 | 🔒 |
| PUT | /api/users/:id | 사용자 수정 | 🔒 |
| DELETE | /api/users/:id | 사용자 삭제 | 🔒 |
| GET | /api/users | 사용자 목록 | 🔒 |
```

## 핵심 포함 항목

각 엔드포인트마다 반드시:

| 항목 | 설명 |
|------|------|
| **Method + Path** | `POST /api/users` |
| **Auth** | 인증 필요 여부 + 방식 |
| **Frontend Caller** | 어떤 페이지/컴포넌트에서 호출하는지 |
| **Request** | headers, params, body (타입 + 필수 여부) |
| **Response** | 성공 응답 스키마 (JSON 예시) |
| **Error Responses** | status code + 조건 + body |

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
3. Frontend Caller도 함께 업데이트

절대 하지 말 것:
- api-spec에 없는 API를 암묵적으로 추가
- 같은 데이터를 반환하는 다른 경로의 API 생성
  (예: GET /api/users/me와 GET /api/user/profile 둘 다 만들지 말 것)
```

## 중복 API 방지 체크리스트

새 API 추가 전 확인:

- [ ] api-spec에 같은 기능의 API가 이미 있는가?
- [ ] 비슷한 경로의 API가 있는가? (단수/복수, 동사 차이)
- [ ] 같은 응답 스키마를 반환하는 다른 API가 있는가?
- [ ] 이 API의 Frontend Caller가 이미 다른 API를 사용하고 있는가?
