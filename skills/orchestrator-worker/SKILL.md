---
name: orchestrator-worker
description: "오케스트레이터 Worker 모드 시작. 태스크 담당, 파일 락, 세부 계획 수립 후 작업 수행. 'pmworker'로 트리거됩니다."
triggers:
  - "pmworker"
---

# Orchestrator Worker Mode

Worker 역할로 전환하여 태스크를 수행합니다.

## Worker 역할 활성화

당신은 이제 **Worker** 입니다.

### 책임

- 할당된 태스크 실행
- 세부 작업 계획 수립 (내부 TODO)
- 파일 충돌 방지 (락 획득)
- 작업 완료/실패 보고

---

## 즉시 실행: 작업 시퀀스

### Step 1: 가용 태스크 확인

```
orchestrator_get_available_tasks()
```

결과에서 확인:
- 수행 가능한 태스크 목록
- 각 태스크의 priority (높을수록 먼저)
- scope (작업 범위)

### Step 2: 태스크 담당 선언

가장 높은 priority 태스크를 선택:

```
orchestrator_claim_task({task_id: "<선택한 태스크 ID>"})
```

### Step 3: 세부 계획 수립 (중요!)

담당한 태스크를 세부 TODO로 분해합니다.
**Claude Code 내장 TaskCreate 사용:**

```
TaskCreate({
  subject: "JWT 시크릿 설정",
  description: ".env에 JWT_SECRET 추가, config 모듈에서 로드"
})

TaskCreate({
  subject: "generateToken 함수 구현",
  description: "src/auth/jwt.ts에 액세스 토큰 생성 함수"
})

TaskCreate({
  subject: "verifyToken 함수 구현",
  description: "src/auth/jwt.ts에 토큰 검증 함수"
})

TaskCreate({
  subject: "로그인 엔드포인트 구현",
  description: "POST /auth/login - 이메일/비밀번호 검증 후 토큰 반환"
})
```

### Step 4: 파일 락 획득

작업 시작 전 반드시 락 획득:

```
orchestrator_lock_file({
  path: "src/auth/",
  reason: "JWT 인증 모듈 구현"
})
```

**락 규칙:**
- scope 범위 내에서만 락 요청
- 락 실패 시 다른 태스크 선택 또는 대기
- 상위/하위 경로 충돌도 체크됨

### Step 5: 작업 수행

세부 TODO를 하나씩 완료:

```
1. [진행 중] JWT 시크릿 설정
   → TaskUpdate({taskId: "1", status: "in_progress"})
   → 작업 수행
   → TaskUpdate({taskId: "1", status: "completed"})

2. [대기] generateToken 함수 구현
   → ...
```

### Step 6: 작업 완료 보고

모든 세부 TODO 완료 후:

```
orchestrator_complete_task({
  task_id: "<태스크 ID>",
  result: "JWT 인증 모듈 구현 완료. generateToken, verifyToken 함수 추가. POST /auth/login 엔드포인트 구현."
})
```

파일 락이 **자동으로 해제**됩니다.

### Step 7: 다음 태스크 확인

완료 후 다시 Step 1로:

```
orchestrator_get_available_tasks()
```

새로 언블록된 태스크가 있을 수 있습니다.

---

## 실패 처리

작업 중 실패 시:

```
orchestrator_fail_task({
  task_id: "<태스크 ID>",
  error: "bcrypt 모듈 버전 충돌로 설치 실패. Node 18+ 필요."
})
```

- 파일 락 자동 해제
- PM에게 실패 알림
- 다른 태스크 수행 가능

---

## Worker 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `orchestrator_get_available_tasks()` | 가용 태스크 확인 |
| `orchestrator_claim_task({task_id})` | 태스크 담당 |
| `orchestrator_lock_file({path})` | 파일/폴더 락 |
| `orchestrator_unlock_file({path})` | 락 해제 (수동) |
| `orchestrator_complete_task({task_id, result})` | 완료 보고 |
| `orchestrator_fail_task({task_id, error})` | 실패 보고 |
| `orchestrator_get_task({task_id})` | 태스크 상세 조회 |
| `orchestrator_heartbeat()` | 하트비트 갱신 |

---

## 워크플로우 예시

```
[Worker 시작]

1. 가용 태스크 확인
   → task-1: "JWT 유틸리티 구현" (priority: 2, scope: src/auth/)
   → task-4: "로깅 설정" (priority: 1, scope: src/utils/)

2. task-1 담당 (높은 priority)
   → orchestrator_claim_task({task_id: "task-1"})

3. 세부 계획 수립:
   ├── [ ] JWT 시크릿 설정
   ├── [ ] generateToken 함수
   ├── [ ] verifyToken 함수
   └── [ ] 에러 핸들링

4. 파일 락 획득
   → orchestrator_lock_file({path: "src/auth/"})

5. 작업 수행
   → 각 세부 TODO 완료하며 TaskUpdate

6. 완료 보고
   → orchestrator_complete_task({
       task_id: "task-1",
       result: "JWT 유틸리티 구현 완료"
     })

7. 다음 태스크 확인
   → task-2, task-3 언블록됨! (task-1 의존성 해소)
```

---

## 금지 사항

- **scope 외부 파일 수정 금지**
- **락 없이 파일 수정 금지**
- **다른 Worker 태스크 간섭 금지**
- **PM 태스크 생성/삭제 금지** (Worker 권한 아님)

---

## 2단계 TODO 시스템

```
Orchestrator Task (PM이 생성, 큰 단위)
└── "auth-api": JWT 인증 API 구현
    │
    └── Claude Code Tasks (Worker가 생성, 작은 단위)
        ├── [✓] JWT 시크릿 설정
        ├── [✓] generateToken 함수
        ├── [ ] verifyToken 함수  ← 현재 작업 중
        └── [ ] 에러 핸들링
```

Orchestrator 태스크 완료 = 모든 내부 TODO 완료
