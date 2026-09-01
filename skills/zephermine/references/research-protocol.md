# Research Protocol

This document defines the research decision and execution flow.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│  RESEARCH FLOW                                              │
│                                                             │
│  Step 4: Decide what to research                            │
│    - Codebase research? (existing patterns/conventions)     │
│    - Web research? (best practices, SOTA approaches)        │
│    - GitHub research? (similar projects, reference impl.)   │
│    - Academic research? (papers, algorithms, approaches)    │
│    - Competitor analysis? (features, menus, UX patterns)    │
│                                                             │
│  Step 5: Execute research (bounded batches)                  │
│    - Writers own one unique file each                        │
│    - Writers return only short summaries                     │
│    - Main/Lead combines files into research.md               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Native Role Contract

| Semantic role | Claude | Codex | Antigravity | Grok | Use here |
|---------------|--------|-------|--------|------|----------|
| `read-only-analysis` | `Explore` | `explorer` | `research` | `explore` | Return-only investigation; no file writes |
| `artifact-writer` | `general-purpose` | `worker` | 메인 또는 쓰기 도구를 명시한 사용자 정의 서브에이전트 | `general-purpose` | Research work item that writes one assigned output file |

- Give every delegated work item one unique output file or make it explicitly return-only.
- Main/Lead alone owns `research-decision.md`, the combined `research.md`, warning-stub integration, and all other shared state.
- Writers must not edit another writer's file or the combined document.
- If native delegation is unavailable, Main/Lead runs the selected work items sequentially with the same budgets and output paths.
- Use the runtime's configured default model; never embed a model name in a work item.

---

## Step 4: Research Decision

### Default No-Stop Policy

Research selection normally does not require a user question.

- Auto-select research from the spec, repo state, available docs, and risk profile.
- Ask only when the research choice changes scope, cost, compliance handling, or requires an irreversible external action.
- If unsure, choose the conservative lower-cost research path and record the assumption in `<planning_dir>/research-decision.md`.
- Do not ask broad preference questions such as "Should I search GitHub?" or "Should I do web research?" unless the user explicitly requested a review gate.

### 4.1 Read and Analyze the Spec File

Read the spec file and extract potential research topics by identifying:

- **Technologies mentioned** (React, Python, PostgreSQL, Redis, etc.)
- **Feature types** (authentication, file upload, real-time sync, caching, etc.)
- **Architecture patterns** (microservices, event-driven, serverless, etc.)
- **Integration points** (third-party APIs, OAuth providers, payment gateways, etc.)

Generate 3-5 research topic suggestions based on what you find. Format them as searchable queries with year for recency:
- "React authentication patterns 2025"
- "PostgreSQL full-text search best practices"
- "Redis session storage patterns"

If the spec is vague, fall back to generic options:
- "General best practices for {detected_language/framework}"
- "Security considerations for {feature_type}"

### 4.2 Auto-Detect Codebase Research

Run codebase research automatically when any of these are true:

- `codemap/index.md`, README, docs, source directories, package manifests, solution files, or tests exist
- the task looks like an addition or change to an existing system
- the user mentions "existing", "current", "same pattern", "again", "fix", "upgrade", or a concrete module name

Skip codebase research only when the workspace is clearly empty or the request is explicitly greenfield/standalone. Record the evidence either way.

### 4.3 Auto-Select GitHub Similar Projects

Run GitHub reference research only when it can materially reduce unknowns:

- the feature has common open-source reference implementations
- the local codebase lacks an established pattern
- the task involves architecture, workflow shape, plugins, CLIs, agent orchestration, or framework integration
- the user explicitly asks for references or examples

Otherwise skip and record: "Skipped GitHub research: local patterns/spec sufficient."

Auto-generate search queries from spec:
- `"{core_feature} {tech_stack}"` (예: "real-time chat nextjs")
- `"{domain} {architecture_pattern}"` (예: "e-commerce microservices")
- 스펙에서 추출한 기술 키워드 조합 (최대 3개 쿼리)

### 4.4 Auto-Select Web Research

Run web research automatically when the answer is likely time-sensitive or external:

- current SDK/API/library behavior, model/provider docs, pricing, standards, regulations, security guidance
- unfamiliar or niche technology
- high-risk integration such as auth, payments, medical, finance, cloud deploy, data privacy
- user explicitly asks for "latest", "current", "research", "deep research", or source-backed recommendations

Limit to max 3 derived topics. If more topics are possible, choose the three most likely to change the plan and put the rest in Open Questions.

### 4.5 Auto-Select Academic Paper Research

Run academic research only when the implementation depends on algorithms, ranking, search, optimization, ML/AI, evaluation methodology, simulation, cryptography, or performance benchmarking.

Auto-generate search queries from spec:
- `"{core_algorithm} algorithm paper"` (예: "recommendation system collaborative filtering paper")
- `"{domain} state of the art {year}"` (예: "real-time chat architecture 2025")
- `"{feature} benchmark comparison"` (예: "vector search performance comparison")

Skip for ordinary CRUD, UI, integration, documentation, and workflow automation tasks.

### 4.6 Auto-Select Competitor Analysis

Run competitor analysis only when product shape matters:

- new product, SaaS, marketplace, public website, onboarding, pricing, menu structure, dashboard IA, or user workflow design
- user explicitly asks for market/product/competitor perspective
- `unknowns.md` flags unknown knowns around UX taste, expected feature set, or category norms

If competitors are unknown, auto-search from the spec. Do not ask for competitor names unless the category is ambiguous enough that the wrong category would change the plan.

### 4.7 Write `research-decision.md`

Before Step 5, write `<planning_dir>/research-decision.md`:

```markdown
# Research Decision

## Selected
- Codebase: yes/no — {evidence}
- Web: yes/no — {evidence}
- GitHub: yes/no — {evidence}
- Academic: yes/no — {evidence}
- Competitors: yes/no — {evidence}

## Assumptions
- [inferred] {assumption}

## Questions Deferred
- {non-blocking unknown to revisit later}
```

If no research type is selected, skip Step 5 and proceed to Step 5A using the spec and local docs.

---

## Step 5: Execute Research

### Critical Pattern: File-First, Bounded Research

**DO NOT** have delegated research work items return full findings to the parent context.

Each research work item uses the `artifact-writer` role, writes to a unique file under `<planning_dir>/research/`, and returns only a 1-2 line summary. This prevents the Step 5 failure mode where two large results return at once and the API responds with `Overloaded`.

Race conditions are avoided by assigning one output file per research type:
- `research/codebase.md`
- `research/web.md`
- `research/github.md`
- `research/academic.md`
- `research/competitors.md`

Main/Lead remains responsible for reading those files and writing the combined `<planning_dir>/research.md`.

```
┌─────────────────────────────────────────────────────────────┐
│  BOUNDED RESEARCH EXECUTION                                 │
│                                                             │
│  Batch 1 (max 2 work items):                                │
│    Work item: codebase → research/codebase.md               │
│    Work item: web      → research/web.md                    │
│                                                             │
│  Batch 2 (max 2 work items):                                │
│    Work item: GitHub   → research/github.md                 │
│    Work item: academic → research/academic.md               │
│                                                             │
│  Batch 3 (if needed):                                       │
│    Work item: competitors → research/competitors.md         │
│                                                             │
│  Parent combines research/*.md → research.md                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Resource Budgets

Apply these limits to every Step 5 research work item:

| Research type | Hard budget |
|---------------|-------------|
| Codebase | Max 10 tool calls; inspect only entrypoints, config, tests, and 5-8 representative files |
| Web | Max 3 topics; max 2 authoritative sources per topic |
| GitHub | Max 3 repos; max 6 source files total across repos |
| Academic | Max 5 sources; prioritize surveys/benchmarks over broad search |
| Competitors | Max 5 competitors; pricing/features/navigation only |

If a work item needs more time, it must write "Follow-up needed" in its output file instead of expanding scope.

### 5.1 Codebase Research (if selected)

Run one native `artifact-writer` work item with a unique output file:

```
Work item contract:
  semantic role: artifact-writer
  unique output: <planning_dir>/research/codebase.md
  description: "Research codebase patterns"
  instructions: |
    Research this codebase to understand:
    - Project structure and architecture
    - Existing patterns and conventions
    - Dependencies and how they're used
    - Testing setup (framework, patterns, how tests are run)

    Focus areas from user: {user_specified_areas_if_any}

    Resource budget:
    - Max 10 tool calls.
    - Inspect only entrypoints, config, tests, and 5-8 representative files.
    - Prefer rg/Glob over broad file reads.

    Write your full findings to: <planning_dir>/research/codebase.md
    Return only: "codebase.md written. Patterns: N, Risks: N, Follow-up: yes/no"
    DO NOT return the full findings in your response.
```

### 5.2 Web Research (if topics selected)

Run one native `artifact-writer` work item with a unique output file:

```
Work item contract:
  semantic role: artifact-writer
  unique output: <planning_dir>/research/web.md
  description: "Research best practices"
  instructions: |
    Research current best practices for the following topics:
    {selected_topics_list}

    For each topic:
    1. Use WebSearch to find authoritative sources
    2. Use WebFetch on promising results to extract recommendations
    3. Cross-validate information across sources
    4. Synthesize findings with clear recommendations

    Resource budget:
    - Research max 3 topics.
    - Use max 2 authoritative sources per topic.
    - Prefer official docs, standards, and primary sources over blog chains.

    Write your full findings to: <planning_dir>/research/web.md
    Return only: "web.md written. Topics: N, Sources: N, Follow-up: yes/no"
    DO NOT return the full findings in your response.
```

### 5.3 GitHub Similar Projects (if selected)

Run one native `artifact-writer` work item with a unique output file:

```
Work item contract:
  semantic role: artifact-writer
  unique output: <planning_dir>/research/github.md
  description: "Search GitHub similar projects"
  instructions: |
    Search GitHub for similar open-source projects related to:
    {project_description_from_spec}

    Tech stack: {detected_tech_stack}

    Search queries to try:
    {auto_generated_queries}

    For each promising project found:
    1. Use WebSearch with "site:github.com {query}" to find repositories
    2. Use WebFetch on the GitHub repo page to read the README
    3. Use Bash to browse source code with gh CLI:
       - `gh api repos/{owner}/{repo}/contents` — 루트 디렉토리 구조
       - `gh api repos/{owner}/{repo}/contents/{path}` — 핵심 파일 내용 (base64 → jq -r '.content' | base64 -d)
       - 우선 탐색 대상: 엔트리포인트(main/app/index), 라우터/컨트롤러, 스키마/모델, 설정 파일
       - 전체 클론 금지 — API로 필요한 파일만 선택적 읽기 (최대 10개 파일)
    4. Feature & Menu Analysis (기능/메뉴 분석):
       - README, 라우터/네비게이션 파일, 사이드바/헤더 컴포넌트에서 기능 목록 추출
       - 메뉴 구조 파악: 페이지/화면 목록, 네비게이션 계층, 사용자 흐름
       - 핵심 기능별 구현 방식 확인 (인증, CRUD, 검색, 대시보드 등)
       - 우리 스펙에 없지만 유사 프로젝트에 공통으로 있는 기능 식별 → 누락 후보
    5. Analyze: project structure, key design decisions, tech choices, code patterns
    6. Note: star count, last update, maturity level

    Resource budget:
    - Select top 3 most relevant projects.
    - Read max 6 source files total across all repos.
    - Do not clone repositories unless the user explicitly asked for deep repository analysis.

    For each selected project, provide:
    - **Repo**: owner/name (URL)
    - **Stars / Last updated**: popularity and freshness
    - **Relevance**: why this project is useful as reference
    - **Features**: 주요 기능 목록 (우리 스펙과 겹치는 기능은 ✅, 우리에게 없는 기능은 💡 표시)
    - **Menu/Pages**: 메뉴 구조 또는 페이지 목록 (트리 형태)
    - **Architecture**: key patterns, folder structure, tech stack
    - **Key Code**: 참고할 만한 핵심 코드 패턴 (파일 경로 + 요약)
    - **Takeaways**: specific ideas we can adopt or avoid

    Write your full findings to: <planning_dir>/research/github.md
    Return only: "github.md written. Repos: N, Follow-up: yes/no"
    DO NOT return the full findings in your response.
```

### 5.4 Academic Paper Research (if selected)

Run one native `artifact-writer` work item with a unique output file:

```
Work item contract:
  semantic role: artifact-writer
  unique output: <planning_dir>/research/academic.md
  description: "Research academic papers and algorithms"
  instructions: |
    Research academic papers, algorithms, and implementation approaches for:
    {project_description_from_spec}

    Search queries to try:
    {auto_generated_queries}

    For each search:
    1. Use WebSearch to find papers, articles, blog posts about algorithms and approaches
    2. Use WebFetch on promising results to extract key information
    3. Focus on: algorithm design, data structures, performance characteristics,
       implementation trade-offs, benchmark comparisons

    For each relevant paper/approach found, provide:
    - **Title**: paper/article title
    - **Source**: URL or citation
    - **Algorithm/Approach**: core algorithm or method described
    - **Key Insight**: what makes this approach notable
    - **Implementation Notes**: practical considerations (complexity, libraries, patterns)
    - **Relevance**: how this applies to our project

    Also identify:
    - Common patterns across papers (consensus approaches)
    - Trade-offs between different approaches (speed vs accuracy, simplicity vs features)
    - Recommended implementation order (which to try first)

    Resource budget:
    - Max 5 sources.
    - Prefer surveys, benchmark papers, official docs, and reproducible implementations.

    Write your full findings to: <planning_dir>/research/academic.md
    Return only: "academic.md written. Sources: N, Follow-up: yes/no"
    DO NOT return the full findings in your response.
```

### 5.5 Competitor Analysis (if selected)

Run one native `artifact-writer` work item with a unique output file:

```
Work item contract:
  semantic role: artifact-writer
  unique output: <planning_dir>/research/competitors.md
  description: "Analyze competitor products"
  instructions: |
    Analyze competitor products/services for:
    {project_description_from_spec}

    Known competitors (if any): {user_provided_competitors}

    1. Use WebSearch to find competing products/services
       - "{domain} software comparison {year}"
       - "{feature} alternatives"
       - "best {domain} tools"
    2. Use WebFetch on each competitor's website to extract:
       - Feature list / pricing page
       - Menu structure / navigation
       - Key differentiators

    For each competitor (top 5), provide:
    - **Name**: product/service name (URL)
    - **Target Audience**: who they serve
    - **Core Features**: feature list (categorized)
    - **Menu/Navigation Structure**: sitemap or menu tree
    - **UX Patterns**: notable UI/UX decisions
    - **Strengths**: what they do well
    - **Weaknesses**: gaps, complaints, missing features (check review sites)
    - **Pricing Model**: free/freemium/paid tiers

    Then provide:
    ## Competitive Landscape Summary
    | Feature | Us (planned) | Competitor A | Competitor B | Competitor C |
    |---------|-------------|-------------|-------------|-------------|
    | {feature} | ✅/❌/💡 | ✅/❌ | ✅/❌ | ✅/❌ |

    ## Differentiation Opportunities
    - Features competitors lack that we can offer
    - UX patterns we should adopt
    - UX anti-patterns we should avoid

    Resource budget:
    - Max 5 competitors.
    - Capture pricing, features, navigation, and positioning.
    - Do not deep-dive reviews unless the user selected competitor analysis as the primary research path.

    Write your full findings to: <planning_dir>/research/competitors.md
    Return only: "competitors.md written. Competitors: N, Follow-up: yes/no"
    DO NOT return the full findings in your response.
```

### 5.6 Bounded Execution

Main/Lead creates `<planning_dir>/research/` before launching work items.

If multiple research types are needed, launch work items in bounded batches:
- Default max: **2 concurrent research work items**
- If the previous batch hits `Overloaded`, rate limit, or timeout: retry the failed item once as a **single work item** with half the budget
- If it fails again: Main/Lead writes a short warning stub to that research file and continues with successful research

Do not launch all five research work items in one message.

```
# Batch 1:
[artifact-writer: codebase → research/codebase.md]
[artifact-writer: web → research/web.md]

# Batch 2:
[artifact-writer: GitHub → research/github.md]
[artifact-writer: academic → research/academic.md]

# Batch 3:
[artifact-writer: competitors → research/competitors.md]
```

Wait for a batch to complete before launching the next batch.

### 5.7 Combine Results and Write File

After collecting writer summaries, Main/Lead reads the files under `<planning_dir>/research/` and combines them into `<planning_dir>/research.md`.

Recommended structure:

```markdown
# Research

## Summary
- {top finding}

## Codebase Research
{content from research/codebase.md or "Skipped"}

## Web Research
{content from research/web.md or "Skipped"}

## GitHub References
{content from research/github.md or "Skipped"}

## Academic / Algorithm Research
{content from research/academic.md or "Skipped"}

## Competitor Analysis
{content from research/competitors.md or "Skipped"}

## Open Questions
- {follow-up items from writer files}
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| Spec file is vague | Select codebase research if available; otherwise use generic topics based on detected language/framework and record `[inferred]` assumptions |
| No research selected | Skip Step 5, proceed to Step 5A using spec/local docs |
| One work item fails | Retry once as a single work item with half budget; if still failing, Main/Lead writes the warning stub and continues |
| `API Error: Overloaded` | Wait briefly, reduce concurrency to 1, retry the failed research item once |
| All delegated work items fail | Main/Lead writes warning stubs, proceeds to Step 5A with local context, and asks only if the task is high-risk and no conservative plan can be formed |
| Only one research type | Run one writer or the sequential main-context fallback; write only that research file |
| GitHub search returns no relevant results | Note in research file, not a blocker |
