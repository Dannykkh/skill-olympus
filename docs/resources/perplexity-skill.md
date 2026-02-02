# Perplexity Skill

> Perplexity AI 도구를 Claude Code에서 효과적으로 사용하기 위한 가이드

## 기본 정보

| 항목 | 내용 |
|------|------|
| **저장소** | 내장 스킬 |
| **분류** | Skill (웹 검색 통합) |
| **용도** | 웹 검색, 현재 정보 조회, 일반 질문 |

---

## 개요

Perplexity의 검색 및 대화형 AI 기능을 언제/어떻게 사용할지에 대한 명확한 가이드라인을 제공합니다. 토큰 예산을 존중하고 다른 전문 도구와의 중복을 피합니다.

---

## 사용 시기

Perplexity 도구는 **사용자가 명시적으로 요청할 때만** 사용:
- **검색 쿼리**: "search", "find", "look up", "research"
- **현재 정보**: "what's the latest", "recent trends"
- **일반 질문**: 전문 도구가 다루지 않는 광범위한 주제

---

## 사용하지 말아야 할 때

| 요청 유형 | 대신 사용할 도구 |
|----------|----------------|
| 라이브러리/프레임워크 문서 | Context7 MCP |
| Graphite `gt` CLI 명령 | Graphite MCP |
| 워크스페이스 관련 질문 | Nx MCP |
| 특정 URL | URL Crawler |
| 심층 연구 | Researcher 에이전트 (`/research`) |

---

## 사용 가능한 도구

### 1. Perplexity Search

**용도**: 리소스, URL, 현재 모범 사례 찾기

**사용 시기**:
- 튜토리얼, 블로그 포스트, 기사 찾기
- 기술에 대한 최신 정보 찾기
- "search for...", "find...", "look up..." 요청

**기본 사용법** (항상 이 제한으로 시작):
```typescript
mcp__perplexity__perplexity_search({
  query: "your search query",
  max_results: 3,           // 기본값 10은 너무 많음!
  max_tokens_per_page: 512  // 결과당 콘텐츠 줄이기
})
```

**제한 증가 시기** (드물게):
- 사용자가 명시적으로 포괄적인 결과 필요
- 초기 검색에서 유용한 결과 없음
- 복잡한 주제로 여러 소스 필요

### 2. Perplexity Ask

**용도**: 웹 소스에서 합성된 대화형 설명

**사용 시기**:
- 검색 결과가 아닌 설명이 필요할 때
- 여러 웹 소스에서 정보 합성
- 현재 컨텍스트로 개념 설명

**사용법**:
```typescript
mcp__perplexity__perplexity_ask({
  messages: [
    {
      role: "user",
      content: "Explain how postgres advisory locks work"
    }
  ]
})
```

### 3. Perplexity Research (금지)

**절대 사용 금지**: `mcp__perplexity__perplexity_research`

**이유**: 극도로 높은 토큰 비용 (30-50k 토큰)

**대신 사용**: Researcher 에이전트 (`/research <topic>`)

---

## 도구 선택 체인

질문을 받으면 이 우선순위 순서를 따르세요:

1. **Context7 MCP** - 라이브러리/프레임워크 문서
2. **Graphite MCP** - `gt` CLI 관련
3. **Nx MCP** - 현재 워크스페이스 관련 질문
4. **Perplexity Search** - 일반 검색
5. **Perplexity Ask** - 대화형 답변
6. **Researcher 에이전트** - 심층 다중 소스 연구
7. **WebSearch** - 최후의 수단 (Perplexity 소진 후)

---

## 빠른 결정 매트릭스

| 사용자 요청 | 사용할 도구 |
|------------|------------|
| React hooks 문서 | Context7 MCP |
| gt stack 명령 | Graphite MCP |
| 여기 빌드 설정 | Nx MCP |
| 마이그레이션 가이드 찾기 | Perplexity Search |
| advisory locks 설명 | Perplexity Ask |
| 심층 연구 보고서 | Researcher 에이전트 |
| 일반 웹 검색 | WebSearch (최후 수단) |

---

## 모범 사례

1. **보수적으로 시작**: 항상 `max_results: 3`, `max_tokens_per_page: 512` 사용
2. **대안 먼저 확인**: Perplexity 전에 Context7, Graphite MCP, Nx MCP 시도
3. **트리거 단어 인식**: "search", "find", "look up", "research", "latest"
4. **research 도구 금지**: `perplexity_research` 대신 researcher 에이전트 사용
5. **체인 존중**: 도구 선택 우선순위 따르기

---

## 일반적인 실수

- 라이브러리 문서에 Perplexity 사용 (Context7 사용해야 함)
- 기본으로 높은 제한 사용 (컨텍스트 비대화 유발)
- `perplexity_research` 직접 사용 (researcher 에이전트 사용해야 함)
- 도구 선택 체인 건너뛰기
- 전문 도구 적용 여부 확인 안 함

---

**문서 작성일:** 2026-02-02
