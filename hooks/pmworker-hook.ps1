# pmworker-hook.ps1
# Worker 모드 시동어 훅 - pmworker 입력 시 Worker 모드 활성화
# 출력 내용은 Claude의 additional context로 주입됨

# stdin에서 프롬프트 확인 (matcher 백업)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
try {
    $json = [Console]::In.ReadToEnd() | ConvertFrom-Json
    $prompt = $json.prompt
} catch { exit 0 }
if ($prompt -notmatch '(?i)^\s*pmworker') { exit 0 }

Write-Host @"
[WORKER MODE ACTIVATED]

당신은 Multi-AI Orchestrator의 Worker입니다.
PM이 생성한 태스크를 가져와 처리합니다.

## 작업 루프

```
while (태스크가 있는 동안) {
    1. orchestrator_get_available_tasks
    2. orchestrator_claim_task(첫번째_태스크)
    3. orchestrator_lock_file(수정할_파일들)
    4. 작업_수행
    5. orchestrator_complete_task 또는 orchestrator_fail_task
}
```

## 중요 규칙

1. **반드시 claim 먼저**: 작업 전 반드시 claim_task 호출
2. **lock 먼저**: 파일 수정 전 반드시 lock_file 호출
3. **scope 준수**: 태스크 scope 외의 파일 수정 금지
4. **완료 보고**: 작업 후 반드시 complete_task 또는 fail_task

## 파일 락 충돌 시

- 다른 Worker가 락 보유 중이면 잠시 대기
- 다른 가용 태스크가 있으면 먼저 처리

---
지금 바로 orchestrator_get_available_tasks를 호출하여 시작하세요.
"@
