# Fetch MCP

> 웹페이지 URL 내용을 읽어오는 Anthropic 공식 MCP 서버

## 기본 정보

| 항목 | 내용 |
|------|------|
| **저장소** | [github.com/anthropics/mcp-server-fetch](https://github.com/anthropics/mcp-server-fetch) |
| **NPM** | [@anthropic-ai/mcp-server-fetch](https://www.npmjs.com/package/@anthropic-ai/mcp-server-fetch) |
| **제작자** | Anthropic (공식) |
| **분류** | MCP 서버 |
| **API 키** | 불필요 |

---

## 개요

Fetch MCP는 웹페이지 URL의 내용을 가져와서 Claude에게 제공하는 Anthropic 공식 MCP 서버. HTTP 요청을 통해 웹 콘텐츠를 마크다운 형태로 변환하여 분석 가능하게 함.

**참고:** Claude Code에는 `WebFetch` 도구가 이미 내장되어 있어 기본적인 웹페이지 읽기는 MCP 없이 가능. Fetch MCP는 더 세밀한 제어가 필요할 때 사용.

---

## 주요 기능

### 1. 웹페이지 내용 가져오기

URL을 입력하면 해당 페이지의 내용을 마크다운으로 변환하여 반환.

```
이 문서 내용 읽어줘: https://docs.python.org/3/library/asyncio.html
```

### 2. 다양한 콘텐츠 타입 지원

| 타입 | 지원 |
|------|------|
| HTML | ✅ 마크다운 변환 |
| JSON | ✅ 구조화된 형태 유지 |
| Plain Text | ✅ 그대로 반환 |
| XML | ✅ 파싱 후 반환 |

### 3. HTTP 헤더/옵션 설정

User-Agent, Accept 등 커스텀 헤더 설정 가능.

---

## 설치 방법

```bash
claude mcp add fetch -- npx -y @anthropic-ai/mcp-server-fetch
```

### 설정 확인

```bash
claude mcp list
```

---

## WebFetch (내장) vs Fetch MCP 비교

| 항목 | WebFetch (내장) | Fetch MCP |
|------|-----------------|-----------|
| **설치** | 불필요 | MCP 추가 필요 |
| **기본 사용** | ✅ 충분 | ✅ 가능 |
| **커스텀 헤더** | ❌ | ✅ 가능 |
| **인증 요청** | ❌ | ✅ 일부 지원 |
| **로봇 규칙** | 준수 | 준수 |
| **권장 상황** | 일반 웹페이지 | 고급 설정 필요 시 |

**결론:** 대부분의 경우 내장 WebFetch로 충분. API 문서, 공개 웹페이지 읽기는 내장 도구 사용 권장.

---

## 사용 예시

### 기본 사용

```
이 API 문서 읽고 요약해줘: https://api.example.com/docs
```

### 기술 문서 분석

```
Python asyncio 공식 문서 읽고 주요 패턴 정리해줘:
https://docs.python.org/3/library/asyncio.html
```

### JSON API 응답 확인

```
이 API 응답 구조 분석해줘: https://api.github.com/users/octocat
```

---

## 제한사항

### 접근 불가

- 로그인 필요한 페이지 (인증된 세션 불가)
- JavaScript 렌더링 필요한 SPA (정적 HTML만 가져옴)
- robots.txt에서 차단된 페이지
- CAPTCHA 보호 페이지

### 접근 가능

- 공개 문서 사이트
- API 문서
- 공개 JSON API
- 정적 웹페이지

---

## 장단점

### 장점
- Anthropic 공식 지원
- API 키 불필요
- 마크다운 자동 변환
- 다양한 콘텐츠 타입 지원

### 단점/주의사항
- JavaScript 렌더링 미지원 (Playwright MCP 필요)
- 인증 페이지 접근 제한
- 일부 사이트 차단 가능

---

## 대안 도구

| 도구 | 용도 |
|------|------|
| **WebFetch (내장)** | 기본 웹페이지 읽기 (MCP 불필요) |
| **Playwright MCP** | JavaScript 렌더링 필요 시 |
| **Firecrawl MCP** | 대규모 웹 크롤링 |
| **Browserbase MCP** | 클라우드 브라우저 자동화 |

---

## 관련 리소스

- [Anthropic MCP 공식 문서](https://modelcontextprotocol.io/)
- [MCP Server Fetch GitHub](https://github.com/anthropics/mcp-server-fetch)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp) - JS 렌더링 필요 시

---

**문서 작성일:** 2026-02-02
