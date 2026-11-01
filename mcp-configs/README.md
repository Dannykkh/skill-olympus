# MCP Configuration Management

Pre-configured MCP server settings for Claude Code, Codex, and Antigravity.

## Available MCP Servers

| Name | Description | API Key | Package |
|------|-------------|---------|---------|
| context7 | Latest library docs search; optional | Not required | `@upstash/context7-mcp` |
| playwright | Browser automation and E2E testing | Not required | `@playwright/mcp` |
| fetch | Fetch URL content (HTML/JSON/MD) | Not required | `uvx mcp-server-fetch` |

## Installation

The main installers (`install.bat` and `install.sh`) install only `playwright` by default. Install `context7` explicitly when needed. Rerunning a main installer preserves existing optional registrations. The standalone MCP scripts' explicit `--all` option also installs `context7`.

Check the project's dependency versions, existing code, and official documentation first. Context7 is an optional documentation lookup tool, not a prerequisite for implementation.

### Codex CLI (recommended)

```bash
# List available MCP servers
node install-mcp-codex.js --list

# Install the default MCP
node install-mcp-codex.js playwright

# Optional Context7 MCP
node install-mcp-codex.js context7

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

# Install the default MCP
node install-mcp.js playwright

# Optional Context7 MCP
node install-mcp.js context7

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
node install-mcp-antigravity.js playwright
# Optional Context7 MCP
node install-mcp-antigravity.js context7
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
claude mcp add fetch -- uvx mcp-server-fetch
# Codex CLI
codex mcp add context7 -- npx -y @upstash/context7-mcp@latest
codex mcp add playwright -- npx -y @playwright/mcp@latest
```
