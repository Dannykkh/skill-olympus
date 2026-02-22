# save-turn.ps1 - Codex notify orchestrator
# Role split:
# - append-user.ps1: persist user message
# - append-assistant.ps1: persist assistant message

[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

function Write-DebugLog([string]$message) {
    try {
        $debugDir = Join-Path $HOME ".codex\hooks"
        if (-not (Test-Path $debugDir)) {
            New-Item -ItemType Directory -Path $debugDir -Force | Out-Null
        }
        $debugFile = Join-Path $debugDir "save-turn-debug.log"
        $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
        [System.IO.File]::AppendAllText($debugFile, $line + [Environment]::NewLine, [System.Text.Encoding]::UTF8)
    } catch {}
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
    [System.IO.File]::WriteAllText($convFile, $header, [System.Text.Encoding]::UTF8)
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
Add-CodexUserEntry -ConvFile $convFile -Timestamp $ts -UserText $userText
Add-CodexAssistantEntry -ConvFile $convFile -Timestamp $ts -Response $response

if ($turnId) {
    [System.IO.File]::AppendAllText($convFile, "<!-- turn:$turnId -->`n", [System.Text.Encoding]::UTF8)
} else {
    $sig = Get-Sha1 ("$userText`n---`n$response")
    if ($sig) {
        [System.IO.File]::AppendAllText($convFile, "<!-- turnhash:$sig -->`n", [System.Text.Encoding]::UTF8)
    }
}

Write-DebugLog "saved: baseDir=$baseDir, file=$convFile, userLen=$($userText.Length), respLen=$($response.Length), turnId=$turnId"
