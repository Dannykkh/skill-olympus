# spawn-worker.ps1
# Orchestrator Worker를 새 터미널에서 실행하는 스크립트
# 멀티AI 지원: Claude, Codex, Gemini
#
# 사용법:
#   .\spawn-worker.ps1 -WorkerId "worker-1" -ProjectRoot "C:\project" -AutoTerminate 1 -AIProvider "claude"

param(
    [Parameter(Mandatory=$true)]
    [string]$WorkerId,

    [Parameter(Mandatory=$true)]
    [string]$ProjectRoot,

    [Parameter(Mandatory=$false)]
    [string]$AutoTerminate = "1",

    [Parameter(Mandatory=$false)]
    [ValidateSet("claude", "codex", "gemini")]
    [string]$AIProvider = "claude"
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
Write-Host "AI Provider: $AIProvider" -ForegroundColor Yellow
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

# 프로젝트 디렉토리로 이동
Set-Location $ProjectRoot

# AI Provider별 CLI 실행
try {
    switch ($AIProvider) {
        "claude" {
            $cliPath = Get-Command claude -ErrorAction SilentlyContinue
            if (-not $cliPath) {
                Write-Host "ERROR: claude command not found." -ForegroundColor Red
                exit 1
            }
            Write-Host "Starting Claude Code..." -ForegroundColor Green
            $systemPrompt | claude --dangerously-skip-permissions
        }
        "codex" {
            $cliPath = Get-Command codex -ErrorAction SilentlyContinue
            if (-not $cliPath) {
                Write-Host "ERROR: codex command not found." -ForegroundColor Red
                exit 1
            }
            Write-Host "Starting Codex CLI..." -ForegroundColor Green
            codex --full-auto --approval-mode full-auto -q $systemPrompt
        }
        "gemini" {
            $cliPath = Get-Command gemini -ErrorAction SilentlyContinue
            if (-not $cliPath) {
                Write-Host "ERROR: gemini command not found." -ForegroundColor Red
                exit 1
            }
            Write-Host "Starting Gemini CLI..." -ForegroundColor Green
            $systemPrompt | gemini
        }
    }
} catch {
    Write-Host "ERROR: Failed to start $AIProvider" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# 자동 종료가 비활성화된 경우 대기
if ($AutoTerminate -eq "0") {
    Write-Host ""
    Write-Host "Worker finished. Press any key to close..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
