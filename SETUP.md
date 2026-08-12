# 환경 설정 가이드

이 문서는 Claude Code 커스터마이징 환경을 완전히 구성하는 방법을 설명합니다.

---

## 기본 설치와 CLI 선택

설치기는 프로젝트 기술 스택을 자동 감지하지 않습니다. 대상 CLI만 선택하고, 핵심 번들은 모두 설치합니다. 인수가 없거나 `--all`을 지정하면 Claude, Codex, Gemini, Grok용 자산을 함께 준비합니다. 선택한 CLI 실행 파일이 없어도 홈 디렉터리의 스킬·카탈로그·source-only 라이브러리·훅·설정은 준비하며, MCP 등록처럼 해당 실행 파일이 필요한 명령만 `skipped`로 보고합니다. CLI를 나중에 설치했다면 같은 설치기를 다시 실행해 등록 단계를 완료합니다.

```bash
# 모든 CLI
.\install.bat
./install.sh

# 위 기본값을 명시적으로 적는 같은 동작
.\install.bat --all
./install.sh --all

# 특정 CLI만
.\install.bat --llm claude,codex
./install.sh --llm claude,codex
```

`docs/smart-setup-registry.json`은 리소스 매핑 참고자료이며, `/smart-setup`이라는 활성 명령을 제공하지 않습니다. 프로젝트 유형별 외부 리소스는 아래 섹션에서 직접 선택합니다.

---

## 🚀 수동 설치: 프로젝트 유형별

프로젝트 유형에 맞는 스킬만 선택적으로 설치하세요.

### WPF / Windows Forms 프로젝트

```bash
# 필수
npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code

# 선택 (DDD/CQRS 패턴 사용 시)
npx add-skill nesbo/dotnet-claude-code-skills -a claude-code

# 선택 (오케스트레이션)
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
```

### .NET MAUI / 크로스 플랫폼 앱

```bash
# 필수
npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code

# 선택 (오케스트레이션)
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
```

### ASP.NET Core / Blazor 웹 앱

```bash
# 필수
npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code
npx add-skill nesbo/dotnet-claude-code-skills -a claude-code

# 선택 (PostgreSQL 사용 시)
claude plugin marketplace add timescale/pg-aiguide
claude plugin install pg-aiguide

# 선택 (오케스트레이션)
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
```

### React / Next.js 프로젝트

```bash
# 필수
npx add-skill vercel-labs/agent-skills -a claude-code

# 선택 (TypeScript 강화)
npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code

# 선택 (오케스트레이션)
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
```

### Node.js / NestJS 백엔드

```bash
# 필수
npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code

# 선택 (TypeScript Node.js 템플릿)
npx add-skill PaulRBerg/dot-claude -a claude-code

# 선택 (PostgreSQL 사용 시)
claude plugin marketplace add timescale/pg-aiguide
claude plugin install pg-aiguide

# 선택 (오케스트레이션)
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
```

### 풀스택 (React + Node.js + PostgreSQL)

```bash
# 프론트엔드
npx add-skill vercel-labs/agent-skills -a claude-code

# 백엔드
npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code

# 데이터베이스
claude plugin marketplace add timescale/pg-aiguide
claude plugin install pg-aiguide

# 오케스트레이션
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
```

### 풀스택 (.NET + React + PostgreSQL)

```bash
# 백엔드
npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code
npx add-skill nesbo/dotnet-claude-code-skills -a claude-code

# 프론트엔드
npx add-skill vercel-labs/agent-skills -a claude-code

# 데이터베이스
claude plugin marketplace add timescale/pg-aiguide
claude plugin install pg-aiguide

# 오케스트레이션
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
```

### 결제 연동 프로젝트 (토스페이먼츠)

```bash
# 필수 - 토스페이먼츠 MCP (결제 연동 10분 완료)
claude mcp add tosspayments -- npx -y @tosspayments/integration-guide-mcp@latest

# 선택 (Node.js 백엔드)
npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code

# 선택 (React 프론트엔드)
npx add-skill vercel-labs/agent-skills -a claude-code
```

**사용법:**
```
"결제창을 연결해줘"
"정기결제 연동하고 싶어"
"V2 SDK로 결제위젯 삽입하는 코드 작성해줘"
```

### 전체 설치 (모든 스킬)

```bash
# 모든 외부 스킬 한번에 설치
npx add-skill vercel-labs/agent-skills -a claude-code
npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code
npx add-skill nesbo/dotnet-claude-code-skills -a claude-code
npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code
npx add-skill PaulRBerg/dot-claude -a claude-code

# MCP 서버
claude mcp add tosspayments -- npx -y @tosspayments/integration-guide-mcp@latest
claude mcp add context7 -- npx -y @upstash/context7-mcp

# 플러그인
claude plugin marketplace add timescale/pg-aiguide
claude plugin install pg-aiguide

/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
/oh-my-claudecode:omc-setup
```

---

## 상세 가이드

아래는 각 스킬/플러그인의 상세 설명입니다.

---

## 1. Vercel Agent Skills (강력 추천)

[vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) - React/Next.js 10년 최적화 패턴

### 설치 방법

```bash
# Claude Code에 설치 (권장)
npx add-skill vercel-labs/agent-skills -a claude-code

# 또는 전체 에이전트에 설치
npx add-skill vercel-labs/agent-skills -y -g
```

### 포함 스킬

| 스킬 | 설명 |
|------|------|
| **react-best-practices** | 45+ 규칙, 8개 카테고리 React/Next.js 성능 최적화 |
| **web-design-guidelines** | 100+ 규칙 접근성, 성능, UX 검토 |
| **vercel-deploy-claimable** | 40+ 프레임워크 자동 감지 Vercel 배포 |

### 사용 시점

- React 컴포넌트 작성/리뷰 시 자동 활성화
- "Review this React component for performance issues"
- "Help me optimize this Next.js page"
- "Deploy my app"

---

## 2. oh-my-claudecode (선택)

[Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) - 32개 에이전트, 40+ 스킬 다중 에이전트 오케스트레이션

> 이 플러그인의 에이전트는 Olympus의 기본 등록 0개 정책과 별개인 외부 opt-in 자산입니다.
> 각 CLI의 네이티브 작업자만으로 충분하면 설치하지 않는 편이 컨텍스트와 라우팅 경쟁을 줄입니다.

### 설치 방법

```bash
# Step 1: 플러그인 추가
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode

# Step 2: 설정 실행
/oh-my-claudecode:omc-setup
```

### 포함된 에이전트 (32개)

| 에이전트 | 용도 |
|---------|------|
| architect | 아키텍처 설계 |
| researcher | 연구 및 분석 |
| explore | 코드베이스 탐색 |
| designer | UI/UX 디자인 |
| writer | 문서 작성 |
| vision | 이미지/PDF 분석 |
| critic | 코드/아이디어 비평 |
| analyst | 데이터 분석 |
| executor | 작업 실행 |
| planner | 계획 수립 |
| qa-tester | QA 테스트 |
| scientist (Haiku/Sonnet/Opus) | 과학적 분석 (3단계) |
| security-reviewer | 보안 검토 |
| build-fixer | 빌드 오류 수정 |

### 5가지 실행 모드

| 모드 | 키워드 | 설명 |
|------|--------|------|
| Autopilot | `autopilot` | 완전 자율 실행 |
| Ultrapilot | `ultrawork`, `ulw` | 3-5배 빠른 병렬 처리 |
| Swarm | `swarm` | N개 조정 에이전트 작업 풀 |
| Pipeline | `pipeline` | 순차 에이전트 체이닝 |
| Ecomode | `eco`, `ecomode` | 토큰 효율적 실행 (30-50% 절감) |

### 주요 스킬

```bash
/oh-my-claudecode:ultrawork     # 최대 병렬 실행
/oh-my-claudecode:research AUTO: <목표>  # 자율 연구
/oh-my-claudecode:mcp-setup     # MCP 자동 설정
/oh-my-claudecode:learner       # 스킬 자동 학습
/oh-my-claudecode:tdd           # TDD 가이드
/oh-my-claudecode:git-master    # Git 워크플로우
```

### MCP 자동 설정

```bash
/oh-my-claudecode:mcp-setup
```

지원 MCP:
- **Context7**: 라이브러리 문서/코드 컨텍스트
- **Exa**: 웹 검색 (API 키 필요)
- **GitHub**: 이슈/PR/저장소 접근
- **Filesystem**: 확장 파일 시스템 접근

### 자연어 인식

Magic Keywords (자동 활성화):
- "plan this" → 계획 시작
- "don't stop until done" → 지속성 모드
- "ultrawork" → 최대 병렬 실행

---

## 3. .NET / C# / WPF / MAUI 스킬

C#, WPF, MAUI 개발에 필수적인 스킬들입니다.

### claude-code-dotnet (Aaronontheweb)

[claude-code-dotnet](https://github.com/Aaronontheweb/claude-code-dotnet) - 5개 에이전트 + 6개 스킬

```bash
npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code
```

**포함 내용:**

| 에이전트/스킬 | 설명 |
|--------------|------|
| modern-csharp-coding-standards | records, pattern matching, async/await, Span/Memory |
| wpf-best-practices | WPF MVVM, 데이터 바인딩, 스타일링 |
| maui-best-practices | .NET MAUI 크로스 플랫폼 개발 |
| entity-framework | EF Core 베스트 프랙티스 |
| asp-net-core | ASP.NET Core API 개발 |
| blazor | Blazor 컴포넌트 개발 |

### dotnet-claude-code-skills (nesbo)

[dotnet-claude-code-skills](https://github.com/nesbo/dotnet-claude-code-skills) - DDD + Clean Architecture

```bash
npx add-skill nesbo/dotnet-claude-code-skills -a claude-code
```

**포함 내용:**
- Domain-Driven Design (DDD) 패턴
- CQRS (Command Query Responsibility Segregation)
- Hexagonal Architecture (Ports & Adapters)
- .NET 8+, C# 12 기준

---

## 4. Node.js / TypeScript 스킬

### mastering-typescript-skill

[mastering-typescript-skill](https://github.com/SpillwaveSolutions/mastering-typescript-skill) - 엔터프라이즈급 TypeScript

```bash
npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code
```

**지원 버전:**
- Node.js 22 LTS
- NestJS 11.x (백엔드)
- React 19.x (프론트엔드)
- Vite 7.x, Vitest 3.x
- ESLint 9.x

### dot-claude (PaulRBerg)

[dot-claude](https://github.com/PaulRBerg/dot-claude) - TypeScript Node.js 템플릿

```bash
npx add-skill PaulRBerg/dot-claude -a claude-code
```

**특징:**
- Bun 런타임 지원
- Vitest 테스팅
- Biome 린팅/포맷팅
- CLI 도구, 라이브러리, 백엔드 서비스용

---

## 5. 데이터베이스 스킬

### pg-aiguide (Timescale) - PostgreSQL

[pg-aiguide](https://github.com/timescale/pg-aiguide) - PostgreSQL 베스트 프랙티스

```bash
claude plugin marketplace add timescale/pg-aiguide
claude plugin install pg-aiguide
```

**기능:**
- PostgreSQL 공식 매뉴얼 시맨틱 검색 (버전별)
- AI 최적화 스킬 자동 적용
- FK 인덱스, Heap storage, 쿼리 최적화 가이드

**주요 포인트:**
- FK 인덱스: PostgreSQL은 FK 컬럼을 자동 인덱싱하지 않음 → 수동 추가 필요
- Heap storage: SQL Server/MySQL InnoDB와 달리 기본 클러스터드 PK 없음

---

## 6. MCP 서버 설정

자세한 내용: [mcp-servers/README.md](mcp-servers/README.md)

### 빠른 전체 설정

`.claude/settings.local.json`에 추가:

```json
{
  "mcpServers": {
    "tosspayments": {
      "command": "npx",
      "args": ["-y", "@tosspayments/integration-guide-mcp@latest"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "timeout": 60000
    },
    "stitch": {
      "command": "npx",
      "args": ["-y", "stitch-mcp"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token"
      }
    }
  }
}
```

### CLI로 설치

```bash
# Toss Payments - 결제 연동 (10분 완료)
claude mcp add tosspayments -- npx -y @tosspayments/integration-guide-mcp@latest

# Context7 - 라이브러리 문서
claude mcp add context7 -- npx -y @upstash/context7-mcp

# Playwright - 브라우저 자동화
claude mcp add playwright -- npx -y @playwright/mcp@latest

# Stitch - UI 디자인 (자동 설정)
npx -p stitch-mcp-auto stitch-mcp-auto-setup

# GitHub
claude mcp add github -- npx -y @modelcontextprotocol/server-github
```

---

## 7. 커스텀 스킬·명령어·훅 설치

이 저장소의 커스터마이징을 설치합니다.

기존 설치를 업데이트할 때 이름이 다른 외부·개인 스킬은 유지됩니다. Olympus와 이름이
겹치는 수정본은 각 CLI 홈의 `_olympus-preserved/<timestamp>/`로 이동하며, 폐기된 구
Olympus 항목은 `_pruned-stale-olympus/<timestamp>/`로 이동합니다. 자동 원상복구 명령은
없으므로 업데이트·source-only 전체 활성화·수동 복구 전에
[스킬 레지스트리 마이그레이션 가이드](docs/skill-registry-migration.md)를 확인하세요.

일반 업데이트는 먼저 제거하지 않습니다. `git pull` 후 옵션 없이 설치기를 다시 실행하면
현재의 가벼운 기본 정책으로 조정됩니다. `--uninstall` 후 재설치는 설치가 깨졌거나 Olympus가
관리하는 훅과 MCP 등록까지 처음부터 다시 만들 때만 사용합니다. 제거는 보존본을 자동 복구하지 않습니다.

| 기존 항목 | 설치 결과 | 복구 방법 |
|-----------|-----------|-----------|
| 이름이 다른 외부·개인 스킬 | 그대로 유지 | 조치 없음 |
| 현재 활성 Olympus 스킬 | 현재 버전으로 갱신 | 저장소 원본에서 수정 |
| 현재 source-only가 된 Olympus 스킬 | 활성 경로에서 제외하고 `.olympus/source-skills`에 현재 버전 게시 | slash 등록이 필요할 때만 `--include-source-only-skills` |
| Olympus와 이름이 같은 수정본·외부 스킬 | `_olympus-preserved/<timestamp>/`로 이동 | 디렉터리명과 frontmatter `name`을 함께 고유하게 바꾼 뒤 `skills/`에 수동 복사 |
| 폐기된 구 Olympus 항목 | `_pruned-stale-olympus/<timestamp>/`로 이동 | 필요성을 확인한 뒤 고유 이름으로 수동 복사 |

### Windows

```batch
REM 일반 설치 또는 업데이트: 네 CLI 전체, 가벼운 기본 구성
install.bat

REM source-only 스킬까지 모두 활성 등록
install.bat --all --include-source-only-skills

REM Olympus 관리 구성을 제거한 뒤 기본값으로 재설치
install.bat --uninstall
install.bat --all
```

### Linux/Mac

```bash
# 일반 설치 또는 업데이트: 네 CLI 전체, 가벼운 기본 구성
chmod +x install.sh
./install.sh

# source-only 스킬까지 모두 활성 등록
./install.sh --all --include-source-only-skills

# Olympus 관리 구성을 제거한 뒤 기본값으로 재설치
./install.sh --uninstall
./install.sh --all
```

> 최상위 설치기의 제거 옵션은 `--uninstall`입니다. `--link`와 `--unlink`는 현재 최상위
> 설치 모드가 아니며, 자산 동기화 스크립트의 내부 `--unlink`와 구분해야 합니다.

### 수동 설치

```bash
# Skills (글로벌, 기본 allowlist만 활성 + 나머지는 dormant source library)
node scripts/sync-claude-skills.js ~/.claude

# 모든 source-only 스킬도 활성 레지스트리에 추가해야 할 때만:
node scripts/sync-claude-skills.js ~/.claude --include-source-only-skills

# Custom agents는 기본 설치하지 않음
# 호환성 테스트용 source-only 프롬프트가 꼭 필요할 때만:
node scripts/sync-claude-agents.js ~/.claude --include-source-only-agents

# Hooks (글로벌) + settings.json 자동 설정
cp hooks/*.sh hooks/*.ps1 ~/.claude/hooks/
node install-hooks-config.js ~/.claude/hooks ~/.claude/settings.json --bash
# Windows (PowerShell): node install-hooks-config.js ~/.claude/hooks ~/.claude/settings.json --windows
```

---

## 7-1. 훅 설정 가이드

> **참고**: `install.bat` / `install.sh` 실행 시 훅 파일 복사와 `settings.json` 설정이 **자동으로 완료**됩니다.
> 아래는 수동 설정이 필요한 경우(프로젝트별 커스텀 등)를 위한 가이드입니다.

### 자동 설정 (권장)

설치 스크립트가 다음을 자동으로 처리합니다:
1. 훅 스크립트를 `~/.claude/hooks/`에 복사 (또는 링크)
2. `~/.claude/settings.json`에 훅 설정 자동 등록
3. `~/.claude/CLAUDE.md`에 장기기억 규칙 자동 추가 (응답 태그, 대화 검색)
4. **Windows에서는 항상 PowerShell 사용** (Git Bash가 있어도 Claude Code는 /bin/bash 사용하므로)

```bash
# 이것만 실행하면 훅 설정 완료
install.bat          # Windows
./install.sh         # Linux/Mac
```

### 수동 설정 (프로젝트별 커스텀)

프로젝트별로 훅을 다르게 구성하려면 수동 설정이 필요합니다.

#### 환경 확인

| 환경 | 사용할 스크립트 | 확인 방법 |
|------|----------------|----------|
| Windows + Git 설치됨 | `.sh` (Bash) | `where bash` 실행 시 경로 출력 |
| Windows + Git 없음 | `.ps1` (PowerShell) | `where bash` 실행 시 오류 |
| Mac / Linux | `.sh` (Bash) | 기본 지원 |

#### install-hooks-config.js 헬퍼 사용

```bash
# Bash 환경
node install-hooks-config.js <hooks-dir> <settings-path> --bash

# PowerShell 환경
node install-hooks-config.js <hooks-dir> <settings-path> --windows

# 훅 설정 제거
node install-hooks-config.js <hooks-dir> <settings-path> --uninstall
```

이 헬퍼는 기존 settings.json의 다른 키(enabledPlugins 등)를 보존하면서 `hooks` 키만 교체/삭제합니다.

#### 수동 JSON 설정 (Bash)

`.claude/settings.json` 또는 `.claude/settings.local.json`:
```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "command": "bash hooks/save-conversation.sh \"$PROMPT\"" }
    ],
    "PreToolUse": [
      { "matcher": "Write|Edit", "command": "bash hooks/protect-files.sh \"$TOOL_INPUT\"" },
      { "matcher": "Write", "command": "bash hooks/check-new-file.sh \"$TOOL_INPUT\"" }
    ],
    "PostToolUse": [
      { "matcher": "Write|Edit", "command": "bash hooks/validate-api.sh \"$TOOL_INPUT\"" }
    ]
  }
}
```

#### 수동 JSON 설정 (PowerShell)

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "command": "powershell -ExecutionPolicy Bypass -File hooks/save-conversation.ps1 \"$PROMPT\"" }
    ],
    "PreToolUse": [
      { "matcher": "Write|Edit", "command": "powershell -ExecutionPolicy Bypass -File hooks/protect-files.ps1 \"$TOOL_INPUT\"" },
      { "matcher": "Write", "command": "powershell -ExecutionPolicy Bypass -File hooks/check-new-file.ps1 \"$TOOL_INPUT\"" }
    ],
    "PostToolUse": [
      { "matcher": "Write|Edit", "command": "powershell -ExecutionPolicy Bypass -File hooks/validate-api.ps1 \"$TOOL_INPUT\"" }
    ]
  }
}
```

### 주의사항

1. **줄바꿈 문제**: `.sh` 파일은 반드시 LF (Unix) 줄바꿈이어야 합니다
   - Windows에서 CRLF로 저장하면 `\r': command not found` 오류 발생
   - `.gitattributes`에서 `*.sh text eol=lf` 설정으로 방지

2. **PowerShell 실행 정책**: `-ExecutionPolicy Bypass` 플래그 필수

3. **jq 의존성**: bash 스크립트 중 일부는 `jq` 필요 (JSON 파싱)
   - 설치: `choco install jq` 또는 `winget install jqlang.jq`

4. **자세한 훅 목록**: `hooks/README.md` 참고

---

## 7-2. Orchestrator MCP 정책 레이어 설치 가이드

> 일반적인 `workpm` 병렬 실행은 각 CLI의 네이티브 작업자를 사용하므로 별도 MCP 설치가 필요하지 않습니다.
> hard file lock, 외부 태스크 보드, Claude/Codex/Gemini 혼합 Worker가 필요한 프로젝트만 Orchestrator MCP를 설치합니다.
> 최상위 `install.bat`/`install.sh`는 source-only Orchestrator 런타임을 각 CLI 홈에 준비하고,
> CLI 실행 파일이 있으면 글로벌 MCP 등록도 시도합니다. 아래 `skills/orchestrator/install.js <project>` 절차는
> 프로젝트별 명령·훅·`settings.local.json`이 실제로 필요할 때만 추가로 수행합니다.

### 자동 설치 (권장)

```bash
# 설치
node skills/orchestrator/install.js <대상-프로젝트-경로>

# 제거
node skills/orchestrator/install.js <대상-프로젝트-경로> --uninstall
```

**설치 스크립트가 수행하는 단계:**

| 단계 | 내용 |
|------|------|
| 1. MCP 서버 빌드 | `dist/index.js` 없으면 자동 `npm install && npm run build` |
| 2. 명령어 복사 | `.claude/commands/`에 `workpm.md`, `pmworker.md` 복사 |
| 3. settings.local.json 머지 | MCP 서버 + 훅 설정 추가 (기존 설정 보존, 중복 방지) |

> **참고**: PM/Worker 모드 감지는 글로벌 훅 `orchestrator-detector.js`로 처리합니다.
> `install.bat`/`install.sh` 실행 시 자동 설치됩니다.

**제거 시:**
- `settings.local.json`에서 orchestrator MCP 설정만 제거 (다른 설정 보존)
- 복사된 명령어 파일 삭제

### 수동 설치

수동으로 설정하려면 [skills/orchestrator/docs/orchestrator-guide.md](skills/orchestrator/docs/orchestrator-guide.md) 참고.

### 사용법

```bash
# 일반 PM 모드: 네이티브 작업자 사용
workpm

# MCP 정책 레이어가 필요한 경우
/daedalus --mcp

# MCP Worker 모드: 다른 터미널에서 입력
pmworker
```

---

## 8. 전체 설치 순서

### 새 PC에서 환경 구성

```bash
# 1. 프론트엔드 스킬 (React/Next.js)
npx add-skill vercel-labs/agent-skills -a claude-code

# 2. 백엔드 스킬 (.NET/C#/WPF/MAUI)
npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code
npx add-skill nesbo/dotnet-claude-code-skills -a claude-code

# 3. Node.js/TypeScript 스킬
npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code

# 4. 데이터베이스 플러그인 (PostgreSQL)
claude plugin marketplace add timescale/pg-aiguide
claude plugin install pg-aiguide

# 5. 선택: 외부 32-agent 플러그인이 실제로 필요할 때만 설치
# 이 항목은 Olympus 사용자 정의 에이전트 기본 0개와 별도입니다.
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
/oh-my-claudecode:omc-setup

# 6. MCP 서버 설정
/oh-my-claudecode:mcp-setup
# 또는 수동으로 claude mcp add ...

# 7. 커스텀 스킬/명령어/훅 설치 (글로벌, 가벼운 기본 정책)
# Windows: install.bat
# Linux/Mac: ./install.sh
# → Skills, Commands, Hooks 글로벌 설치
# → 사용자 정의 에이전트 참고 소스는 기본 미설치 (네이티브 서브에이전트 사용)
# → settings.json 훅 설정 자동 등록
# → CLAUDE.md 장기기억 규칙 자동 추가 (응답 태그, 대화 검색)
```

---

## 9. 설정 확인

```bash
# 설치된 스킬 목록
/skills

# 설치된 플러그인 목록
/plugins

# MCP 상태 확인
/mcp

# 사용 가능한 작업자 확인
# 각 CLI의 네이티브 agent/subagent 화면 또는 명령을 사용합니다.
# Olympus 사용자 정의 에이전트는 기본 등록 0개가 정상입니다.
```

---

## 10. 내가 사용하는 전체 목록

### 외부 플러그인/스킬

| 이름 | 용도 | 설치 명령 |
|------|------|----------|
| Vercel Agent Skills | React/Next.js/배포 | `npx add-skill vercel-labs/agent-skills -a claude-code` |
| claude-code-dotnet | C#/WPF/MAUI/.NET | `npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code` |
| dotnet-claude-code-skills | DDD/CQRS/Hexagonal | `npx add-skill nesbo/dotnet-claude-code-skills -a claude-code` |
| mastering-typescript-skill | Node.js/TypeScript | `npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code` |
| pg-aiguide | PostgreSQL 베스트 프랙티스 | `claude plugin install pg-aiguide` |
| oh-my-claudecode | 다중 에이전트 오케스트레이션 | `/plugin install oh-my-claudecode` |

### MCP 서버

| 이름 | 용도 | 설치 |
|------|------|------|
| Context7 | 라이브러리 문서 | `claude mcp add context7 ...` |
| Playwright | 브라우저 자동화 | `claude mcp add playwright ...` |
| Stitch | UI 디자인 | `npx -p stitch-mcp-auto ...` |
| GitHub | GitHub API | `claude mcp add github ...` |

### 글로벌 스킬 소스 (직접 제작, 주요 항목)

스킬 소스 100개는 기본 allowlist 합집합 17개(사용자 진입점 하네스 11개 + 런타임 어댑터 6개)와 source-only 내부·선택 모듈 83개로 나뉩니다. 호환되지 않는 어댑터를 제외하면 Claude는 97개(활성 14 + source-only 83), Codex/Gemini는 각각 96개(활성 13 + source-only 83)입니다. Grok 설치 표면은 Claude의 활성 14개를 공유합니다. 활성 하네스는 필요한 하위 모듈을 카탈로그에서 직접 읽고, 나머지 저빈도 가이드·변환기도 같은 source-only 경로에서 명시 요청할 수 있습니다.

| 이름 | 기본 상태 | 용도 |
|------|-----------|------|
| docker-deploy | source-only | 자연어 요청이나 활성 Zeus 하네스가 카탈로그 원본을 직접 읽어 Docker 배포 환경 구성 |
| code-reviewer | source-only | CLI 네이티브 리뷰를 보강하는 정책·보안 감사 모듈 |
| react-dev | source-only | React/TypeScript 개발 참고자료 |
| python-backend-fastapi | source-only | Python FastAPI 개발 참고자료 |
| mnemo | active adapter | 장기기억 시스템 (대화 저장 + 태깅 + 검색) |
| orchestrator | source-only skill + runtime module | 일반 작업은 네이티브 workpm 사용; hard lock·외부 보드·혼합 CLI 분기에서만 MCP 런타임 사용 |
| excel2md | source-only | 엑셀 → 마크다운 변환 |
| fullstack-coding-standards | source-only | 풀스택 코딩 표준 참고자료 |
| test-driven-development | source-only | TDD 워크플로우 참고자료 |
| systematic-debugging | source-only | 체계적 디버깅 참고자료 |

### source-only 에이전트 참고자료 (기본 미설치, 주요 항목)

| 이름 | 용도 |
|------|------|
| frontend-react | 소스 참고용; 실제 구현은 프로젝트 설정·기존 UI 구조·테스트를 따르는 네이티브 작업자 사용 |
| backend-spring | 소스 참고용; 실제 구현은 build manifest·기존 계층·테스트를 따르는 네이티브 작업자 사용 |
| architect | 소스 참고용; 실제 설계는 네이티브 계획·검토 + documentation-and-adrs 사용 |
| security-reviewer | 소스 참고용; 실제 검증은 code-reviewer 보안 감사 모드 또는 argos Phase 7 사용 |
| stitch-developer | 소스 참고용; 실제 실행은 design-plan이 조건부 source-only stitch 어댑터를 직접 읽어 수행 |
| code-reviewer | 소스 참고용; 실제 리뷰는 CLI 네이티브 review + 동명 스킬 사용 |
| qa-engineer | 소스 참고용; 실제 QA는 프로젝트 테스트 실행·minos·argos 사용 |
| documentation | 소스 참고용; 실제 작성은 네이티브 작업자 + 목적별 문서 스킬 사용 |
| spec-interviewer | 소스 참고용; 실제 인터뷰는 zephermine 사용 |

### 기본 활성 진입점과 source-only 요청

| 진입점 | 기본 상태 | 용도 |
|--------|-----------|------|
| `/zeus` | active | 설계부터 검증까지 전자동 파이프라인 |
| `/zephermine` | active | 요구사항 인터뷰와 구현 계획 |
| `/agent-team` | active adapter | CLI 네이티브 병렬 구현 |
| `workpm` (`/daedalus`) | active | 설계 없이 시작하는 PM 흐름 |
| `/mnemo` | active adapter | 대화 기록과 과거 검색 |
| 카탈로그의 나머지 워크플로우 | source-only | 자연어로 명시 요청하거나 `--include-source-only-skills` opt-in 후 slash 호출 |

---

## 11. 빠른 복구 체크리스트

새 환경에서 빠르게 복구할 때 사용:

- [ ] Claude Code 설치됨
- [ ] **프론트엔드**: Vercel 스킬 설치됨 (`npx add-skill vercel-labs/agent-skills -a claude-code`)
- [ ] **백엔드 .NET**: claude-code-dotnet 설치됨 (`npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code`)
- [ ] **백엔드 Node.js**: mastering-typescript-skill 설치됨 (`npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code`)
- [ ] **데이터베이스**: pg-aiguide 설치됨 (`claude plugin install pg-aiguide`)
- [ ] **선택 오케스트레이션**: 외부 32-agent 구성이 필요한 경우에만 oh-my-claudecode 설치 (`/plugin install oh-my-claudecode`)
- [ ] MCP 서버 설정됨 (`/oh-my-claudecode:mcp-setup` 또는 수동)
- [ ] `install.bat` 또는 `./install.sh`을 실행하여 네 CLI 글로벌 자산이 준비되고, **Olympus 관리** 사용자 정의 에이전트는 기본 0개로 유지됨
- [ ] 설치되지 않은 CLI가 있다면 자산은 준비되고 CLI 전용 MCP 등록만 `skipped`로 표시됐는지 확인; CLI 설치 후 같은 설치기 재실행
- [ ] 같은 이름의 수정본이 있었다면 `<CLI_HOME>/_olympus-preserved/` 확인; 복구 시 디렉터리명과 frontmatter `name`을 함께 변경
- [ ] settings.json에 훅 설정 자동 등록 확인됨
- [ ] CLAUDE.md에 장기기억 규칙 자동 추가 확인됨 (응답 태그, 대화 검색)

---

## 12. 참고 리소스

### 스킬/에이전트 컬렉션

| 프로젝트 | 설명 | 링크 |
|---------|------|------|
| awesome-claude-code-subagents | 100+ 전문 서브에이전트 컬렉션 | [GitHub](https://github.com/VoltAgent/awesome-claude-code-subagents) |
| awesome-claude-skills | Claude 스킬 큐레이션 리스트 | [GitHub](https://github.com/travisvn/awesome-claude-skills) |
| everything-claude-code | Anthropic 해커톤 우승자 설정 | [GitHub](https://github.com/affaan-m/everything-claude-code) |
| claude-code-showcase | 종합 설정 예제 + TypeScript 훅 | [GitHub](https://github.com/ChrisWiles/claude-code-showcase) |
| awesome-claude-code | Claude Code 리소스 큐레이션 | [GitHub](https://github.com/hesreallyhim/awesome-claude-code) |
| anthropics/skills | Anthropic 공식 스킬 | [GitHub](https://github.com/anthropics/skills) |

### 언어/프레임워크별 스킬

| 언어/프레임워크 | 프로젝트 | 링크 |
|----------------|---------|------|
| C# / .NET / WPF / MAUI | claude-code-dotnet | [GitHub](https://github.com/Aaronontheweb/claude-code-dotnet) |
| C# / DDD / CQRS | dotnet-claude-code-skills | [GitHub](https://github.com/nesbo/dotnet-claude-code-skills) |
| TypeScript / NestJS | mastering-typescript-skill | [GitHub](https://github.com/SpillwaveSolutions/mastering-typescript-skill) |
| TypeScript / Node.js | dot-claude | [GitHub](https://github.com/PaulRBerg/dot-claude) |
| React / Next.js | vercel-labs/agent-skills | [GitHub](https://github.com/vercel-labs/agent-skills) |
| PostgreSQL | pg-aiguide | [GitHub](https://github.com/timescale/pg-aiguide) |

---

**최종 업데이트:** 2026-08-13
