# 환경 설정 가이드

이 문서는 Claude Code 커스터마이징 환경을 완전히 구성하는 방법을 설명합니다.

---

## ⚡ Smart Setup (자동 추천 설치)

프로젝트 기술 스택을 자동 감지하여 최적의 스킬/에이전트/MCP를 추천하고 설치합니다.

```bash
# 프로젝트에서 실행
/smart-setup

# 추천 목록만 미리 확인 (설치하지 않음)
/smart-setup --dry-run
```

**동작 방식:**
1. 프로젝트 파일 스캔 (package.json, *.csproj, requirements.txt 등)
2. 기술 태그 감지 (react, typescript, dotnet, python 등)
3. 내부 스킬/에이전트 + 외부 스킬 + MCP 서버 매칭
4. 필수/추천/선택 3단계로 추천
5. 사용자 확인 후 자동 설치

**레지스트리:** `docs/smart-setup-registry.json`에서 매핑 데이터 관리

> 수동으로 프로젝트 유형별 설치하려면 아래 섹션을 참고하세요.

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

## 2. oh-my-claudecode (강력 추천)

[Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) - 32개 에이전트, 40+ 스킬 다중 에이전트 오케스트레이션

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

## 7. 커스텀 스킬/에이전트 설치

이 저장소의 커스터마이징을 설치합니다.

### Windows

```batch
REM 복사 모드 (기본)
install.bat

REM 심볼릭 링크 모드 (git pull로 자동 업데이트)
install-link.bat
REM 또는: install.bat --link

REM 링크 제거
install-unlink.bat
REM 또는: install.bat --unlink
```

### Linux/Mac

```bash
# 복사 모드 (기본)
chmod +x install.sh
./install.sh

# 심볼릭 링크 모드 (git pull로 자동 업데이트)
./install.sh --link

# 링크 제거
./install.sh --unlink
```

> **복사 vs 링크 모드:**
> | 모드 | 장점 | 단점 |
> |------|------|------|
> | 복사 (기본) | 원본과 독립적, 안전 | 업데이트 시 재설치 필요 |
> | 링크 (`--link`) | git pull만으로 자동 반영 | 원본 삭제 시 동작 안 함 |
>
> **링크 모드 상세:**
> - Windows: `mklink /J` (Junction) — 관리자 권한 불필요
> - Linux/Mac: `ln -s` (symlink)
> - Skills: 개별 폴더 단위로 링크
> - Agents, Commands, Hooks: 전체 폴더를 한번에 링크
> - settings.json 훅 설정도 자동 등록

### 수동 설치

```bash
# Skills (글로벌)
cp -r skills/* ~/.claude/skills/

# Agents (글로벌)
cp agents/* ~/.claude/agents/

# Commands (글로벌)
cp commands/*.md ~/.claude/commands/

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
3. 플랫폼 자동 감지 (bash 있으면 `.sh`, 없으면 `.ps1` 사용)

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
      { "matcher": "Write|Edit", "command": "bash hooks/validate-code.sh \"$TOOL_INPUT\"" },
      { "matcher": "Write|Edit", "command": "bash hooks/format-code.sh \"$TOOL_INPUT\"" },
      { "matcher": "Write", "command": "bash hooks/validate-docs.sh \"$TOOL_INPUT\"" }
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
      { "matcher": "Write|Edit", "command": "powershell -ExecutionPolicy Bypass -File hooks/validate-code.ps1 \"$TOOL_INPUT\"" },
      { "matcher": "Write|Edit", "command": "powershell -ExecutionPolicy Bypass -File hooks/format-code.ps1 \"$TOOL_INPUT\"" },
      { "matcher": "Write", "command": "powershell -ExecutionPolicy Bypass -File hooks/validate-docs.ps1 \"$TOOL_INPUT\"" }
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

## 7-2. Orchestrator 설치 가이드

> **참고**: Orchestrator(PM-Worker 병렬 처리)는 글로벌 설치가 아닌 **프로젝트별 설치**가 필요합니다.
> MCP 서버 경로, 훅, 명령어를 대상 프로젝트에 개별 설정합니다.

### 자동 설치 (권장)

```bash
# 설치
node install-orchestrator.js <대상-프로젝트-경로>

# 제거
node install-orchestrator.js <대상-프로젝트-경로> --uninstall
```

**설치 스크립트가 수행하는 4단계:**

| 단계 | 내용 |
|------|------|
| 1. MCP 서버 빌드 | `dist/index.js` 없으면 자동 `npm install && npm run build` |
| 2. 훅 파일 복사 | 플랫폼 감지 후 `workpm-hook.{ps1\|sh}`, `pmworker-hook.{ps1\|sh}` 복사 |
| 3. 명령어 복사 | `.claude/commands/`에 `workpm.md`, `pmworker.md` 복사 |
| 4. settings.local.json 머지 | MCP 서버 + 훅 설정 추가 (기존 설정 보존, 중복 방지) |

**제거 시:**
- `settings.local.json`에서 orchestrator MCP + 훅 항목만 제거 (다른 설정 보존)
- 복사된 훅/명령어 파일 삭제

### 수동 설치

수동으로 설정하려면 [mcp-servers/claude-orchestrator-mcp/README.md](mcp-servers/claude-orchestrator-mcp/README.md) 참고.

### 사용법

```bash
# PM 모드: 프롬프트에 입력
workpm

# Worker 모드: 다른 터미널에서 입력
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

# 5. oh-my-claudecode 플러그인 설치
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
/oh-my-claudecode:omc-setup

# 6. MCP 서버 설정
/oh-my-claudecode:mcp-setup
# 또는 수동으로 claude mcp add ...

# 7. 커스텀 스킬/에이전트/명령어/훅 설치 (모두 글로벌)
# Windows: install.bat (또는 install-link.bat)
# Linux/Mac: ./install.sh (또는 ./install.sh --link)
# → Skills, Agents, Commands, Hooks 모두 글로벌 설치 + settings.json 자동 설정
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

# 사용 가능한 에이전트 확인
# (Task 도구 사용 시 자동 표시)
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

### 글로벌 스킬 (직접 제작)

| 이름 | 용도 |
|------|------|
| docker-deploy | Docker 배포 환경 구성 |
| code-reviewer | 코드 리뷰 |
| react-best-practices | React 성능 최적화 |
| python-backend | Python FastAPI 개발 가이드 |

### 글로벌 에이전트 (직접 제작)

| 이름 | 용도 |
|------|------|
| api-tester | API 테스트 |
| code-reviewer | 코드 리뷰 |
| frontend-react | 프론트엔드 개발/분석 |
| qa-engineer | QA 검증 |
| qa-writer | QA 시나리오 작성 |
| documentation | 문서 작성 |
| migration-helper | 마이그레이션 |

### 글로벌 Commands

| 이름 | 용도 |
|------|------|
| /check-todos | TODO 검토 |
| /write-api-docs | API 문서 생성 |
| /write-changelog | Changelog 생성 |
| /write-prd | PRD 작성 |

---

## 11. 빠른 복구 체크리스트

새 환경에서 빠르게 복구할 때 사용:

- [ ] Claude Code 설치됨
- [ ] **프론트엔드**: Vercel 스킬 설치됨 (`npx add-skill vercel-labs/agent-skills -a claude-code`)
- [ ] **백엔드 .NET**: claude-code-dotnet 설치됨 (`npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code`)
- [ ] **백엔드 Node.js**: mastering-typescript-skill 설치됨 (`npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code`)
- [ ] **데이터베이스**: pg-aiguide 설치됨 (`claude plugin install pg-aiguide`)
- [ ] **오케스트레이션**: oh-my-claudecode 플러그인 설치됨 (`/plugin install oh-my-claudecode`)
- [ ] MCP 서버 설정됨 (`/oh-my-claudecode:mcp-setup` 또는 수동)
- [ ] install.bat/sh 실행하여 커스텀 스킬/에이전트/명령어/훅 글로벌 설치됨 (링크 모드 권장: `install-link.bat`)
- [ ] settings.json에 훅 설정 자동 등록 확인됨

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

**최종 업데이트:** 2026-02-04
