# Changelog

All notable changes to this project will be documented in this file.

## [1.8.0] - 2026-03-23

### Features
- **project-gotchas** — Auto gotcha + learned pattern management with Haiku analyzer (656167c)
- **cross-cli** — Codex/Gemini save-turn hooks integrated with gotchas/learned observation (dbca431)
- **codemap** — CodeMap index files + AGENTS.md section link (ab5ba39)
- **GEMINI.md** — Gemini CLI project instructions (85b30a8)

### Bug Fixes
- **hooks** — save-tool-use.ps1 PowerShell syntax error + JSON parsing error guard (e47a62a, 017715a)
- **installer** — better-sqlite3 prerequisite check + PROJECT_ROOT removal (939d85d)
- **skills** — qa-test-planner YAML frontmatter folded block scalar fix (0055ce1)

---

## [1.7.0] - 2026-03-21

### Features
- **orchestrator** — state.json → SQLite WAL migration (2db3d2c)
- **qpassenger** — Playwright MCP browser exploration QA Step 5 (d076b19)
- **agents** — Large-scale agent improvements (octopus reference) (a406744)

### Bug Fixes
- **skills** — Subagent AskUserQuestion blocking prevention + argos healer (acbbe5d)
- **installer** — jq prerequisite check for hook error prevention (4a1b9ea)

---

## [1.6.0] - 2026-03-18

### Features
- **mnemo** — Progressive disclosure, PostToolUse hook, privacy tag, token hints (d869969)
- **design-plan** — Aphrodite design orchestrator skill (ef56d87)
- **estimate** — Development cost estimation with Excel output (3dd1f9e)
- **biz-strategy** — Business model canvas, TAM/SAM/SOM, renamed to /hermes (cf67dfe, 6ffb9ea)
- **okr** — OKR goal setting and tracking (cf67dfe)
- **frontend-design** — Design databases: 161 palettes, 73 fonts, 84 styles (d906bae)

### Refactoring
- **skills** — Anthropic skill-making best practices applied (7a4856b)
- **skills** — Progressive disclosure split for qpassenger, hermes, closer (91916b4)
- **skills** — Trigger conditions added to 11 skill descriptions (97e55fe)

---

## [1.5.0] - 2026-03-09

### Features
- **final-inspection** — Closer skill for post-pipeline flow diagrams + document generation (b1ed739)
- **release-notes** — Version + CHANGELOG + tag automation (92cc997)
- **seo-audit** — Expanded to SEO + AEO + GEO 10-area audit v2.0.0 (c87e2e6)
- **zephermine** — Academic research, competitor analysis, persona & journey map (2893d92)
- **youtube-transcript** — yt-dlp based, no MCP needed (615f59e)
- **frontend-design** — Anthropic official skill integration (74d1169)

### Refactoring
- **pipeline** — Integer numbering, PM principles, role separation, sync filtering (909d7a6)
- **artifacts** — CLI-neutral naming, zeus archive cleanup (b3a793a)

---

## [1.4.0] - 2026-03-02

### Features
- **auto-continue-loop** — Chronos: iterative FIND-FIX-VERIFY loop (7dc6b28)
- **argos** — Pipeline architecture + construction inspection skill (067984a)
- **memory-compact** — MEMORY.md explosion prevention (9b912b1)
- **orchestrator** — Portable workpm and chronos entrypoints (1ef7089)
- **docker-db-backup** — PostgreSQL/MySQL/MariaDB backup in Docker (f18c194)

### Bug Fixes
- **hooks** — Use absolute paths for Windows compatibility (e1b9229)
- **install** — Safe-copy.js for broken symlink handling (3cb344d)
- **install** — Remove broken symlinks before copy (c478f50)

---

## [1.3.0] - 2026-02-19

### Features
- **codex-mnemo / gemini-mnemo** — Cross-CLI memory sync (f70775f)
- **workpm v2** — Full overhaul + 8-person team test (70f6b35)
- **selective install** — Choose components during install (85923a4)
- **Gemini CLI** — Full support with MCP install (85923a4)
- **agents** — ASP.NET Core + WPF Desktop + web-preview agents (0bd52fc, b36d282)
- **spawn_workers** — Multi-AI auto execution: Claude + Codex + Gemini (681b2c1)

### Bug Fixes
- **mnemo** — Conversation search integration + Codex duplicate save fix (5d18306)
- **install-mcp** — MCP health check + auto-repair on connection failure (bade9c2)

---

## [1.2.0] - 2026-02-09

### Features
- **zephermine** — GitHub similar project search + QA scenarios + API spec generation (3fcbe84, b2fa3ea, 3129b73)
- **agent-team** — Native Agent Teams with wave grouping + free mode (c3c0438, ad4af93)
- **qa-until-pass** — Fix-until-pass test loop (later renamed to qpassenger) (c818470)
- **zeus** — Zero-interaction full pipeline skill (e55bb64)
- **stitch UI skills** — Design-md, enhance-prompt, loop, react (230bebf)
- **plugin manifest** — Claude Code plugin marketplace support (033c4ba)

### Bug Fixes
- **zephermine** — Context explosion prevention in team review (166e45a)
- **workpm** — AI assignment realistic adjustment (3b0d178)

---

## [1.1.0] - 2026-02-01

### Features
- **zephermine** — Renamed from gepetto, orchestrator MCP expansion (f6a04fb)
- **docker-deploy** — v2.0.0 ~ v2.7.0 evolution (66f418d ~ 9c188bf)
- **fullstack-coding-standards** — Agent + skill with smart-setup (da81254)
- **install.bat** — 7-step installer with hook auto-registration (655b561, 9f96b1c)
- **mnemo** — Skill folder consolidation + keyword extraction + conversation search (178a239, 7c6e31f, c8d558b)
- **orchestrator** — Skill folder consolidation + project install script (dfb830d, bcaf8e6)
- **excel2md** — Excel to markdown converter (b44a16a)
- **external skills** — TDD, debugging, Semgrep, Wrangler, DOCX, PDF (5ad580d)

### Refactoring
- **skills** — Duplicate cleanup: 5 deleted, 2 merged (24e5244)
- **memory** — Context tree structure + 3-layer architecture (b2788c1, 604d20f)

---

## [1.0.0] - 2026-01-29

### Initial Release

The foundation of the AI agent harness customization system.

- **30+ skills** — humanizer, ppt-generator, docker-deploy, and more
- **10+ agents** — ai-ml, code-review, architecture, debugging, and more
- **Hooks** — PowerShell + Bash hook scripts for Windows/Mac/Linux
- **MCP servers** — Presentation, document, and free/local alternatives
- **3-layer memory** — MEMORY.md index + memory/*.md + conversations/
- **Multi-AI** — Orchestrator with workpm/pmworker triggers
- **install.bat/sh** — One-command installation
- **QUICK-REFERENCE.md** — Easy resource discovery
