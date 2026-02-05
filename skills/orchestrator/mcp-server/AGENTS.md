# Claude Orchestrator - Agent Guidelines

이 파일은 PM과 Worker 에이전트가 따라야 할 워크플로우 가이드라인입니다.

---

## PM (Project Manager) 역할

### 책임
- 전체 프로젝트 분석 및 태스크 분해
- 태스크 우선순위 및 의존성 설정
- Multi-AI 배정 (태스크 특성에 맞는 AI 선택)
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
     prompt: "JWT 인증 API 구현. POST /auth/login, POST /auth/refresh 엔드포인트 구현.",
     scope: ["src/auth/"],
     priority: 2,
     ai_provider: "codex"  // 코드 생성에 적합
   })

   orchestrator_create_task({
     id: "auth-test",
     prompt: "인증 API 테스트 작성",
     depends_on: ["auth-api"],
     scope: ["tests/auth/"],
     ai_provider: "codex"
   })

   orchestrator_create_task({
     id: "security-review",
     prompt: "인증 모듈 보안 취약점 분석",
     depends_on: ["auth-api"],
     ai_provider: "gemini"  // 대용량 분석에 적합
   })

5. 진행 모니터링
   → orchestrator_get_progress()
   → 블로킹된 태스크, 실패한 태스크 확인
```

### AI 배정 가이드

| 태스크 유형 | 추천 AI | 이유 |
|------------|---------|------|
| 코드 생성/구현 | Codex | 빠른 코드 생성 |
| 테스트 작성 | Codex | 반복적 패턴 |
| 리팩토링 | Claude | 복잡한 추론 |
| 아키텍처 설계 | Claude | 맥락 이해 |
| 코드 리뷰 | Gemini | 대용량 컨텍스트 |
| 보안 분석 | Gemini | 전체 코드 스캔 |
| 문서 작성 | Claude | 자연어 품질 |

---

## Worker 역할

### 책임
- 할당된 태스크 실행
- 파일 충돌 방지 (락 획득)
- 작업 완료/실패 보고

### 워크플로우 (중요!)

```
1. 태스크 확인 및 담당
   → orchestrator_get_available_tasks()
   → orchestrator_claim_task({task_id: "auth-api"})

2. ⭐ 세부 계획 수립 (Claude Code 내장 도구 사용)
   → TaskCreate로 하위 TODO 생성

   예시:
   TaskCreate({
     subject: "JWT 토큰 생성 함수 구현",
     description: "src/auth/jwt.ts에 generateToken, verifyToken 함수 구현"
   })
   TaskCreate({
     subject: "로그인 엔드포인트 구현",
     description: "POST /auth/login - 이메일/비밀번호 검증 후 토큰 반환"
   })
   TaskCreate({
     subject: "토큰 갱신 엔드포인트 구현",
     description: "POST /auth/refresh - 리프레시 토큰으로 새 액세스 토큰 발급"
   })

3. 파일 락 획득
   → orchestrator_lock_file({path: "src/auth/"})
   → 다른 Worker와 충돌 방지

4. 작업 수행
   → TaskUpdate로 진행 상태 업데이트
   → 각 하위 TODO 완료 시 completed 처리

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
Claude Code 내장 TaskCreate/TaskUpdate(작은 단위)로 세부 작업을 관리합니다.

```
Orchestrator Task (PM이 생성)
└── "auth-api": JWT 인증 API 구현
    │
    └── Claude Code Tasks (Worker가 생성)
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
- task-1: "User 모듈 CRUD API" (Codex, priority: 2)
- task-2: "Auth JWT 구현" (Codex, priority: 3)
- task-3: "전체 코드 보안 리뷰" (Gemini, depends_on: [task-1, task-2])
- task-4: "API 문서 작성" (Claude, depends_on: [task-1, task-2])
```

### Worker-1 (Codex) 화면
```
> 할당된 태스크를 확인하고 작업 시작해줘

[Worker-1] orchestrator_get_available_tasks()
→ task-2: "Auth JWT 구현" (priority: 3) 선택

[Worker-1] orchestrator_claim_task({task_id: "task-2"})
→ 담당 완료

[Worker-1] TaskCreate로 세부 계획 수립:
- [ ] JWT 시크릿 설정
- [ ] generateToken 함수
- [ ] verifyToken 함수
- [ ] 로그인 엔드포인트
- [ ] 토큰 갱신 엔드포인트

[Worker-1] orchestrator_lock_file({path: "src/auth/"})
→ 락 획득

[Worker-1] 작업 수행...
→ 각 TODO 완료 시 TaskUpdate로 상태 변경

[Worker-1] orchestrator_complete_task({task_id: "task-2"})
→ 완료! task-3, task-4 언블록됨
```
