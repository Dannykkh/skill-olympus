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
    [string]$AIProvider = "claude",

    [Parameter(Mandatory=$false)]
    [string]$LogFile = ""
)

# 로그 함수 — 콘솔 + 파일 동시 출력
function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] $Message"
    Write-Host $Message -ForegroundColor $Color
    if ($LogFile) {
        Add-Content -Path $LogFile -Value $logLine -ErrorAction SilentlyContinue
    }
}

# 환경 변수 설정
$env:ORCHESTRATOR_WORKER_ID = $WorkerId
$env:ORCHESTRATOR_PROJECT_ROOT = $ProjectRoot

Write-Log "" "White"
Write-Log "========================================" "Cyan"
Write-Log "  Orchestrator Worker Starting..." "Cyan"
Write-Log "========================================" "Cyan"
Write-Log "" "White"
Write-Log "Worker ID: $WorkerId" "Yellow"
Write-Log "AI Provider: $AIProvider" "Yellow"
Write-Log "Project: $ProjectRoot" "Yellow"
Write-Log "Auto-terminate: $($AutoTerminate -eq '1')" "Yellow"
Write-Log "Log: $LogFile" "Yellow"
Write-Log "" "White"

# Worker 시스템 프롬프트 — 임시 파일로 전달 (stdin 파이프 문제 회피)
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
if (-not (Test-Path $ProjectRoot)) {
    Write-Log "ERROR: Project root not found: $ProjectRoot" "Red"
    exit 1
}
Set-Location $ProjectRoot

# 프롬프트를 임시 파일에 저장 (stdin 파이프 대신)
$promptFile = Join-Path $env:TEMP "orchestrator-prompt-$WorkerId.txt"
[System.IO.File]::WriteAllText($promptFile, $systemPrompt, [System.Text.Encoding]::UTF8)

# AI Provider별 CLI 실행
try {
    switch ($AIProvider) {
        "claude" {
            $cliPath = Get-Command claude -ErrorAction SilentlyContinue
            if (-not $cliPath) {
                Write-Log "ERROR: claude command not found in PATH" "Red"
                exit 1
            }
            Write-Log "CLI_STARTED: Claude Code at $($cliPath.Source)" "Green"
            # 임시 파일에서 읽어 stdin으로 전달 (멀티라인 안전)
            Get-Content $promptFile -Raw | claude --dangerously-skip-permissions
        }
        "codex" {
            $cliPath = Get-Command codex -ErrorAction SilentlyContinue
            if (-not $cliPath) {
                Write-Log "ERROR: codex command not found in PATH" "Red"
                exit 1
            }
            Write-Log "CLI_STARTED: Codex CLI at $($cliPath.Source)" "Green"
            # codex -q 플래그로 프롬프트 전달
            codex --full-auto --approval-mode full-auto -q (Get-Content $promptFile -Raw)
        }
        "gemini" {
            $cliPath = Get-Command gemini -ErrorAction SilentlyContinue
            if (-not $cliPath) {
                Write-Log "ERROR: gemini command not found in PATH" "Red"
                exit 1
            }
            Write-Log "CLI_STARTED: Gemini CLI at $($cliPath.Source)" "Green"
            Get-Content $promptFile -Raw | gemini
        }
    }
    Write-Log "Worker $WorkerId finished successfully" "Green"
} catch {
    Write-Log "ERROR: Failed to start $AIProvider - $($_.Exception.Message)" "Red"
    exit 1
} finally {
    # 임시 프롬프트 파일 정리
    if (Test-Path $promptFile) {
        Remove-Item $promptFile -ErrorAction SilentlyContinue
    }
}

# 자동 종료가 비활성화된 경우 대기
if ($AutoTerminate -eq "0") {
    Write-Log "" "White"
    Write-Log "Worker finished. Press any key to close..." "Yellow"
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
