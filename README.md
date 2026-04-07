**Language:** English | [한국어](README-ko.md)

# Skill Olympus

> *Where every skill is a Greek god, and every workflow is a myth.*

[![Stars](https://img.shields.io/github/stars/Dannykkh/skill-olympus?style=flat)](https://github.com/Dannykkh/skill-olympus/stargazers)
[![Forks](https://img.shields.io/github/forks/Dannykkh/skill-olympus?style=flat)](https://github.com/Dannykkh/skill-olympus/network/members)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Shell](https://img.shields.io/badge/-Shell-4EAA25?logo=gnu-bash&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)
![PowerShell](https://img.shields.io/badge/-PowerShell-5391FE?logo=powershell&logoColor=white)
![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white)

> **98 skills** | **49 agents** | **12 hooks** | **3 CLI support** | **Cross-CLI memory sync**

---

**The production-ready agent harness for Claude Code, Codex CLI, and Gemini CLI.**

Not just configs. A complete **harness engineering** system: CPS-gated design interviews (Context → Problem → Solution with mandatory checkpoints), zero-interaction full pipeline (design → implement → inspect → test), end-to-end traceability from interview to code inspection, cross-CLI memory persistence, and multi-AI parallel orchestration. Evolved over 3+ months of intensive daily use building real products.

Works across **Claude Code**, **Codex CLI**, and **Gemini CLI**.

---

## Quick Start

```bash
# Clone
git clone https://github.com/Dannykkh/skill-olympus.git
cd skill-olympus

# Windows
.\install.bat

# macOS/Linux
chmod +x install.sh && ./install.sh
```

That's it. **96 skills, 48 agents, 12 hooks** installed across Claude Code + Codex CLI + Gemini CLI.

> Codex/Gemini steps auto-skip if the respective CLI is not installed.

---

## The Pantheon

> Twelve gods sit on Mount Olympus. Each holds a domain. Each answers to a single name.
> Call any one of them — or call **Zeus**, and the entire pantheon descends at once.

This isn't a collection of plugins. It's a **mythology of work**:
a small council of gods, each forged for one craft, each speaking in their own voice.
They hand work to one another the way the old myths describe — Zephermine whispers a spec
into Poseidon's ear, Poseidon raises the waves, Argos counts every plank, Minos judges
each soul at the gate, and Clio carves the whole story into stone for those who come after.

Below is the council. Pick one, or summon them all.

### The Council of Twelve

| Skill | Name | Origin | Role |
|-------|------|--------|------|
| `/zephermine` | Zephermine (젭마인) | The West Wind, breath of inspiration | **The Architect** — 26-step deep interview, spec generation, 5-expert team review |
| `/zeus` | Zeus (제우스) | King of the Gods | **The Commander** — Zero-interaction full pipeline. One command, all gods descend |
| `/agent-team` / `/poseidon` | Poseidon (포세이돈) | God of the Sea | **The Sea Lord** — Raises the waves. Section dependencies sail in formation, fleet by fleet |
| `/workpm` | Daedalus (다이달로스) | Master Craftsman of the Labyrinth | **The Hands-On Builder** — Builds without a blueprint. Hands in clay, eyes on the prize |
| `/argos` | Argos (아르고스) | The All-Seeing, Hundred-Eyed Watchman | **The Inspector** — A hundred eyes never blink. Every line of code is seen |
| `/minos` | Minos (미노스) | Judge of the Underworld | **The Judge** — Souls and code alike stand trial. The fix-loop never closes until it passes |
| `/clio` | Clio (클리오) | Muse of History | **The Chronicler** — The last to speak. She carves the heroes' deeds into the records of time |
| `/chronos` | Chronos (크로노스) | God of Time | **The Tireless One** — Time itself bends to her will. FIND → FIX → VERIFY, again, and again, and again |
| `/hermes` | Hermes (헤르메스) | God of Commerce, Messenger of the Gods | **The Merchant** — Reads markets like he reads winds. TAM, SAM, SOM, GTM — the trader's compass |
| `/athena` | Athena (아테나) | Goddess of Strategy & Wisdom | **The Strategist** — Cold-eyed, cold-blooded. Asks the questions that hurt: ship it, kill it, or pivot? |
| `/aphrodite` | Aphrodite (아프로디테) | Goddess of Beauty | **The Beauty** — 161 palettes, 73 fonts, 84 styles. Nothing leaves her hands ugly |
| `mnemo` | Mnemo (므네모) | Mnemosyne, Mother of the Muses | **The Keeper of Memory** — Forgets nothing. Three layers of memory across every session, every CLI |

---

### Voices from Olympus

**Zeus** — *"One word, and the council convenes. I do not negotiate with the work. I deliver it."*
Throws every god into the field with a single line. Design → Implement → Inspect → Test, untouched by human hand.

**Zephermine** — *"Twenty-six questions. None of them are optional. The spec is sacred."*
The breath that shapes the blueprint. CPS-gated interview, 5-expert review, no spec ships half-formed.

**Poseidon** — *"You don't fight the sea. You ride it."*
Reads the dependency graph like tides. Builds the fleet (teammates), waits for the wave, sends them all out together.

**Daedalus** — *"There was no labyrinth before me. I made it from nothing. Hand me the stone."*
For when there is no plan. He researches, proposes, drafts, and builds — alone if he must.

**Argos** — *"Of my hundred eyes, none ever close. The plank you forgot to nail down — I have already counted it."*
Walks the construction site after the crew leaves. Cross-references spec ↔ code ↔ tests. Nothing slips past.

**Minos** — *"Stand before me. Show me your tests. The verdict is binary."*
Drags the code to the gate of the underworld. Fails it. Heals it. Fails it again. Repeats until it passes.

**Clio** — *"The work is finished. Now I write the song."*
Turns the corpse of a project into a living document. Flow diagrams, PRD, technical docs, user manual — all carved at the end.

**Chronos** — *"You are mortal. You sleep. I do not."*
The autonomous loop that does not give up. FIND → FIX → VERIFY, until the bug is dead or the dawn breaks.

**Hermes** — *"Every market is a road. Every road has a price. Pay it, or starve."*
Business model, market sizing, GTM. Reads the trade winds before you commit a single line.

**Athena** — *"Wisdom is knowing what not to build. I will ask you the question you are afraid of."*
Go / No-Go gate. Scope decisions. The CEO who makes you justify your existence.

**Aphrodite** — *"Beauty is not a luxury. It is the difference between a tool and a thing people love."*
Design orchestrator. 161 palettes, 73 fonts, 84 styles, design tokens, component architecture.

**Mnemo** — *"Forget nothing. The conversation you had three months ago is the answer you need today."*
The mother of all muses. Three-layer memory: index, semantic, episodic. Crosses every CLI, persists every session.

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

### v1.7.0 — Orchestrator SQLite WAL + Minos Step 5 (Mar 2026)

- **orchestrator** — state.json → SQLite WAL migration for crash recovery
- **minos** — Playwright MCP real-browser QA testing
- **codemap** — CodeMap index for codebase navigation

### v1.6.0 — Design + Business + Skill Best Practices (Mar 2026)

- **design-plan (Aphrodite)** — Design orchestrator with 161 palettes, 73 fonts, 84 styles
- **estimate** — Development cost estimation with Excel output
- **biz-strategy (Hermes)** — Business model canvas, TAM/SAM/SOM, GTM strategy
- **Anthropic best practices** — Applied across all skills

See the full changelog in [CHANGELOG.md](CHANGELOG.md) and [Releases](https://github.com/Dannykkh/skill-olympus/releases).

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
| **Test** | `/minos` (미노스) | Playwright E2E tests + fix-until-pass loop |
| **Deliver** | `/clio` (클리오) | Flow diagrams + PRD + technical docs + user manual |
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
| **Pipeline** | zephermine, zeus, argos, minos, closer | Zero-interaction full dev pipeline |
| **Frontend** | react-dev, frontend-design, stitch-*, seo-audit, ui-ux-auditor + 5 more | 161 palettes, 73 fonts, SEO+AEO+GEO audit |
| **Development** | docker-deploy, database-schema-designer, social-login, code-reviewer + 7 more | Docker, DB design, social login, code quality |
| **Business** | biz-strategy, ceo, estimate, okr, daily-meeting-update | CEO coaching, cost estimation, OKR, standup |
| **Testing** | qa-test-planner, auto-continue-loop, flow-verifier + 3 more | Chronos loop, Playwright QA |
| **Memory** | mnemo, memory-compact, project-gotchas | 3-layer memory, auto learning |
| **Docs** | mermaid-diagrams, marp-slide, docx, pdf, draw-io + 3 more | Diagrams, presentations, documents |
| **Meta** | autoresearch, skill-judge, manage-skills, plugin-forge, release-notes + 4 more | Skill auto-optimization (Hill Climbing), management, release |
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

### Hooks (13)

| Hook | Event | Purpose |
|------|-------|---------|
| reconcile-conversations | SessionStart | Backfill missed Claude/Codex turns from JSONL transcripts |
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
| [v1.9.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.9.0) | 2026-03-24 | Athena CEO Coaching + Pipeline Expansion |
| [v1.8.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.8.0) | 2026-03-23 | Project Gotchas + Learned Patterns |
| [v1.7.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.7.0) | 2026-03-21 | Orchestrator SQLite WAL + Minos |
| [v1.6.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.6.0) | 2026-03-18 | Design + Business + Skill Best Practices |
| [v1.5.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.5.0) | 2026-03-09 | Closer + SEO Audit + Pipeline Overhaul |
| [v1.4.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.4.0) | 2026-03-02 | Chronos + Argos + Memory Compact |
| [v1.3.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.3.0) | 2026-02-19 | Cross-CLI: Codex + Gemini |
| [v1.2.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.2.0) | 2026-02-09 | Agent-Team + Zeus + QA Pipeline |
| [v1.1.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.1.0) | 2026-02-01 | Zephermine + Mnemo + Install |
| [v1.0.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.0.0) | 2026-01-29 | Initial Release |

---

## License

MIT License

---

**Last Updated:** 2026-03-23
