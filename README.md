**Language:** English | [한국어](README-ko.md)

# Claude Code Agent Customizations

[![Stars](https://img.shields.io/github/stars/Dannykkh/claude-code-agent-customizations?style=flat)](https://github.com/Dannykkh/claude-code-agent-customizations/stargazers)
[![Forks](https://img.shields.io/github/forks/Dannykkh/claude-code-agent-customizations?style=flat)](https://github.com/Dannykkh/claude-code-agent-customizations/network/members)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Shell](https://img.shields.io/badge/-Shell-4EAA25?logo=gnu-bash&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)
![PowerShell](https://img.shields.io/badge/-PowerShell-5391FE?logo=powershell&logoColor=white)
![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white)

> **95 skills** | **48 agents** | **12 hooks** | **3 CLI support** | **Cross-CLI memory sync**

---

**The production-ready agent harness for Claude Code, Codex CLI, and Gemini CLI.**

Not just configs. A complete system: zero-interaction full pipeline (design → implement → inspect → test), cross-CLI memory persistence, auto gotcha/learned pattern tracking, and multi-AI parallel orchestration. Evolved over 3+ months of intensive daily use building real products.

Works across **Claude Code**, **Codex CLI**, and **Gemini CLI**.

---

## Quick Start

```bash
# Clone
git clone https://github.com/Dannykkh/claude-code-agent-customizations.git
cd claude-code-agent-customizations

# Windows
.\install.bat

# macOS/Linux
chmod +x install.sh && ./install.sh
```

That's it. **95 skills, 48 agents, 12 hooks** installed across Claude Code + Codex CLI + Gemini CLI.

> Codex/Gemini steps auto-skip if the respective CLI is not installed.

---

## Meet the Team

Each skill is named after a Greek myth character (or a baseball role) that matches its purpose.

| Skill | Name | Origin | Role |
|-------|------|--------|------|
| `/zephermine` | Zephermine (젭마인) | — | **Architect** — 26-step deep interview, spec generation, 5-expert team review |
| `/zeus` | Zeus (제우스) | King of the Gods | **Commander** — Zero-interaction full pipeline, controls everything |
| `/agent-team` | Danny's Team (대니즈팀) | — | **Construction Crew** — Wave-grouped parallel implementation |
| `/workpm` | Daedalus (다이달로스) | Master Craftsman | **Site Foreman** — PM that builds without pre-design, hands-on |
| `/argos` | Argos (아르고스) | The All-Seeing (100 eyes) | **Inspector** — Construction inspection, verifies code matches design |
| `/qpassenger` | QPassenger (큐패신저) | — | **QA Tester** — Playwright E2E tests + fix-until-pass loop |
| `/closer` | Closer (클로저) | Baseball Closer | **Closer** — Post-pipeline deliverables: flow diagrams + docs |
| `/chronos` | Chronos (크로노스) | God of Time | **Tireless Worker** — Autonomous FIND-FIX-VERIFY loop, never stops |
| `/hermes` | Hermes (헤르메스) | God of Commerce | **Business Analyst** — Business model, TAM/SAM/SOM, GTM strategy |
| `/athena` | Athena (아테나) | Goddess of Strategy | **CEO Coach** — Go/No-Go gate, strategic challenge, scope decisions |
| `/aphrodite` | Aphrodite (아프로디테) | Goddess of Beauty | **Design Director** — Design orchestrator with 161 palettes, 73 fonts |
| `mnemo` | Mnemo (므네모) | Mnemosyne (Goddess of Memory) | **Librarian** — 3-layer persistent memory across sessions and CLIs |

---

## What's New

### v1.9.0 — Athena CEO Coaching (Mar 2026)

- **ceo (Athena)** — CEO coaching skill: Go/No-Go gate, strategic challenge, scope decisions (Expand/Reduce/Pivot/Kill)
- **Pipeline expansion** — New phase: `/hermes` → `/athena` → `/zephermine` (Analyze → Challenge → Design)
- **Hermes synergy** — Athena auto-reads Hermes output for data-driven strategic challenge
- **README overhaul** — Star-optimized structure, Meet the Team with Greek myth naming

### v1.8.0 — Project Gotchas + Learned Patterns (Mar 2026)

- **project-gotchas** — Auto mistake tracking + success pattern learning with Haiku analyzer
- **2-layer storage** — Global (`memory/gotchas/`) + project-specific (`memory/learned/`)
- **Cross-CLI observation** — Claude save-tool-use + Codex/Gemini save-turn hooks integrated
- **CHANGELOG.md** — Version history v1.0.0 ~ v1.8.0

### v1.7.0 — Orchestrator SQLite WAL + QPassenger Step 5 (Mar 2026)

- **orchestrator** — state.json → SQLite WAL migration for crash recovery
- **qpassenger** — Playwright MCP real-browser QA testing
- **codemap** — CodeMap index for codebase navigation

### v1.6.0 — Design + Business + Skill Best Practices (Mar 2026)

- **design-plan (Aphrodite)** — Design orchestrator with 161 palettes, 73 fonts, 84 styles
- **estimate** — Development cost estimation with Excel output
- **biz-strategy (Hermes)** — Business model canvas, TAM/SAM/SOM, GTM strategy
- **Anthropic best practices** — Applied across all skills

See the full changelog in [CHANGELOG.md](CHANGELOG.md) and [Releases](https://github.com/Dannykkh/claude-code-agent-customizations/releases).

---

## Core Pipeline

One command does everything:

```
/zeus "Build a shopping mall. React + Spring Boot"
    → Design (26-step interview) → Implement (parallel workers) → Inspect → Test
    → Zero interaction — never asks questions, all decisions automated
```

| Phase | Skill | What it does |
|-------|-------|-------------|
| **Analyze** | `/hermes` (헤르메스) | Business model, TAM/SAM/SOM, GTM, metrics, cohort |
| **Challenge** | `/athena` (아테나) | CEO coaching — Go/No-Go gate, scope decisions, kill test |
| **Design** | `/zephermine` (젭마인) | 26-step interview → SPEC.md → 5-agent team review |
| **Implement** | `/agent-team` | Wave-grouped parallel execution with Agent Teams |
| **Inspect** | `/argos` (아르고스) | Construction inspection: verify code matches design |
| **Test** | `/qpassenger` (큐패신저) | Playwright E2E tests + fix-until-pass loop |
| **Deliver** | `/closer` (클로저) | Flow diagrams + PRD + technical docs + user manual |
| **Full Auto** | `/zeus` (제우스) | All phases chained, zero interaction |

Each skill works standalone or as part of the pipeline.

---

## Cross-CLI Support

Same skills, same memory, same experience across 3 CLIs.

| Feature | Claude Code | Codex CLI | Gemini CLI |
|---------|------------|-----------|------------|
| Skills | `~/.claude/skills/` | `~/.codex/skills/` | `~/.gemini/skills/` |
| Agents | `~/.claude/agents/` | `~/.codex/agents/` | `~/.gemini/agents/` |
| Memory (Mnemo) | save-response hook | save-turn hook | save-turn hook |
| Gotchas/Learned | save-tool-use hook | save-turn hook | save-turn hook |
| Orchestrator | MCP server | MCP server | MCP server |
| Install | `install.bat/sh` | Auto (steps 8-11) | Auto (step 12) |

Cross-CLI sync is handled by `sync-codex-assets.js` and `sync-gemini-assets.js`.

---

## Memory System (Mnemo)

3-layer persistent memory that survives across sessions and CLIs.

```
Session A: work → #tags saved → /wrap-up → MEMORY.md updated
Session B: MEMORY.md auto-loaded → past search → context restored
```

| Layer | Storage | Loaded |
|-------|---------|--------|
| **Index** | `MEMORY.md` | Always (< 100 lines) |
| **Semantic** | `memory/*.md` | On demand |
| **Episodic** | `conversations/*.md` | On search |

Includes auto gotcha/learned tracking:
- **Errors** → `memory/gotchas/observations.jsonl` → Haiku analyzes patterns
- **Successes** → `memory/learned/observations.jsonl` → Haiku detects workflows

---

## What's Inside

### Skills (95)

| Category | Skills | Highlights |
|----------|--------|------------|
| **AI Tools** | codex, gemini, orchestrator, workpm, agent-team + 5 more | Multi-AI orchestration, PM-Worker pattern |
| **Pipeline** | zephermine, zeus, argos, qpassenger, closer | Zero-interaction full dev pipeline |
| **Frontend** | react-dev, frontend-design, stitch-*, seo-audit, ui-ux-auditor + 5 more | 161 palettes, 73 fonts, SEO+AEO+GEO audit |
| **Development** | docker-deploy, database-schema-designer, code-reviewer + 7 more | Docker, DB design, code quality |
| **Business** | biz-strategy, ceo, estimate, okr, daily-meeting-update | CEO coaching, cost estimation, OKR, standup |
| **Testing** | qa-test-planner, auto-continue-loop, flow-verifier + 3 more | Chronos loop, Playwright QA |
| **Memory** | mnemo, memory-compact, project-gotchas | 3-layer memory, auto learning |
| **Docs** | mermaid-diagrams, marp-slide, docx, pdf, draw-io + 3 more | Diagrams, presentations, documents |
| **Meta** | skill-judge, manage-skills, plugin-forge, release-notes + 4 more | Skill management, release automation |
| **Git** | commit-work, release-notes, deploymonitor | Conventional commits, CHANGELOG |
| **Media** | video-maker | Remotion-based React video |
| **Research** | reddit-researcher | Market research + lead scoring |
| **Translation** | ko-en-translator | Korean↔English bidirectional translation |
| **Utilities** | humanizer, jira, datadog-cli, excel2md + 3 more | AI pattern removal, integrations |

### Agents (48)

Specialized subagents for every development task:

| Area | Agents |
|------|--------|
| **Architecture** | architect, spec-interviewer, fullstack-development-workflow |
| **Frontend** | frontend-react, react-best-practices, stitch-developer, ui-ux-designer |
| **Backend** | backend-spring, backend-dotnet, desktop-wpf, python-fastapi |
| **Database** | database-postgresql, database-mysql, database-schema-designer |
| **Quality** | code-reviewer, security-reviewer, qa-engineer, tdd-coach |
| **Performance** | performance-engineer, debugger |
| **AI/ML** | ai-ml (RAG, LLM APIs, latest SDKs) |
| **Writing** | writing-specialist, humanizer-guidelines, writing-guidelines |
| **Language** | typescript-spec, python-spec |

### Hooks (12)

| Hook | Event | Purpose |
|------|-------|---------|
| save-response | Stop | Auto-save assistant responses with #tags |
| save-tool-use | PostToolUse | Tool logging + gotchas/learned observation |
| save-conversation | UserPromptSubmit | Persist user input |
| validate-code | PostToolUse | 500-line limit, security scan |
| check-new-file | PreToolUse | Reducing entropy check |
| protect-files | PreToolUse | Sensitive file protection |
| validate-docs | PostToolUse | AI writing pattern detection |
| format-code | PostToolUse | Auto-format (Python/TS/JS/Java/CSS) |
| validate-api | PostToolUse | API file validation |
| loop-stop | Stop | Chronos auto-iteration |
| ddingdong-noti | Stop | OS-native notification |
| orchestrator-detector | UserPromptSubmit | PM/Worker mode detection |

---

## Multi-AI Orchestration

PM distributes tasks, Workers execute in parallel across Claude + Codex + Gemini.

```
Terminal 1 (PM):     /workpm → analyze → create 3 tasks
Terminal 2 (Claude): /pmworker → claim task-1 → execute → complete
Terminal 3 (Codex):  /pmworker → claim task-2 → execute → complete
Terminal 4 (Gemini): /pmworker → claim task-3 → execute → complete
```

| Component | Description |
|-----------|-------------|
| **Orchestrator MCP** | SQLite WAL task queue, file locks, dependency resolution |
| **workpm** | Unified PM entrypoint (Agent Teams or MCP mode) |
| **pmworker** | Unified Worker entrypoint (all CLIs) |

---

## External Resources

### Recommended Skills

| Resource | Description | Install |
|----------|-------------|---------|
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | Anthropic hackathon winner (28 agents, 116 skills) | `/plugin marketplace add` |
| [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) | React/Next.js best practices (45+ rules) | `npx add-skill vercel-labs/agent-skills` |
| [claude-code-dotnet](https://github.com/Aaronontheweb/claude-code-dotnet) | C#/WPF/MAUI/.NET skills | `npx add-skill Aaronontheweb/claude-code-dotnet` |

### Recommended MCP Servers

| MCP | Description | Install |
|-----|-------------|---------|
| [Context7](https://github.com/upstash/context7) | Latest library docs (Next.js 15, React 19) | `claude mcp add context7 -- npx -y @upstash/context7-mcp` |
| [Playwright](https://github.com/microsoft/playwright-mcp) | Browser automation for QA | `claude mcp add playwright -- npx -y @playwright/mcp@latest` |
| [Stitch](https://github.com/anthropics/stitch-mcp) | Google Stitch UI design | `npx -p stitch-mcp-auto stitch-mcp-auto-setup` |

### Skills Directory

| Resource | Description |
|----------|-------------|
| [skills.sh](https://skills.sh/) | 25K+ skills directory by Vercel |
| [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | 200+ curated skills |
| [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | Claude Code resource curation |

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| [v1.9.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.9.0) | 2026-03-24 | Athena CEO Coaching + Pipeline Expansion |
| [v1.8.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.8.0) | 2026-03-23 | Project Gotchas + Learned Patterns |
| [v1.7.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.7.0) | 2026-03-21 | Orchestrator SQLite WAL + QPassenger |
| [v1.6.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.6.0) | 2026-03-18 | Design + Business + Skill Best Practices |
| [v1.5.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.5.0) | 2026-03-09 | Closer + SEO Audit + Pipeline Overhaul |
| [v1.4.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.4.0) | 2026-03-02 | Chronos + Argos + Memory Compact |
| [v1.3.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.3.0) | 2026-02-19 | Cross-CLI: Codex + Gemini |
| [v1.2.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.2.0) | 2026-02-09 | Agent-Team + Zeus + QA Pipeline |
| [v1.1.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.1.0) | 2026-02-01 | Zephermine + Mnemo + Install |
| [v1.0.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.0.0) | 2026-01-29 | Initial Release |

---

## License

MIT License

---

**Last Updated:** 2026-03-23
