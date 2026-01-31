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
# Windows
install.bat

# Linux/Mac
chmod +x install.sh && ./install.sh
```

---

## What's Included

### Custom Skills (48 Skills)

| Category | Skills | Description |
|----------|--------|-------------|
| 🤖 **AI Tools** | codex, gemini, perplexity | External AI model integration (GPT-5.2, Gemini, web search) |
| 🔮 **Meta** | agent-md-refactor, command-creator, plugin-forge, skill-judge | Plugin/skill creation tools |
| 📝 **Documentation** | c4-architecture, mermaid-diagrams, marp-slide, draw-io, excalidraw, crafting-effective-readmes | Diagrams & documentation |
| 🎨 **Frontend** | react-dev, vercel-react-best-practices, mui, design-system-starter | React/TypeScript/Design |
| 🛠️ **Development** | docker-deploy, python-backend-fastapi, database-schema-designer, dependency-updater | Dev tools & deployment |
| 🎯 **Planning** | gepetto, requirements-clarity, game-changing-features, ship-learn-next | Planning & requirements |
| 👔 **Professional** | professional-communication, feedback-mastery, difficult-workplace-conversations | Business communication |
| 🧪 **Testing** | code-reviewer, qa-test-planner | Code review & QA |
| 📦 **Git** | commit-work | Git workflow |
| 🔧 **Utilities** | humanizer, session-handoff, jira, datadog-cli, ppt-generator, web-to-markdown | Utilities |

> **Full list**: See `skills/` directory or [AGENTS.md](AGENTS.md) for complete skill descriptions.

### Custom Agents (19 Agents)

| Category | Agents | Description |
|----------|--------|-------------|
| **Full Stack** | frontend-react, backend-spring, database-mysql | React/Spring/MySQL specialists |
| **AI/ML** | ai-ml | LLM integration, RAG systems |
| **API** | api-tester, api-comparator | API testing & compatibility |
| **QA** | qa-engineer, qa-writer, code-reviewer | Testing & code review |
| **Documentation** | documentation, mermaid-diagram-specialist | Docs & diagrams |
| **Design** | ascii-ui-mockup-generator, ui-ux-designer | UI/UX design feedback |
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

> **Full list**: See `commands/` directory or [AGENTS.md](AGENTS.md)

### Hooks

| Hook | Timing | Description |
|------|--------|-------------|
| protect-files.sh | PreToolUse | Protect critical files from modification |
| format-code.sh | PostToolUse | Auto-format code after changes |
| validate-api.sh | PostToolUse | Validate API files after modification |

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
├── skills/                    # Custom skills (slash commands)
│   ├── docker-deploy/         # Docker deployment (Cython/PyArmor support)
│   ├── code-reviewer/         # Auto code review (500-line limit, security)
│   ├── react-best-practices/  # Vercel's 45 React optimization rules
│   ├── web-design-guidelines/ # UI/UX accessibility review
│   ├── api-tester/            # Frontend-backend integration testing
│   ├── erd-designer/          # Mermaid ERD generation
│   ├── humanizer/             # AI writing pattern removal (24 patterns)
│   ├── ppt-generator/         # PowerPoint generation from templates
│   └── python-backend/        # FastAPI best practices
├── agents/                    # Custom subagents
│   ├── frontend-react.md      # React + Zustand + TanStack Query
│   ├── backend-spring.md      # Java 21 + Spring Boot 3.x
│   ├── database-mysql.md      # MySQL 8.0 + Flyway
│   ├── ai-ml.md               # LLM + RAG + Vector DB
│   ├── api-tester.md          # REST/GraphQL API testing
│   ├── code-reviewer.md       # Code quality & security review
│   ├── qa-engineer.md         # Test strategy & execution
│   ├── qa-writer.md           # Test case writing
│   ├── documentation.md       # PRD, API docs, CHANGELOG
│   ├── migration-helper.md    # Legacy → Modern migration
│   ├── explore-agent.md       # Legacy code analysis (Korean)
│   ├── feature-tracker.md     # Feature progress tracking (Korean)
│   └── api-comparator.md      # API compatibility verification
├── commands/                  # Slash commands & scripts
│   ├── check-todos.md
│   ├── write-api-docs.md
│   ├── write-changelog.md
│   ├── write-prd.md
│   ├── test.md
│   ├── review.md
│   ├── migrate.md
│   ├── generate.md
│   ├── daily-sync.md
│   └── update-docs.md
├── hooks/                     # Hook scripts
│   ├── protect-files.sh
│   ├── format-code.sh
│   └── validate-api.sh
├── mcp-servers/               # MCP server guides
│   ├── README.md
│   └── claude-orchestrator-mcp/
├── docs/                      # Documentation
│   └── resources/             # External resource docs
│       ├── README.md          # Resource index
│       ├── _template.md       # Template for new docs
│       ├── everything-claude-code.md
│       ├── vercel-agent-skills.md
│       ├── oh-my-claudecode.md
│       ├── skills-sh.md
│       ├── toss-payments-mcp.md
│       └── context7-mcp.md
├── install.bat                # Windows installer
├── install.sh                 # Linux/Mac installer
├── SETUP.md                   # Complete setup guide
├── README.md                  # This file (English)
└── README-ko.md               # Korean version
```

---

## Installation Locations

| Item | Global | Project |
|------|--------|---------|
| Skills | `~/.claude/skills/` | `.claude/skills/` |
| Agents | `~/.claude/agents/` | `.claude/agents/` |
| Commands | - | `.claude/commands/` |
| Hooks | `~/.claude/settings.json` | `.claude/settings.json` |

- **Global**: Available in all projects
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

## License

MIT License

---

**Last Updated:** 2026-01-26
