---
name: api-tester
description: API 연동 테스트 스킬. 프론트-백엔드 통신 검증, 프록시 설정 확인.
---

# API Tester

## 테스트 항목
- [ ] CORS 설정
- [ ] 프록시 경로 (`/api/*` → `http://localhost:<BACKEND_PORT>`)
- [ ] JWT 토큰 전달
- [ ] 에러 응답 포맷
- [ ] 파일 업로드 (multipart/form-data)
- [ ] 응답 시간 (< 500ms)

**사용:** "로그인 API 테스트해줘"
