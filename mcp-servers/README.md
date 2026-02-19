# MCP Servers

Model Context Protocol (MCP) 서버 모음 및 설정 가이드

---

## 📋 외부 MCP 서버 (권장)

### 1. Toss Payments - 결제 연동 (⭐ 추천)

[토스페이먼츠 MCP](https://toss.tech/article/tosspayments-mcp)는 PG업계 최초로 도입된 결제 연동 MCP 서버입니다.

**효과:**
- 결제 연동 시간: **3개월 → 10분**으로 단축
- 자연어 명령으로 결제 코드 생성
- 5년간 축적된 연동 가이드, API 문서, 예제 코드 학습

**설치:**

```bash
claude mcp add tosspayments -- npx -y @tosspayments/integration-guide-mcp@latest
```

**수동 설정:**

```json
{
  "mcpServers": {
    "tosspayments": {
      "command": "npx",
      "args": ["-y", "@tosspayments/integration-guide-mcp@latest"]
    }
  }
}
```

**사용법:**

```
User: 결제창을 연결해줘
User: 정기결제 연동하고 싶어
User: V2 SDK로 결제위젯 삽입하는 코드 작성해줘
User: 결제 승인 요청하는 코드를 작성해줘
```

**호환 도구:** Claude, Cursor, Cody 등

**참고:**
- [토스 기술블로그: MCP 서버 구현기](https://toss.tech/article/tosspayments-mcp)
- [토스페이먼츠 개발자센터: LLM 가이드](https://docs.tosspayments.com/guides/v2/get-started/llms-guide)
- [토스페이먼츠 블로그](https://www.tosspayments.com/blog/articles/mcp)

---

### 2. Context7 - 라이브러리 문서 검색

[Context7](https://github.com/upstash/context7)은 최신 라이브러리 문서를 LLM 컨텍스트에 직접 주입하는 MCP 서버입니다.

**기능:**
- 최신 버전의 라이브러리 문서 검색
- 공식 소스에서 코드 예제 가져오기
- 프롬프트에 "use context7" 추가만으로 동작

**설치:**

```bash
# Claude Code에 추가 (npx 방식)
claude mcp add context7 -- npx -y @upstash/context7-mcp

# 또는 HTTP 방식
claude mcp add --transport http context7 https://mcp.context7.com/mcp
```

**수동 설정** (`~/.claude/settings.json` 또는 `.claude/settings.local.json`):

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

**사용법:**

```
User: React 19의 useActionState 사용법 알려줘. use context7
Claude: [Context7 MCP로 최신 React 19 문서 검색]
```

특정 라이브러리 지정:
```
User: use library /supabase/supabase for API docs
```

**제공 도구:**
- `resolve-library-id`: 라이브러리 이름을 Context7 호환 ID로 변환
- `get-library-docs`: 라이브러리 문서 검색 (tokens 파라미터로 크기 조절)

**요구사항:** Node.js >= 18.0.0

**참고:** [Context7 공식 문서](https://github.com/upstash/context7) | [Upstash Blog](https://upstash.com/blog/context7-mcp)

---

### 3. Playwright - 브라우저 자동화

[Playwright MCP](https://github.com/microsoft/playwright-mcp)는 Microsoft에서 관리하는 공식 브라우저 자동화 MCP 서버입니다.

**기능:**
- 브라우저 창 제어 (Chrome, Firefox, WebKit)
- 웹 페이지 접근성 트리 기반 상호작용
- 스크린샷 없이 구조화된 데이터로 동작
- 세션 동안 쿠키 유지 (수동 로그인 가능)

**설치:**

```bash
# Claude Code에 추가
claude mcp add playwright -- npx -y @playwright/mcp@latest
```

**수동 설정:**

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "timeout": 60000
    }
  }
}
```

**사용법:**

```
User: playwright mcp로 https://example.com 열어서 내용 확인해줘
Claude: [Playwright MCP로 브라우저 열기]
```

**실용적인 사용 사례:**
- 웹 애플리케이션 E2E 테스트
- 웹 페이지 스크래핑
- 로그인이 필요한 사이트 자동화 (수동 로그인 후 자동화)
- UI 검증 및 디버깅

**브라우저 설치:**
첫 사용 시 자동으로 브라우저 바이너리가 설치됩니다.

**참고:** [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp) | [Simon Willison's TIL](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code)

---

### 4. Python - 코드 실행

Python 코드를 실행하고 Python 환경을 관리하는 MCP 서버입니다.

**옵션 A: mcp-server-fetch + Python 실행**

```bash
# Python 실행 서버 설치 (uvx 사용)
pip install mcp-server-python
```

**설정:**

```json
{
  "mcpServers": {
    "python": {
      "command": "uvx",
      "args": ["mcp-server-python"]
    }
  }
}
```

**옵션 B: 직접 Python 스크립트 실행**

```json
{
  "mcpServers": {
    "python-exec": {
      "command": "python",
      "args": ["-m", "mcp_server_python"],
      "env": {
        "PYTHON_EXEC_TIMEOUT": "30"
      }
    }
  }
}
```

**기능:**
- Python 코드 스니펫 실행
- Python 파일 실행
- 파일 관리 (읽기, 쓰기, 목록)
- Python 환경 정보 확인
- 타임아웃 및 작업 디렉토리 설정

**참고:** [Python MCP SDK](https://github.com/modelcontextprotocol/python-sdk) | [Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)

---

### 5. Filesystem - 파일 시스템 접근

로컬 파일 시스템에 접근하는 MCP 서버입니다.

**설치:**

```bash
claude mcp add filesystem -- npx -y @anthropic-ai/mcp-server-filesystem /path/to/allowed/dir
```

**설정:**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-server-filesystem",
        "/path/to/your/projects",
        "/path/to/your/data"
      ]
    }
  }
}
```

---

### 6. GitHub - GitHub API 접근

GitHub 리포지토리, 이슈, PR 관리를 위한 MCP 서버입니다.

**설정:**

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

---

### 7. Stitch MCP - Google Stitch UI 디자인

[Google Stitch](https://stitch.withgoogle.com/)와 연동하여 AI 기반 UI/UX 디자인을 생성하는 MCP 서버입니다.

**기능:**
- AI 기반 UI 화면 생성
- 프로젝트 및 스크린 관리
- 프론트엔드 코드 및 디자인 시스템 추출
- 2024-2025 UI 트렌드 적용 (glassmorphism, bento-grid, gradient-mesh 등)

**설치 (자동 설정):**

```bash
# 자동 설치 - Claude Code, Gemini CLI, Codex CLI에 자동 설정
npx -p stitch-mcp-auto stitch-mcp-auto-setup
```

**수동 설정:**

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "stitch-mcp"]
    }
  }
}
```

또는 David East 버전:

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "@_davideast/stitch-mcp"]
    }
  }
}
```

**사용법:**

```
User: /stitch:design 홈 화면 디자인해줘
User: /stitch:design-system 현재 프로젝트의 디자인 시스템 추출해줘
User: /stitch:design-flow 로그인 → 대시보드 플로우 생성해줘
```

**제공 명령:**
- `/stitch:design` - UI 화면 디자인 생성
- `/stitch:design-system` - 디자인 시스템 추출
- `/stitch:design-flow` - 화면 플로우 생성
- `/stitch:design-qa` - 디자인 QA
- `/stitch:design-export` - 코드 내보내기

**참고:** [stitch-mcp GitHub](https://github.com/Kargatharaakash/stitch-mcp) | [davideast/stitch-mcp](https://github.com/davideast/stitch-mcp) | [Google Stitch Docs](https://stitch.withgoogle.com/docs/mcp/setup)

---

## 🎨 프레젠테이션 & 문서 (무료, 로컬 실행)

> API 키 불필요, 로컬에서 실행되는 오픈소스 MCP 서버들

### 8. Office-PowerPoint-MCP - PPT 자동화 (⭐ 추천)

[Office-PowerPoint-MCP](https://github.com/GongRzhe/Office-PowerPoint-MCP-Server)는 python-pptx 기반의 가장 기능이 풍부한 PowerPoint MCP 서버입니다.

**특징:**
- ✅ **무료** / 로컬 실행 / API 키 불필요
- 32개 도구, 11개 모듈
- 25개 전문 슬라이드 템플릿
- 라운드트립 지원 (기존 .pptx 수정)

**설치:**

```bash
pip install office-powerpoint-mcp-server
```

**설정:**

```json
{
  "mcpServers": {
    "powerpoint": {
      "command": "python",
      "args": ["-m", "office_powerpoint_mcp_server"]
    }
  }
}
```

**제공 도구 (32개):**
- 프레젠테이션: 생성, 열기, 저장, 닫기
- 슬라이드: 추가, 삭제, 복제, 레이아웃 변경
- 콘텐츠: 텍스트, 이미지, 표, 차트 삽입
- 스타일: 테마 적용, 마스터 슬라이드 편집

**사용법:**

```
User: 분기별 실적 보고서 PPT 만들어줘
User: 기존 템플릿.pptx 열어서 데이터만 업데이트해줘
User: 차트와 표가 포함된 프레젠테이션 생성해줘
```

**참고:** [GitHub](https://github.com/GongRzhe/Office-PowerPoint-MCP-Server) | [PyPI](https://pypi.org/project/office-powerpoint-mcp-server/)

---

### 9. PPT-MCP (Node.js) - 크로스 플랫폼

[PPT-MCP](https://github.com/guangxiangdebizi/PPT-MCP)는 순수 JavaScript/TypeScript로 구현된 PowerPoint MCP 서버입니다.

**특징:**
- ✅ **무료** / 로컬 실행 / API 키 불필요
- Python 불필요 (Node.js만 필요)
- Windows, macOS, Linux 모두 지원
- PptxGenJS 기반

**설치:**

```bash
npm install -g ppt-mcp
```

**설정:**

```json
{
  "mcpServers": {
    "ppt": {
      "command": "npx",
      "args": ["-y", "ppt-mcp"]
    }
  }
}
```

**참고:** [GitHub](https://github.com/guangxiangdebizi/PPT-MCP)

---

### 10. pptx-xlsx-mcp - PPT + Excel 통합

[pptx-xlsx-mcp](https://github.com/jenstangen1/pptx-xlsx-mcp)는 PowerPoint와 Excel을 동시에 다루는 MCP 서버입니다.

**특징:**
- ✅ **무료** / 로컬 실행 / API 키 불필요
- PPT + Excel 통합 관리
- pywin32 COM 자동화 (실행 중인 Office 앱 제어)
- 실시간 편집 가능

**설치:**

```bash
git clone https://github.com/jenstangen1/pptx-xlsx-mcp
cd pptx-xlsx-mcp
pip install -r requirements.txt
```

**설정:**

```json
{
  "mcpServers": {
    "office": {
      "command": "python",
      "args": ["server.py"]
    }
  }
}
```

**참고:** [GitHub](https://github.com/jenstangen1/pptx-xlsx-mcp) | [MCP Servers](https://mcpservers.org/servers/jenstangen1/pptx-xlsx-mcp)

---

### 11. mcp-pandoc - 문서 변환 (⭐ 추천)

[mcp-pandoc](https://github.com/vivekVells/mcp-pandoc)는 Pandoc 기반의 문서 포맷 변환 MCP 서버입니다. **공식 MCP 프로젝트에 포함**되어 있습니다.

**특징:**
- ✅ **무료** / 로컬 실행 / API 키 불필요
- 공식 MCP 서버 목록에 포함
- Markdown → PDF, DOCX, HTML, EPUB 등
- 커스텀 템플릿 지원

**설치:**

```bash
# Pandoc 설치 필요
# Windows: choco install pandoc
# Mac: brew install pandoc
# Linux: apt install pandoc

pip install mcp-pandoc
```

**설정:**

```json
{
  "mcpServers": {
    "pandoc": {
      "command": "python",
      "args": ["-m", "mcp_pandoc"]
    }
  }
}
```

**지원 포맷:**
- 입력: Markdown, HTML, DOCX, LaTeX, RST, EPUB
- 출력: PDF, DOCX, HTML, PPTX, EPUB, LaTeX

**사용법:**

```
User: 이 마크다운 파일을 PDF로 변환해줘
User: README.md를 DOCX로 만들어줘
User: 문서를 회사 템플릿 스타일로 변환해줘
```

**참고:** [GitHub](https://github.com/vivekVells/mcp-pandoc) | [Free MCP Servers](https://free-mcp-servers.app/server/mcp-pandoc)

---

### 12. markdownify-mcp - 모든 것을 마크다운으로

[markdownify-mcp](https://github.com/zcaceres/markdownify-mcp)는 다양한 파일과 웹 콘텐츠를 마크다운으로 변환하는 MCP 서버입니다.

**특징:**
- ✅ **무료** / 로컬 실행 / API 키 불필요
- PDF, 이미지, 오디오 → 마크다운
- 웹 페이지 스크래핑 → 마크다운
- OCR 지원

**설치:**

```bash
pip install markdownify-mcp
```

**설정:**

```json
{
  "mcpServers": {
    "markdownify": {
      "command": "python",
      "args": ["-m", "markdownify_mcp"]
    }
  }
}
```

**참고:** [GitHub](https://github.com/zcaceres/markdownify-mcp)

---

## 🎬 비디오 & 애니메이션 (무료, 로컬 실행)

### 13. manim-mcp-server - 수학/교육 애니메이션

[manim-mcp-server](https://github.com/abhiemj/manim-mcp-server)는 3Blue1Brown 스타일의 수학 애니메이션을 생성하는 MCP 서버입니다.

**특징:**
- ✅ **무료** / 로컬 실행 / API 키 불필요
- Manim 커뮤니티 에디션 기반
- 수학, 과학, 교육용 애니메이션
- 고품질 MP4 출력

**설치:**

```bash
# Manim 설치
pip install manim

# MCP 서버
git clone https://github.com/abhiemj/manim-mcp-server
cd manim-mcp-server
pip install -r requirements.txt
```

**설정:**

```json
{
  "mcpServers": {
    "manim": {
      "command": "python",
      "args": ["server.py"]
    }
  }
}
```

**사용법:**

```
User: 피타고라스 정리 애니메이션 만들어줘
User: 정렬 알고리즘 시각화 영상 생성해줘
User: 미적분 개념 설명 애니메이션 만들어줘
```

**참고:** [GitHub](https://github.com/abhiemj/manim-mcp-server) | [Manim Docs](https://docs.manim.community/)

---

### 14. blender-mcp - 3D 모델링 & 애니메이션

[blender-mcp](https://github.com/ahujasid/blender-mcp)는 Blender를 제어하여 3D 모델링과 애니메이션을 생성하는 MCP 서버입니다.

**특징:**
- ✅ **무료** / 로컬 실행 / API 키 불필요
- Blender 전체 기능 활용
- 3D 모델, 애니메이션, 렌더링
- Python 스크립팅 지원

**설치:**

```bash
# Blender 설치 필요 (https://www.blender.org/)
git clone https://github.com/ahujasid/blender-mcp
cd blender-mcp
pip install -r requirements.txt
```

**설정:**

```json
{
  "mcpServers": {
    "blender": {
      "command": "python",
      "args": ["server.py"],
      "env": {
        "BLENDER_PATH": "/path/to/blender"
      }
    }
  }
}
```

**참고:** [GitHub](https://github.com/ahujasid/blender-mcp)

---

### 15. video-editing-mcp - 비디오 편집

[video-editing-mcp](https://github.com/burningion/video-editing-mcp)는 비디오 편집, 분석, 검색 기능을 제공하는 MCP 서버입니다.

**특징:**
- ✅ **무료** / 로컬 실행 / API 키 불필요
- 비디오 편집 및 분석
- 장면 검색 및 추출
- Video Jungle 컬렉션 관리

**설치:**

```bash
git clone https://github.com/burningion/video-editing-mcp
cd video-editing-mcp
pip install -r requirements.txt
```

**참고:** [GitHub](https://github.com/burningion/video-editing-mcp)

---

## 📌 참고: 상업용 서비스 (API 키 필요)

더 많은 기능이 필요한 경우 다음 상업용 서비스를 고려하세요:

| 서비스 | 설명 | 링크 |
|--------|------|------|
| Canva MCP | 디자인 & 프레젠테이션 | [공식 문서](https://www.canva.com/help/mcp-agent-setup/) |
| SlideSpeak | AI PPT 생성 | [공식 사이트](https://slidespeak.co) |
| Pictory | 비디오 생성 | [공식 사이트](https://pictory.ai) |
| Creatify | 아바타 비디오, 립싱크 | [GitHub](https://github.com/TSavo/creatify-mcp) |

---

## 📦 포함된 커스텀 MCP 서버

### orchestrator (skills/orchestrator/mcp-server/)

PM-Worker 패턴의 멀티AI 오케스트레이션 MCP 서버입니다.

> **참고:** MCP 서버 소스는 `skills/orchestrator/mcp-server/`에 통합되어 있습니다.
> 설치는 `install.sh`가 자동으로 처리합니다.

---


## ⚡ 빠른 설정 (권장 조합)

모든 권장 MCP 서버를 한 번에 설정하려면 다음을 `.claude/settings.local.json`에 추가:

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
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-server-filesystem",
        "/path/to/your/projects"
      ]
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

### CLI로 빠르게 추가하기

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

# ========== 무료 로컬 실행 (아래는 pip 설치 후 수동 설정) ==========

# PowerPoint - PPT 자동화 (python-pptx 기반, 32개 도구)
pip install office-powerpoint-mcp-server

# Pandoc - 문서 변환 (MD → PDF, DOCX, HTML)
pip install mcp-pandoc
```

---

## 🔧 MCP 서버 개발 가이드

### 새 MCP 서버 만들기

1. **프로젝트 초기화:**
```bash
mkdir my-mcp-server
cd my-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node
```

2. **TypeScript 설정** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

3. **MCP 서버 코드** (`src/index.ts`):
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'my-mcp-server',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});

// 도구 등록
server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'my_tool',
    description: 'My custom tool',
    inputSchema: {
      type: 'object',
      properties: {
        param: { type: 'string' }
      }
    }
  }]
}));

server.setRequestHandler('tools/call', async (request) => {
  return { content: [{ type: 'text', text: 'Result' }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

4. **빌드 및 Claude Code에 추가:**
```bash
npm run build
```

---

## 🐛 트러블슈팅

### MCP 서버가 시작되지 않음

```bash
# 로그 확인
claude --verbose

# MCP 서버 직접 실행하여 에러 확인
npx -y @upstash/context7-mcp
```

### 도구가 Claude에게 표시되지 않음

1. Claude Code 재시작
2. MCP 서버 설정 확인 (`settings.json`)
3. `/mcp` 명령으로 MCP 상태 확인

### npx 실행 오류

```bash
# npm 캐시 정리
npm cache clean --force

# Node.js 버전 확인 (>= 18 필요)
node --version
```

### 타임아웃 오류

설정에 `timeout` 값 추가:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["..."],
      "timeout": 60000
    }
  }
}
```

---

## 📚 참고 자료

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/anthropics/mcp)
- [Claude Code MCP Integration](https://code.claude.com/docs/en/mcp)
- [Context7 MCP](https://github.com/upstash/context7)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [Python MCP SDK](https://github.com/modelcontextprotocol/python-sdk)

---

**버전:** 2.2.0
**최종 업데이트:** 2026-01-26
