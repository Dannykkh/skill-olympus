# MCP Configuration Management

Pre-configured MCP server settings for Claude Code, Codex, and Antigravity.

## Available MCP Servers

| Name | Description | API Key | Package |
|------|-------------|---------|---------|
| context7 | Latest library docs search | Not required | `@upstash/context7-mcp` |
| playwright | Browser automation and E2E testing | Not required | `@playwright/mcp` |
| chrome-devtools | Chrome DevTools integration (network/console/performance); optional | Not required | `chrome-devtools-mcp` |
| fetch | Fetch URL content (HTML/JSON/MD) | Not required | `uvx mcp-server-fetch` |
| github | GitHub API integration (PR, Issue, etc.) | **Required** | `@modelcontextprotocol/server-github` |

## Installation

The main installers (`install.bat` and `install.sh`) install `context7` and `playwright` by default. Install `chrome-devtools` explicitly when needed. Rerunning a main installer does not remove an existing `chrome-devtools` registration. The standalone MCP scripts' `--all` option includes it.

### Codex CLI (recommended)

```bash
# List available MCP servers
node install-mcp-codex.js --list

# Install specific MCP
node install-mcp-codex.js context7 playwright

# Optional Chrome DevTools MCP
node install-mcp-codex.js chrome-devtools

# Install all free MCP servers
# Note: auto-install excludes fetch because it requires uv/uvx
node install-mcp-codex.js --all

# Uninstall specific MCP
node install-mcp-codex.js --uninstall context7
```

### Claude Code CLI

```bash
# List available MCP servers
node install-mcp.js --list

# Install specific MCP
node install-mcp.js context7 playwright

# Optional Chrome DevTools MCP
node install-mcp.js chrome-devtools

# Install all free MCP servers
# Note: auto-install excludes fetch because it requires uv/uvx
node install-mcp.js --all

# Uninstall specific MCP
node install-mcp.js --uninstall context7

# Install for a specific Claude scope (default: user)
node install-mcp.js --scope local context7
```

### Antigravity CLI

```bash
node install-mcp-antigravity.js chrome-devtools
```

## Config File Format

Each JSON file follows this structure:

```json
{
  "name": "mcp-name",
  "description": "Description",
  "requiresApiKey": false,
  "config": {
    "command": "npx",
    "args": ["-y", "@package/name@latest"]
  }
}
```

When an API key is required:

```json
{
  "requiresApiKey": true,
  "apiKeyEnvVar": "ENV_VAR_NAME",
  "config": {
    "env": {
      "ENV_VAR_NAME": "${ENV_VAR_NAME}"
    }
  }
}
```

## Manual Installation

To install directly without `install-mcp.js`/`install-mcp-codex.js`:

```bash
# Claude Code CLI
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
claude mcp add playwright -- npx -y @playwright/mcp@latest
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
claude mcp add fetch -- uvx mcp-server-fetch
# Codex CLI
codex mcp add context7 -- npx -y @upstash/context7-mcp@latest
codex mcp add playwright -- npx -y @playwright/mcp@latest
```
