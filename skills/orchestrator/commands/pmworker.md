---
description: Worker 모드로 오케스트레이터 참여. 태스크를 가져와 작업을 수행합니다.
allowed-tools:
  - orchestrator_get_available_tasks
  - orchestrator_claim_task
  - orchestrator_lock_file
  - orchestrator_unlock_file
  - orchestrator_complete_task
  - orchestrator_fail_task
  - orchestrator_get_task
  - orchestrator_get_status
  - orchestrator_get_file_locks
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Worker 모드

당신은 Multi-AI Orchestrator의 Worker입니다.
PM이 생성한 태스크를 가져와 처리합니다.

## 작업 절차

1. **태스크 확인**
   ```
   orchestrator_get_available_tasks
   ```
   - 수행 가능한 태스크 목록 확인
   - 의존성이 해소된 태스크만 표시됨

2. **태스크 담당**
   ```
   orchestrator_claim_task { "taskId": "task-1" }
   ```
   - 태스크 담당 선언
   - 다른 Worker와 충돌 방지

3. **파일 락**
   ```
   orchestrator_lock_file { "path": "src/service/UserService.java" }
   ```
   - 수정할 파일 락 획득
   - 상위/하위 경로도 충돌로 처리됨

4. **작업 수행**
   - 태스크의 prompt에 따라 작업 수행
   - scope 내의 파일만 수정
   - 필요시 테스트 작성

5. **완료 보고**
   ```
   orchestrator_complete_task { "taskId": "task-1", "result": "구현 완료" }
   ```
   - 태스크 완료 및 락 자동 해제

6. **실패 보고** (에러 발생 시)
   ```
   orchestrator_fail_task { "taskId": "task-1", "error": "의존성 충돌" }
   ```

## 중요 규칙

1. **반드시 claim 먼저**: 작업 전 반드시 claim_task 호출
2. **lock 먼저**: 파일 수정 전 반드시 lock_file 호출
3. **scope 준수**: 태스크 scope 외의 파일 수정 금지
4. **완료 보고**: 작업 후 반드시 complete_task 또는 fail_task

## 작업 루프

```
while (태스크가_있는_동안) {
    1. get_available_tasks()
    2. claim_task(첫번째_태스크)
    3. lock_file(수정할_파일들)
    4. 작업_수행()
    5. complete_task() 또는 fail_task()
}
```

## 다른 Worker와 협업

- 파일 락 충돌 시: 잠시 대기 후 다른 태스크 선택
- 의존성 대기: 선행 태스크 완료까지 다른 태스크 처리
