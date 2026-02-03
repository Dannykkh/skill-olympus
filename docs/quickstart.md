# 빠른 시작 가이드

Claude Code 커스터마이징의 핵심 기능을 5분 안에 시작하는 가이드입니다.

---

## 1. 설치

### Windows

```powershell
# 저장소 클론
git clone https://github.com/Dannykkh/claude-code-agent-customizations.git
cd claude-code-agent-customizations

# 설치 스크립트 실행
.\install.bat
```

### Linux/Mac

```bash
git clone https://github.com/Dannykkh/claude-code-agent-customizations.git
cd claude-code-agent-customizations
chmod +x install.sh && ./install.sh
```

---

## 2. 핵심 기능 요약

| 기능 | 트리거 | 설명 |
|------|--------|------|
| **Multi-AI 오케스트레이터** | `workpm`, `pmworker` | Claude + Codex + Gemini 병렬 처리 |
| **장기기억** | `/memory` | 세션 간 컨텍스트 유지 |
| **키워드 검색** | `/memory find` | 이전 대화 RAG 검색 |
| **코드 리뷰** | `/review` | 자동 코드 리뷰 |
| **세션 핸드오프** | `/handoff` | 세션 인수인계 문서 |

---

## 3. 오케스트레이터 빠른 시작

### 단일 터미널 (일반 사용)

```
> workpm
인증 시스템 구현해줘

→ AI 감지, 프로젝트 분석, 태스크 생성
→ 순차 실행
```

### 다중 터미널 (병렬 처리)

**터미널 1 (PM):**
```
> workpm
인증 시스템 구현해줘. 3개 태스크로 분리해서 병렬 처리해줘.
```

**터미널 2 (Worker):**
```
> pmworker
```

**터미널 3 (Worker):**
```
> pmworker
```

### Multi-AI 자동 실행

```powershell
.\mcp-servers\claude-orchestrator-mcp\scripts\launch.ps1 -ProjectPath "C:\your\project" -MultiAI
```

---

## 4. 메모리 시스템 빠른 시작

### 정보 기억하기

```
/memory add Redis TTL은 1시간으로 설정
기억해: API 엔드포인트는 /api/v1 프리픽스 사용
```

### 이전 대화 검색

```
/memory find 인증
이전에 OAuth 구현한 적 있어?
```

### 수동 키워드 태깅

```
/memory tag oauth, jwt, 로그인
```

---

## 5. 주요 스킬

| 스킬 | 트리거 | 용도 |
|------|--------|------|
| **code-reviewer** | `/review` | 코드 품질, 보안 검토 |
| **docker-deploy** | `/docker-deploy` | Docker 배포 환경 생성 |
| **humanizer** | `/humanizer` | AI 글쓰기 패턴 제거 |
| **session-handoff** | `/handoff` | 세션 인수인계 |
| **mermaid-diagrams** | `/diagram` | 다이어그램 생성 |

---

## 6. 설정 파일

### .claude/settings.local.json

```json
{
  "mcpServers": {
    "orchestrator": {
      "command": "node",
      "args": ["path/to/claude-orchestrator-mcp/dist/index.js"],
      "env": {
        "ORCHESTRATOR_PROJECT_ROOT": "${workspaceFolder}",
        "ORCHESTRATOR_WORKER_ID": "pm"
      }
    }
  },
  "hooks": {
    "UserPromptSubmit": [
      {"hooks": ["powershell -File hooks/orchestrator-mode.ps1 \"$PROMPT\""]},
      {"hooks": ["powershell -File hooks/save-conversation.ps1 \"$PROMPT\""]}
    ]
  }
}
```

---

## 7. 디렉토리 구조

```
프로젝트/
├── CLAUDE.md              # 프로젝트 지침 (@MEMORY.md 참조)
├── MEMORY.md              # 장기기억 (항상 로드됨)
├── .claude/
│   ├── settings.local.json  # MCP + 훅 설정
│   ├── conversations/       # 대화 로그 + 키워드 인덱스
│   └── handoffs/           # 세션 핸드오프 문서
└── .orchestrator/          # 오케스트레이터 상태 (멀티 터미널 시)
    └── state.json
```

---

## 8. 자주 쓰는 명령어

### 오케스트레이터

| 명령어 | 설명 |
|--------|------|
| `workpm` | PM 모드 시작 |
| `pmworker` | Worker 모드 시작 |

### 메모리

| 명령어 | 설명 |
|--------|------|
| `/memory add <내용>` | 정보 기억 |
| `/memory find <키워드>` | 대화 검색 |
| `/memory search <키워드>` | MEMORY.md 검색 |
| `/memory tag <키워드들>` | 수동 태깅 |
| `/memory list` | 전체 기억 보기 |

### 개발

| 명령어 | 설명 |
|--------|------|
| `/review` | 코드 리뷰 |
| `/docker-deploy` | Docker 설정 생성 |
| `/diagram` | 다이어그램 생성 |
| `/handoff` | 세션 핸드오프 |

---

## 9. 다음 단계

- **상세 가이드**: [오케스트레이터 가이드](orchestrator-guide.md)
- **메모리 시스템**: [메모리 시스템 가이드](memory-system.md)
- **전체 스킬 목록**: [README.md](../README.md)
- **설정 상세**: [SETUP.md](../SETUP.md)

---

## 10. 트러블슈팅

### MCP 서버 연결 안됨

```powershell
# MCP 서버 빌드 확인
cd mcp-servers/claude-orchestrator-mcp
npm install && npm run build
```

### 훅이 작동 안함

```
# 훅 스크립트 권한 확인 (Linux/Mac)
chmod +x hooks/*.sh

# PowerShell 실행 정책 확인 (Windows)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 키워드 검색 안됨

```
# index.json 수동 생성
keyword-extractor 에이전트로 .claude/conversations/ 분석해서 index.json 생성해줘
```

---

**최종 업데이트:** 2026-02-02
