# Claude Code Customizations

A comprehensive collection of custom Skills, Agents, Hooks, and MCP servers for Claude Code.

**[한국어 버전](README-ko.md)**

---

## Why This Project?

When using Claude Code, I found myself repeatedly:
- Setting up the same configurations for new projects
- Searching for useful external skills and plugins
- Writing similar agent prompts for common tasks

This repository solves these problems by:
1. **Centralizing configurations** - All customizations in one place
2. **Documenting external resources** - Curated list of useful skills, plugins, and MCP servers
3. **Project-type templates** - Quick setup guides for different tech stacks

---

## Quick Start

> **5-minute guide?** See **[Quick Start Guide](docs/quickstart.md)** for getting started with core features fast.
>
> **Full pipeline?** See **[Workflow Guide](docs/workflow-guide.md)** — Design → Build → QA end-to-end.
>
> **New environment?** See [SETUP.md](SETUP.md) for complete setup guide with project-type specific installations.

### Install by Project Type

| Project Type | Command |
|-------------|---------|
| **WPF / WinForms** | `npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code` |
| **React / Next.js** | `npx add-skill vercel-labs/agent-skills -a claude-code` |
| **Node.js / NestJS** | `npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code` |
| **Payment Integration** | `claude mcp add tosspayments -- npx -y @tosspayments/integration-guide-mcp@latest` |

### Full Installation

```bash
# Windows (copy mode)
install.bat

# Windows (symlink mode - auto-update via git pull)
install-link.bat          # or: install.bat --link
install-unlink.bat        # remove links: install.bat --unlink

# Linux/Mac (copy mode)
chmod +x install.sh && ./install.sh

# Linux/Mac (symlink mode)
./install.sh --link
./install.sh --unlink     # remove links
```

> **Link mode** creates symlinks (Windows: Junction, Linux/Mac: symlink) instead of copying files. Changes to the repo are reflected immediately after `git pull` — no need to re-run the installer.
>
> The installer runs **12 steps** covering Claude Code, Codex CLI, and Gemini CLI:
> - **Steps 1-7** (Claude Code): Skills, Agents, Hooks, settings.json, CLAUDE.md, MCP servers, Orchestrator MCP
> - **Steps 8-11** (Codex CLI): Codex-Mnemo, Skills/Agents sync, MCP servers, Orchestrator MCP
> - **Step 12** (Gemini CLI): Gemini-Mnemo
>
> Codex/Gemini steps auto-skip if the respective CLI is not installed.

---

## Core Systems

Four core systems that differentiate this project:

### Zephermine - SPEC Interview & Verification

Deep-dive interview system that generates complete spec documents from conversations.

| Feature | Description |
|---------|-------------|
| **24-step workflow** | A~G categories: goals, design vision, features, tech, timeline, risks, DB schema, verification, skill discovery |
| **5 Whys technique** | Uncovers hidden motivations behind requirements |
| **5-agent team review** | UX, Architecture, Red Team, Domain Process, Domain Tech agents analyze the spec in parallel |
| **Plain language** | Technical terms explained in parentheses (accessible to non-engineers) |
| **Auto-verification** | Sub-agents validate spec completeness and quality |

```
/zephermine (젭마인) → Interview → SPEC.md → Verification → architect → Implementation
```

> **[Skill Details](skills/zephermine/SKILL.md)**

### Mnemo - Cross-Session Memory

File-based memory system for context persistence across sessions. No DB, no AI calls in hooks.

| Component | Role |
|-----------|------|
| `MEMORY.md` | Semantic memory - context tree (architecture/, patterns/, gotchas/) |
| `conversations/*.md` | Episodic memory - conversation logs with `#tags:` |
| `save-conversation` hook | Auto-saves user input |
| `save-response` hook | Auto-saves assistant response + keywords |

```
Session A: work → #tags saved → /wrap-up → MEMORY.md updated
Session B: MEMORY.md auto-loaded → past search → context restored
```

> **[Skill Details](skills/mnemo/SKILL.md)** | **[System Architecture](skills/mnemo/docs/memory-system.md)**

### Orchestrator - Multi-AI Parallel Execution

PM distributes tasks, Workers (Claude + Codex + Gemini) execute in parallel with file locking.

| Component | Description |
|-----------|-------------|
| MCP Server | Task queue, file locks, dependency resolution |
| `workpm` | Unified PM entrypoint. Claude uses Agent Teams; Codex/Gemini route to MCP-only mode |
| `workpm-mcp` | Explicit MCP-only PM entrypoint - works on Claude, Codex, Gemini |
| `pmworker` | Unified Worker entrypoint - claim task, lock files, execute, report (all CLIs) |

**Canonical cross-CLI invocation names:** `/zephermine`, `/zeus`, `workpm`, `/chronos`, `/qpassenger`, `/agent-team`

```
Terminal 1 (PM):     workpm → analyze → create 3 tasks
Terminal 2 (Worker): pmworker → claim task-1 → execute → complete
Terminal 3 (Worker): pmworker → claim task-2 → execute → complete
```

```bash
# Install to a project (per-project, MCP needs project root)
node skills/orchestrator/install.js <target-project-path>
```

> **[Skill Details](skills/orchestrator/SKILL.md)** | **[Full Guide](skills/orchestrator/docs/orchestrator-guide.md)**

### Zeus - Zero-Interaction Full Pipeline

One-line description in, fully built project out. Chains zephermine → orchestrator → qpassenger automatically.

| Phase | What it does |
|-------|-------------|
| **Phase 0** | Parse description — extract industry, tech stack, features |
| **Phase 1** | Planning (zephermine 24 steps) — synthetic interview, spec, sections |
| **Phase 2** | Implementation (workpm) — unified PM entrypoint creates tasks, workers build in parallel |
| **Phase 3** | Testing (qpassenger) — Playwright E2E tests + Healer loop |
| **Phase 4** | Final report — `docs/zeus/zeus-report.md` with pass/fail summary |

```
/zeus "쇼핑몰 만들어줘. React+Spring Boot"
    → Phase 0~4 auto-executed without stopping
    → Never calls AskUserQuestion — all decisions via auto-response table
```

> **[Skill Details](skills/zeus/SKILL.md)**

---

## What's Included

### Custom Skills (84 Skills)

| Category | Skills | Description |
|----------|--------|-------------|
| 🤖 **AI Tools** | codex, gemini, multi-ai-orchestration, orchestrator, workpm (Daedalus), workpm-mcp, pmworker, agent-team, agent-team-codex | External AI model integration + Multi-AI orchestration + Daedalus (site PM) + Native Agent Teams (Opus 4.6) + Codex Multi-Agent + Activity Log |
| 🔮 **Meta** | agent-md-refactor, command-creator, plugin-forge, skill-judge, find-skills, manage-skills, verify-implementation | Plugin/skill creation/verification tools |
| 📝 **Documentation** | mermaid-diagrams, marp-slide, draw-io, excalidraw, crafting-effective-readmes | Diagrams & documentation |
| 🎨 **Frontend** | react-dev, vercel-react-best-practices, mui, design-system-starter, stitch-design-md, stitch-enhance-prompt, stitch-loop, stitch-react, seo-audit, ui-ux-auditor | React/TypeScript/Design/Stitch UI generation + SEO+AEO+GEO 10-area audit + UI/UX 8-area audit |
| 🛠️ **Development** | docker-deploy, docker-db-backup, python-backend-fastapi, database-schema-designer, dependency-updater, fullstack-coding-standards, dotnet-coding-standards, wpf-coding-standards | Dev tools & deployment |
| 🎯 **Planning** | zephermine (젭마인), zeus (제우스), game-changing-features, ship-learn-next | Planning & requirements (zeus: zero-interaction full pipeline, zephermine: spec verification) |
| 📖 **Learning** | explain | Code explanation with analogies + Mermaid diagrams |
| 👔 **Professional** | professional-communication, workplace-conversations | Business communication |
| 🧪 **Testing** | code-reviewer, api-tester, qa-test-planner, qpassenger, auto-continue-loop, flow-verifier, argos | Code review & QA & auto fix-verify loop & flow verification & Argos inspection |
| 📦 **Git** | commit-work, deploymonitor | Git workflow & DeployMonitor auto-deploy |
| 🎬 **Media** | video-maker | Remotion-based React video creation (product intro, demo, social media) |
| 🔧 **Utilities** | humanizer, jira, datadog-cli, ppt-generator, excel2md, web-to-markdown, api-handoff | Utilities |
| 📊 **Research** | reddit-researcher | Reddit market research + lead scoring + pain point classification |
| 🧠 **Memory/Session** | mnemo, memory-compact | Unified memory system (conversation saving + tagging + search + MEMORY.md + session handoff) + Memory size check & compaction |

> **Full list**: See `skills/` directory or [AGENTS.md](AGENTS.md) for complete skill descriptions.

### Custom Agents (42 Agents)

| Category | Agents | Description |
|----------|--------|-------------|
| **Workflow** | fullstack-development-workflow, spec-interviewer, architect | Full development cycle management & architecture design |
| **Guidelines** | react-best-practices, python-fastapi-guidelines, writing-guidelines, naming-conventions, code-review-checklist, humanizer-guidelines, react-useeffect-guidelines, reducing-entropy, web-preview-guide, fullstack-coding-standards | Passive rules (always applied) |
| **Full Stack** | frontend-react, backend-spring, backend-dotnet, desktop-wpf, database-schema-designer, database-mysql, database-postgresql | React/Spring/ASP.NET Core/WPF Desktop/Schema Design/MySQL/PostgreSQL specialists |
| **AI/ML** | ai-ml | LLM integration, RAG systems, Latest model/SDK coding guide |
| **API** | api-tester, api-comparator | API testing & compatibility |
| **QA** | qa-engineer, qa-writer, code-reviewer | Testing & code review |
| **Documentation** | documentation, mermaid-diagram-specialist | Docs & diagrams |
| **Design** | ascii-ui-mockup-generator, ui-ux-designer, stitch-developer | UI/UX design & Stitch UI generation |
| **Security** | security-reviewer | Security vulnerability analysis (8 categories: Auth, Input, Data, Dependencies, Rate Limit, File Upload, Prompt Injection, Info Disclosure) |
| **Migration** | migration-helper, explore-agent | Legacy modernization |
| **Planning** | feature-tracker | Feature tracking |
| **Communication** | communication-excellence-coach | Email & presentation coaching |
| **General** | general-purpose, codebase-pattern-finder, chronos-worker | Multi-purpose agents + Chronos loop worker |

> **Full list**: See `agents/` directory or [AGENTS.md](AGENTS.md) for complete agent descriptions.

### Hooks

| Hook | Timing | Description |
|------|--------|-------------|
| save-conversation.sh | UserPromptSubmit | Save user input to conversations (Mnemo) |
| save-response.sh | Stop | Save assistant responses with #tags (Mnemo) |
| orchestrator-detector.js | UserPromptSubmit | PM/Worker mode detection |
| validate-code.sh | PostToolUse | Code validation (500 lines, function size, security) |
| check-new-file.sh | PreToolUse | Reducing entropy check before new file creation |
| validate-docs.sh | PostToolUse | AI writing pattern detection in markdown |
| protect-files.sh | PreToolUse | Protect critical files from modification |
| format-code.sh | PostToolUse | Auto-format code (Python/TS/JS/Java/CSS) |
| validate-api.sh | PostToolUse | Validate API files after modification |
| loop-stop.sh | Stop | Chronos loop: intercept session end & re-inject prompt for auto-iteration |
| ddingdong-noti.sh | Stop | OS-native notification on session end (Windows/macOS/Linux) |

### Mnemo & Orchestrator

> See **[Core Systems](#core-systems)** above for detailed descriptions.
>
> - **Mnemo**: Included in global install (`install.bat`). [System Architecture](skills/mnemo/docs/memory-system.md)
> - **Orchestrator**: Per-project install required. [Full Guide](skills/orchestrator/docs/orchestrator-guide.md)

---

## External Resources (Recommended)

> **[Detailed Documentation](docs/resources/)** - 각 리소스에 대한 상세 문서 (기능, 설치, 사용법, 장단점)

### Skills & Plugins

| Resource | Description | Install | Docs |
|----------|-------------|---------|------|
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | Anthropic hackathon winner setup (12 agents, 16 skills) | `/plugin marketplace add affaan-m/everything-claude-code` | [상세](docs/resources/everything-claude-code.md) |
| [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) | React/Next.js best practices (45+ rules) | `npx add-skill vercel-labs/agent-skills -a claude-code` | [상세](docs/resources/vercel-agent-skills.md) |
| [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) | 32 agents, 40+ skills, multi-agent orchestration | `/plugin install oh-my-claudecode` | [상세](docs/resources/oh-my-claudecode.md) |
| [claude-code-dotnet](https://github.com/Aaronontheweb/claude-code-dotnet) | C#/WPF/MAUI/.NET skills | `npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code` | - |
| [mastering-typescript-skill](https://github.com/SpillwaveSolutions/mastering-typescript-skill) | Enterprise TypeScript (NestJS, React 19) | `npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code` | - |
| [pg-aiguide](https://github.com/timescale/pg-aiguide) | PostgreSQL best practices | `claude plugin install pg-aiguide` | - |
| [skills.sh](https://skills.sh/) | 25K+ skills directory by Vercel | `npx skills add <owner/repo>` | [상세](docs/resources/skills-sh.md) |

### External AI CLI Integration

| Resource | Description | Docs |
|----------|-------------|------|
| **Codex CLI** | OpenAI Codex CLI (GPT-5.2) integration | [상세](docs/resources/codex-cli.md) |
| **Gemini CLI** | Google Gemini 3 Pro CLI integration | [상세](docs/resources/gemini-cli.md) |
| **Humanizer Skill** | AI writing pattern removal (24 patterns) | [상세](docs/resources/humanizer-skill.md) |

### Multi-LLM Integration

> **문제**: LLM은 학습 데이터 이후의 최신 모델/API 정보를 모릅니다.
> **해결**: Context7 (라이브러리 문서) + PAL MCP (멀티 모델) 조합 사용

| Resource | Type | Description | Install |
|----------|------|-------------|---------|
| **[Context7](https://github.com/upstash/context7)** | MCP | 최신 라이브러리 문서 주입 (Next.js 15, React 19 등) | `claude mcp add context7 -- npx -y @upstash/context7-mcp` |
| **[PAL MCP](https://github.com/BeehiveInnovations/pal-mcp-server)** | MCP | Multi-Model: Gemini + OpenAI + Claude + 50+ 모델 | [GitHub README](https://github.com/BeehiveInnovations/pal-mcp-server) |
| [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | Skills | 200+ 스킬 (Codex, Gemini CLI 호환) | `npx add-skill VoltAgent/awesome-agent-skills` |
| [antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) | Skills | 625+ 스킬 (Anthropic, OpenAI, Google 공식) | GitHub clone |
| [AI-research-SKILLs](https://github.com/Orchestra-Research/AI-research-SKILLs) | Skills | AI 연구/엔지니어링 전용 스킬 | GitHub clone |
| [claude-flow](https://github.com/ruvnet/claude-flow) | Agent | Multi-agent 스웜, LLM 간 자동 전환 | `npm install claude-flow` |

**Skill vs Agent 분류**:
- **Skills** (on-demand): codex, gemini - 사용자 트리거로 외부 LLM 호출
- **Agents** (passive): 가이드라인, 모범 사례 - 항상 컨텍스트에 존재

### MCP Servers

| MCP | Description | Install | Docs |
|-----|-------------|---------|------|
| **[Toss Payments](https://toss.tech/article/tosspayments-mcp)** | Payment integration in 10 min (PG industry first) | `claude mcp add tosspayments -- npx -y @tosspayments/integration-guide-mcp@latest` | [상세](docs/resources/toss-payments-mcp.md) |
| [Context7](https://github.com/upstash/context7) | Library documentation search | `claude mcp add context7 -- npx -y @upstash/context7-mcp` | [상세](docs/resources/context7-mcp.md) |
| [Playwright](https://github.com/microsoft/playwright-mcp) | Browser automation | `claude mcp add playwright -- npx -y @playwright/mcp@latest` | - |
| [Stitch](https://github.com/anthropics/stitch-mcp) | Google Stitch UI design | `npx -p stitch-mcp-auto stitch-mcp-auto-setup` | - |
| [GitHub](https://github.com/github/github-mcp-server) | GitHub API access | `claude mcp add github -- npx -y @modelcontextprotocol/server-github` | - |

**Free & Local (No API Key):**

| MCP | Description | Install |
|-----|-------------|---------|
| **[Office-PowerPoint-MCP](https://github.com/GongRzhe/Office-PowerPoint-MCP-Server)** | PPT automation (32 tools, 25 templates) | `pip install office-powerpoint-mcp-server` |
| [mcp-pandoc](https://github.com/vivekVells/mcp-pandoc) | Document conversion (MD→PDF/DOCX) | `pip install mcp-pandoc` |
| [manim-mcp](https://github.com/abhiemj/manim-mcp-server) | Math/education animations | Manim + local server |
| [blender-mcp](https://github.com/ahujasid/blender-mcp) | 3D modeling & animation | Blender + local server |

---

## Project Structure

```
claude-code-customizations/
├── skills/                    # Custom skills (83 skills)
│   ├── mnemo/                 # 🧠 Memory system (global install)
│   ├── memory-compact/        # 🧠 Memory size check & compaction
│   ├── orchestrator/          # 🤖 Multi-AI orchestration (per-project)
│   ├── workpm/                # 🤖 Unified PM entrypoint wrapper
│   ├── workpm-mcp/            # 🤖 Explicit MCP-only PM wrapper
│   ├── pmworker/              # 🤖 Unified Worker entrypoint wrapper
│   ├── agent-md-refactor/
│   ├── api-handoff/
│   ├── api-tester/
│   ├── argos/                  # 🔍 Verification/inspection (감리)
│   ├── auto-continue-loop/
│   ├── code-reviewer/
│   ├── codex/
│   ├── command-creator/
│   ├── commit-work/
│   ├── crafting-effective-readmes/
│   ├── daily-meeting-update/
│   ├── database-schema-designer/
│   ├── datadog-cli/
│   ├── dependency-updater/
│   ├── design-system-starter/
│   ├── docker-db-backup/
│   ├── docker-deploy/
│   ├── domain-name-brainstormer/
│   ├── draw-io/
│   ├── excalidraw/
│   ├── explain/
│   ├── find-skills/
│   ├── fullstack-coding-standards/
│   ├── game-changing-features/
│   ├── gemini/
│   ├── deploymonitor/
│   ├── zephermine/
│   ├── zeus/
│   ├── humanizer/
│   ├── jira/
│   ├── marp-slide/
│   ├── meme-factory/
│   ├── mermaid-diagrams/
│   ├── mui/
│   ├── multi-ai-orchestration/
│   ├── naming-analyzer/
│   ├── openapi-to-typescript/
│   ├── plugin-forge/
│   ├── ppt-generator/
│   ├── professional-communication/
│   ├── python-backend-fastapi/
│   ├── qa-test-planner/
│   ├── qpassenger/
│   ├── react-dev/
│   ├── reducing-entropy/
│   ├── ship-learn-next/
│   ├── skill-judge/
│   ├── vercel-react-best-practices/
│   ├── web-design-guidelines/
│   ├── web-to-markdown/
│   ├── workplace-conversations/
│   ├── stitch-design-md/
│   ├── stitch-enhance-prompt/
│   ├── stitch-loop/
│   ├── stitch-react/
│   ├── nano-banana/
│   ├── semgrep-rule-creator/
│   ├── systematic-debugging/
│   ├── test-driven-development/
│   ├── manage-skills/
│   ├── verify-implementation/
│   ├── wrangler/
│   ├── docx/
│   ├── pdf/
│   ├── seo-audit/
│   ├── reddit-researcher/
│   ├── ui-ux-auditor/
│   ├── video-maker/
│   ├── flow-verifier/
│   └── writing-clearly-and-concisely/
├── agents/                    # Custom subagents (35 + skills/*/agents/ 2 = 37 agents)
│   ├── architect.md
│   ├── ai-ml.md
│   ├── api-comparator.md
│   ├── api-tester.md
│   ├── ascii-ui-mockup-generator.md
│   ├── backend-spring.md
│   ├── codebase-pattern-finder.md
│   ├── code-review-checklist.md
│   ├── code-reviewer.md
│   ├── communication-excellence-coach.md
│   ├── database-mysql.md
│   ├── database-postgresql.md
│   ├── database-schema-designer.md
│   ├── documentation.md
│   ├── explore-agent.md
│   ├── feature-tracker.md
│   ├── frontend-react.md
│   ├── general-purpose.md
│   ├── humanizer-guidelines.md
│   ├── mermaid-diagram-specialist.md
│   ├── migration-helper.md
│   ├── naming-conventions.md
│   ├── python-fastapi-guidelines.md
│   ├── qa-engineer.md
│   ├── qa-writer.md
│   ├── react-best-practices.md
│   ├── react-useeffect-guidelines.md
│   ├── reducing-entropy.md
│   ├── spec-interviewer.md
│   ├── security-reviewer.md
│   ├── stitch-developer.md
│   ├── ui-ux-designer.md
│   └── writing-guidelines.md
├── hooks/                     # Global hooks (11 hooks)
│   ├── save-conversation.sh/.ps1
│   ├── save-response.sh/.ps1
│   ├── orchestrator-detector.js
│   ├── check-new-file.sh/.ps1
│   ├── format-code.sh/.ps1
│   ├── protect-files.sh/.ps1
│   ├── validate-api.sh/.ps1
│   ├── validate-code.sh/.ps1
│   ├── validate-docs.sh/.ps1
│   ├── loop-stop.sh/.ps1
│   └── ddingdong-noti.sh/.ps1
├── mcp-servers/               # MCP server guides
│   └── README.md
├── mcp-configs/               # MCP server preset configs (Claude + Codex)
│   └── README.md
├── scripts/                   # Utility scripts
│   ├── sync-codex-assets.js   # Sync skills/agents to Codex CLI
│   └── generate-codex-compat-report.js  # Codex compatibility analyzer
├── docs/                      # Documentation
│   ├── quickstart.md
│   ├── workflow-guide.md      # End-to-end pipeline guide
│   ├── schema-design-workflow.md  # Database schema design workflow
│   ├── codex-compatibility-report.md    # Codex CLI compatibility status
│   └── resources/
├── install.bat                # Windows installer (12 steps, Claude + Codex + Gemini)
├── install.sh                 # Linux/Mac installer (12 steps, Claude + Codex + Gemini)
├── install-hooks-config.js    # Hook settings helper
├── install-claude-md.js       # CLAUDE.md rules merger
├── install-mcp-codex.js       # Codex CLI MCP installer (codex mcp add/remove)
├── SETUP.md                   # Complete setup guide
└── README.md                  # This file
```

---

## Installation Locations

| Item | Global | Project |
|------|--------|---------|
| Skills | `~/.claude/skills/` | `.claude/skills/` |
| Agents | `~/.claude/agents/` | `.claude/agents/` |
| Hooks | `~/.claude/hooks/` + `~/.claude/settings.json` | `.claude/hooks/` + `.claude/settings.json` |

- **Global**: Available in all projects (installer auto-configures all items globally)
- **Project**: Available only in that project

---

## Adding New Customizations

### Add a new skill
```bash
mkdir skills/my-skill
# Create skills/my-skill/SKILL.md
```

### Add a new agent
```bash
# Create agents/my-agent.md
```

---

## Related Resources

### Skills Directory

| Resource | Description | Link |
|----------|-------------|------|
| **skills.sh** | 25K+ skills directory by Vercel (install: `npx skills add <owner/repo>`) | [skills.sh](https://skills.sh/) |

**Popular Skills (by installs):**
| Skill | Installs | Description |
|-------|----------|-------------|
| vercel-react-best-practices | 50.3K | React development guide |
| web-design-guidelines | 38.2K | Web design principles |
| remotion-best-practices | 34.4K | Remotion video framework |
| frontend-design | 15.3K | Frontend architecture |
| supabase-postgres-best-practices | 4.4K | Database patterns |

### Community Projects

| Project | Description | Link |
|---------|-------------|------|
| awesome-claude-code-subagents | 100+ specialized subagents | [GitHub](https://github.com/VoltAgent/awesome-claude-code-subagents) |
| awesome-claude-skills | Curated Claude skills list | [GitHub](https://github.com/travisvn/awesome-claude-skills) |
| everything-claude-code | Anthropic hackathon winner setup | [GitHub](https://github.com/affaan-m/everything-claude-code) |
| claude-code-showcase | Comprehensive config examples | [GitHub](https://github.com/ChrisWiles/claude-code-showcase) |
| awesome-claude-code | Claude Code resource curation | [GitHub](https://github.com/hesreallyhim/awesome-claude-code) |

---

## References

> **[Full References List](docs/references.md)** - All GitHub projects, MCP servers, research, and documentation referenced in building this project.

**Key References:**
- [softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit) - session handoff pattern (integrated into mnemo)
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) - React best practices
- [Vercel AGENTS.md Research](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) - 3-layer architecture basis
- [upstash/context7](https://github.com/upstash/context7) - Latest library docs injection

---

## License

MIT License

---

**Last Updated:** 2026-03-12
