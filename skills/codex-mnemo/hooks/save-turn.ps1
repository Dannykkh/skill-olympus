# save-turn.ps1 - Codex notify orchestrator
# Role split:
# - append-user.ps1: persist user message
# - append-assistant.ps1: persist assistant message

[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# BOM 없는 UTF-8 인코더 (PS의 [System.Text.Encoding]::UTF8은 BOM 포함이라 사용 안 함)
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Write-DebugLog([string]$message) {
    try {
        $debugDir = Join-Path $HOME ".codex\hooks"
        if (-not (Test-Path $debugDir)) {
            New-Item -ItemType Directory -Path $debugDir -Force | Out-Null
        }
        $debugFile = Join-Path $debugDir "save-turn-debug.log"
        $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
        [System.IO.File]::AppendAllText($debugFile, $line + [Environment]::NewLine, $Utf8NoBom)
    } catch {}
}

# P1 parity: Claude/Gemini와 공유하는 mnemo-errors.log에 에러급 실패를 기록한다.
# Write-DebugLog는 Codex 전용 디버그 trace이고, 사용자에게 가시화할 에러는
# 프로젝트의 .claude/mnemo-errors.log로 통합된다 (SessionStart 배너에서 집계됨).
function Write-MnemoError {
    param([string]$Context, [string]$Message)
    try {
        $root = $PWD.Path
        try {
            $gitRoot = git rev-parse --show-toplevel 2>$null
            if ($LASTEXITCODE -eq 0 -and $gitRoot) { $root = $gitRoot.Replace('/', '\') }
        } catch {}
        $errDir = Join-Path $root '.claude'
        if (-not (Test-Path $errDir)) {
            New-Item -ItemType Directory -Path $errDir -Force | Out-Null
        }
        $logPath = Join-Path $errDir 'mnemo-errors.log'
        $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        $line = "[$ts] [codex-mnemo/save-turn.ps1] [$Context] $Message`r`n"
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::AppendAllText($logPath, $line, $utf8NoBom)
    } catch {}
    # 디버그 파일에도 동일 메시지 기록 (Codex 전용 trace 보존)
    Write-DebugLog "ERROR [$Context] $Message"
}

function Parse-JsonSafe([string]$text) {
    if (-not $text) { return $null }
    try { return ($text | ConvertFrom-Json) } catch { return $null }
}

function Get-String($obj, [string]$name) {
    if ($null -eq $obj) { return "" }
    try {
        $v = $obj.PSObject.Properties[$name].Value
        if ($null -eq $v) { return "" }
        return "$v"
    } catch {
        return ""
    }
}

function Extract-Text($value) {
    if ($null -eq $value) { return "" }
    if ($value -is [string]) { return $value }
    if ($value -is [array]) {
        $parts = @()
        foreach ($item in $value) {
            $t = Extract-Text $item
            if ($t) { $parts += $t }
        }
        return ($parts -join "`n")
    }
    if ($value.PSObject.Properties["text"]) { return (Extract-Text $value.text) }
    if ($value.PSObject.Properties["content"]) { return (Extract-Text $value.content) }
    return "$value"
}

function Normalize-PathSafe([string]$p) {
    if (-not $p) { return "" }
    try {
        return ([System.IO.Path]::GetFullPath($p)).TrimEnd('\').ToLowerInvariant()
    } catch {
        return $p.TrimEnd('\').ToLowerInvariant()
    }
}

function Select-SessionFile([string]$preferredCwd) {
    $sessionRoot = Join-Path $HOME ".codex\sessions"
    if (-not (Test-Path $sessionRoot)) { return $null }
    $files = Get-ChildItem -Path $sessionRoot -Recurse -Filter "*.jsonl" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 20
    if (-not $files -or $files.Count -eq 0) { return $null }

    $prefNorm = Normalize-PathSafe $preferredCwd
    if (-not $prefNorm) { return $files[0].FullName }

    foreach ($f in $files) {
        try {
            $head = Get-Content -Path $f.FullName -TotalCount 3 -Encoding UTF8 -ErrorAction SilentlyContinue
            foreach ($line in $head) {
                $o = Parse-JsonSafe $line
                if (-not $o) { continue }
                if ("$($o.type)" -eq "session_meta") {
                    $cwd = Normalize-PathSafe (Get-String $o.payload "cwd")
                    if ($cwd -and ($cwd -eq $prefNorm)) {
                        return $f.FullName
                    }
                }
            }
        } catch {}
    }

    return $files[0].FullName
}

function Read-SessionTailLines([string]$path, [int]$maxBytes = 2097152) {
    if (-not $path -or -not (Test-Path $path)) { return @() }
    $fs = $null
    try {
        $fs = [System.IO.FileStream]::new($path, 'Open', 'Read', 'ReadWrite')
        $len = [int64]$fs.Length
        if ($len -le 0) { return @() }
        $read = [Math]::Min($maxBytes, $len)
        $start = $len - $read
        $fs.Seek($start, 'Begin') | Out-Null
        $buffer = New-Object byte[] $read
        [void]$fs.Read($buffer, 0, $read)
        $text = [System.Text.Encoding]::UTF8.GetString($buffer)
        return ($text -split "`n")
    } catch {
        return @()
    } finally {
        if ($fs) { $fs.Close() }
    }
}

function Get-LatestSessionData([string]$preferredCwd) {
    $sessionFile = Select-SessionFile $preferredCwd
    if (-not $sessionFile) {
        return @{ UserText = ""; ResponseText = ""; Cwd = "" }
    }

    $cwd = ""
    $lastUser = ""
    $lastAssistant = ""
    $lines = Read-SessionTailLines -path $sessionFile -maxBytes 2097152
    if (-not $lines) {
        return @{ UserText = ""; ResponseText = ""; Cwd = "" }
    }

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if (-not $line) { continue }
        $o = Parse-JsonSafe $line
        if (-not $o) { continue }

        if ("$($o.type)" -eq "session_meta" -and -not $cwd) {
            $cwdCandidate = Get-String $o.payload "cwd"
            if ($cwdCandidate) { $cwd = $cwdCandidate.Trim() }
            continue
        }

        if ("$($o.type)" -ne "response_item") { continue }
        $p = $o.payload
        if ("$($p.type)" -ne "message") { continue }
        $role = "$($p.role)"
        if ($role -ne "user" -and $role -ne "assistant") { continue }

        $text = (Extract-Text $p.content).Trim()
        if (-not $text) { continue }
        if ($role -eq "user") {
            $lastUser = $text
        } else {
            $lastAssistant = $text
        }
    }

    return @{ UserText = $lastUser; ResponseText = $lastAssistant; Cwd = $cwd; SessionFile = $sessionFile }
}

function Get-Sha1([string]$text) {
    if (-not $text) { return "" }
    $sha = [System.Security.Cryptography.SHA1]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
        $hash = $sha.ComputeHash($bytes)
        return ([BitConverter]::ToString($hash) -replace "-", "").ToLowerInvariant()
    } finally {
        $sha.Dispose()
    }
}

function Invoke-NotificationHook {
    param(
        [string]$Title = "Codex CLI",
        [string]$Message = "작업이 완료되었습니다"
    )

    $notifyHook = Join-Path $HOME ".codex\hooks\ddingdong-noti.ps1"
    if (-not (Test-Path $notifyHook)) { return }

    $prevTitle = $env:AGENT_NOTIFY_TITLE
    $prevMessage = $env:AGENT_NOTIFY_MESSAGE

    try {
        $env:AGENT_NOTIFY_TITLE = $Title
        $env:AGENT_NOTIFY_MESSAGE = $Message
        & $notifyHook
    } catch {
        Write-DebugLog "notify-chain-failed: $($_.Exception.Message)"
    } finally {
        if ($null -ne $prevTitle) { $env:AGENT_NOTIFY_TITLE = $prevTitle } else { Remove-Item Env:AGENT_NOTIFY_TITLE -ErrorAction SilentlyContinue }
        if ($null -ne $prevMessage) { $env:AGENT_NOTIFY_MESSAGE = $prevMessage } else { Remove-Item Env:AGENT_NOTIFY_MESSAGE -ErrorAction SilentlyContinue }
    }
}

function Get-NodeCommand {
    foreach ($candidate in @("node", "node.exe")) {
        $command = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($command) { return $command.Source }
    }
    return ""
}

function New-EmptyHookSummary {
    return @{
        warnings = 0
        errors = 0
        touchedFiles = @()
        newFiles = @()
        messages = @()
    }
}

function Invoke-CodexHookBridge {
    param(
        [Parameter(Mandatory = $true)][string]$BaseDir,
        [Parameter(Mandatory = $true)][object]$PayloadObject
    )

    $bridge = Join-Path $PSScriptRoot "codex-hook-bridge.js"
    if (-not (Test-Path $bridge)) {
        return (New-EmptyHookSummary)
    }

    $nodeCommand = Get-NodeCommand
    if (-not $nodeCommand) {
        Write-DebugLog "hook-bridge-skip: node not found"
        return (New-EmptyHookSummary)
    }

    try {
        $payloadJson = "{}"
        if ($null -ne $PayloadObject) {
            $payloadJson = $PayloadObject | ConvertTo-Json -Compress -Depth 30
        }

        $raw = $payloadJson | & $nodeCommand $bridge "--base-dir=$BaseDir" 2>&1
        $text = (($raw | ForEach-Object { "$_" }) -join "`n").Trim()
        if (-not $text) {
            return (New-EmptyHookSummary)
        }

        $summary = Parse-JsonSafe $text
        if (-not $summary) {
            Write-DebugLog "hook-bridge-unparsed: $text"
            return (New-EmptyHookSummary)
        }

        $touchedCount = 0
        try { $touchedCount = $summary.touchedFiles.Count } catch {}
        $warningCount = 0
        try { $warningCount = [int]$summary.warnings } catch {}
        $errorCount = 0
        try { $errorCount = [int]$summary.errors } catch {}
        Write-DebugLog "hook-bridge: files=$touchedCount warnings=$warningCount errors=$errorCount"

        try {
            foreach ($message in $summary.messages) {
                if ($message) {
                    Write-DebugLog "hook-bridge> $message"
                }
            }
        } catch {}

        return $summary
    } catch {
        Write-DebugLog "hook-bridge-failed: $($_.Exception.Message)"
        return (New-EmptyHookSummary)
    }
}

function Ensure-MemoryScaffold([string]$BaseDir) {
    if (-not $BaseDir) { return }

    $memoryDir = Join-Path $BaseDir "memory"
    $projectName = Split-Path $BaseDir -Leaf
    $today = Get-Date -Format "yyyy-MM-dd"

    if (-not (Test-Path $memoryDir)) {
        New-Item -ItemType Directory -Path $memoryDir -Force | Out-Null
    }

    $memoryFile = Join-Path $BaseDir "MEMORY.md"
    if (-not (Test-Path $memoryFile)) {
        $memoryContent = @"
# MEMORY.md - 프로젝트 장기기억

## 프로젝트 목표

| 목표 | 상태 |
|------|------|
| $projectName 핵심 작업 추적 | 진행 중 |

---

## 키워드 인덱스

| 키워드 | 상세 파일 |
|--------|-----------|
| 프로젝트, 생성일 | #meta |

---

## architecture/
- [memory/architecture.md](memory/architecture.md)

## patterns/
- [memory/patterns.md](memory/patterns.md)

## tools/
- [memory/tools.md](memory/tools.md)

## gotchas/
- [memory/gotchas.md](memory/gotchas.md)

---

## meta/
- **프로젝트**: $projectName
- **생성일**: $today
- **마지막 업데이트**: $today
"@
        [System.IO.File]::WriteAllText($memoryFile, $memoryContent.TrimStart(), $Utf8NoBom)
    }

    $categoryFiles = @{
        "architecture.md" = @"
# Architecture - 설계 결정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
"@
        "patterns.md" = @"
# Patterns - 작업 패턴, 워크플로우

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
"@
        "tools.md" = @"
# Tools - MCP 서버, 외부 도구, 라이브러리

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
"@
        "gotchas.md" = @"
# Gotchas - 주의사항, 함정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
"@
    }

    foreach ($fileName in $categoryFiles.Keys) {
        $filePath = Join-Path $memoryDir $fileName
        if (-not (Test-Path $filePath)) {
            [System.IO.File]::WriteAllText($filePath, $categoryFiles[$fileName].TrimStart(), $Utf8NoBom)
        }
    }
}

$helperUser = Join-Path $PSScriptRoot "append-user.ps1"
$helperAssistant = Join-Path $PSScriptRoot "append-assistant.ps1"
if (-not (Test-Path $helperUser) -or -not (Test-Path $helperAssistant)) {
    Write-DebugLog "skip: helper scripts not found in $PSScriptRoot"
    exit 0
}
. $helperUser
. $helperAssistant

$payload = $null
$lastArg = $null
if ($args.Count -gt 0) {
    $lastArg = "$($args[$args.Count - 1])"
}

if ($lastArg) {
    $payload = Parse-JsonSafe $lastArg
    if (-not $payload -and (Test-Path $lastArg)) {
        try {
            $payload = Parse-JsonSafe (Get-Content $lastArg -Raw -Encoding UTF8)
        } catch {}
    }
}

if (-not $payload) {
    try {
        $payload = Parse-JsonSafe ([Console]::In.ReadToEnd())
    } catch {}
}

if (-not $payload) {
    Write-DebugLog "payload parse failed, fallback to sessions, pwd=$($PWD.Path), argsCount=$($args.Count)"
    $payload = @{}
}

$turnId = "$($payload.'turn-id')".Trim()
if (-not $turnId) {
    $turnId = "$($payload.turn_id)".Trim()
}

# input-messages가 배열이면 마지막 요소만 추출 (Codex는 누적 전달)
$inputMsgs = $payload.'input-messages'
if ($inputMsgs -is [array] -and $inputMsgs.Count -gt 0) {
    $userText = (Extract-Text $inputMsgs[-1]).Trim()
} else {
    $userText = (Extract-Text $inputMsgs).Trim()
}
if (-not $userText) {
    $inputMsgs2 = $payload.'input_messages'
    if ($inputMsgs2 -is [array] -and $inputMsgs2.Count -gt 0) {
        $userText = (Extract-Text $inputMsgs2[-1]).Trim()
    } else {
        $userText = (Extract-Text $inputMsgs2).Trim()
    }
}

$response = (Extract-Text $payload.'last-assistant-message').Trim()
if (-not $response) {
    $response = (Extract-Text $payload.'last_assistant_message').Trim()
}

if ((-not $userText -or $userText.Length -lt 1) -or (-not $response -or $response.Length -lt 5)) {
    $prefCwd = ""
    foreach ($k in @("cwd", "working-directory", "working_directory", "project-root", "project_root", "workspace-root", "workspace_root")) {
        $v = ""
        try { $v = "$($payload.$k)".Trim() } catch {}
        if ($v) { $prefCwd = $v; break }
    }
    if (-not $prefCwd -and $env:CODEX_WORKSPACE_ROOT) { $prefCwd = $env:CODEX_WORKSPACE_ROOT }
    if (-not $prefCwd) { $prefCwd = $PWD.Path }

    $sessionData = Get-LatestSessionData $prefCwd
    if (-not $userText -or $userText.Length -lt 1) {
        $userText = "$($sessionData.UserText)".Trim()
    }
    if (-not $response -or $response.Length -lt 5) {
        $response = "$($sessionData.ResponseText)".Trim()
    }
    if (-not (Get-String $payload "cwd")) {
        if (-not (Get-String $payload "working-directory")) {
            if (-not (Get-String $payload "working_directory")) {
                if ($sessionData.Cwd) {
                    $payload | Add-Member -NotePropertyName "cwd" -NotePropertyValue $sessionData.Cwd -Force
                }
            }
        }
    }
    Write-DebugLog "fallback-used: session=$($sessionData.SessionFile), userLen=$($userText.Length), respLen=$($response.Length), prefCwd=$prefCwd"
}

# <private> 블록 제거 (민감 정보 보호)
if ($userText) { $userText = $userText -replace '(?s)<private>.*?</private>', '[PRIVATE]' }
if ($response) { $response = $response -replace '(?s)<private>.*?</private>', '[PRIVATE]' }

if ((-not $userText -or $userText.Length -lt 1) -and (-not $response -or $response.Length -lt 5)) {
    Write-DebugLog "skip: empty turn, pwd=$($PWD.Path)"
    exit 0
}

$baseDir = ""
foreach ($k in @("cwd", "working-directory", "working_directory", "project-root", "project_root", "workspace-root", "workspace_root")) {
    $v = ""
    try { $v = "$($payload.$k)".Trim() } catch {}
    if ($v -and (Test-Path $v)) {
        $baseDir = $v
        break
    }
}
if (-not $baseDir -and $env:CODEX_WORKSPACE_ROOT -and (Test-Path $env:CODEX_WORKSPACE_ROOT)) {
    $baseDir = $env:CODEX_WORKSPACE_ROOT
}
if (-not $baseDir) {
    $baseDir = $PWD.Path
}

# Sub-directory(예: bin/Debug)를 부모 git root로 정규화한다.
# Visual Studio가 빌드 후 bin/Debug에서 실행되어 그 cwd가 payload로 들어와도
# conversations/는 진짜 프로젝트 루트에 생기도록 한다.
# git이 없는 디렉토리면 baseDir 그대로 유지 (fail-open).
if ($baseDir) {
    try {
        $gitRoot = & git -C $baseDir rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -eq 0 -and $gitRoot) {
            $baseDir = $gitRoot.Replace('/', '\')
        }
    } catch {}
}

Ensure-MemoryScaffold $baseDir

$convDir = Join-Path $baseDir "conversations"
$today = Get-Date -Format "yyyy-MM-dd"
$convFile = Join-Path $convDir "$today-codex.md"

if (-not (Test-Path $convDir)) {
    New-Item -ItemType Directory -Path $convDir -Force | Out-Null
}

if (-not (Test-Path $convFile)) {
    $header = @"
---
date: $today
project: $(Split-Path $baseDir -Leaf)
keywords: []
summary: ""
---

# $today

"@
    [System.IO.File]::WriteAllText($convFile, $header, $Utf8NoBom)
}

if (Test-Path $convFile) {
    $existing = Get-Content $convFile -Raw -Encoding UTF8
    if ($turnId) {
        if ($existing -match [regex]::Escape("<!-- turn:$turnId -->")) {
            Write-DebugLog "skip: duplicate turnId=$turnId"
            exit 0
        }
    } else {
        $sig = Get-Sha1 ("$userText`n---`n$response")
        if ($sig -and ($existing -match [regex]::Escape("<!-- turnhash:$sig -->"))) {
            Write-DebugLog "skip: duplicate turnHash=$sig"
            exit 0
        }
    }
}

$ts = Get-Date -Format 'HH:mm:ss'
# P1 parity: 파일 쓰기 실패 시 mnemo-errors.log에 기록해 사용자에게 가시화한다.
try {
    Add-CodexUserEntry -ConvFile $convFile -Timestamp $ts -UserText $userText
    Add-CodexAssistantEntry -ConvFile $convFile -Timestamp $ts -Response $response

    if ($turnId) {
        [System.IO.File]::AppendAllText($convFile, "<!-- turn:$turnId -->`n", $Utf8NoBom)
    } else {
        $sig = Get-Sha1 ("$userText`n---`n$response")
        if ($sig) {
            [System.IO.File]::AppendAllText($convFile, "<!-- turnhash:$sig -->`n", $Utf8NoBom)
        }
    }
} catch {
    Write-MnemoError -Context 'conv-append' -Message "conversations 파일 쓰기 실패: $($_.Exception.Message)"
    if ($env:MNEMO_STRICT -eq '1') { exit 1 }
    # fail-open: notify 훅 체인은 계속 진행 (에러는 이미 기록됨)
}

Write-DebugLog "saved: baseDir=$baseDir, file=$convFile, userLen=$($userText.Length), respLen=$($response.Length), turnId=$turnId"
$hookSummary = Invoke-CodexHookBridge -BaseDir $baseDir -PayloadObject $payload
$hookWarnings = 0
$hookErrors = 0
try { $hookWarnings = [int]$hookSummary.warnings } catch {}
try { $hookErrors = [int]$hookSummary.errors } catch {}

$notifyTitle = "Codex CLI"
$notifyMessage = "작업이 완료되었습니다"
if ($hookErrors -gt 0) {
    $notifyTitle = "Codex Hook Alert"
    $notifyMessage = "작업 완료, hook 오류 $hookErrors개"
    if ($hookWarnings -gt 0) {
        $notifyMessage += " / 경고 $hookWarnings개"
    }
} elseif ($hookWarnings -gt 0) {
    $notifyMessage = "작업 완료, hook 경고 $hookWarnings개"
}
Invoke-NotificationHook -Title $notifyTitle -Message $notifyMessage

# ─────────────────────────────────────────────
# Gotchas/Learned 관찰 기록 (memory/gotchas/ + memory/learned/)
# 응답 텍스트에서 에러/성공 패턴을 감지하여 observations.jsonl에 기록
# ─────────────────────────────────────────────
if ($response -and $baseDir) {
    $hasError = $response -match '(?i)(error|fail|exception|denied|not found|cannot|unable|ENOENT|ERR_|실패|오류)'
    $secretPattern = '(?i)(api[_-]?key|token|secret|password|authorization)["''\s:=]+[A-Za-z0-9_\-/.+=]{8,}'
    $safeResponse = $response
    if ($safeResponse.Length -gt 3000) { $safeResponse = $safeResponse.Substring(0, 3000) + "...[truncated]" }
    $safeResponse = $safeResponse -replace $secretPattern, '$1: [REDACTED]'
    $safeUser = if ($userText) { $userText } else { "" }
    if ($safeUser.Length -gt 1000) { $safeUser = $safeUser.Substring(0, 1000) + "...[truncated]" }

    # PS 5.1 호환: Join-Path는 3개 인수 미지원. 중첩 호출로 처리.
    $memoryDir = Join-Path $baseDir "memory"
    if ($hasError) {
        $obsTargetDir = Join-Path $memoryDir "gotchas"
        $obsEventType = "turn_error"
    } else {
        $obsTargetDir = Join-Path $memoryDir "learned"
        $obsEventType = "turn_success"
    }

    if (-not (Test-Path $obsTargetDir)) {
        New-Item -ItemType Directory -Path $obsTargetDir -Force | Out-Null
    }
    $obsFile = Join-Path $obsTargetDir "observations.jsonl"
    $obs = @{
        timestamp = (Get-Date -Format "o")
        event = $obsEventType
        cli = "codex"
        input = $safeUser
        output = $safeResponse
        session = if ($turnId) { $turnId } else { "unknown" }
    } | ConvertTo-Json -Compress
    [System.IO.File]::AppendAllText($obsFile, "$obs`n", $Utf8NoBom)

    # 파일 크기 제한 (10MB)
    if ((Test-Path $obsFile) -and ((Get-Item $obsFile).Length / 1MB) -ge 10) {
        $archiveDir = Join-Path $obsTargetDir "archive"
        if (-not (Test-Path $archiveDir)) { New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null }
        Move-Item $obsFile (Join-Path $archiveDir "observations-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').jsonl") -Force
    }
}

$chronosContinue = Join-Path $HOME ".codex\skills\auto-continue-loop\scripts\continue-loop.ps1"
if (Test-Path $chronosContinue) {
    try {
        ($payload | ConvertTo-Json -Compress -Depth 20) | & $chronosContinue
    } catch {
        Write-DebugLog "chronos-chain-failed: $($_.Exception.Message)"
    }
}
