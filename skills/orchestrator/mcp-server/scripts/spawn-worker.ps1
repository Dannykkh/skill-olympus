# spawn-worker.ps1
# Orchestrator Worker를 새 터미널에서 실행하는 스크립트
#
# 사용법:
#   .\spawn-worker.ps1 -WorkerId "worker-1" -ProjectRoot "C:\project" -AutoTerminate 1

param(
    [Parameter(Mandatory=$true)]
    [string]$WorkerId,

    [Parameter(Mandatory=$true)]
    [string]$ProjectRoot,

    [Parameter(Mandatory=$false)]
    [string]$AutoTerminate = "1"
)

# 환경 변수 설정
$env:ORCHESTRATOR_WORKER_ID = $WorkerId
$env:ORCHESTRATOR_PROJECT_ROOT = $ProjectRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Orchestrator Worker Starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Worker ID: $WorkerId" -ForegroundColor Yellow
Write-Host "Project: $ProjectRoot" -ForegroundColor Yellow
Write-Host "Auto-terminate: $($AutoTerminate -eq '1')" -ForegroundColor Yellow
Write-Host ""

# Worker 시스템 프롬프트
$systemPrompt = @"
당신은 Orchestrator Worker입니다. Worker ID: $WorkerId

## 자동 모드
1. orchestrator_get_available_tasks로 사용 가능한 태스크 확인
2. 태스크가 있으면 orchestrator_claim_task로 담당 선언
3. 태스크 수행 (코드 작성, 파일 수정 등)
4. orchestrator_complete_task 또는 orchestrator_fail_task로 완료 보고
5. 반복

## 자동 종료 조건
- allTasksCompleted가 true면 즉시 종료
- hasRemainingWork가 false이고 availableTasks가 비어있으면 대기 후 재확인

## 중요 규칙
- 파일 수정 전 반드시 orchestrator_lock_file 호출
- 작업 완료 시 모든 락은 자동 해제됨
- 에러 발생 시 orchestrator_fail_task로 보고

지금 바로 orchestrator_get_available_tasks를 호출하여 작업을 시작하세요.
"@

# Claude Code 실행 (Windows Terminal 또는 현재 터미널에서)
try {
    # Claude Code가 설치되어 있는지 확인
    $claudePath = Get-Command claude -ErrorAction SilentlyContinue

    if (-not $claudePath) {
        Write-Host "ERROR: claude command not found. Please install Claude Code first." -ForegroundColor Red
        exit 1
    }

    Write-Host "Starting Claude Code with Worker prompt..." -ForegroundColor Green
    Write-Host ""

    # 프로젝트 디렉토리로 이동
    Set-Location $ProjectRoot

    # Claude Code 실행
    # --system-prompt 또는 --prompt 옵션으로 Worker 모드 설정
    # 현재 Claude Code CLI 버전에 따라 적절한 옵션 사용

    # 방법 1: stdin으로 프롬프트 전달
    $systemPrompt | claude --dangerously-skip-permissions

} catch {
    Write-Host "ERROR: Failed to start Claude Code" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# 자동 종료가 비활성화된 경우 대기
if ($AutoTerminate -eq "0") {
    Write-Host ""
    Write-Host "Worker finished. Press any key to close..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
