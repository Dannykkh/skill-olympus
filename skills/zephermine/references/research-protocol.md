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
│    - Subagents write one file each                           │
│    - Subagents return only short summaries                   │
│    - Main Claude combines files into research.md             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 4: Research Decision

### Question Tool Compatibility

Use plain text numbered choices by default. Use a structured question tool only when the current CLI supports the exact schema.

- Structured calls: max 3 questions per call, each with 2-3 short options.
- Do not use structured multi-selection fields unless the CLI explicitly supports them.
- For multiple selections, show a numbered checklist and ask the user to reply with multiple numbers.
- If `Invalid tool parameters` occurs once, do not retry the same payload; fall back to plain text.

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

### 4.2 Ask About Codebase Research

Ask as a bounded choice. Use a structured question tool only if supported:

```
question: "Is there existing code I should research first?"
header: "Codebase"
options:
  - label: "Yes, research the codebase"
    description: "Analyze existing patterns, conventions, dependencies"
  - label: "No existing code"
    description: "This is a new project or standalone feature"
```

### 4.3 Ask About GitHub Similar Projects

Ask as a bounded choice. Use a structured question tool only if supported:

```
question: "Should I search GitHub for similar projects to use as reference?"
header: "GitHub"
options:
  - label: "Yes, find similar projects"
    description: "Search GitHub for reference implementations, architecture patterns, proven solutions"
  - label: "No, skip"
    description: "Enough context from codebase and web research"
```

If user selects yes, auto-generate search queries from spec:
- `"{core_feature} {tech_stack}"` (예: "real-time chat nextjs")
- `"{domain} {architecture_pattern}"` (예: "e-commerce microservices")
- 스펙에서 추출한 기술 키워드 조합 (최대 3개 쿼리)

### 4.4 Ask About Web Research

Present the derived topics as a numbered checklist by default. Use structured multi-selection only if the current CLI explicitly supports it. When using the structured tool, send at most 4 `options` per call (5+ derived topics → use the plain numbered checklist or split into batches of 4; `AskUserQuestion` rejects >4 options with `Invalid tool parameters`):

```
question: "Should I research current best practices for any of these topics?"
header: "Web Research"
selection: "multiple numbers by default; structured multiple-selection only if supported"
options:
  - label: "{derived_topic_1}"
    description: "Based on spec mention of {X}"
  - label: "{derived_topic_2}"
    description: "Based on spec mention of {Y}"
  - label: "{derived_topic_3}"
    description: "Based on spec mention of {Z}"
```

If user selects "Other", follow up to get custom topics.

### 4.5 Ask About Academic Paper Research

Ask as a bounded choice. Use a structured question tool only if supported:

```
question: "관련 논문이나 알고리즘을 조사할까요?"
header: "논문 조사"
options:
  - label: "Yes, search papers & algorithms"
    description: "관련 논문, 알고리즘, 데이터 구조, 구현 패턴을 조사합니다 (Google Scholar, arXiv 등)"
  - label: "No, skip"
    description: "논문 조사 불필요"
```

If user selects yes, auto-generate search queries from spec:
- `"{core_algorithm} algorithm paper"` (예: "recommendation system collaborative filtering paper")
- `"{domain} state of the art {year}"` (예: "real-time chat architecture 2025")
- `"{feature} benchmark comparison"` (예: "vector search performance comparison")

### 4.6 Ask About Competitor Analysis

Ask as a bounded choice. Use a structured question tool only if supported:

```
question: "경쟁 서비스/제품을 조사할까요?"
header: "경쟁 분석"
options:
  - label: "Yes, analyze competitors"
    description: "경쟁 서비스의 기능, 메뉴 구조, UX 패턴, 차별점을 분석합니다"
  - label: "No, skip"
    description: "경쟁 분석 불필요"
```

If user selects yes, ask follow-up as plain text or a supported bounded choice:

```
question: "알고 있는 경쟁 서비스가 있나요? (없으면 자동 검색합니다)"
header: "Competitors"
options:
  - label: "직접 입력"
    description: "경쟁사 이름이나 URL을 알려주세요"
  - label: "자동 검색"
    description: "스펙 기반으로 유사 서비스를 찾아보겠습니다"
```

### 4.7 Handle "No Research" Case

If user selects no codebase AND no web research AND no GitHub research, skip step 5 entirely.

---

## Step 5: Execute Research

### Critical Pattern: File-First, Bounded Research

**DO NOT** have research subagents return full findings to the parent context.

Each research subagent writes to a unique file under `<planning_dir>/research/` and returns only a 1-2 line summary. This prevents the Step 5 failure mode where two large research agents return 100k+ tokens at once and the API responds with `Overloaded`.

Race conditions are avoided by assigning one output file per research type:
- `research/codebase.md`
- `research/web.md`
- `research/github.md`
- `research/academic.md`
- `research/competitors.md`

The parent remains responsible for reading those files and writing the combined `<planning_dir>/research.md`.

```
┌─────────────────────────────────────────────────────────────┐
│  BOUNDED RESEARCH EXECUTION                                 │
│                                                             │
│  Batch 1 (max 2 tasks):                                     │
│    Task: codebase → research/codebase.md                    │
│    Task: web      → research/web.md                         │
│                                                             │
│  Batch 2 (max 2 tasks):                                     │
│    Task: GitHub   → research/github.md                      │
│    Task: academic → research/academic.md                    │
│                                                             │
│  Batch 3 (if needed):                                       │
│    Task: competitors → research/competitors.md              │
│                                                             │
│  Parent combines research/*.md → research.md                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Resource Budgets

Apply these limits to every Step 5 research agent:

| Research type | Hard budget |
|---------------|-------------|
| Codebase | Max 10 tool calls; inspect only entrypoints, config, tests, and 5-8 representative files |
| Web | Max 3 topics; max 2 authoritative sources per topic |
| GitHub | Max 3 repos; max 6 source files total across repos |
| Academic | Max 5 sources; prioritize surveys/benchmarks over broad search |
| Competitors | Max 5 competitors; pricing/features/navigation only |

If the agent needs more time, it must write "Follow-up needed" in its output file instead of expanding scope.

### 5.1 Codebase Research (if selected)

Launch Task tool with `subagent_type=Explore`:

```
Task tool:
  subagent_type: Explore
  description: "Research codebase patterns"
  prompt: |
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

Launch Task tool with `subagent_type=Explore`:

```
Task tool:
  subagent_type: Explore
  description: "Research best practices"
  prompt: |
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

Launch Task tool with `subagent_type=Explore`:

```
Task tool:
  subagent_type: Explore
  description: "Search GitHub similar projects"
  prompt: |
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

Launch Task tool with `subagent_type=Explore`:

```
Task tool:
  subagent_type: Explore
  description: "Research academic papers and algorithms"
  prompt: |
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

Launch Task tool with `subagent_type=Explore`:

```
Task tool:
  subagent_type: Explore
  description: "Analyze competitor products"
  prompt: |
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

Create `<planning_dir>/research/` before launching tasks.

If multiple research types are needed, launch tasks in bounded batches:
- Default max: **2 concurrent research tasks**
- If the previous batch hits `Overloaded`, rate limit, or timeout: retry the failed item once as a **single task** with half the budget
- If it fails again: write a short warning stub to that research file and continue with successful research

Do not launch all five research tasks in one message.

```
# Batch 1:
[Task tool call 1: Explore subagent for codebase]
[Task tool call 2: Explore subagent for web research]

# Batch 2:
[Task tool call 3: Explore subagent for GitHub projects]
[Task tool call 4: Explore subagent for academic papers]

# Batch 3:
[Task tool call 5: Explore subagent for competitor analysis]
```

Wait for a batch to complete before launching the next batch.

### 5.7 Combine Results and Write File

After collecting subagent summaries, read the files under `<planning_dir>/research/` and combine them into `<planning_dir>/research.md`.

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
- {follow-up items from subagent files}
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| Spec file is vague | Present generic options based on detected language/framework |
| User selects no research | Skip step 5, proceed to step 6 (interview) |
| One subagent fails | Retry once as a single task with half budget; if still failing, write warning stub and continue |
| `API Error: Overloaded` | Wait briefly, reduce concurrency to 1, retry the failed research item once |
| All subagents fail | Ask user whether to retry with codebase-only research or proceed without research |
| Only one research type | Run single subagent, write file with just that content |
| GitHub search returns no relevant results | Note in research file, not a blocker |
