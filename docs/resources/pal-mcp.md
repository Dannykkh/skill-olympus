# BeehiveInnovations/pal-mcp-server

> Multi-Model 오케스트레이션 MCP 서버 (50+ LLM 지원)

## 기본 정보

| 항목 | 내용 |
|------|------|
| **저장소** | [github.com/BeehiveInnovations/pal-mcp-server](https://github.com/BeehiveInnovations/pal-mcp-server) |
| **제작자** | BeehiveInnovations |
| **라이선스** | MIT |
| **분류** | MCP Server |

---

## 개요

하나의 프롬프트에서 여러 LLM 모델을 활용할 수 있는 MCP 서버. Claude Code 내에서 GPT, Gemini, Grok 등 다양한 모델을 호출.

**해결하는 문제:**
- Claude만으로는 해결하기 어려운 특정 작업
- 모델별 강점 활용 (코딩 vs 추론 vs 대규모 컨텍스트)
- 비용 최적화 (작업에 따라 저렴한 모델 선택)

---

## 지원 모델

### 주요 공급자

| 공급자 | 모델 | 특징 |
|--------|------|------|
| **OpenAI** | GPT-5.2, GPT-5.2-mini | 코딩 최고 성능 |
| **Google** | Gemini 3 Pro, Flash | 1M 컨텍스트 |
| **Anthropic** | Claude Opus 4.5 | 복잡한 추론 |
| **xAI** | Grok | 실시간 정보 |
| **OpenRouter** | 50+ 모델 | 통합 API |
| **Ollama** | 로컬 모델 | 무료, 프라이버시 |

---

## 주요 기능

### 모델 간 자동 전환 (Failover)

```
요청 → 주 모델 실패 → 백업 모델 자동 전환
```

### 작업별 최적 모델 선택

| 작업 | 추천 모델 | 이유 |
|------|----------|------|
| 복잡한 리팩토링 | GPT-5.2 | SWE-bench 최고 |
| 전체 코드베이스 리뷰 | Gemini 3 Pro | 1M 컨텍스트 |
| 빠른 코드 생성 | Gemini 3 Flash | 서브초 응답 |
| 비용 최적화 | GPT-5.2-mini | 4배 저렴 |

### 비용 최적화 라우팅

작업 복잡도에 따라 자동으로 적정 모델 선택:
- 간단한 질문 → 저렴한 모델
- 복잡한 작업 → 고성능 모델

---

## 설치 방법

```bash
# npm 설치
npm install pal-mcp-server

# 또는 npx로 직접 실행
npx pal-mcp-server
```

### Claude Code에 추가

```bash
claude mcp add pal -- npx pal-mcp-server
```

### 환경 변수 설정

```bash
# .env 파일
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
ANTHROPIC_API_KEY=...
```

---

## 사용 예시

### Claude Code에서 다른 모델 호출

```
"GPT-5.2로 이 알고리즘 최적화해줘"
→ PAL MCP가 GPT-5.2 API 호출
→ 결과를 Claude에게 반환
```

### 대규모 컨텍스트 작업

```
"Gemini로 전체 코드베이스 분석해줘"
→ PAL MCP가 Gemini 3 Pro (1M 컨텍스트) 호출
→ 분석 결과 반환
```

---

## 장단점

### 장점
- 50+ 모델 통합 접근
- 작업별 최적 모델 자동 선택
- 비용 최적화 가능
- Failover로 안정성 향상
- 로컬 모델(Ollama) 지원

### 단점/주의사항
- 여러 API 키 관리 필요
- 추가 비용 발생 (외부 API 호출)
- 응답 시간 증가 (네트워크 레이턴시)
- 각 모델의 API 제한 확인 필요

---

## 관련 리소스

- [Context7 MCP](./context7-mcp.md) - 라이브러리 문서 주입
- [Multi-LLM Integration Guide](./multi-llm-integration.md) - 종합 가이드
- [claude-flow](./claude-flow.md) - Multi-agent 오케스트레이션

---

**문서 작성일:** 2026-02-01
