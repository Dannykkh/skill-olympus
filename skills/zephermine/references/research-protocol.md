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
│                                                             │
│  Step 5: Execute research (parallel if multiple selected)   │
│    - Subagents return results                               │
│    - Main Claude combines and writes claude-research.md     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 4: Research Decision

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

Use AskUserQuestion:

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

Use AskUserQuestion:

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

Present the derived topics as multi-select options:

```
question: "Should I research current best practices for any of these topics?"
header: "Web Research"
multiSelect: true
options:
  - label: "{derived_topic_1}"
    description: "Based on spec mention of {X}"
  - label: "{derived_topic_2}"
    description: "Based on spec mention of {Y}"
  - label: "{derived_topic_3}"
    description: "Based on spec mention of {Z}"
```

If user selects "Other", follow up to get custom topics.

### 4.5 Handle "No Research" Case

If user selects no codebase AND no web research AND no GitHub research, skip step 5 entirely.

---

## Step 5: Execute Research

### Critical Pattern: Subagents Return Results, Parent Writes Files

**DO NOT** have subagents write to files directly. This avoids race conditions and keeps control with the main context.

```
┌─────────────────────────────────────────────────────────────┐
│  PARALLEL RESEARCH EXECUTION                                │
│                                                             │
│  Task 1: Explore ──────────┐                                │
│    (codebase patterns)     │                                │
│                            ├──→ Main Claude combines       │
│  Task 2: Explore ──────────┤    and writes single          │
│    (web best practices)    │    claude-research.md         │
│                            │                                │
│  Task 3: Explore ──────────┘                                │
│    (GitHub similar projects)                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

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

    Return your findings as markdown.
    DO NOT write to any files. Return findings in your response.
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

    Return your findings as markdown. Always cite sources with URLs.
    DO NOT write to any files. Return findings in your response.
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

    Select top 3-5 most relevant projects. For each, provide:
    - **Repo**: owner/name (URL)
    - **Stars / Last updated**: popularity and freshness
    - **Relevance**: why this project is useful as reference
    - **Features**: 주요 기능 목록 (우리 스펙과 겹치는 기능은 ✅, 우리에게 없는 기능은 💡 표시)
    - **Menu/Pages**: 메뉴 구조 또는 페이지 목록 (트리 형태)
    - **Architecture**: key patterns, folder structure, tech stack
    - **Key Code**: 참고할 만한 핵심 코드 패턴 (파일 경로 + 요약)
    - **Takeaways**: specific ideas we can adopt or avoid

    Return your findings as markdown. Always include repo URLs.
    DO NOT write to any files. Return findings in your response.
```

### 5.4 Parallel Execution

If multiple research types are needed, launch **all Task tools in a single message**.

```
# Single message with multiple tool calls:
[Task tool call 1: Explore subagent for codebase]
[Task tool call 2: Explore subagent for web research]
[Task tool call 3: Explore subagent for GitHub projects]
```

Wait for all to complete, then combine results.

### 5.5 Combine Results and Write File

After collecting results from all subagents, combine them into `<planning_dir>/claude-research.md`.

Structure the file however makes sense for the findings.

---

## Edge Cases

| Case | Handling |
|------|----------|
| Spec file is vague | Present generic options based on detected language/framework |
| User selects no research | Skip step 5, proceed to step 6 (interview) |
| One subagent fails | Log warning, write file with only successful research |
| All subagents fail | Log error, ask user if they want to retry or proceed |
| Only one research type | Run single subagent, write file with just that content |
| GitHub search returns no relevant results | Note in research file, not a blocker |
