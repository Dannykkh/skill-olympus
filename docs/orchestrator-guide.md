# Multi-AI Orchestrator 상세 가이드

PM + Multi-AI Worker 병렬 처리 시스템의 완전한 사용 가이드입니다.

---

## 목차

1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [설치 및 설정](#설치-및-설정)
4. [PM 모드 (workpm)](#pm-모드-workpm)
5. [Worker 모드 (pmworker)](#worker-모드-pmworker)
6. [Multi-AI 설정](#multi-ai-설정)
7. [실전 예시](#실전-예시)
8. [MCP 도구 레퍼런스](#mcp-도구-레퍼런스)
9. [트러블슈팅](#트러블슈팅)

---

## 개요

### 무엇인가?

Multi-AI Orchestrator는 여러 AI CLI (Claude, Codex, Gemini)를 동시에 활용하여 대규모 작업을 병렬로 처리하는 시스템입니다.

### 언제 사용하나?

| 상황 | 권장 |
|------|------|
| 단일 파일 수정 | 일반 Claude Code |
| 다중 모듈 동시 작업 | **Orchestrator** |
| 대규모 리팩토링 | **Orchestrator** |
| 여러 관점의 코드 리뷰 | **Orchestrator** (Multi-AI) |

### 핵심 기능

- **파일 락킹**: 다중 Worker 간 파일 충돌 방지
- **태스크 의존성**: 선행 작업 완료 후 자동 언블록
- **Multi-AI**: Claude + Codex + Gemini 병렬 실행
- **자동 Fallback**: 설치된 AI만 자동 감지

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                         PM (Claude)                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ workpm 입력                                          │    │
│  │   ↓                                                  │    │
│  │ 1. orchestrator_detect_providers() - AI 감지         │    │
│  │ 2. orchestrator_analyze_codebase() - 프로젝트 분석   │    │
│  │ 3. orchestrator_create_task() - 태스크 생성          │    │
│  │ 4. orchestrator_get_progress() - 진행 모니터링       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Worker-1      │ │   Worker-2      │ │   Worker-3      │
│   (Claude)      │ │   (Codex)       │ │   (Gemini)      │
│                 │ │                 │ │                 │
│ pmworker 입력   │ │ pmworker 입력   │ │ pmworker 입력   │
│   ↓             │ │   ↓             │ │   ↓             │
│ claim_task      │ │ claim_task      │ │ claim_task      │
│ lock_file       │ │ lock_file       │ │ lock_file       │
│ [작업 수행]     │ │ [작업 수행]     │ │ [작업 수행]     │
│ complete_task   │ │ complete_task   │ │ complete_task   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 상태 파일

```
프로젝트/
└── .orchestrator/
    └── state.json    # 태스크, 락, 워커 상태
```

---

## 설치 및 설정

### 1. MCP 서버 빌드

```powershell
cd mcp-servers/claude-orchestrator-mcp
npm install
npm run build
```

### 2. 프로젝트에 MCP 설정

`.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "orchestrator": {
      "command": "node",
      "args": ["D:/git/claude-code-agent-customizations/mcp-servers/claude-orchestrator-mcp/dist/index.js"],
      "env": {
        "ORCHESTRATOR_PROJECT_ROOT": "${workspaceFolder}",
        "ORCHESTRATOR_WORKER_ID": "pm"
      }
    }
  },
  "hooks": {
    "UserPromptSubmit": [
      {
        "description": "오케스트레이터 PM/Worker 모드 감지",
        "hooks": ["powershell -ExecutionPolicy Bypass -File hooks/orchestrator-mode.ps1 \"$PROMPT\""]
      }
    ]
  }
}
```

### 3. 다중 터미널 실행 (권장)

```powershell
# launch.ps1 사용
.\mcp-servers\claude-orchestrator-mcp\scripts\launch.ps1 -ProjectPath "C:\your\project" -MultiAI
```

이 명령은:
- PM용 터미널 1개
- Worker용 터미널 3개 (기본)
- 각 터미널에 MCP 설정 자동 생성
- Git Worktree로 격리 (선택)

---

## PM 모드 (workpm)

### 시작

PM 터미널에서:

```
workpm
```

### PM이 하는 일

1. **AI Provider 감지**
2. **프로젝트 분석**
3. **태스크 분해 및 생성**
4. **진행 상황 모니터링**

### 상세 워크플로우

#### Step 1: AI 감지

```
[ORCHESTRATOR PM MODE ACTIVE]

orchestrator_detect_providers() 실행 결과:
{
  "mode": "full",
  "modeDescription": "Full Mode: Claude + Codex + Gemini (3개 AI 병렬 처리)",
  "providers": [
    {"name": "claude", "available": true, "version": "1.0.0"},
    {"name": "codex", "available": true, "version": "2.1.0"},
    {"name": "gemini", "available": true, "version": "3.0.0"}
  ]
}
```

#### Step 2: 프로젝트 분석

```
orchestrator_analyze_codebase() 실행:

분석 결과:
- 총 파일: 342개
- 탐지된 모듈: User, Auth, Product, Order
- 디렉토리 구조: src/controllers/, src/services/, src/models/

제안: 각 모듈별로 독립적인 태스크를 생성하는 것을 권장합니다.
```

#### Step 3: 태스크 생성

```
orchestrator_create_task({
  id: "auth-api",
  prompt: "JWT 인증 API 구현. POST /auth/login, POST /auth/refresh 엔드포인트. bcrypt로 비밀번호 해싱.",
  scope: ["src/auth/", "src/middleware/"],
  priority: 3,
  ai_provider: "codex"
})

orchestrator_create_task({
  id: "auth-test",
  prompt: "인증 API 단위 테스트 작성. Jest 사용. 성공/실패 케이스 포함.",
  scope: ["tests/auth/"],
  priority: 2,
  depends_on: ["auth-api"],
  ai_provider: "codex"
})

orchestrator_create_task({
  id: "security-review",
  prompt: "인증 모듈 보안 취약점 분석. OWASP Top 10 기준 검토.",
  depends_on: ["auth-api"],
  ai_provider: "gemini"
})
```

#### Step 4: 진행 모니터링

```
orchestrator_get_progress() 실행:

{
  "total": 3,
  "completed": 1,
  "inProgress": 1,
  "pending": 1,
  "percentComplete": 33,
  "blockedTasks": ["auth-test"],
  "activeTasks": [
    {"id": "auth-api", "owner": "worker-1", "startedAt": "..."}
  ]
}
```

### 태스크 설계 원칙

| 원칙 | 설명 | 예시 |
|------|------|------|
| **단일 책임** | 하나의 태스크 = 하나의 목표 | "로그인 API 구현" (O), "로그인+회원가입+비밀번호 변경" (X) |
| **명확한 범위** | scope로 수정 가능 파일 명시 | `scope: ["src/auth/"]` |
| **적절한 크기** | 1-2시간 내 완료 가능 | 너무 크면 분할 |
| **의존성 명시** | depends_on으로 순서 지정 | 테스트는 구현 후 |

### AI 배정 가이드

| 태스크 유형 | 추천 AI | 이유 |
|------------|---------|------|
| 코드 생성/구현 | `codex` | 빠른 코드 생성 |
| 테스트 작성 | `codex` | 반복적 패턴 |
| 리팩토링 | `claude` | 복잡한 추론 |
| 아키텍처 설계 | `claude` | 맥락 이해 |
| 코드 리뷰 | `gemini` | 대용량 컨텍스트 (1M 토큰) |
| 보안 분석 | `gemini` | 전체 코드 스캔 |
| 문서 작성 | `claude` | 자연어 품질 |

---

## Worker 모드 (pmworker)

### 시작

Worker 터미널에서:

```
pmworker
```

### Worker가 하는 일

1. **가용 태스크 확인**
2. **태스크 담당 선언**
3. **세부 TODO 작성** (내부 계획)
4. **파일 락 획득**
5. **작업 수행**
6. **완료/실패 보고**

### 상세 워크플로우

#### Step 1: 가용 태스크 확인

```
[ORCHESTRATOR WORKER MODE ACTIVE]

orchestrator_get_available_tasks() 실행:

{
  "workerId": "worker-1",
  "availableTasks": [
    {
      "id": "auth-api",
      "prompt": "JWT 인증 API 구현...",
      "priority": 3,
      "scope": ["src/auth/", "src/middleware/"]
    }
  ],
  "message": "1 task(s) available"
}
```

#### Step 2: 태스크 담당

```
orchestrator_claim_task({task_id: "auth-api"})

결과: Task 'auth-api' claimed by worker-1
```

#### Step 3: 세부 TODO 작성

**중요**: Worker는 큰 태스크를 받으면 Claude Code 내장 TaskCreate로 세부 계획을 세웁니다.

```
TaskCreate({
  subject: "JWT 시크릿 환경변수 설정",
  description: ".env에 JWT_SECRET, JWT_EXPIRES_IN 추가"
})

TaskCreate({
  subject: "generateToken 함수 구현",
  description: "src/auth/jwt.ts - 액세스 토큰 생성"
})

TaskCreate({
  subject: "verifyToken 함수 구현",
  description: "src/auth/jwt.ts - 토큰 검증 및 디코딩"
})

TaskCreate({
  subject: "로그인 엔드포인트 구현",
  description: "POST /auth/login - 이메일/비밀번호 검증 후 토큰 반환"
})

TaskCreate({
  subject: "토큰 갱신 엔드포인트 구현",
  description: "POST /auth/refresh - 리프레시 토큰으로 새 액세스 토큰"
})
```

#### Step 4: 파일 락 획득

```
orchestrator_lock_file({
  path: "src/auth/",
  reason: "JWT 인증 모듈 구현"
})

결과: Path 'src/auth/' locked successfully
```

**락 규칙:**
- 다른 Worker가 같은 경로를 락하면 충돌
- 상위/하위 경로도 충돌로 처리
- 태스크 완료 시 자동 해제

#### Step 5: 작업 수행

각 세부 TODO를 하나씩 완료:

```
[세부 TODO 진행]
├── [✓] JWT 시크릿 환경변수 설정
├── [✓] generateToken 함수 구현
├── [→] verifyToken 함수 구현  ← 현재 작업 중
├── [ ] 로그인 엔드포인트 구현
└── [ ] 토큰 갱신 엔드포인트 구현
```

#### Step 6: 완료 보고

```
orchestrator_complete_task({
  task_id: "auth-api",
  result: "JWT 인증 모듈 구현 완료. generateToken, verifyToken 함수 추가. POST /auth/login, POST /auth/refresh 엔드포인트 구현."
})

결과:
- Task 'auth-api' completed
- 파일 락 자동 해제
- 의존성 해소된 태스크: auth-test (이제 수행 가능)
```

#### Step 7: 다음 태스크

```
orchestrator_get_available_tasks()

→ auth-test가 이제 available!
```

### 실패 처리

```
orchestrator_fail_task({
  task_id: "auth-api",
  error: "bcrypt 모듈 버전 충돌. Node 18+ 필요."
})

결과:
- Task 'auth-api' marked as failed
- 파일 락 자동 해제
- PM에게 실패 알림
```

---

## Multi-AI 설정

### 자동 감지 모드

```powershell
.\launch.ps1 -ProjectPath "C:\project" -MultiAI
```

시스템이 자동으로:
1. 설치된 AI CLI 감지 (claude, codex, gemini --version)
2. 모드 결정 (Full/Dual/Single)
3. Worker에 AI 라운드 로빈 배정

### 수동 배정 모드

```powershell
.\launch.ps1 -ProjectPath "C:\project" -AIProviders @('claude', 'codex', 'gemini')
```

- Worker-1: Claude
- Worker-2: Codex
- Worker-3: Gemini

### AI별 CLI 옵션

| AI | 자동 모드 명령어 |
|----|-----------------|
| Claude | `claude --dangerously-skip-permissions` |
| Codex | `codex --full-auto --approval-mode full-auto` |
| Gemini | `gemini --approval-mode yolo` |

### Fallback 동작

| 상황 | 동작 |
|------|------|
| Codex 미설치 | Claude로 fallback |
| Gemini 미설치 | Claude로 fallback |
| 지정한 AI 미설치 | 사용 가능한 AI로 자동 전환 |

---

## 실전 예시

### 예시 1: 인증 시스템 구현

**PM 터미널:**
```
workpm

사용자 인증 시스템을 구현해줘.
- JWT 기반 인증
- 로그인, 회원가입, 비밀번호 변경
- 테스트 코드 포함
- 보안 리뷰 필요
```

**PM 응답:**
```
AI 감지: Full Mode (Claude + Codex + Gemini)

태스크 분해:
1. user-model (Codex, priority: 3)
   - User 모델 및 스키마 정의
   - scope: src/models/

2. auth-api (Codex, priority: 3, depends_on: user-model)
   - JWT 인증 API 구현
   - scope: src/auth/, src/middleware/

3. auth-test (Codex, priority: 2, depends_on: auth-api)
   - 인증 API 테스트
   - scope: tests/auth/

4. security-review (Gemini, priority: 1, depends_on: auth-api)
   - 보안 취약점 분석
   - scope: 전체

Worker들에게 전달 준비 완료!
```

**Worker-1 (Codex) 터미널:**
```
pmworker

→ user-model 태스크 담당
→ 세부 TODO 작성
→ 작업 수행
→ 완료 보고

→ auth-api 태스크 담당 (의존성 해소됨)
→ ...
```

**Worker-2 (Gemini) 터미널:**
```
pmworker

→ 가용 태스크 없음 (의존성 대기)
→ (auth-api 완료 후)
→ security-review 태스크 담당
→ 전체 코드베이스 보안 분석
→ 완료 보고
```

### 예시 2: 대규모 리팩토링

**PM 터미널:**
```
workpm

레거시 코드를 현대적인 구조로 리팩토링해줘.
- src/legacy/ → src/modules/ 마이그레이션
- 클래스 기반 → 함수형 컴포넌트
- 테스트 추가
```

---

## MCP 도구 레퍼런스

### Multi-AI 관리

| 도구 | 설명 | 파라미터 |
|------|------|----------|
| `orchestrator_detect_providers` | 설치된 AI CLI 감지 | - |
| `orchestrator_get_provider_info` | AI 강점 조회 | `provider`: claude/codex/gemini |

### PM 전용

| 도구 | 설명 | 파라미터 |
|------|------|----------|
| `orchestrator_analyze_codebase` | 프로젝트 분석 | `path?`, `pattern?` |
| `orchestrator_create_task` | 태스크 생성 | `id`, `prompt`, `depends_on?`, `scope?`, `priority?`, `ai_provider?` |
| `orchestrator_get_progress` | 진행 상황 | - |

### Worker 전용

| 도구 | 설명 | 파라미터 |
|------|------|----------|
| `orchestrator_get_available_tasks` | 가용 태스크 | - |
| `orchestrator_claim_task` | 태스크 담당 | `task_id` |
| `orchestrator_lock_file` | 파일 락 | `path`, `reason?` |
| `orchestrator_unlock_file` | 락 해제 | `path` |
| `orchestrator_complete_task` | 완료 보고 | `task_id`, `result?` |
| `orchestrator_fail_task` | 실패 보고 | `task_id`, `error` |

### 공통

| 도구 | 설명 | 파라미터 |
|------|------|----------|
| `orchestrator_get_status` | 전체 상태 | - |
| `orchestrator_get_task` | 태스크 상세 | `task_id` |
| `orchestrator_get_file_locks` | 락 목록 | - |
| `orchestrator_delete_task` | 태스크 삭제 | `task_id` |
| `orchestrator_reset` | 상태 초기화 | - |
| `orchestrator_heartbeat` | 하트비트 | - |

---

## 트러블슈팅

### 문제: "Task has unmet dependencies"

**원인**: 선행 태스크가 아직 완료되지 않음

**해결**:
```
orchestrator_get_progress()
→ blockedTasks 확인
→ 선행 태스크 완료 대기 또는 다른 태스크 수행
```

### 문제: "Path is locked by another worker"

**원인**: 다른 Worker가 해당 경로를 사용 중

**해결**:
```
orchestrator_get_file_locks()
→ 누가 락했는지 확인
→ 해당 Worker 작업 완료 대기 또는 다른 태스크 수행
```

### 문제: AI Provider가 감지되지 않음

**원인**: CLI가 PATH에 없거나 설치 안됨

**해결**:
```bash
# 각 CLI 설치 확인
claude --version
codex --version
gemini --version

# PATH 확인
where claude
```

### 문제: Worker가 태스크를 찾지 못함

**원인**: 모든 태스크가 의존성 대기 또는 다른 Worker가 이미 담당

**해결**:
```
orchestrator_get_available_tasks()
→ 빈 배열이면 대기
→ PM에게 새 태스크 요청
```

### 문제: state.json 손상

**해결**:
```
orchestrator_reset()
→ 모든 상태 초기화 (태스크, 락, 워커)
→ PM이 태스크 다시 생성
```

---

## 참고

- [MCP 서버 소스](../mcp-servers/claude-orchestrator-mcp/)
- [PM 스킬](../skills/orchestrator-pm/SKILL.md)
- [Worker 스킬](../skills/orchestrator-worker/SKILL.md)
- [launch.ps1 스크립트](../mcp-servers/claude-orchestrator-mcp/scripts/launch.ps1)
