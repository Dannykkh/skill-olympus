# MCP Configuration Management

Pre-configured MCP server settings for Claude Code, Codex, and Antigravity.

## Available MCP Servers

| Name | Description | API Key | Package |
|------|-------------|---------|---------|
| context7 | Latest library docs search; optional | Not required | `@upstash/context7-mcp` |
| playwright | Browser automation and E2E testing | Not required | `@playwright/mcp` |
| fetch | Fetch URL content (HTML/JSON/MD) | Not required | `uvx mcp-server-fetch` |

## Installation

A plain install or reinstall preserves existing MCP registrations. Each registered stdio server starts a process per open CLI session. Pass `--register-mcp` to `install.bat` or `install.sh` to register Playwright and Orchestrator for the selected Claude, Codex, and Antigravity targets. This option can replace settings for those servers. The installers build the Orchestrator runtime either way. To register or remove one server, use the standalone commands below. Their `--all` option also installs `context7`.

Check the project's dependency versions, existing code, and official documentation first. Context7 is an optional documentation lookup tool, not a prerequisite for implementation.

### Codex CLI (recommended)

The Codex adapter reads the installed server list before changing registrations. If it cannot read that list, it exits with an error. When registering or removing several servers, it processes the remaining names after an individual failure and returns a nonzero exit code if any requested operation failed. A retry skips servers already registered or already removed. The main installers also return a nonzero exit code when a requested Codex registration fails.

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

With `--register-mcp`, the main installer refreshes the **user-scope** Orchestrator entry with the installed runtime path. For Playwright, it uses the standalone adapter. The adapter skips a matching entry and replaces it when it detects a different command or arguments in the requested scope. Replacing an entry also replaces its custom environment variables. To keep custom settings for these servers, run the main installer without `--register-mcp`.

The standalone adapter defaults to user scope. If another scope hides a same-name registration, it adds the requested entry when missing and keeps an existing hidden entry on a normal rerun. `--force` explicitly replaces the requested scope’s entry. Entries in other scopes are preserved.

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

Before registering or removing a server, the adapter reads both
`config/mcp_config.json` and `antigravity-cli/.olympus-mcp-manifest.json` under
`ANTIGRAVITY_HOME` (default `~/.gemini`). If either existing file cannot be
read as a valid UTF-8 JSON object with the expected server map, the adapter
reports the file path and exits before writing either file. Restore or repair
the reported file and retry. A new config may omit `mcpServers`.

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
