# Security Specialist 체크리스트

Scope: 인증/권한 관련 파일 변경 시 또는 백엔드 diff > 100줄
Output: JSON (한 줄에 하나). 발견 없으면 `NO FINDINGS`만 출력.

```json
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"security","summary":"...","fix":"...","specialist":"security"}
```

---

## 카테고리

### 입력 검증 (Trust Boundary)
- 컨트롤러/핸들러에서 사용자 입력 검증 없이 수용
- 쿼리 파라미터가 DB 쿼리나 파일 경로에 직접 사용
- 요청 body 필드에 타입/스키마 검증 없음
- 파일 업로드 시 타입/크기/내용 검증 없음
- Webhook payload 서명 검증 없이 처리

### 인증/권한 우회
- 라우트에 인증 미들웨어 누락
- 권한 체크가 "deny"가 아닌 "allow" 기본값
- 사용자가 자신의 역할/권한 수정 가능 (권한 상승)
- IDOR — ID 변경으로 타인 데이터 접근 가능
- 토큰/API 키 만료 미확인
- 세션 고정 또는 하이재킹 가능성

### 인젝션 (SQL 외)
- subprocess에 사용자 입력이 포함된 커맨드 인젝션
- 템플릿 인젝션 (Jinja2, ERB, Handlebars)
- SSRF — 사용자 입력 URL로 fetch/redirect
- Path traversal — `../../etc/passwd` 패턴
- Header injection — 사용자 입력이 HTTP 헤더에 삽입
- LDAP 인젝션

### 암호화 오용
- 보안 용도에 MD5, SHA1 사용 (약한 해싱)
- Math.random, rand()로 토큰/시크릿 생성 (예측 가능)
- 시크릿/토큰/다이제스트에 `==` 비교 (타이밍 공격)
- 하드코딩된 암호화 키 또는 IV
- 비밀번호 해싱에 salt 미사용

### 비밀 노출
- 소스 코드에 API 키, 토큰, 비밀번호 (주석 포함)
- 로그에 시크릿 기록
- URL에 자격 증명 (쿼리 파라미터, Basic Auth)
- 에러 응답에 민감 데이터 포함
- PII 평문 저장

### XSS Escape Hatch
- React: `dangerouslySetInnerHTML`에 사용자 데이터
- Vue: `v-html`에 사용자 데이터
- Django: `|safe`, `mark_safe()`에 사용자 입력
- Rails: `.html_safe`, `raw()`에 사용자 데이터
- 일반: `innerHTML`에 미소독 데이터

### 역직렬화
- 신뢰할 수 없는 데이터 역직렬화 (pickle, Marshal, YAML.load)
- 외부 API의 직렬화 객체를 스키마 검증 없이 수용

### LLM 출력 신뢰 경계
- LLM 생성 값(이메일, URL)을 검증 없이 DB 저장
- LLM 구조화 출력을 타입/형태 체크 없이 DB 기록
- LLM 생성 URL을 허용 목록 없이 fetch (SSRF)
- LLM 출력을 소독 없이 벡터 DB에 저장 (저장된 프롬프트 인젝션)
