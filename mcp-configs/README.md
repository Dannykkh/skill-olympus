# MCP Configuration Management

Pre-configured MCP server settings for Claude Code/Codex/Gemini.

## Available MCP Servers

| Name | Description | API Key | Package |
|------|-------------|---------|---------|
| context7 | Latest library docs search | Not required | `@upstash/context7-mcp` |
| playwright | Browser automation and E2E testing | Not required | `@playwright/mcp` |
| chrome-devtools | Chrome DevTools integration (network/console/performance) | Not required | `@anthropic-ai/chrome-devtools-mcp` |
| fetch | Fetch URL content (HTML/JSON/MD) | Not required | `mcp-fetch-server` |
| github | GitHub API integration (PR, Issue, etc.) | **Required** | `@modelcontextprotocol/server-github` |

## Installation

### Codex CLI (recommended)

```bash
# List available MCP servers
node install-mcp-codex.js --list

# Install specific MCP
node install-mcp-codex.js context7 playwright

# Install all free MCP servers
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

# Install all free MCP servers
node install-mcp.js --all

# Uninstall specific MCP
node install-mcp.js --uninstall context7

# Install to specific settings.json
node install-mcp.js context7 --target ~/.claude/settings.json
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
claude mcp add chrome-devtools -- npx -y @anthropic-ai/chrome-devtools-mcp@latest
claude mcp add fetch -- npx -y mcp-fetch-server@latest
# Codex CLI
codex mcp add context7 -- npx -y @upstash/context7-mcp@latest
codex mcp add playwright -- npx -y @playwright/mcp@latest
```
