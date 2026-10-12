# save-turn.ps1 - Codex notify orchestrator
# store-turn.js가 한 턴의 전체 입력·답변·표식을 함께 저장한다.

# 저장 opt-out: MNEMO_DISABLE=1|true|yes 면 mnemo 자동 저장 전체 비활성화 (개인정보처리방침 거부 방법)
if ($env:MNEMO_DISABLE -match '^(1|true|yes)$') { exit 0 }

[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# BOM 없는 UTF-8 인코더 (PS의 [System.Text.Encoding]::UTF8은 BOM 포함이라 사용 안 함)
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
$CodexHome = if ($env:CODEX_HOME) {
    [System.IO.Path]::GetFullPath($env:CODEX_HOME)
} else {
    Join-Path $HOME ".codex"
}

function Write-DebugLog([string]$message) {
    try {
        $debugDir = Join-Path $CodexHome "hooks"
        if (-not (Test-Path $debugDir)) {
            New-Item -ItemType Directory -Path $debugDir -Force | Out-Null
        }
        $debugFile = Join-Path $debugDir "save-turn-debug.log"
        $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
        [System.IO.File]::AppendAllText($debugFile, $line + [Environment]::NewLine, $Utf8NoBom)
    } catch {}
}

# P1 parity: Claude/Antigravity와 공유하는 mnemo-errors.log에 에러급 실패를 기록한다.
# Write-DebugLog는 Codex 전용 디버그 trace이고, 사용자에게 가시화할 에러는
# 프로젝트의 .claude/mnemo-errors.log로 통합된다 (SessionStart 배너에서 집계됨).
function Write-MnemoError {
    param([string]$Context, [string]$Message)
    try {
        if (-not $baseDir) { return }
        $root = $baseDir
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

function Resolve-MnemoProjectRoot($Payload) {
    $helper = Join-Path $PSScriptRoot 'mnemo-project-root.js'
    if (-not (Test-Path -LiteralPath $helper)) { $helper = Join-Path $PSScriptRoot '../../../hooks/mnemo-project-root.js' }
    if (-not (Test-Path -LiteralPath $helper)) { return $null }
    try {
        $result = ($Payload | ConvertTo-Json -Compress -Depth 40) | & node $helper --codex 2>$null
        if ($LASTEXITCODE -eq 0 -and $result) { return "$result".Trim() }
    } catch {}
    return $null
}

# reconcile_codex_conversations.py SessionMeta.is_subagent와 같은 규칙.
# 2026-10 실측(세션 6,386개): agent_path·parent_thread_id·forked_from_id·thread_source=subagent는
# 모두 source가 객체인 세션에서만 나오고, source 객체만 있는 하위 에이전트 세션도 있다.
function Test-SubagentSessionMeta($meta) {
    if ($null -eq $meta) { return $false }
    $source = $null
    try { $source = $meta.PSObject.Properties['source'].Value } catch {}
    if ($source -is [System.Management.Automation.PSCustomObject]) { return $true }
    foreach ($key in @('agent_path', 'parent_thread_id', 'forked_from_id')) {
        if ((Get-String $meta $key).Trim()) { return $true }
    }
    return ((Get-String $meta 'thread_source') -eq 'subagent')
}

# 세션 파일의 첫 session_meta payload. 옛 하위 에이전트 파일에는 부모 session_meta가 둘째로 붙어 있어 첫 것만 본다.
function Read-SessionMeta([string]$path) {
    if (-not $path) { return $null }
    $reader = $null
    try {
        $stream = [System.IO.FileStream]::new($path, 'Open', 'Read', 'ReadWrite')
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
        for ($i = 0; $i -lt 3; $i++) {
            $line = $reader.ReadLine()
            if ($null -eq $line) { break }
            $o = Parse-JsonSafe $line
            if ($o -and "$($o.type)" -eq 'session_meta') { return $o.payload }
        }
    } catch {
    } finally {
        if ($reader) { $reader.Dispose() }
    }
    return $null
}

# notify의 thread-id로 그 스레드의 세션 파일(sessions/yyyy/MM/dd/rollout-…-<thread-id>.jsonl)을 찾는다.
function Find-ThreadSessionFile([string]$threadId) {
    if ($threadId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { return $null }
    $sessionRoot = Join-Path $CodexHome "sessions"
    if (-not (Test-Path -LiteralPath $sessionRoot)) { return $null }
    $pattern = "*-$threadId.jsonl"
    try {
        if ($threadId[14] -eq '7') {
            # UUIDv7 앞 48비트는 생성 시각(ms)이고 세션 파일은 그 로컬 날짜 폴더에 생긴다(2026-10 실측 6,388개 모두 일치).
            # 그날과 앞뒤 하루만 보면 세션이 수천 개여도 몇 ms에 끝난다. 없으면(세션을 남기지 않는 codex exec 등)
            # 전체를 뒤지지 않고 null을 돌려 지금처럼 저장한다.
            $ms = [Convert]::ToInt64($threadId.Replace('-', '').Substring(0, 12), 16)
            $day = [DateTimeOffset]::FromUnixTimeMilliseconds($ms).LocalDateTime.Date
            $inv = [System.Globalization.CultureInfo]::InvariantCulture
            foreach ($offset in @(0, -1, 1)) {
                $d = $day.AddDays($offset)
                $dir = [System.IO.Path]::Combine($sessionRoot, $d.ToString('yyyy', $inv), $d.ToString('MM', $inv), $d.ToString('dd', $inv))
                if (-not [System.IO.Directory]::Exists($dir)) { continue }
                $hit = [System.IO.Directory]::GetFiles($dir, $pattern)
                if ($hit.Count -gt 0) { return $hit[0] }
            }
            return $null
        }
        foreach ($file in [System.IO.Directory]::EnumerateFiles($sessionRoot, $pattern, [System.IO.SearchOption]::AllDirectories)) {
            return $file
        }
    } catch {}
    return $null
}

function Select-SessionFile([string]$preferredCwd) {
    $sessionRoot = Join-Path $CodexHome "sessions"
    if (-not (Test-Path $sessionRoot)) { return $null }
    $files = Get-ChildItem -Path $sessionRoot -Recurse -Filter "*.jsonl" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 20
    if (-not $files -or $files.Count -eq 0) { return $null }

    $prefNorm = Normalize-PathSafe $preferredCwd
    if (-not $prefNorm) { return $null }

    foreach ($f in $files) {
        try {
            $head = Get-Content -Path $f.FullName -TotalCount 3 -Encoding UTF8 -ErrorAction SilentlyContinue
            foreach ($line in $head) {
                $o = Parse-JsonSafe $line
                if (-not $o) { continue }
                if ("$($o.type)" -eq "session_meta") {
                    # 하위 에이전트 세션의 user 메시지는 AGENTS.md 주입뿐이라 대체 원천이 될 수 없다
                    if (Test-SubagentSessionMeta $o.payload) { break }
                    $cwd = Normalize-PathSafe (Get-String $o.payload "cwd")
                    if ($cwd -and ($cwd -eq $prefNorm)) {
                        return $f.FullName
                    }
                }
            }
        } catch {}
    }

    return $null
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
        foreach ($category in @("architecture", "patterns", "tools", "gotchas")) {
            if (Test-Path (Join-Path $memoryDir "$category/index.md") -PathType Leaf) {
                $memoryContent = $memoryContent.Replace("memory/$category.md", "memory/$category/index.md")
            }
        }
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
        $splitDir = Join-Path $memoryDir ([System.IO.Path]::GetFileNameWithoutExtension($fileName))
        if (Test-Path (Join-Path $splitDir "index.md") -PathType Leaf) { continue }
        if (-not (Test-Path $filePath)) {
            [System.IO.File]::WriteAllText($filePath, $categoryFiles[$fileName].TrimStart(), $Utf8NoBom)
        }
    }
}

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
        # stdin 워치독 v2 (gotcha 063): notify는 payload를 argv로 전달하므로 stdin은 fallback일 뿐 —
        # stdin이 열린 채 닫히지 않으면 무한 대기(좀비 프로세스)가 되므로 15초로 제한.
        # 기존 StreamReader.ReadToEndAsync + Wait는 PS 5.1에서 동기 블로킹되어 워치독이 무효였음
        # (실측: EOF까지 대기) → raw stream ReadAsync(byte[]) chunk 루프 + deadline만 진짜 비동기.
        # 주의: 워치독 초과 시 계속 진행 금지 — 미완료 stdin read가 남은 상태에서
        # native 명령(git 등)을 호출하면 PS 5.1의 stdin 전달 대기에 걸려 행이 된다 (실측 재현).
        $mnemoDeadline = [DateTime]::UtcNow.AddSeconds(15)
        $mnemoStdin = [Console]::OpenStandardInput()
        $mnemoBuf = New-Object System.IO.MemoryStream
        $mnemoChunk = New-Object byte[] 65536
        $mnemoTimedOut = $false
        while ($true) {
            $mnemoReadTask = $mnemoStdin.ReadAsync($mnemoChunk, 0, $mnemoChunk.Length)
            $mnemoRemainMs = [int][Math]::Max(0, ($mnemoDeadline - [DateTime]::UtcNow).TotalMilliseconds)
            if (-not $mnemoReadTask.Wait($mnemoRemainMs)) { $mnemoTimedOut = $true; break }
            if ($mnemoReadTask.Result -le 0) { break }
            $mnemoBuf.Write($mnemoChunk, 0, $mnemoReadTask.Result)
        }
        if ($mnemoTimedOut) {
            Write-DebugLog "stdin watchdog timeout (15s) — fail-open exit"
            exit 0
        }
        $payload = Parse-JsonSafe ([System.Text.Encoding]::UTF8.GetString($mnemoBuf.ToArray()))
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

# legacy notify는 하위 에이전트 턴에도 실행되는데 입력에 그 표시가 없다. 2026-10-11 실측: 하위 에이전트
# 턴의 thread-id는 하위 에이전트 자신의 세션 id이고 input-messages는 []이다. 그 세션 파일의 session_meta로
# 알아보고 대화 기록·관찰 기록·chronos 이어가기를 건너뛴다(이어가기가 부모 턴 도중 resume을 띄우지 않게).
# 하위 에이전트가 고친 파일 검사(hook bridge)는 전처럼 돈다. 세션 파일을 못 찾으면 전처럼 저장한다.
$threadId = (Get-String $payload 'thread-id').Trim()
if (-not $threadId) { $threadId = (Get-String $payload 'thread_id').Trim() }
$threadSessionFile = Find-ThreadSessionFile $threadId
if ($threadSessionFile -and (Test-SubagentSessionMeta (Read-SessionMeta $threadSessionFile))) {
    Write-DebugLog "skip: subagent turn, thread=$threadId, turnId=$turnId"
    $baseDir = Resolve-MnemoProjectRoot $payload
    if ($baseDir) { Invoke-CodexHookBridge -BaseDir $baseDir -PayloadObject $payload | Out-Null }
    exit 0
}

$baseDir = Resolve-MnemoProjectRoot $payload
if (-not $baseDir) { exit 0 }
if (-not (Test-Path -LiteralPath (Join-Path $baseDir '.mnemo-root'))) {
    [System.IO.File]::WriteAllText((Join-Path $baseDir '.mnemo-root'), '', $Utf8NoBom)
}

Ensure-MemoryScaffold $baseDir

$storeHelper = Join-Path $PSScriptRoot 'store-turn.js'
$sessionFile = $threadSessionFile
# thread-id가 없는 옛 알림만 같은 cwd의 루트 세션을 대체 원천으로 찾는다.
if (-not $threadId) { $sessionFile = Select-SessionFile (Get-String $payload 'cwd') }
$stored = $null
try {
    $storeJson = ($payload | ConvertTo-Json -Compress -Depth 40) | & node $storeHelper $baseDir "$sessionFile"
    $stored = Parse-JsonSafe ($storeJson -join "`n")
    if (-not $stored) { throw 'store-turn returned no result' }
} catch {
    Write-MnemoError -Context 'conv-append' -Message "완료 턴 저장 실패: $($_.Exception.Message)"
    if ($env:MNEMO_STRICT -eq '1') { exit 1 }
}
$userText = "$($stored.userText)"
$response = "$($stored.response)"
if ($stored.status -eq 'duplicate') {
    Write-DebugLog "skip: duplicate turnId=$turnId"
    exit 0
}
if ($stored.status -eq 'empty') { Write-DebugLog 'skip: empty turn'; exit 0 }
if ($stored.status -eq 'saved') {
    Write-DebugLog "saved: baseDir=$baseDir, userCount=$($stored.userCount), userLen=$($userText.Length), respLen=$($response.Length), turnId=$turnId, flushed=$($stored.savedCount)"
} elseif ($stored) {
    Write-MnemoError -Context 'conv-append' -Message "완료 턴 저장 대기: $($stored.error); pending=$($stored.pendingFile)"
    if ($env:MNEMO_STRICT -eq '1') { exit 1 }
}
$hookSummary = Invoke-CodexHookBridge -BaseDir $baseDir -PayloadObject $payload

# ─────────────────────────────────────────────
# Gotchas/Learned 관찰 기록 (memory/gotchas/ + memory/learned/)
# 응답 텍스트에서 에러/성공 패턴을 감지하여 observations.jsonl에 기록
# ─────────────────────────────────────────────
if ($response -and $baseDir) {
    # 턴 텍스트에 error라는 단어가 있다는 이유로 실패로 보면, 에러를 '설명한' 응답까지
    # gotchas로 들어간다. 줄 머리의 에러 형태만 실패로 본다 (Claude 훅과 같은 규칙).
    $errorShape = '(?im)^\s*(?:(?:fatal|error|err)\s*:|Traceback \(most recent call last\)|' +
                  '[A-Za-z_.]*(?:Error|Exception)\s*:|' +
                  '(?:bash|sh|cmd|zsh)?:?[^\n]{0,40}(?:command not found|No such file or directory|Permission denied)|' +
                  'ENOENT|ERR_[A-Z_]+|npm ERR!|error TS\d+|error CS\d+)'
    $hasError = $response -match $errorShape
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

    # MNEMO_ROTATION_START
    # 기준값이 없거나 잘못됐으면 상태 알림의 초기화 이후에 회전한다.
    if ((Test-Path -LiteralPath $obsFile) -and (Get-Item -LiteralPath $obsFile).Length -ge 10MB) {
        $rotationMarker = Join-Path (Split-Path $obsTargetDir -Parent) ".mnemo-distill-offset"
        $rotationText = if (Test-Path -LiteralPath $rotationMarker) { [IO.File]::ReadAllText($rotationMarker).Trim() } else { "" }
        if ($rotationText -match '^(-?\d+)\s+(-?\d+)\s+(\d+)$') {
            $rotationG = [long]$Matches[1]; $rotationL = [long]$Matches[2]; $rotationRef = $Matches[3]
            $rotationCount = [long]0
            foreach ($line in [IO.File]::ReadLines($obsFile)) { $rotationCount++ }
            if ((Split-Path $obsTargetDir -Leaf) -eq "gotchas") { $rotationG -= $rotationCount } else { $rotationL -= $rotationCount }
            $archiveDir = Join-Path $obsTargetDir "archive"
            [IO.Directory]::CreateDirectory($archiveDir) | Out-Null
           $archiveFile = Join-Path $archiveDir ("observations-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + [guid]::NewGuid().ToString("N") + ".jsonl")
            $rotationTemp = $rotationMarker + "." + [guid]::NewGuid().ToString("N") + ".tmp"
           Move-Item -LiteralPath $obsFile -Destination $archiveFile -ErrorAction Stop
           try {
                [IO.File]::WriteAllText($rotationTemp, "$rotationG $rotationL $rotationRef", $Utf8NoBom)
                Move-Item -LiteralPath $rotationTemp -Destination $rotationMarker -Force -ErrorAction Stop
           } catch {
               Move-Item -LiteralPath $archiveFile -Destination $obsFile -ErrorAction Stop
               throw
            } finally {
                if (Test-Path -LiteralPath $rotationTemp) { Remove-Item -LiteralPath $rotationTemp -Force }
           }
        }
    }
    # MNEMO_ROTATION_END
}

$chronosContinue = Join-Path $CodexHome "skills\auto-continue-loop\scripts\continue-loop.ps1"
if (Test-Path $chronosContinue) {
    $chronosPayloadFile = $null
    try {
        $chronosPayloadFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText(
            $chronosPayloadFile,
            ($payload | ConvertTo-Json -Compress -Depth 20),
            $Utf8NoBom
        )
        & $chronosContinue $chronosPayloadFile
    } catch {
        Write-DebugLog "chronos-chain-failed: $($_.Exception.Message)"
    } finally {
        if ($chronosPayloadFile -and (Test-Path $chronosPayloadFile)) {
            Remove-Item $chronosPayloadFile -Force -ErrorAction SilentlyContinue
        }
    }
}

# ── mnemo status notify (LLM 호출 X, 비용 0) ──────────────────
# delta(마지막 정제 이후 새 raw) 200건 또는 마지막 핸드오프 14일 초과 시 status 파일 + stderr 안내.
function Notify-MnemoStatus {
    param([string]$Root)
    try {
        $gJsonl = Join-Path $Root 'memory\gotchas\observations.jsonl'
        $lJsonl = Join-Path $Root 'memory\learned\observations.jsonl'
        $handoffDir = Join-Path $Root 'docs\handoffs'

        $gCount = 0; $lCount = 0
        if (Test-Path $gJsonl) {
            $gCount = (Get-Content $gJsonl -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
        }
        if (Test-Path $lJsonl) {
            $lCount = (Get-Content $lJsonl -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
        }
        $total = $gCount + $lCount

        $days = 999
        if (Test-Path $handoffDir) {
            $latest = Get-ChildItem -Path $handoffDir -Filter '*.md' -ErrorAction SilentlyContinue |
                Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($latest) {
                $days = [int](((Get-Date) - $latest.LastWriteTime).TotalDays)
            }
        }

        # --- delta 기반 판정 (cumulative total -> 마지막 정제 이후 delta) ---
        # observations.jsonl은 절대 비워지지 않아 누적 total로 판정하면 한 번 임계를 넘긴 뒤
        # 영구히 경고가 뜬다. gotchas/learned 정제 .md의 최신 mtime이 마커보다 새로우면
        # 정제가 일어난 것으로 보고 baseline을 현재 누적값으로 리셋한다.
        $markerFile = Join-Path $Root 'memory\.mnemo-distill-offset'
        $refEpoch = 0
        foreach ($sub in @('gotchas', 'learned')) {
            $subDir = Join-Path $Root "memory\$sub"
            if (Test-Path $subDir) {
                Get-ChildItem -Path $subDir -Filter '*.md' -ErrorAction SilentlyContinue | ForEach-Object {
                    $e = [int64]([DateTimeOffset]$_.LastWriteTimeUtc).ToUnixTimeSeconds()
                    if ($e -gt $refEpoch) { $refEpoch = $e }
                }
            }
        }
        $baseG = 0; $baseL = 0; $markerRef = -1; $markerValid = $false
        if (Test-Path $markerFile) {
            try {
                $parts = ((Get-Content $markerFile -Raw -ErrorAction SilentlyContinue).Trim() -split '\s+')
                if ($parts.Count -eq 3) { $baseG = [int64]$parts[0]; $baseL = [int64]$parts[1]; $markerRef = [int64]$parts[2]; $markerValid = $markerRef -ge 0 }
            } catch { $markerValid = $false }
        }
        if (-not $markerValid -or $refEpoch -gt $markerRef) {
            $baseG = $gCount; $baseL = $lCount
            try { [System.IO.File]::WriteAllText($markerFile, "$gCount $lCount $refEpoch", (New-Object System.Text.UTF8Encoding $false)) } catch {}
        }
        $delta = ($gCount - $baseG) + ($lCount - $baseL)
        if ($delta -lt 0) { $delta = 0 }
        # 임계: 마지막 정제 이후 새 관찰 200건 또는 마지막 핸드오프 14일 초과
        if ($delta -lt 200 -and $days -lt 14) {
            $sf = Join-Path $Root 'memory\.mnemo-status.md'
            if (Test-Path $sf) { Remove-Item $sf -Force -ErrorAction SilentlyContinue }
            return
        }

        $statusDir = Join-Path $Root 'memory'
        if (-not (Test-Path $statusDir)) {
            New-Item -ItemType Directory -Path $statusDir -Force -ErrorAction SilentlyContinue | Out-Null
        }
        $statusFile = Join-Path $statusDir '.mnemo-status.md'
        $now = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        $content = "# mnemo status`n`n- 새 관찰(정제 이후): **$delta** / 누적 **$total** (gotchas $gCount + learned $lCount)`n- last handoff: **${days}일 전**`n- 권장: 카탈로그의 source-only ``memory-distill`` 모듈을 직접 읽어 rebuild 또는 핸드오프`n- updated: $now`n"
        [System.IO.File]::WriteAllText($statusFile, $content, $Utf8NoBom)
        [Console]::Error.WriteLine("[mnemo] 새 관찰 $delta 건(누적 $total) / 마지막 핸드오프 $days 일 전 -> source-only memory-distill 모듈을 직접 읽어 rebuild 권장")
    } catch {
        Write-DebugLog "mnemo-notify-failed: $($_.Exception.Message)"
    }
}

Notify-MnemoStatus -Root $baseDir
