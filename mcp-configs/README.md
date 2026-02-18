# MCP 설정 관리

Claude Code/Codex에서 자주 사용하는 MCP 서버들의 사전 구성된 설정 파일입니다.

## 사용 가능한 MCP 서버

| 이름 | 설명 | API 키 | 패키지 |
|------|------|--------|--------|
| context7 | 최신 라이브러리 문서 검색 | 불필요 | `@upstash/context7-mcp` |
| playwright | 브라우저 자동화 및 E2E 테스트 | 불필요 | `@playwright/mcp` |
| fetch | URL 콘텐츠 가져오기 (HTML/JSON/MD) | 불필요 | `mcp-fetch-server` (npx) |
| sequential-thinking | 단계적 사고 프로세스 | 불필요 | `@modelcontextprotocol/server-sequential-thinking` |
| github | GitHub API 통합 (PR, Issue 등) | **필요** | `@modelcontextprotocol/server-github` |

## 설치 방법

### Codex CLI (권장)

```bash
# 사용 가능한 MCP 목록 표시
node install-mcp-codex.js --list

# 특정 MCP 설치
node install-mcp-codex.js context7 playwright

# 무료 MCP 전부 설치
node install-mcp-codex.js --all

# 특정 MCP 제거
node install-mcp-codex.js --uninstall context7
```

### Claude Code CLI

```bash
# 사용 가능한 MCP 목록 표시
node install-mcp.js --list

# 특정 MCP 설치
node install-mcp.js context7 playwright

# 무료 MCP 전부 설치
node install-mcp.js --all

# 특정 MCP 제거
node install-mcp.js --uninstall context7

# 특정 settings.json에 설치
node install-mcp.js context7 --target ~/.claude/settings.json
```

## 설정 파일 형식

각 JSON 파일은 다음 구조를 따릅니다:

```json
{
  "name": "mcp-name",
  "description": "설명",
  "requiresApiKey": false,
  "config": {
    "command": "npx",
    "args": ["-y", "@package/name@latest"]
  }
}
```

API 키가 필요한 경우:

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

## 직접 설치 (수동)

`install-mcp.js`/`install-mcp-codex.js` 없이 직접 설치하려면:

```bash
# Claude Code CLI 사용
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
claude mcp add playwright -- npx -y @playwright/mcp@latest
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking

# Codex CLI 사용
codex mcp add context7 -- npx -y @upstash/context7-mcp@latest
codex mcp add playwright -- npx -y @playwright/mcp@latest
codex mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
```
