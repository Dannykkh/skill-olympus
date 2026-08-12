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
    [switch]$ManualMode,  # 각 CLI의 기본 대화형 권한 모드 사용

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
        Write-ColorOutput "  [✓] Codex CLI 감지됨 (OpenAI)" "Green"
    } else {
        Write-ColorOutput "  [✗] Codex CLI 없음" "Gray"
    }

    if (Test-AIProvider "gemini") {
        $providers += "gemini"
        Write-ColorOutput "  [✓] Gemini CLI 감지됨 (Google)" "Green"
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
            if ($AutoMode) { "claude --permission-mode auto" } else { "claude" }
        }
        "codex" {
            if ($AutoMode) { "codex --approve-for-me --sandbox workspace-write" } else { "codex" }
        }
        "gemini" {
            if ($AutoMode) { "gemini --sandbox --approval-mode yolo" } else { "gemini" }
        }
        default {
            throw "지원하지 않는 AI provider: $Provider"
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

if ($availableProviders.Count -eq 0) {
    Write-ColorOutput "오류: 지원되는 AI provider가 없습니다 (claude, codex, gemini)." "Red"
    exit 1
}

$aiMode = "single"
$workerAIs = @()
if ($availableProviders.Count -ge 3) {
    $aiMode = "full"
    Write-ColorOutput "`n모드: Full Mode ($($availableProviders -join ' + '))" "Magenta"
} elseif ($availableProviders.Count -eq 2) {
    $aiMode = "dual"
    Write-ColorOutput "`n모드: Dual Mode ($($availableProviders -join ' + '))" "Magenta"
} else {
    Write-ColorOutput "`n모드: Single Mode ($($availableProviders[0]) only)" "Yellow"
}

$defaultProvider = $availableProviders[0]
for ($i = 0; $i -lt $WorkerCount; $i++) {
    $requestedProvider = if ($AIProviders -and $i -lt $AIProviders.Count) { $AIProviders[$i] } else { $defaultProvider }
    if ($availableProviders -notcontains $requestedProvider) {
        Write-ColorOutput "오류: 요청 provider '$requestedProvider'가 설치되어 있지 않습니다. 사용 가능: $($availableProviders -join ', ')" "Red"
        exit 1
    }
    $workerAIs += $requestedProvider
}

Write-ColorOutput "Worker AI 배정:" "Green"
for ($i = 0; $i -lt $workerAIs.Count; $i++) {
    Write-ColorOutput "  Worker-$($i+1): $($workerAIs[$i])" "Cyan"
}

# MCP 설정 생성 함수
function Create-McpConfig {
    param(
        [string]$TargetDir,
        [string]$WorkerId,
        [string]$AIProvider = ""
    )

    $claudeDir = Join-Path $TargetDir ".claude"
    if (-not (Test-Path $claudeDir)) {
        New-Item -ItemType Directory -Path $claudeDir | Out-Null
    }

    $mcpEnv = @{
        ORCHESTRATOR_PROJECT_ROOT = $ProjectPath
        ORCHESTRATOR_WORKER_ID = $WorkerId
    }
    if ($AIProvider) {
        $mcpEnv.ORCHESTRATOR_AI_PROVIDER = $AIProvider
    }

    $mcpConfig = @{
        mcpServers = @{
            orchestrator = @{
                command = "node"
                args = @($McpServerDist)
                env = $mcpEnv
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
        Create-McpConfig -TargetDir $workerWorktree -WorkerId $workerName -AIProvider $workerAIs[$i - 1]
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
    Write-ColorOutput "실행 모드: 자동 (sandbox/auto-review 경계 유지)" "Yellow"
}

# PM 탭 (감지된 첫 provider 사용)
$pmPath = if ($SkipWorktrees) { $ProjectPath } else { Join-Path $WorktreesDir "pm" }
$pmProvider = $availableProviders[0]
$pmCmd = Get-AICommand -Provider $pmProvider -AutoMode $autoMode
$wtCommands += "new-tab --title `"PM ($pmProvider)`" -d `"$pmPath`" cmd /k `"echo PM Ready && $pmCmd`""

# Worker 탭들 (Multi-AI 지원)
for ($i = 1; $i -le $WorkerCount; $i++) {
    $workerName = "worker-$i"
    $workerPath = if ($SkipWorktrees) { $ProjectPath } else { Join-Path $WorktreesDir $workerName }

    # 워커별 AI 선택
    $workerAI = $workerAIs[$i - 1]
    $workerCmd = Get-AICommand -Provider $workerAI -AutoMode $autoMode

    # 탭 타이틀에 AI 표시
    $tabTitle = "$workerName ($workerAI)"
    $wtCommands += "new-tab --title `"$tabTitle`" -d `"$workerPath`" cmd /k `"echo Worker $i [$workerAI] Ready && $workerCmd`""
}

# Multi-AI 정보 문자열 생성
$workerAIInfo = ""
for ($i = 1; $i -le $WorkerCount; $i++) {
    $ai = $workerAIs[$i - 1]
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
1. PM 탭에서 감지된 provider CLI 실행
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

## Provider 선택 원칙
- 별도 근거가 없으면 ai_provider를 생략해 provider-agnostic 태스크로 생성
- 사용자 요구, 조직 정책, provider별 재현 필요성, 실제 평가 결과가 있을 때만 provider 고정
- 요청 provider가 미설치면 다른 provider로 바꾸지 않고 실패 보고
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
Write-ColorOutput "또는 수동으로 각 디렉토리에서 배정된 provider CLI를 실행하세요:" "Yellow"
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
