# Orchestrator MCP - Agent Guidelines

이 파일은 PM과 Worker 에이전트가 따라야 할 워크플로우 가이드라인입니다.

---

## PM (Project Manager) 역할

### 책임
- 전체 프로젝트 분석 및 태스크 분해
- 태스크 우선순위 및 의존성 설정
- Provider routing 결정 (근거가 없으면 provider-agnostic 유지)
- 진행 상황 모니터링

### 워크플로우

```
1. AI Provider 감지
   → orchestrator_detect_providers()
   → 사용 가능한 AI 확인 (Claude/Codex/Gemini)

2. 프로젝트 분석
   → orchestrator_analyze_codebase()
   → 모듈, 파일 구조, 의존성 파악

3. 태스크 분해 (중요!)
   다음 원칙에 따라 태스크 분해:
   - 단일 책임: 하나의 태스크 = 하나의 목표
   - 명확한 범위: scope로 수정 가능한 파일 명시
   - 적절한 크기: 1-2시간 내 완료 가능한 단위
   - 의존성 명시: depends_on으로 순서 지정

4. 태스크 생성 예시
   orchestrator_create_task({
     id: "auth-api",
     prompt: "기존 인증 계층과 오류 응답 규칙을 따라 JWT 로그인 및 갱신 엔드포인트를 구현하고 단위 테스트와 타입 검사를 통과시킨다.",
     scope: ["src/auth/"],
     priority: 2
   })

   orchestrator_create_task({
     id: "auth-test",
     prompt: "선행 인증 API의 성공, 만료, 잘못된 서명, 권한 거부 경로를 검증하는 회귀 테스트를 추가하고 전체 테스트를 실행한다.",
     depends_on: ["auth-api"],
     scope: ["tests/auth/"]
   })

   orchestrator_create_task({
     id: "codex-cli-repro",
     prompt: "Codex CLI에서만 재현되는 MCP 호출 오류를 같은 CLI 환경에서 재현하고 최소 수정 후 회귀 테스트를 실행한다.",
     scope: ["src/mcp/**", "tests/mcp/**"],
     ai_provider: "codex"  // 특정 provider 재현이 필요한 경우에만 고정
   })

5. 진행 모니터링
   → orchestrator_get_progress()
   → 블로킹된 태스크, 실패한 태스크 확인

6. 활동 로그 리뷰
   → orchestrator_get_activity_log({task_id, worker_id, type, since, limit})
   → orchestrator_get_task_summary({task_id}) — 마일스톤/에러 요약
   → Worker의 의사결정 과정, 에러 이력 확인
```

### Provider 배정 가이드

| 상황 | 동작 |
|------|------|
| 별도 근거 없음 | `ai_provider` 생략 — 어떤 Worker든 claim 가능 |
| 사용자/조직이 특정 CLI 요구 | 설치가 감지된 해당 provider 명시 |
| provider별 재현·호환성 검증 | 재현 대상 provider 명시 |
| 요청 provider 미설치 | 생성 실패를 보고하고 다른 provider로 바꾸지 않음 |

Vendor별 강점을 고정 가정하지 않습니다. 현재 모델·설정, 프로젝트 평가, 사용자 요구를 근거로 결정합니다.

---

## Worker 역할

### 책임
- 할당된 태스크 실행
- 파일 충돌 방지 (락 획득)
- 작업 완료/실패 보고

### Provider 등록 및 claim 계약

- 자동 생성 Worker는 provider-prefixed ID에서 provider를 복원합니다. 수동 Worker는 `ORCHESTRATOR_AI_PROVIDER=claude|codex|gemini`를 명시합니다.
- `orchestrator_get_available_tasks()`는 현재 Worker provider와 일치하는 태스크 및 provider-agnostic 태스크만 반환합니다.
- `orchestrator_claim_task({task_id})`는 pending 상태, provider, 선행 의존성을 하나의 원자적 compare-and-set으로 검사합니다. 동시 claim 중 정확히 하나만 성공합니다.
- `ai_provider`가 없는 태스크는 어떤 Worker든 claim할 수 있지만, provider가 지정된 태스크는 같은 provider Worker만 claim할 수 있습니다.

### 워크플로우 (중요!)

```
1. 태스크 확인 및 담당
   → orchestrator_get_available_tasks()
   → 응답의 workerProvider와 태스크 aiProvider 확인
   → orchestrator_claim_task({task_id: "auth-api"})

2. 세부 계획 수립 (현재 CLI의 로컬 TODO/계획 관리 방식 사용)
   → 하위 TODO 생성

   예시:
   TODO: JWT 토큰 생성 함수 구현
   - src/auth/jwt.ts에 generateToken, verifyToken 함수 구현

   TODO: 로그인 엔드포인트 구현
   - POST /auth/login - 이메일/비밀번호 검증 후 토큰 반환

   TODO: 토큰 갱신 엔드포인트 구현
   - POST /auth/refresh - 리프레시 토큰으로 새 액세스 토큰 발급

3. 파일 락 획득
   → orchestrator_lock_file({path: "src/auth/"})
   → 다른 Worker와 충돌 방지

4. 작업 수행 + 활동 기록
   → 현재 CLI의 로컬 TODO/계획 관리 방식으로 진행 상태 업데이트
   → 각 하위 TODO 완료 시 completed 처리
   → orchestrator_log_activity로 주요 활동 기록:
     - type: 'progress' (진행), 'decision' (결정), 'error' (에러), 'file_change' (파일 변경)
     - task_id, tags 포함으로 나중에 검색 가능

5. 작업 완료
   → orchestrator_complete_task({
       task_id: "auth-api",
       result: "JWT 인증 API 구현 완료. generateToken, verifyToken, login, refresh 엔드포인트 추가."
     })
   → 파일 락 자동 해제

6. 실패 시
   → orchestrator_fail_task({
       task_id: "auth-api",
       error: "bcrypt 모듈 버전 충돌로 설치 실패"
     })
```

### Worker TODO 관리 패턴

Worker는 오케스트레이터 태스크(큰 단위)를 받으면,
현재 CLI의 로컬 TODO/계획 관리 방식으로 세부 작업을 관리합니다.

```
Orchestrator task (PM이 생성)
└── "auth-api": JWT 인증 API 구현
    │
    └── Worker local TODOs
        ├── [✓] JWT 토큰 생성 함수 구현
        ├── [✓] 로그인 엔드포인트 구현
        ├── [ ] 토큰 갱신 엔드포인트 구현  ← 현재 작업 중
        └── [ ] 에러 핸들링 추가
```

---

## 충돌 방지 규칙

### 파일 락 규칙
1. **작업 시작 전** 반드시 `orchestrator_lock_file` 호출
2. **scope 범위** 내에서만 작업
3. 다른 Worker의 락과 겹치면 **대기 또는 다른 태스크 선택**
4. 작업 완료/실패 시 락 **자동 해제**

### 금지 사항
- scope 외부 파일 수정
- 락 없이 파일 수정
- 다른 Worker 태스크에 간섭

---

## 예시: 전체 플로우

### PM 화면
```
> 프로젝트 구조를 분석하고 태스크를 생성해줘

[PM] orchestrator_detect_providers() 실행
→ Full Mode: Claude + Codex + Gemini 사용 가능

[PM] orchestrator_analyze_codebase() 실행
→ 모듈 탐지: User, Auth, Product, Order

[PM] 태스크 생성:
- task-1: "User 모듈 CRUD API" (provider-agnostic, priority: 2)
- task-2: "Auth JWT 구현" (provider-agnostic, priority: 3)
- task-3: "전체 코드 보안 리뷰" (provider-agnostic, depends_on: [task-1, task-2])
- task-4: "API 문서 작성" (provider-agnostic, depends_on: [task-1, task-2])
```

### Worker-1 화면
```
> 할당된 태스크를 확인하고 작업 시작해줘

[Worker-1] orchestrator_get_available_tasks()
→ task-2: "Auth JWT 구현" (priority: 3) 선택

[Worker-1] orchestrator_claim_task({task_id: "task-2"})
→ 담당 완료

[Worker-1] 로컬 TODO로 세부 계획 수립:
- [ ] JWT 시크릿 설정
- [ ] generateToken 함수
- [ ] verifyToken 함수
- [ ] 로그인 엔드포인트
- [ ] 토큰 갱신 엔드포인트

[Worker-1] orchestrator_lock_file({path: "src/auth/"})
→ 락 획득

[Worker-1] 작업 수행...
→ 각 TODO 완료 시 로컬 진행 상태 업데이트

[Worker-1] orchestrator_complete_task({task_id: "task-2"})
→ 완료! task-3, task-4 언블록됨
```
