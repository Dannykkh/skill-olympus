# 장기기억 시스템

세션 간 컨텍스트를 유지하는 가벼운 메모리 시스템입니다.
RAG/벡터DB 없이 키워드 기반 파일 검색으로 동작합니다.

---

## 인지 모델

사람의 기억 회상 과정과 동일한 구조입니다.

```
단편기억 (tags)             →  장기기억 (conversations)
"orchestrator, hooks"      →  "2월 4일에 install-orchestrator.js 만들고
                               Stop 훅으로 응답 저장 구현했고..."
```

| 단계 | 사람 | 이 시스템 |
|------|------|----------|
| 단서 (cue) | "그거 뭐였더라..." | 사용자가 키워드 언급 |
| 연상 (association) | 관련 기억 떠오름 | `#tags`, MEMORY.md 인덱스에서 매칭 |
| 회상 (recall) | 상세 내용 기억남 | 대화 파일 읽어서 맥락 복원 |
| 답변 | "아, 그때 이랬지!" | "2월 4일에 이렇게 했습니다" |

**MEMORY.md = 의미기억** (사실/규칙: "Stop 훅에서 AI 호출 금지")
**conversations/ = 일화기억** (에피소드: "2월 4일에 JSONL 구조 파악하며 삽질함")
**#tags = 시냅스** (둘을 연결하는 인덱스)

---

## 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **빠르게** | 훅에서 AI 호출 금지 (기계적 처리만) |
| **단순하게** | 파일 기반, DB/RAG/MCP 불필요 |
| **검색 가능하게** | 키워드 + 컨텍스트 트리 |

---

## 구조

```
프로젝트/
├── MEMORY.md                        # 의미기억: 핵심 결정/패턴 (항상 로드)
├── CLAUDE.md                        # @MEMORY.md 참조 + 메모리 규칙
├── hooks/
│   ├── save-conversation.ps1/.sh    # User 입력 자동 저장
│   └── save-response.ps1/.sh        # Assistant 응답 자동 저장 (Stop 훅)
└── .claude/
    ├── commands/
    │   └── wrap-up.md               # 세션 종료 시 정리 명령
    └── conversations/               # 일화기억: 대화 로그
        ├── 2026-02-03.md
        └── 2026-02-04.md
```

---

## 동작 방식

### 저장 (자동)

```
사용자 입력
    ↓
[UserPromptSubmit 훅] save-conversation.ps1
    → 대화 파일에 "## [HH:mm] User" append (AI 호출 없음)
    ↓
Claude 응답 (끝에 #tags 포함)
    ↓
[Stop 훅] save-response.ps1
    → transcript JSONL에서 마지막 assistant text 추출
    → 500자 제한으로 대화 파일에 append (AI 호출 없음)
```

### 태깅 (자연스럽게)

Claude가 의미있는 응답 끝에 키워드를 포함합니다:

```markdown
orchestrator 설치 스크립트를 만들었습니다.

`#tags: orchestrator, install-script, mcp, hooks`
```

Stop 훅이 응답 텍스트를 저장하므로 키워드도 자동으로 캡처됩니다.
별도 키워드 추출 훅이나 AI 호출이 필요 없습니다.

### 검색 (동의어 확장)

사용자가 과거 작업을 언급하면 Claude가 자동으로 검색합니다.
정확한 키워드 매칭뿐 아니라 **동의어/관련어를 확장**하여 여러 번 검색합니다.

```
사용자: "이전에 병렬 작업 어떻게 했더라?"
         ↓
Claude: ① MEMORY.md 키워드 인덱스 확인 (이미 로드됨)
         ↓ "병렬" → parallel, orchestrator, pm-worker, concurrent
         ↓
        ② 키워드 확장 (한↔영 양방향)
         ↓ "병렬 작업" → parallel, orchestrator, pm-worker, 병렬, concurrent
         ↓
        ③ 확장된 키워드로 여러 번 grep (최대 3회 재시도)
         ↓ Grep "#tags:.*parallel" → 없음
         ↓ Grep "#tags:.*orchestrator" → 2026-02-04.md 매칭
         ↓
        ④ 해당 대화 섹션 읽기
         ↓
        ⑤ 관련 키워드 추가 발견 시 하위 탐색 1회
         ↓
        ⑥ "2월 4일에 PM-Worker 오케스트레이터를 만들었습니다."
```

**동의어 확장 예시:**

| 사용자 질문 | 확장되는 키워드 |
|------------|---------------|
| "병렬 작업" | parallel, orchestrator, pm-worker, concurrent, 병렬 |
| "속도 문제" | performance, speed, optimization, 최적화, 느림 |
| "기억 시스템" | memory, conversation, hooks, 장기기억, recall |
| "코드 설명" | explain, learning-harness, 비유, explanation |

### 정리 (/wrap-up)

세션 종료 시 `/wrap-up` 명령으로 정리합니다:

1. 키워드 추출 → 대화 파일 frontmatter 업데이트
2. 세션 요약 작성 (오늘 한 일, 주요 결정, 다음 할 일)
3. 중요 결정 → MEMORY.md 업데이트

---

## 2계층 메모리 구조

| 계층 | 파일 | 용도 | 로딩 |
|------|------|------|------|
| **의미기억** | MEMORY.md | 핵심 결정, 패턴, 규칙 (압축) | 항상 (`@MEMORY.md`) |
| **일화기억** | conversations/*.md | 상세 대화 원본 (에피소드) | 검색 시에만 |

MEMORY.md는 요약본, 대화 파일은 원본 근거.
필요한 깊이에 따라 계층을 선택합니다.

### MEMORY.md 컨텍스트 트리

```markdown
## 키워드 인덱스
| 키워드 | 섹션 |
|--------|------|
| auth, jwt | #architecture/authentication |

## architecture/     ← 설계 결정
## patterns/         ← 작업 패턴
## tools/            ← MCP, 외부 도구
## gotchas/          ← 주의사항, 함정
```

### 대화 파일 구조

```markdown
---
date: 2026-02-04
project: my-project
keywords: ["orchestrator", "hooks", "stop-hook"]
---

## [10:30] User
orchestrator 설치 스크립트 만들어줘

## [10:35] Assistant
install-orchestrator.js를 생성했습니다...
`#tags: orchestrator, install-script, mcp`
```

---

## 결정 변경 시 (Superseded 패턴)

결정이 바뀌면 삭제하지 않고 이력을 보존합니다:

```markdown
### 기존-결정 ❌ SUPERSEDED
`superseded-by: #새-결정`
- 기존 내용...

### 새-결정 ✅ CURRENT
`supersedes: #기존-결정`
- 새 내용
- **변경 이유**: ...
```

---

## 장점

1. **속도**: 모든 훅에서 AI 호출 제로. 기계적 처리만 (append, grep)
2. **컨텍스트 다이어트**: MEMORY.md만 항상 로드, 대화 파일은 필요 시에만
3. **파일 기반 단순성**: DB/RAG/MCP 불필요. `.md` 파일이라 사람이 직접 편집 가능
4. **Git 추적**: 버전 관리, 이력 추적, 롤백 가능
5. **이식성**: 다른 프로젝트에 복사만 하면 적용
6. **RAG 90% 효과**: 키워드 grep + 동의어 확장으로 시맨틱 검색에 가까운 효과, 복잡도는 10%

---

## 설치

### 자동 설치 (권장)

```bash
# Windows
install.bat

# Linux/Mac
./install.sh
```

글로벌 설치 스크립트가 **6단계**로 자동 처리합니다:

1. Skills 설치
2. Agents 설치
3. Commands 설치
4. Hooks 설치
5. `settings.json` 훅 등록
6. **`CLAUDE.md` 장기기억 규칙 등록** (응답 태그, 대화 검색)

> **Windows 참고:** Git Bash가 설치되어 있어도 항상 PowerShell(`.ps1`)을 사용합니다. Claude Code는 `/bin/bash`(WSL)를 호출하므로 Windows 경로와 호환되지 않기 때문입니다.

### 수동 설치

**1. 훅 복사:**
```bash
cp hooks/save-conversation.{ps1,sh} <프로젝트>/hooks/
cp hooks/save-response.{ps1,sh} <프로젝트>/hooks/
```

**2. 대화 폴더 생성:**
```bash
mkdir -p .claude/conversations
```

**3. CLAUDE.md에 추가:**
```markdown
@MEMORY.md

## 응답 키워드 규칙
의미있는 응답 끝에 `#tags: keyword1, keyword2` 포함

## 과거 대화 검색 규칙
사용자가 과거 작업 언급 시 conversations/ 검색
```

**4. settings.json 훅 등록:**
```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "matcher": ".*", "hooks": [{ "type": "command", "command": "powershell -ExecutionPolicy Bypass -File hooks/save-conversation.ps1" }] }
    ],
    "Stop": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "powershell -ExecutionPolicy Bypass -File hooks/save-response.ps1" }] }
    ]
  }
}
```

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `MEMORY.md` | 의미기억 (컨텍스트 트리) |
| `CLAUDE.md` | 메모리 규칙 정의 |
| `~/.claude/CLAUDE.md` | **글로벌** 메모리 규칙 (모든 프로젝트 적용) |
| `hooks/save-conversation.ps1/.sh` | User 입력 자동 저장 (BOM-free UTF-8) |
| `hooks/save-response.ps1/.sh` | Assistant 응답 자동 저장 (Stop 훅, BOM-free UTF-8) |
| `.claude/commands/wrap-up.md` | 세션 종료 정리 명령 |
| `.claude/conversations/` | 일화기억 (대화 로그) |
| `templates/global-claude-md-rules.md` | CLAUDE.md 규칙 템플릿 |
| `install-claude-md.js` | CLAUDE.md 규칙 머지 헬퍼 |

---

**최종 업데이트:** 2026-02-04
