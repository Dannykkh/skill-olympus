# reconcile-conversations.ps1
# SessionStart 훅: Claude + Codex 두 CLI의 JSONL 원본을 source of truth로 선언하고,
# save-response/save-turn이 놓친 턴을 conversations/YYYY-MM-DD-{claude,codex}.md에 backfill한다.
#
# 동작 원칙
# - 빠르게: 오늘자 날짜만 reconcile (기본값)
# - 조용히: 에러가 발생해도 세션 시작을 막지 않음 (fail-open)
# - 멱등: 각 CLI의 사이드카 인덱스(.mnemo-index.json)가 Claude/Codex 네임스페이스 공유

# Grok 세션 가드: Grok SessionStart마다 Claude/Codex reconcile 비용을 지불하지 않도록 즉시 종료.
if ($env:GROK_HOOK_EVENT) { exit 0 }
if ($env:DEVIN_PROJECT_DIR) { exit 0 }

[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Claude Code가 stdin으로 JSON 페이로드를 전달. transcript_path를 추출해
# 프로젝트 루트 결정에 활용한다 (SessionStart hook도 transcript_path를 받음).
$transcriptPath = $null
try {
    $rawInput = [Console]::In.ReadToEnd()
    if ($rawInput) {
        $payload = $rawInput | ConvertFrom-Json
        $transcriptPath = $payload.transcript_path
    }
} catch {}

# Resolve all storage through the shared project boundary contract.
function Get-ClaudeProjectRoot {
    param([string]$TranscriptPath, $Payload)
    $helper = Join-Path $PSScriptRoot 'mnemo-project-root.js'
    if (-not (Test-Path -LiteralPath $helper)) { return $null }
    try {
        $result = ($Payload | ConvertTo-Json -Compress -Depth 30) | & node $helper --claude 2>$null
        if ($LASTEXITCODE -eq 0 -and $result) { return "$result".Trim() }
    } catch {}
    return $null
}

$ProjectRoot = Get-ClaudeProjectRoot -TranscriptPath $transcriptPath -Payload $payload

# Temp/무효 루트면 저장 skip (fail-open) — gotcha 065
if (-not $ProjectRoot) { exit 0 }

# 스크립트 경로 해결 헬퍼: 여러 후보 경로 중 존재하는 첫 번째 반환
function Find-FirstExisting {
    param([string[]]$Candidates)
    foreach ($c in $Candidates) {
        if ($c -and (Test-Path $c)) { return $c }
    }
    return $null
}

# Claude reconcile 스크립트
$repoRoot = Split-Path $PSScriptRoot -Parent
$claudeScript = Find-FirstExisting @(
    (Join-Path $repoRoot 'skills\mnemo\scripts\reconcile_conversations.py'),
    (Join-Path $repoRoot 'scripts\reconcile_conversations.py'),
    (Join-Path $HOME '.claude\skills\mnemo\scripts\reconcile_conversations.py')
)

# Codex reconcile 스크립트 (여러 설치 경로 탐색)
# - repo 체크아웃 (dev)
# - codex-mnemo/install.js가 배치하는 <CODEX_HOME>/scripts/
# - sync-codex-assets.js가 전체 스킬을 복사하는 <CODEX_HOME>/skills/codex-mnemo/scripts/
# - Claude smart-setup이 동기화한 ~/.claude/skills/codex-mnemo/scripts/
$codexHome = if ($env:CODEX_HOME) {
    [System.IO.Path]::GetFullPath($env:CODEX_HOME)
} else {
    Join-Path $HOME '.codex'
}
$codexScript = Find-FirstExisting @(
    (Join-Path $repoRoot 'skills\codex-mnemo\scripts\reconcile_codex_conversations.py'),
    (Join-Path $codexHome 'scripts\reconcile_codex_conversations.py'),
    (Join-Path $codexHome 'skills\codex-mnemo\scripts\reconcile_codex_conversations.py'),
    (Join-Path $HOME '.claude\skills\codex-mnemo\scripts\reconcile_codex_conversations.py')
)

# 둘 다 없으면 조용히 종료 (세션 시작 블로킹 방지)
if (-not $claudeScript -and -not $codexScript) {
    exit 0
}

# Python 실행 파일 결정
# Windows App Store의 python3 stub를 피하기 위해 --version 체크로 실제 실행 가능성 검증.
$python = $null
foreach ($cmd in @('python', 'py', 'python3')) {
    $resolved = Get-Command $cmd -ErrorAction SilentlyContinue
    if ($resolved) {
        try {
            $null = & $resolved.Source --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                $python = $resolved.Source
                break
            }
        } catch {}
    }
}

if (-not $python) {
    exit 0
}

# reconcile 실행 (오늘자만, quiet 모드)
# 에러 발생해도 세션 시작을 막지 않도록 try/catch + exit 0
function Write-MnemoError {
    param([string]$Context, [string]$Message)
    try {
        $errDir = Join-Path $ProjectRoot '.claude'
        if (-not (Test-Path $errDir)) {
            New-Item -ItemType Directory -Path $errDir -Force | Out-Null
        }
        $logPath = Join-Path $errDir 'mnemo-errors.log'
        $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        $line = "[$ts] [reconcile-conversations.ps1] [$Context] $Message`r`n"
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::AppendAllText($logPath, $line, $utf8NoBom)
    } catch {}
}

function Invoke-ReconcileScript {
    param([string]$ScriptPath, [string]$CliLabel)
    if (-not $ScriptPath) { return }
    try {
        $out = & $python $ScriptPath --project-root $ProjectRoot --quiet 2>&1
        if ($LASTEXITCODE -ne 0) {
            $joined = ($out -join ' ').Trim()
            Write-MnemoError -Context "$CliLabel-nonzero" -Message "exit=$LASTEXITCODE output=$joined"
        }
    } catch {
        Write-MnemoError -Context "$CliLabel-invoke" -Message $_.Exception.Message
    }
}

# 저장 opt-out: MNEMO_DISABLE=1|true|yes 면 backfill 저장을 건너뛴다 (개인정보처리방침 거부 방법).
# 버전 체크·에러 배너는 저장이 아니므로 계속 실행 (버전 체크는 OLYMPUS_UPDATE_CHECK_DISABLE로 별도 제어).
if ($env:MNEMO_DISABLE -notmatch '^(1|true|yes)$') {
    Invoke-ReconcileScript -ScriptPath $claudeScript -CliLabel 'claude'
    Invoke-ReconcileScript -ScriptPath $codexScript -CliLabel 'codex'
}

# 사용자에게 보일 안내를 모은다. 끝에서 systemMessage JSON 한 줄로 내보낸다.
# exit 0 훅의 stderr는 사용자 화면에 나온다는 보장이 없어서(공식 문서에 없음) 쓰지 않는다 (gotcha 127).
$userNotices = New-Object System.Collections.Generic.List[string]

# ── 업데이트 체크 (하루 1회, non-blocking) ──
# 설치된 훅은 CLI 설정 폴더(~/.claude/hooks 등)에서 돌아 저장소를 모른다. 저장소에서 바로 돌면 형제
# scripts\, 아니면 OLYMPUS_DIR, 그다음 설치기가 남긴 저장소 위치(~/.skill-olympus/repo-root)를 쓴다.
function Find-OlympusRepoRoot {
    if (Test-Path (Join-Path $repoRoot 'scripts\update-check.ps1')) { return $repoRoot }
    if ($env:OLYMPUS_DIR -and (Test-Path (Join-Path $env:OLYMPUS_DIR 'scripts\update-check.ps1'))) { return $env:OLYMPUS_DIR }
    $userHome = if ($env:USERPROFILE) { $env:USERPROFILE } else { $HOME }
    $stateDir = if ($env:OLYMPUS_STATE_DIR) { $env:OLYMPUS_STATE_DIR } else { Join-Path $userHome '.skill-olympus' }
    $record = Join-Path $stateDir 'repo-root'
    if (Test-Path $record) {
        $recorded = (Get-Content $record -Raw).Trim()
        if ($recorded -and (Test-Path (Join-Path $recorded 'scripts\update-check.ps1'))) { return $recorded }
    }
    return $null
}

try {
    $olympusRoot = Find-OlympusRepoRoot
    if ($olympusRoot) {
        $updateScript = Join-Path $olympusRoot 'scripts\update-check.ps1'
        $updateResult = & powershell -NoProfile -ExecutionPolicy Bypass -File $updateScript 2>$null
        if ($updateResult -match '^UPGRADE_AVAILABLE\s+(\S+)\s+(\S+)') {
            $oldVer = $Matches[1]
            $newVer = $Matches[2]
            $userNotices.Add("[skill-olympus] 새 버전 v${newVer} 사용 가능 (현재 v${oldVer}). ${olympusRoot} 에서 git pull 후 install.bat --all 로 업데이트하세요.")
        }
    }
} catch {}

# 세션 시작 시 누적된 에러 수를 안내
try {
    $errLog = Join-Path $ProjectRoot '.claude\mnemo-errors.log'
    if (Test-Path $errLog) {
        $cutoff = (Get-Date).AddHours(-24)
        $recent = Get-Content $errLog -Encoding UTF8 -ErrorAction SilentlyContinue | Where-Object {
            if ($_ -match '^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]') {
                try {
                    $ts = [DateTime]::ParseExact($Matches[1], 'yyyy-MM-dd HH:mm:ss', $null)
                    return $ts -ge $cutoff
                } catch { return $false }
            }
            return $false
        }
        if ($recent -and $recent.Count -gt 0) {
            $userNotices.Add("[mnemo] 최근 24시간 내 mnemo 에러 $(@($recent).Count)건 (.claude/mnemo-errors.log 확인)")
        }
    }
} catch {}

# SessionStart stdout은 JSON 객체 하나일 때만 구조화 출력으로 읽힌다. 안내가 없으면 아무것도 쓰지 않는다.
if ($userNotices.Count -gt 0) {
    try {
        $json = @{ systemMessage = ($userNotices -join "`n") } | ConvertTo-Json -Compress
        # 위에서 지정한 Console UTF-8 인코딩은 Windows PowerShell 5.1에서 BOM을 앞에 붙일 수 있다.
        # BOM이 붙으면 JSON으로 읽히지 않으므로 BOM 없는 바이트를 표준 출력에 직접 쓴다.
        $bytes = (New-Object System.Text.UTF8Encoding $false).GetBytes($json + "`n")
        $stdout = [Console]::OpenStandardOutput()
        $stdout.Write($bytes, 0, $bytes.Length)
        $stdout.Flush()
    } catch {}
}

exit 0
