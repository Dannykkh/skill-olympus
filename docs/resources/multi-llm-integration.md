# Multi-LLM Integration Resources

LLM 코딩 도구에서 최신 모델/API 정보를 활용하기 위한 리소스 모음.

## 문제점

LLM은 학습 데이터 컷오프 이후의 정보를 알지 못합니다:
- Next.js 15, React 19 등 최신 라이브러리 API
- 새로운 LLM 모델 (GPT-5.2, Gemini 3, Claude Opus 4.5)
- 변경된 가격 정책, 컨텍스트 윈도우

## 해결책

### 1. Context7 MCP - 최신 라이브러리 문서

**용도**: 라이브러리/프레임워크의 최신 문서를 컨텍스트에 주입

**설치**:
```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp
```

**주요 기능**:
- `resolve-library-id`: 라이브러리명 → Context7 ID 변환
- `get-library-docs`: 최신 문서 및 코드 예시 반환

**사용 예시**:
```
"Next.js 15 App Router 사용법 알려줘"
→ Context7이 최신 Next.js 15 문서를 컨텍스트에 주입
→ LLM이 정확한 최신 API로 답변
```

**장점**:
- 할루시네이션 방지 (존재하지 않는 API 제거)
- 버전별 문서 지원
- 자동 호출 규칙 설정 가능

**GitHub**: https://github.com/upstash/context7

---

### 2. PAL MCP - Multi-Model 오케스트레이션

**용도**: 하나의 프롬프트에서 여러 LLM 모델 활용

**지원 모델**:
- Gemini 3 Pro, Flash
- OpenAI GPT-5.2, GPT-5.1
- Anthropic Claude Opus 4.5
- Grok, Azure, Ollama
- OpenRouter (50+ 모델)

**주요 기능**:
- 모델 간 자동 전환 (failover)
- 작업별 최적 모델 선택
- 비용 최적화 라우팅

**사용 사례**:
```
1. Claude가 전체 조율
2. 알고리즘 분석 → GPT-5.2
3. 대규모 컨텍스트 → Gemini 3 Pro (1M)
4. 빠른 응답 필요 → Gemini 3 Flash
```

**GitHub**: https://github.com/BeehiveInnovations/pal-mcp-server

---

## Skills vs Agents 분류 가이드

외부 리소스를 가져올 때 Skills와 Agents 중 어디에 배치할지 결정:

### Skills로 분류 (on-demand)

| 특징 | 예시 |
|------|------|
| 사용자가 명시적으로 호출 | `/codex`, `/gemini` |
| 외부 API 호출 | LLM API, 웹 검색 |
| 파일 생성/수정 작업 | `/docker-deploy` |
| 일회성 워크플로우 | 버전 마이그레이션 |

**이 프로젝트의 LLM Skills**:
- `codex` - GPT-5.2 코드 분석/리팩토링
- `gemini` - Gemini 3 Pro 대규모 컨텍스트 분석
- `perplexity` - 웹 검색 및 최신 정보 조사

### Agents로 분류 (passive)

| 특징 | 예시 |
|------|------|
| 항상 컨텍스트에 존재 | 가이드라인, 규칙 |
| 자동 적용 | 코드 작성 시 참조 |
| 결정 포인트 없음 | 즉시 참조 가능 |

**이 프로젝트의 Guideline Agents**:
- `react-best-practices` - React 최적화 규칙
- `python-fastapi-guidelines` - FastAPI 모범 사례
- `code-review-checklist` - 코드 품질 기준

---

## 추천 스킬/에이전트 컬렉션

### 대규모 스킬 컬렉션

| 프로젝트 | 스킬 수 | 호환성 | GitHub |
|---------|--------|--------|--------|
| VoltAgent/awesome-agent-skills | 200+ | Codex, Gemini CLI, Cursor | [Link](https://github.com/VoltAgent/awesome-agent-skills) |
| antigravity-awesome-skills | 625+ | Claude Code, Antigravity | [Link](https://github.com/sickn33/antigravity-awesome-skills) |
| AI-research-SKILLs | 다수 | 모든 LLM | [Link](https://github.com/Orchestra-Research/AI-research-SKILLs) |

### Multi-Agent 오케스트레이션

| 프로젝트 | 설명 | GitHub |
|---------|------|--------|
| claude-flow | 다중 에이전트 스웜, LLM 간 자동 전환 | [Link](https://github.com/ruvnet/claude-flow) |
| wshobson/agents | 지능형 자동화 및 오케스트레이션 | [Link](https://github.com/wshobson/agents) |

### 전문 서브에이전트 (claudekit)

| 에이전트 | 설명 |
|---------|------|
| oracle-gpt5 | GPT-5 기반 복잡한 추론 |
| code-reviewer | 6가지 측면 심층 분석 |
| ai-sdk-expert | Vercel AI SDK 전문가 |
| typescript-expert | TypeScript 전문가 |

---

## 현재 모델 비교 (2026년 기준)

| 모델 | SWE-bench | 컨텍스트 | 가격 (input/output) | 강점 |
|------|-----------|---------|---------------------|------|
| Claude Opus 4.5 | ~74% | 200K | - | 복잡한 추론, 에이전트 |
| GPT-5.2 | 76.3% | 400K | $1.25/$10.00 | 소프트웨어 엔지니어링 |
| GPT-5.2-mini | ~74% | 400K | $0.25/$2.00 | 비용 효율적 |
| Gemini 3 Pro | 76.2% | **1M** | $2-4/M | 대규모 컨텍스트, 코드 리뷰 |
| Gemini 3 Flash | ~72% | 1M | 저렴 | 서브초 응답 |

### 작업별 추천 모델

| 작업 | 추천 모델 | 이유 |
|------|----------|------|
| 복잡한 리팩토링 | GPT-5.2 | SWE-bench 최고 점수 |
| 전체 코드베이스 리뷰 | Gemini 3 Pro | 1M 컨텍스트 윈도우 |
| 빠른 코드 생성 | Gemini 3 Flash | 서브초 응답 |
| 비용 최적화 | GPT-5.2-mini | 4배 저렴 |
| 에이전트 워크플로우 | Claude Opus 4.5 | 안정적인 도구 사용 |

---

## 설치 가이드

### 1. Context7 설치
```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp
```

### 2. 기존 LLM 스킬 활용
```bash
# 이미 포함된 스킬
/codex   # GPT-5.2 코드 분석
/gemini  # Gemini 3 Pro 대규모 분석
```

### 3. 추가 스킬 컬렉션 설치
```bash
# VoltAgent 스킬 (200+)
npx add-skill VoltAgent/awesome-agent-skills -a claude-code

# 또는 수동 설치
git clone https://github.com/sickn33/antigravity-awesome-skills
cp -r antigravity-awesome-skills/skills/* ~/.claude/skills/
```

---

## 참고 자료

- [Vercel AGENTS.md 연구](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)
- [Context7 공식 문서](https://context7.com/docs/overview)
- [MCP 명세](https://modelcontextprotocol.io/specification/2025-11-25)
- [HuggingFace Claude Code Skills 사례](https://huggingface.co/blog/sionic-ai/claude-code-skills-training)

---

**최종 업데이트**: 2026-01-31
