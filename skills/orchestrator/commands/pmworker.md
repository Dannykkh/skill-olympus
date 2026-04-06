---
description: Worker 모드로 오케스트레이터 참여. 태스크를 가져와 작업을 수행합니다.
allowed-tools:
  - orchestrator_get_available_tasks
  - orchestrator_claim_task
  - orchestrator_lock_file
  - orchestrator_unlock_file
  - orchestrator_complete_task
  - orchestrator_fail_task
  - orchestrator_heartbeat
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
   - 응답에 `aiProvider`, `predecessorResults` 포함

2. **태스크 선택 기준**
   - `aiProvider`가 지정되어 있으면 해당 AI에 적합한 태스크 우선
   - `priority`가 높은 태스크 우선 (3 > 2 > 1)
   - `predecessorResults`가 있으면 선행 태스크 결과를 반드시 읽고 시작

3. **선행 태스크 결과 활용**
   `predecessorResults`에 선행 태스크의 완료 결과가 포함됨:
   ```json
   {
     "predecessorResults": [
       { "taskId": "section-01-foundation", "result": "src/core/에 Base 클래스 생성 완료. UserBase, OrderBase 인터페이스 export." }
     ]
   }
   ```
   - 선행 태스크가 생성한 파일/인터페이스를 파악하고 연동
   - 선행 결과와 모순되는 구현 금지

4. **태스크 담당**
   ```
   orchestrator_claim_task { "taskId": "task-1" }
   ```
   - 태스크 담당 선언
   - 다른 Worker와 충돌 방지

5. **파일 락**
   ```
   orchestrator_lock_file { "path": "src/service/UserService.java" }
   ```
   - scope에 명시된 파일/디렉토리 락 획득
   - 상위/하위 경로도 충돌로 처리됨

6. **코드 구현**
   - 태스크의 prompt에 따라 코드 작성
   - **scope 내의 파일만 수정** (scope 외 파일 수정 시 락 충돌 위험)
   - prompt에 명시된 성공 기준 확인

7. **검증 루프** (Implement → Test → Fix, 최대 3회)

   코드 구현 후 반드시 테스트로 검증합니다. 통과할 때까지 자동 수정을 반복합니다.

   ```
   max_retries = 3
   retry = 0

   WHILE retry < max_retries:
     a. 테스트 파일 확인/작성
        - 기존 테스트가 있으면 그대로 사용
        - 없으면 구현한 코드에 대한 단위 테스트 작성
     b. 테스트 실행 (Bash)
        - 프레임워크 자동 감지:
          package.json → npm test 또는 npx jest/vitest
          pytest.ini/pyproject.toml → pytest
          pom.xml → mvn test
          *.csproj → dotnet test
        - scope 내 테스트만 실행 (전체 테스트 X)
     c. 결과 판정
        - 전체 통과 → Step 8 (완료 보고)로 이동
        - 실패 → Step 7d로
     d. 실패 분석 + 코드 수정
        - 에러 메시지/스택 트레이스 분석
        - 원인 분류: 구현 버그 | 테스트 오류 | 환경 문제
        - 구현 버그 → 구현 코드 수정
        - 테스트 오류 → 테스트 코드 수정
        - 환경 문제 → 수정 불가, Step 9로 이동
        - retry++
        - → Step 7b로 (재실행)

   3회 실패 시 → Step 9 (실패 보고)로 이동
   ```

   **검증 루프 원칙:**
   - 테스트 실행 없이 complete_task 금지 (테스트 프레임워크가 없는 경우만 예외)
   - scope 밖 테스트가 깨져도 무시 (내 책임 범위만)
   - 환경 문제(DB 미연결, 포트 충돌 등)는 수정 시도하지 않고 즉시 실패 보고

8. **완료 보고**
   ```
   orchestrator_complete_task { "taskId": "task-1", "result": "구현 내용 요약" }
   ```
   - **result를 반드시 작성** — 후속 태스크가 이 결과를 참조함
   - 포함 항목: 생성 파일, export 인터페이스, 주요 결정, **테스트 결과 요약**
   - 태스크 완료 및 락 자동 해제

   **result 형식 권장:**
   ```
   구현: src/services/UserService.ts 생성 (CRUD 4개 메서드)
   테스트: tests/UserService.test.ts — 8개 중 8개 통과
   export: UserService, CreateUserDto, UpdateUserDto
   결정: bcrypt 대신 argon2 선택 (보안 강도)
   ```

9. **실패 보고** (검증 루프 3회 실패 또는 환경 문제 시)
   ```
   orchestrator_fail_task { "taskId": "task-1", "error": "구체적 에러 원인" }
   ```
   - 실패 원인, 시도한 수정 내역, 마지막 에러 로그 포함
   - PM이 이 정보를 보고 재배정 또는 계획 수정 판단

## 중요 규칙

1. **반드시 claim 먼저**: 작업 전 반드시 claim_task 호출
2. **lock 먼저**: 파일 수정 전 반드시 lock_file 호출
3. **scope 준수**: 태스크 scope 외의 파일 수정 금지
4. **테스트 필수**: 코드 구현 후 반드시 테스트 실행 (테스트 프레임워크 없는 경우만 예외)
5. **검증 후 보고**: 테스트 통과 확인 후에만 complete_task 호출
6. **result 필수**: complete_task 시 생성 파일, 인터페이스, 주요 결정, 테스트 결과 기록
7. **선행 결과 확인**: predecessorResults가 있으면 반드시 읽고 연동
8. **3회 룰**: 검증 루프 최대 3회. 3회 실패 시 fail_task로 PM에게 보고

## 작업 루프

```
while (태스크가_있는_동안) {
    1. get_available_tasks()
    2. claim_task(첫번째_태스크)
    3. lock_file(수정할_파일들)
    4. 코드 구현
    5. 검증 루프 (test → fix → retest, max 3회)
       - 통과 → complete_task(result + 테스트 결과)
       - 3회 실패 → fail_task(에러 + 수정 이력)
}
```

## 다른 Worker와 협업

- 파일 락 충돌 시: 잠시 대기 후 다른 태스크 선택
- 의존성 대기: 선행 태스크 완료까지 다른 태스크 처리
