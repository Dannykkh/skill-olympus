# Claude Orchestrator Launch Script
# PM + Worker 오케스트레이션 환경 설정 및 실행

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$false)]
    [int]$WorkerCount = 3,

    [Parameter(Mandatory=$false)]
    [switch]$SkipWorktrees,

    [Parameter(Mandatory=$false)]
    [switch]$CleanStart,

    [Parameter(Mandatory=$false)]
    [switch]$ManualMode,  # 권한 확인 모드 (--dangerously-skip-permissions 사용 안함)

    [Parameter(Mandatory=$false)]
    [switch]$MultiAI,  # Multi-AI 모드 활성화 (Claude + Codex + Gemini)

    [Parameter(Mandatory=$false)]
    [string[]]$AIProviders  # 워커별 AI 지정 (예: @('claude', 'codex', 'gemini'))
)

$ErrorActionPreference = "Stop"

# 색상 출력 함수
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

# 배너 출력
Write-ColorOutput "
╔════════════════════════════════════════════════════════════════╗
║           Claude Code Orchestrator Launcher                     ║
║         PM + Multi-AI Worker 병렬 처리 시스템                   ║
╚════════════════════════════════════════════════════════════════╝
" "Cyan"

# ============================================================================
# AI CLI 감지 함수
# ============================================================================

function Test-AIProvider {
    param([string]$Provider)

    try {
        $result = & $Provider --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
    } catch {
        # Provider not found
    }
    return $false
}

function Get-AvailableAIProviders {
    $providers = @()

    if (Test-AIProvider "claude") {
        $providers += "claude"
        Write-ColorOutput "  [✓] Claude CLI 감지됨" "Green"
    } else {
        Write-ColorOutput "  [✗] Claude CLI 없음" "Gray"
    }

    if (Test-AIProvider "codex") {
        $providers += "codex"
        Write-ColorOutput "  [✓] Codex CLI 감지됨 (OpenAI GPT-5.2)" "Green"
    } else {
        Write-ColorOutput "  [✗] Codex CLI 없음" "Gray"
    }

    if (Test-AIProvider "gemini") {
        $providers += "gemini"
        Write-ColorOutput "  [✓] Gemini CLI 감지됨 (Google Gemini 3 Pro)" "Green"
    } else {
        Write-ColorOutput "  [✗] Gemini CLI 없음" "Gray"
    }

    return $providers
}

function Get-AICommand {
    param(
        [string]$Provider,
        [bool]$AutoMode
    )

    $cmd = switch ($Provider) {
        "claude" {
            if ($AutoMode) { "claude --dangerously-skip-permissions" } else { "claude" }
        }
        "codex" {
            if ($AutoMode) { "codex --full-auto --approval-mode full-auto" } else { "codex" }
        }
        "gemini" {
            if ($AutoMode) { "gemini --approval-mode yolo" } else { "gemini" }
        }
        default {
            if ($AutoMode) { "claude --dangerously-skip-permissions" } else { "claude" }
        }
    }
    return $cmd
}

# 경로 확인
$ProjectPath = (Resolve-Path $ProjectPath).Path
Write-ColorOutput "프로젝트 경로: $ProjectPath" "Green"

# MCP 서버 경로 (이 스크립트의 상위 디렉토리)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$McpServerDir = Split-Path -Parent $ScriptDir
$McpServerDist = Join-Path $McpServerDir "dist\index.js"

# MCP 서버 빌드 확인
if (-not (Test-Path $McpServerDist)) {
    Write-ColorOutput "MCP 서버를 빌드합니다..." "Yellow"
    Push-Location $McpServerDir
    npm install
    npm run build
    Pop-Location
}

# Orchestrator 디렉토리
$OrchestratorDir = Join-Path $ProjectPath ".orchestrator"
$WorktreesDir = Join-Path $OrchestratorDir "worktrees"

# CleanStart 옵션 처리
if ($CleanStart) {
    Write-ColorOutput "기존 오케스트레이터 데이터를 정리합니다..." "Yellow"
    if (Test-Path $OrchestratorDir) {
        # Worktrees 제거
        if (Test-Path $WorktreesDir) {
            $worktrees = Get-ChildItem $WorktreesDir -Directory
            foreach ($wt in $worktrees) {
                Write-ColorOutput "  Worktree 제거: $($wt.Name)" "Gray"
                Push-Location $ProjectPath
                git worktree remove $wt.FullName --force 2>$null
                Pop-Location
            }
        }
        Remove-Item $OrchestratorDir -Recurse -Force
    }
}

# 디렉토리 생성
if (-not (Test-Path $OrchestratorDir)) {
    New-Item -ItemType Directory -Path $OrchestratorDir | Out-Null
}
if (-not (Test-Path $WorktreesDir)) {
    New-Item -ItemType Directory -Path $WorktreesDir | Out-Null
}

# Git 확인
Push-Location $ProjectPath
$isGitRepo = git rev-parse --is-inside-work-tree 2>$null
if ($isGitRepo -ne "true") {
    Write-ColorOutput "오류: Git 저장소가 아닙니다." "Red"
    Pop-Location
    exit 1
}
$mainBranch = git symbolic-ref refs/remotes/origin/HEAD 2>$null
if (-not $mainBranch) {
    $mainBranch = "main"
} else {
    $mainBranch = $mainBranch -replace "refs/remotes/origin/", ""
}
Pop-Location

Write-ColorOutput "메인 브랜치: $mainBranch" "Green"
Write-ColorOutput "워커 수: $WorkerCount" "Green"

# ============================================================================
# Multi-AI 모드 설정
# ============================================================================

Write-ColorOutput "`nAI Provider 감지 중..." "Yellow"
$availableProviders = Get-AvailableAIProviders

$aiMode = "single"
$workerAIs = @()

if ($MultiAI -or $AIProviders) {
    if ($availableProviders.Count -ge 3) {
        $aiMode = "full"
        Write-ColorOutput "`n모드: Full Mode (Claude + Codex + Gemini)" "Magenta"
    } elseif ($availableProviders.Count -eq 2) {
        $aiMode = "dual"
        Write-ColorOutput "`n모드: Dual Mode ($($availableProviders -join ' + '))" "Magenta"
    } else {
        $aiMode = "single"
        Write-ColorOutput "`n모드: Single Mode (Claude만 사용)" "Yellow"
    }

    # AIProviders가 지정되면 해당 설정 사용, 아니면 자동 배분
    if ($AIProviders -and $AIProviders.Count -gt 0) {
        $workerAIs = $AIProviders
    } else {
        # 자동 배분: 라운드 로빈 방식
        for ($i = 0; $i -lt $WorkerCount; $i++) {
            $providerIndex = $i % $availableProviders.Count
            $workerAIs += $availableProviders[$providerIndex]
        }
    }

    Write-ColorOutput "Worker AI 배정:" "Green"
    for ($i = 0; $i -lt $workerAIs.Count; $i++) {
        Write-ColorOutput "  Worker-$($i+1): $($workerAIs[$i])" "Cyan"
    }
} else {
    Write-ColorOutput "`n모드: Single Mode (Claude 전용)" "Yellow"
    for ($i = 0; $i -lt $WorkerCount; $i++) {
        $workerAIs += "claude"
    }
}

# MCP 설정 생성 함수
function Create-McpConfig {
    param(
        [string]$TargetDir,
        [string]$WorkerId
    )

    $claudeDir = Join-Path $TargetDir ".claude"
    if (-not (Test-Path $claudeDir)) {
        New-Item -ItemType Directory -Path $claudeDir | Out-Null
    }

    $mcpConfig = @{
        mcpServers = @{
            orchestrator = @{
                command = "node"
                args = @($McpServerDist)
                env = @{
                    ORCHESTRATOR_PROJECT_ROOT = $ProjectPath
                    ORCHESTRATOR_WORKER_ID = $WorkerId
                }
            }
        }
    }

    $mcpConfigPath = Join-Path $claudeDir "mcp.json"
    $mcpConfig | ConvertTo-Json -Depth 10 | Set-Content $mcpConfigPath -Encoding UTF8
    Write-ColorOutput "  MCP 설정 생성: $mcpConfigPath" "Gray"
}

# Git Worktrees 설정
if (-not $SkipWorktrees) {
    Write-ColorOutput "`nGit Worktrees 설정 중..." "Yellow"

    # PM worktree
    $pmWorktree = Join-Path $WorktreesDir "pm"
    if (-not (Test-Path $pmWorktree)) {
        Write-ColorOutput "  PM worktree 생성 중..." "Gray"
        Push-Location $ProjectPath
        git worktree add $pmWorktree $mainBranch 2>$null
        Pop-Location
    }
    Create-McpConfig -TargetDir $pmWorktree -WorkerId "pm"

    # Worker worktrees
    for ($i = 1; $i -le $WorkerCount; $i++) {
        $workerName = "worker-$i"
        $workerBranch = "orchestrator/$workerName"
        $workerWorktree = Join-Path $WorktreesDir $workerName

        if (-not (Test-Path $workerWorktree)) {
            Write-ColorOutput "  $workerName worktree 생성 중..." "Gray"
            Push-Location $ProjectPath

            # 브랜치가 없으면 생성
            $branchExists = git show-ref --verify --quiet "refs/heads/$workerBranch" 2>$null
            if ($LASTEXITCODE -ne 0) {
                git branch $workerBranch $mainBranch 2>$null
            }

            git worktree add $workerWorktree $workerBranch 2>$null
            Pop-Location
        }
        Create-McpConfig -TargetDir $workerWorktree -WorkerId $workerName
    }
}

# 메인 프로젝트에도 MCP 설정 (PM용 기본)
Create-McpConfig -TargetDir $ProjectPath -WorkerId "pm"

# Windows Terminal 탭 열기
Write-ColorOutput "`nWindows Terminal 탭 설정..." "Yellow"

# WT 명령어 구성
$wtCommands = @()

# 실행 모드 설정
$autoMode = -not $ManualMode
if ($ManualMode) {
    Write-ColorOutput "실행 모드: 수동 (권한 확인 필요)" "Yellow"
} else {
    Write-ColorOutput "실행 모드: 자동 (권한 확인 스킵)" "Yellow"
}

# PM 탭 (항상 Claude 사용)
$pmPath = if ($SkipWorktrees) { $ProjectPath } else { Join-Path $WorktreesDir "pm" }
$pmCmd = Get-AICommand -Provider "claude" -AutoMode $autoMode
$wtCommands += "new-tab --title `"PM (Claude)`" -d `"$pmPath`" cmd /k `"echo PM Ready && $pmCmd`""

# Worker 탭들 (Multi-AI 지원)
for ($i = 1; $i -le $WorkerCount; $i++) {
    $workerName = "worker-$i"
    $workerPath = if ($SkipWorktrees) { $ProjectPath } else { Join-Path $WorktreesDir $workerName }

    # 워커별 AI 선택
    $workerAI = if ($workerAIs.Count -ge $i) { $workerAIs[$i - 1] } else { "claude" }
    $workerCmd = Get-AICommand -Provider $workerAI -AutoMode $autoMode

    # 탭 타이틀에 AI 표시
    $tabTitle = "$workerName ($workerAI)"
    $wtCommands += "new-tab --title `"$tabTitle`" -d `"$workerPath`" cmd /k `"echo Worker $i [$workerAI] Ready && $workerCmd`""
}

# Multi-AI 정보 문자열 생성
$workerAIInfo = ""
for ($i = 1; $i -le $WorkerCount; $i++) {
    $ai = if ($workerAIs.Count -ge $i) { $workerAIs[$i - 1] } else { "claude" }
    $workerAIInfo += "- Worker-$i`: $ai`n"
}

# 설정 정보 파일 생성
$infoContent = @"
# Claude Orchestrator 설정 정보
# 생성 시간: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## 프로젝트
- 경로: $ProjectPath
- 메인 브랜치: $mainBranch

## AI 모드
- 모드: $aiMode
- 사용 가능한 AI: $($availableProviders -join ', ')

### Worker AI 배정
$workerAIInfo

## MCP 서버
- 경로: $McpServerDist

## Worktrees
- PM: $(Join-Path $WorktreesDir "pm")
$(for ($i = 1; $i -le $WorkerCount; $i++) { "- Worker-$i`: $(Join-Path $WorktreesDir "worker-$i")" })

## 사용 방법

### PM (Project Manager)
1. PM 탭에서 'claude' 실행
2. AI Provider 감지:
   orchestrator_detect_providers 도구로 사용 가능한 AI 확인
3. 프로젝트 분석:
   orchestrator_analyze_codebase 도구를 사용하여 프로젝트 구조 파악
4. 태스크 생성 (AI 지정 가능):
   orchestrator_create_task 도구로 작업 생성
   - ai_provider: 'claude' | 'codex' | 'gemini' (선택)
5. 진행 모니터링:
   orchestrator_get_progress 도구로 상태 확인

### Worker
1. Worker 탭에서 해당 AI CLI 실행 (claude/codex/gemini)
2. 가용 태스크 확인:
   orchestrator_get_available_tasks
3. 태스크 담당:
   orchestrator_claim_task
4. 파일 락:
   orchestrator_lock_file
5. 작업 완료:
   orchestrator_complete_task

## AI 별 최적 용도
- **Claude**: 복잡한 추론, 코드 리팩토링, 문서 작성, 아키텍처 설계
- **Codex**: 코드 생성, 테스트 작성, 반복 코드 수정, 빠른 프로토타이핑
- **Gemini**: 대용량 컨텍스트 분석 (1M 토큰), 전체 코드베이스 리뷰, 보안 분석
"@

$infoPath = Join-Path $OrchestratorDir "README.md"
$infoContent | Set-Content $infoPath -Encoding UTF8

# 완료 메시지
Write-ColorOutput "
╔════════════════════════════════════════════════════════════════╗
║                       설정 완료!                                ║
╚════════════════════════════════════════════════════════════════╝
" "Green"

Write-ColorOutput "다음 명령으로 Windows Terminal을 실행하세요:" "Yellow"
Write-ColorOutput ""

# 터미널 실행 명령 생성
$wtFullCommand = "wt " + ($wtCommands -join " ; ")
Write-ColorOutput $wtFullCommand "Cyan"

Write-ColorOutput ""
Write-ColorOutput "또는 수동으로 각 디렉토리에서 'claude'를 실행하세요:" "Yellow"
Write-ColorOutput "  PM: $pmPath" "Gray"
for ($i = 1; $i -le $WorkerCount; $i++) {
    $workerPath = if ($SkipWorktrees) { $ProjectPath } else { Join-Path $WorktreesDir "worker-$i" }
    Write-ColorOutput "  Worker-$i`: $workerPath" "Gray"
}

Write-ColorOutput ""
Write-ColorOutput "상세 사용법: $infoPath" "Gray"

# 자동 실행 옵션
$autoStart = Read-Host "`nWindows Terminal을 자동으로 실행하시겠습니까? (Y/N)"
if ($autoStart -eq "Y" -or $autoStart -eq "y") {
    Invoke-Expression $wtFullCommand
}
