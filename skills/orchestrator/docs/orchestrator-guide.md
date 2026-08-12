# Multi-AI Orchestrator 상세 가이드

PM + Multi-AI Worker 병렬 처리 시스템의 완전한 사용 가이드입니다.

---

## 목차

1. [개요](#개요)
2. [핵심 3원칙](#핵심-3원칙)
3. [아키텍처](#아키텍처)
4. [설치 및 설정](#설치-및-설정)
5. [PM 모드 (workpm)](#pm-모드-workpm)
6. [Worker 모드 (pmworker)](#worker-모드-pmworker)
7. [Multi-AI 설정](#multi-ai-설정)
8. [실전 예시](#실전-예시)
9. [MCP 도구 레퍼런스](#mcp-도구-레퍼런스)
10. [트러블슈팅](#트러블슈팅)

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
- **Fail-closed provider routing**: 설치된 provider만 선택하며 요청한 provider가 없으면 임의 대체하지 않음
- **2단계 워크플로우**: 리서치→제안→승인→구현 분리
- **Activity Log**: 결정/진행/에러 통합 타임라인

---

## 핵심 3원칙

### 1. 작업 외주화 — 리더는 코딩하지 않는다

리더의 기억 공간이 전체 작전을 기억하는 유일한 곳이다.
코드까지 짜면 기억이 순식간에 꽉 찬다.
**리더는 전략만. 코딩/리서치는 전부 팀원한테.**

### 2. 기억 외부화 — 기억력을 믿지 마라

대화가 길어지면 오래된 내용이 자동 압축된다.
**중요한 결정이 나올 때마다 activity log에 즉시 기록한다.**

Decision 로깅 포맷:
```
orchestrator_log_activity({
  type: "decision",
  message: "[제목] 결정내용 | 대안: X(거부-사유) | 확신도: 높음/중간/낮음",
  task_id: "관련-태스크",
  tags: ["keyword1", "keyword2"]
})
```

### 3. 계속 해고 — 팀원은 쓰고 버리고 새로 뽑는다

작업 끝난 팀원은 해고하고, 새로 뽑으면서 이전 결과 요약만 넘긴다.
**항상 머리가 깨끗한 팀원한테 시키면 속도와 정확도가 동시에 올라간다.**

### 리더 운영 규율

| 리더가 하는 것 | 리더가 안 하는 것 |
|---------------|-----------------|
| 보고 수신 및 분석 | ❌ 코드 작성, 파일 수정 |
| 사용자 소통 | ❌ 리서치, 코드베이스 탐색 |
| 의사결정 + 로깅 | ❌ 테스트 실행 |
| 팀원 배정/교체/해고 | (시킬 수 있으면 시킴) |

### 팀원 관리

- 같은 파일을 두 에이전트가 동시에 수정 금지
- idle 알림 와도 task 진행 중이면 개입 안 함
- 무관한 태스크면 해고→새 팀원 (200K 컨텍스트 포화 방지)
- 교체 시 같은 이름 재사용 불가
- subagent에게는 리서치/파일 읽기만 허용, 코드 구현 위임 금지

### 통신 규칙

- **Hub-and-Spoke** (기본): 보고/의사결정은 리더 경유
- **P2P** (예외): 같은 모듈 기술 조율만. 끝나면 리더에게 요약 보고
- 팀원끼리 의사결정 자체 해결 금지

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      PM (MCP client)                         │
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
    └── orchestrator.db    # SQLite WAL 기반 태스크, 락, 워커 상태
```

---

## 설치 및 설정

### 1. MCP 서버 빌드

```powershell
cd skills/orchestrator/mcp-server
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
      "args": ["D:/git/skill-olympus/skills/orchestrator/mcp-server/dist/index.js"],
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
        "command": "node hooks/orchestrator-detector.js"
      }
    ]
  }
}
```

### 3. 다중 터미널 실행 (권장)

```powershell
# launch.ps1 사용
.\skills\orchestrator\mcp-server\scripts\launch.ps1 -ProjectPath "C:\your\project" -MultiAI
```

이 명령은:
- PM용 터미널 1개
- Worker용 터미널 3개 (기본)
- 각 터미널에 MCP 설정 자동 생성
- Git Worktree로 격리 (선택)

---

## PM 모드

### CLI별 명령어 선택

| CLI | 명령어 | 모드 | 특징 |
|-----|--------|------|------|
| **Claude** | `workpm` | Agent Teams (네이티브) | 팀원과 실시간 대화, 해고/재고용 |
| **Codex** | `workpm` | 내장 `explorer`/`worker` 역할 | 현재 런타임의 위임·대기·중단 기능 사용 |
| **Gemini** | `workpm` | 서브에이전트 (네이티브, 미실측) | 인식 실패 시 `workpm-mcp` |
| **Grok** | `workpm` | 내장 `explore`/`general-purpose` 역할 | 현재 런타임의 서브에이전트 기능 사용 |
| (공통 폴백) | `workpm-mcp` | MCP 전용 | 태스크 기반, 자동 Worker 실행 |

- `workpm`: 각 CLI의 네이티브 멀티에이전트로 실행 (프리미티브 표는 `skills/workpm/SKILL.md`)
- `workpm-mcp`: orchestrator_* MCP 도구만 사용. 구버전 폴백 + 대규모/hard lock 경로

### PM이 하는 일 (v2)

1. **AI Provider 감지**
2. **플랜 파일 로드** (또는 사용자 요청 분석)
3. **Phase 1: 리서치 & 제안** — 팀원 4명 + 심부름꾼 ~30명
4. **사용자 승인 대기**
5. **Phase 2: 구현 & 검증** — 새 팀원 4명 + 심부름꾼 ~30명
6. **최종 보고**

### 2단계 워크플로우

```
Phase 1: 리서치 & 제안
  리더 → 팀원 4명 → 각 심부름꾼 3~8개 병렬 호출
  → ~30명 동시 리서치 → 보고서 → 3가지 제안서 → 사용자 승인

Phase 2: 구현 & 검증
  기존 팀원 해고 → 새 팀원 4명 (새 이름)
  → ~30명 동시 구현 → 팀원 검토 → 리더 최종 검토 → 보고
```

### 상세 워크플로우

#### Step 1: AI 감지

```
[ORCHESTRATOR PM MODE ACTIVE]

orchestrator_detect_providers() 실행 결과:
{
  "mode": "full",
  "modeDescription": "Full Mode: claude + codex + gemini (3 AI providers)",
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
  priority: 3
})

orchestrator_create_task({
  id: "auth-test",
  prompt: "인증 API의 로그인 성공, 잘못된 비밀번호, 만료 토큰, 갱신 실패 경로를 검증하는 Jest 단위 테스트를 작성하고 전체 테스트를 실행한다.",
  scope: ["tests/auth/"],
  priority: 2,
  depends_on: ["auth-api"]
})

orchestrator_create_task({
  id: "security-review",
  prompt: "인증 모듈의 입력 검증, 토큰 저장, 권한 검사, 오류 노출을 OWASP 기준으로 감사하고 file:line 근거와 수정 제안을 보고한다.",
  depends_on: ["auth-api"],
  scope: ["src/auth/**", "src/middleware/**"]
})
```

위 세 태스크는 `ai_provider`를 생략했으므로 provider-agnostic이며 등록된 어떤 Worker든 claim할 수 있습니다. 특정 CLI에서만 재현해야 하는 작업처럼 명시적 근거가 있을 때만 설치가 확인된 provider를 고정합니다.

```
orchestrator_create_task({
  id: "codex-cli-repro",
  prompt: "Codex CLI에서만 재현되는 MCP 호출 오류를 같은 CLI 환경에서 재현하고 최소 수정 후 회귀 테스트를 실행한다.",
  scope: ["src/mcp/**", "tests/mcp/**"],
  ai_provider: "codex"
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
| **적절한 크기** | 하나의 기능/모듈 단위 | 너무 크면 분할 |
| **의존성 명시** | depends_on으로 순서 지정 | 테스트는 구현 후 |
| **파일 영역 분리** | 두 팀원이 같은 파일 수정 금지 | 태스크 배분 시 담당 영역 명시 |

### Provider 배정 계약

Provider는 vendor별 고정 강점이 아니라 현재 모델·설정, 사용자 요구, 조직 정책, provider별 재현 필요성, 실제 평가 결과로 선택합니다.

| 상황 | `ai_provider` |
|------|---------------|
| 별도 근거 없음 | 생략 — provider-agnostic 태스크 |
| 사용자/조직이 특정 CLI를 요구 | 감지된 해당 provider 명시 |
| provider별 재현·호환성 검증 | 재현 대상 provider 명시 |
| 요청 provider가 미설치 | 태스크 생성을 실패로 보고하고 임의 대체하지 않음 |

Worker는 `ORCHESTRATOR_AI_PROVIDER` 또는 자동 생성된 provider-prefixed Worker ID로 provider가 등록됩니다. 가용 목록과 claim 모두 이 값을 검사하며, provider-agnostic 태스크만 모든 Worker에게 열립니다.

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

**중요**: Worker는 큰 태스크를 받으면 현재 CLI의 로컬 TODO/계획 관리 방식으로 세부 계획을 세웁니다.

```
TODO: JWT 시크릿 환경변수 설정
- .env에 JWT_SECRET, JWT_EXPIRES_IN 추가

TODO: generateToken 함수 구현
- src/auth/jwt.ts - 액세스 토큰 생성

TODO: verifyToken 함수 구현
- src/auth/jwt.ts - 토큰 검증 및 디코딩

TODO: 로그인 엔드포인트 구현
- POST /auth/login - 이메일/비밀번호 검증 후 토큰 반환

TODO: 토큰 갱신 엔드포인트 구현
- POST /auth/refresh - 리프레시 토큰으로 새 액세스 토큰
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

```
orchestrator_spawn_workers({count: 3})
```

시스템은 자동 생성이 지원되는 Claude/Codex/Gemini CLI를 감지합니다. `providers`를 생략하면 고정 순서 `claude → codex → gemini` 중 실제 설치된 첫 provider를 모든 빈 슬롯에 사용합니다. 하나도 감지되지 않으면 생성 요청은 실패합니다.

### 수동 배정 모드

```
orchestrator_spawn_workers({
  count: 3,
  providers: ["claude", "codex", "gemini"]
})
```

- Worker-1: Claude
- Worker-2: Codex
- Worker-3: Gemini

자동 Worker는 Claude의 auto permission mode, Codex의 workspace-write sandbox 안 자동 리뷰, Gemini의 sandbox 안 자동 승인을 사용합니다. approval/sandbox 전체 우회와 workspace trust 우회는 사용하지 않습니다. 더 엄격한 정책이 필요하면 조직이 승인한 permission mode로 Worker를 수동 실행합니다.

### Fail-closed 동작

| 상황 | 동작 |
|------|------|
| `providers` 생략, 하나 이상 감지 | 실제 설치된 첫 provider를 결정적으로 선택 |
| 지원 provider가 하나도 없음 | Worker 생성 실패 |
| 명시한 provider가 미설치 | Worker 생성 실패, 다른 provider로 바꾸지 않음 |
| 태스크의 `ai_provider`가 미설치 | 태스크 생성 실패, 다른 provider로 바꾸지 않음 |

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
1. user-model (provider-agnostic, priority: 3)
   - User 모델 및 스키마 정의
   - scope: src/models/

2. auth-api (provider-agnostic, priority: 3, depends_on: user-model)
   - JWT 인증 API 구현
   - scope: src/auth/, src/middleware/

3. auth-test (provider-agnostic, priority: 2, depends_on: auth-api)
   - 인증 API 테스트
   - scope: tests/auth/

4. security-review (provider-agnostic, priority: 1, depends_on: auth-api)
   - 보안 취약점 분석
   - scope: 전체

Worker들에게 전달 준비 완료!
```

**Worker-1 터미널:**
```
pmworker

→ user-model 태스크 담당
→ 세부 TODO 작성
→ 작업 수행
→ 완료 보고

→ auth-api 태스크 담당 (의존성 해소됨)
→ ...
```

**Worker-2 터미널:**
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
| `orchestrator_get_provider_info` | 설치 상태와 안전한 기본 실행 명령 조회 | `provider`: claude/codex/gemini |

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

**원인**: 모든 태스크가 의존성 대기, 다른 Worker가 이미 담당, 또는 태스크의 `ai_provider`와 현재 Worker provider가 불일치

**해결**:
```
orchestrator_get_available_tasks()
→ 빈 배열이면 대기
→ PM에게 새 태스크 요청
```

### 문제: orchestrator.db 상태를 초기화해야 함

**해결**:
```
orchestrator_reset()
→ 모든 상태 초기화 (태스크, 락, 워커)
→ PM이 태스크 다시 생성
```

---

## 참고

- [MCP 서버 소스](../mcp-server/)
- [PM 워크플로우](../commands/workpm.md)
- [Worker 워크플로우](../commands/pmworker.md)
- [launch.ps1 스크립트](../mcp-server/scripts/launch.ps1)
