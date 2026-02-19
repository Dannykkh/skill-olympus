---
name: api-tester
description: API 연동 테스트 스킬. 프론트-백엔드 통신 검증, 프록시 설정 확인, CORS, JWT 토큰, 에러 응답, 파일 업로드 테스트. "API 테스트해줘"로 실행.
---

# API Tester

프론트엔드 ↔ 백엔드 API 연동을 실제로 검증하는 테스트 스킬.

## 사용법

```
"로그인 API 테스트해줘"
"프론트-백엔드 연동 검증해줘"
"/api-tester"
```

---

## 워크플로우

### 1. 환경 감지

서버 실행 상태 확인:
```bash
# 백엔드 포트 확인
curl -s http://localhost:8000/health || curl -s http://localhost:3001/health

# 프론트엔드 포트 확인
curl -s http://localhost:3000 || curl -s http://localhost:5173
```

프록시 설정 확인 (vite.config.ts, next.config.js, package.json proxy 등):
```bash
# Vite 프록시
grep -r "proxy" vite.config.* 2>/dev/null

# Next.js rewrites
grep -r "rewrites\|destination" next.config.* 2>/dev/null

# CRA proxy
grep "proxy" package.json 2>/dev/null
```

### 2. CORS 검증

```bash
# preflight OPTIONS 요청
curl -v -X OPTIONS http://localhost:8000/api/users \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  2>&1 | grep -i "access-control"
```

**기대 결과:**
- `Access-Control-Allow-Origin`: 프론트엔드 origin 포함
- `Access-Control-Allow-Methods`: 필요한 HTTP 메서드 포함
- `Access-Control-Allow-Headers`: Content-Type, Authorization 포함
- `Access-Control-Allow-Credentials`: true (쿠키 사용 시)

### 3. 인증 흐름 검증

```bash
# 로그인 → 토큰 발급
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234"}' \
  | jq -r '.token // .access_token // .accessToken')

echo "Token: ${TOKEN:0:20}..."

# 보호된 API 호출
curl -s http://localhost:8000/api/users/me \
  -H "Authorization: Bearer $TOKEN" | jq .

# 만료/잘못된 토큰
curl -s -w "\nHTTP Status: %{http_code}\n" \
  http://localhost:8000/api/users/me \
  -H "Authorization: Bearer invalid-token"
```

**기대 결과:**
- 올바른 토큰: 200 + 사용자 정보
- 잘못된 토큰: 401 Unauthorized
- 토큰 없음: 401 또는 403

### 4. CRUD 엔드포인트 검증

```bash
# CREATE
curl -s -X POST http://localhost:8000/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"테스트 항목","description":"테스트용"}' | jq .

# READ (목록)
curl -s http://localhost:8000/api/items \
  -H "Authorization: Bearer $TOKEN" | jq .

# READ (단건)
curl -s http://localhost:8000/api/items/1 \
  -H "Authorization: Bearer $TOKEN" | jq .

# UPDATE
curl -s -X PUT http://localhost:8000/api/items/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"수정된 항목"}' | jq .

# DELETE
curl -s -X DELETE http://localhost:8000/api/items/1 \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP: %{http_code}\n"
```

### 5. 에러 응답 검증

```bash
# 404 Not Found
curl -s http://localhost:8000/api/items/99999 \
  -H "Authorization: Bearer $TOKEN" | jq .

# 400 Bad Request (유효성 검증)
curl -s -X POST http://localhost:8000/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":""}' | jq .

# 409 Conflict (중복)
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234"}' | jq .
```

**에러 응답 포맷 확인:**
```json
{
  "error": "ErrorCode",
  "message": "사용자 친화적 메시지",
  "details": {}
}
```

### 6. 파일 업로드 검증

```bash
# 파일 업로드
curl -s -X POST http://localhost:8000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-file.pdf" | jq .

# 크기 제한 테스트 (100MB+)
dd if=/dev/zero of=/tmp/large-file.bin bs=1M count=101 2>/dev/null
curl -s -X POST http://localhost:8000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/large-file.bin" -w "\nHTTP: %{http_code}\n"
rm -f /tmp/large-file.bin
```

### 7. 응답 시간 검증

```bash
# 응답 시간 측정
for endpoint in "/api/health" "/api/users" "/api/items"; do
  TIME=$(curl -s -o /dev/null -w "%{time_total}" \
    http://localhost:8000$endpoint \
    -H "Authorization: Bearer $TOKEN")
  echo "$endpoint: ${TIME}s"
done
```

**기준:** 일반 API < 500ms, 목록 API < 1000ms, 파일 업로드 < 5000ms

---

## 체크리스트

### 필수 (CRITICAL)
- [ ] CORS 설정 올바름 (preflight 통과)
- [ ] 프록시 경로 정상 작동 (`/api/*` → 백엔드)
- [ ] JWT 토큰 발급/검증 정상
- [ ] 에러 응답 포맷 일관적

### 권장 (HIGH)
- [ ] 인증 실패 시 적절한 상태 코드 (401/403)
- [ ] 유효성 검증 실패 시 400 + 상세 메시지
- [ ] 파일 업로드 크기/확장자 제한
- [ ] 응답 시간 기준 충족 (< 500ms)

### 선택 (MEDIUM)
- [ ] Rate Limiting 동작
- [ ] 페이지네이션 (offset/limit 또는 cursor)
- [ ] 캐싱 헤더 (ETag, Cache-Control)

---

## 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| CORS 에러 | 백엔드 CORS 미설정 | `Access-Control-Allow-Origin` 추가 |
| 프록시 404 | 경로 불일치 | vite.config/next.config 프록시 경로 확인 |
| 토큰 거부 | 비밀키 불일치 | `.env` SECRET_KEY 일치 확인 |
| 타임아웃 | 서버 미실행 | `docker ps` 또는 프로세스 확인 |
| 413 Payload Too Large | 업로드 제한 | nginx/express body-parser 설정 |

---

## 보고서 형식

```markdown
# API 연동 테스트 결과

**날짜:** {date}
**환경:** 로컬 / 스테이징 / 프로덕션

## 결과 요약
| 항목 | 상태 | 비고 |
|------|------|------|
| CORS | ✅/❌ | |
| 프록시 | ✅/❌ | |
| 인증 | ✅/❌ | |
| CRUD | ✅/❌ | |
| 에러 응답 | ✅/❌ | |
| 파일 업로드 | ✅/❌ | |
| 응답 시간 | ✅/❌ | |

## 발견된 문제
1. {issue description}
   - **심각도:** Critical / High / Medium
   - **재현:** {steps}
   - **권장 조치:** {fix}
```
