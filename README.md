# Claude Code Customizations

A comprehensive collection of custom Skills, Agents, Commands, Hooks, and MCP servers for Claude Code.

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
> The installer configures **all 6 components globally**:
> - Skills, Agents, Commands, Hooks (files)
> - Mnemo hooks (`save-conversation`, `save-response`)
> - `~/.claude/settings.json` (hook settings)
> - `~/.claude/CLAUDE.md` (memory rules - response tags, conversation search)

---

## Core Systems

Three core systems that differentiate this project:

### Zephermine - SPEC Interview & Verification

Deep-dive interview system that generates complete spec documents from conversations.

| Feature | Description |
|---------|-------------|
| **19-step interview** | A~G categories: goals, design vision, features, tech, timeline, risks, verification |
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
| `workpm` | PM mode - analyze project, decompose tasks, assign AI |
| `pmworker` | Worker mode - claim task, lock files, execute, report |

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

---

## What's Included

### Custom Skills (55 Skills)

| Category | Skills | Description |
|----------|--------|-------------|
| 🤖 **AI Tools** | codex, gemini, perplexity, multi-ai-orchestration, orchestrator | External AI model integration + Multi-AI orchestration |
| 🔮 **Meta** | agent-md-refactor, command-creator, plugin-forge, skill-judge, find-skills | Plugin/skill creation tools |
| 📝 **Documentation** | mermaid-diagrams, marp-slide, draw-io, excalidraw, crafting-effective-readmes | Diagrams & documentation |
| 🎨 **Frontend** | react-dev, vercel-react-best-practices, mui, design-system-starter, stitch-design-md, stitch-enhance-prompt, stitch-loop, stitch-react | React/TypeScript/Design/Stitch UI generation |
| 🛠️ **Development** | docker-deploy, python-backend-fastapi, database-schema-designer, dependency-updater, fullstack-coding-standards | Dev tools & deployment |
| 🎯 **Planning** | zephermine (젭마인), game-changing-features, ship-learn-next | Planning & requirements (zephermine includes spec verification) |
| 📖 **Learning** | explain | Code explanation with analogies + Mermaid diagrams |
| 👔 **Professional** | professional-communication, workplace-conversations | Business communication |
| 🧪 **Testing** | code-reviewer, api-tester, qa-test-planner | Code review & QA |
| 📦 **Git** | commit-work | Git workflow |
| 🔧 **Utilities** | humanizer, jira, datadog-cli, ppt-generator, excel2md, web-to-markdown, api-handoff | Utilities |
| 🧠 **Memory** | mnemo | Unified memory system (conversation saving + tagging + search + MEMORY.md + session handoff) |

> **Full list**: See `skills/` directory or [AGENTS.md](AGENTS.md) for complete skill descriptions.

### Custom Agents (34 Agents)

| Category | Agents | Description |
|----------|--------|-------------|
| **Workflow** | fullstack-development-workflow, spec-interviewer, architect | Full development cycle management & architecture design |
| **Guidelines** | react-best-practices, python-fastapi-guidelines, writing-guidelines, naming-conventions, code-review-checklist, humanizer-guidelines, react-useeffect-guidelines, reducing-entropy, fullstack-coding-standards | Passive rules (always applied) |
| **Full Stack** | frontend-react, backend-spring, database-mysql, database-postgresql | React/Spring/MySQL/PostgreSQL specialists |
| **AI/ML** | ai-ml | LLM integration, RAG systems |
| **API** | api-tester, api-comparator | API testing & compatibility |
| **QA** | qa-engineer, qa-writer, code-reviewer | Testing & code review |
| **Documentation** | documentation, mermaid-diagram-specialist | Docs & diagrams |
| **Design** | ascii-ui-mockup-generator, ui-ux-designer, stitch-developer | UI/UX design & Stitch UI generation |
| **Security** | security-reviewer | Security vulnerability analysis (OWASP Top 10) |
| **Migration** | migration-helper, explore-agent | Legacy modernization |
| **Planning** | feature-tracker | Feature tracking |
| **Communication** | communication-excellence-coach | Email & presentation coaching |
| **General** | general-purpose, codebase-pattern-finder | Multi-purpose agents |

> **Full list**: See `agents/` directory or [AGENTS.md](AGENTS.md) for complete agent descriptions.

### Commands (17 Commands)

| Command | Description |
|---------|-------------|
| `/check-todos` | Review and prioritize TODO items |
| `/codex-plan` | Create implementation plan with Codex |
| `/compose-email` | Draft professional emails |
| `/daily-sync` | Daily sync and status check |
| `/explain-pr-changes` | Summarize PR changes |
| `/generate` | Generate code templates |
| `/migrate` | Execute migration tasks |
| `/review` | Perform code review |
| `/sync-branch` | Sync branch with main |
| `/test` | Run tests and generate coverage report |
| `/update-docs` | Update documentation files |
| `/write-api-docs` | Generate API documentation |
| `/write-changelog` | Auto-generate changelog from git commits |
| `/write-prd` | Write Product Requirements Document |
| `/smart-setup` | Auto-detect tech stack and recommend/install resources |

> **Full list**: See `commands/` directory or [AGENTS.md](AGENTS.md)

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
| **Perplexity Skill** | Perplexity AI web search integration | [상세](docs/resources/perplexity-skill.md) |
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
- **Skills** (on-demand): codex, gemini, perplexity - 사용자 트리거로 외부 LLM 호출
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
├── skills/                    # Custom skills (55 skills)
│   ├── mnemo/                 # 🧠 Memory system (global install)
│   ├── orchestrator/          # 🤖 Multi-AI orchestration (per-project)
│   ├── agent-md-refactor/
│   ├── api-handoff/
│   ├── api-tester/
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
│   ├── docker-deploy/
│   ├── domain-name-brainstormer/
│   ├── draw-io/
│   ├── excalidraw/
│   ├── explain/
│   ├── find-skills/
│   ├── fullstack-coding-standards/
│   ├── game-changing-features/
│   ├── gemini/
│   ├── zephermine/
│   ├── humanizer/
│   ├── jira/
│   ├── marp-slide/
│   ├── meme-factory/
│   ├── mermaid-diagrams/
│   ├── mui/
│   ├── multi-ai-orchestration/
│   ├── naming-analyzer/
│   ├── openapi-to-typescript/
│   ├── perplexity/
│   ├── plugin-forge/
│   ├── ppt-generator/
│   ├── professional-communication/
│   ├── python-backend-fastapi/
│   ├── qa-test-planner/
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
│   ├── wrangler/
│   ├── docx/
│   ├── pdf/
│   └── writing-clearly-and-concisely/
├── agents/                    # Custom subagents (32 + skills/*/agents/ 2 = 34)
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
├── commands/                  # Slash commands (17 commands)
│   ├── check-todos.md
│   ├── codex-plan.md
│   ├── compose-email.md
│   ├── daily-sync.md
│   ├── explain-changes-mental-model.md
│   ├── explain-pr-changes.md
│   ├── generate.md
│   ├── migrate.md
│   ├── review.md
│   ├── sync-branch.md
│   ├── sync-skills-readme.md
│   ├── test.md
│   ├── update-docs.md
│   ├── viral-tweet.md
│   ├── write-api-docs.md
│   ├── write-changelog.md
│   └── write-prd.md
├── hooks/                     # Global hooks (9 hooks)
│   ├── save-conversation.sh/.ps1
│   ├── save-response.sh/.ps1
│   ├── orchestrator-detector.js
│   ├── check-new-file.sh/.ps1
│   ├── format-code.sh/.ps1
│   ├── protect-files.sh/.ps1
│   ├── validate-api.sh/.ps1
│   ├── validate-code.sh/.ps1
│   └── validate-docs.sh/.ps1
├── mcp-servers/               # MCP server guides
│   └── README.md
├── docs/                      # Documentation
│   ├── quickstart.md
│   └── resources/
├── install.bat                # Windows installer (6 steps, includes Mnemo)
├── install.sh                 # Linux/Mac installer (6 steps, includes Mnemo)
├── install-hooks-config.js    # Hook settings helper
├── install-claude-md.js       # CLAUDE.md rules merger
├── SETUP.md                   # Complete setup guide
└── README.md                  # This file
```

---

## Installation Locations

| Item | Global | Project |
|------|--------|---------|
| Skills | `~/.claude/skills/` | `.claude/skills/` |
| Agents | `~/.claude/agents/` | `.claude/agents/` |
| Commands | `~/.claude/commands/` | `.claude/commands/` |
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

### Add a new command
```bash
# Create commands/my-command.md
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

**Last Updated:** 2026-02-08
