# sync-sessions.ps1
# Fallback autosave for Codex versions where notify hook is not fired reliably.
# Scans Codex session JSONL files and appends new user/assistant messages
# into per-project conversations/YYYY-MM-DD-codex.md files.

[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

function Parse-JsonSafe([string]$text) {
    if (-not $text) { return $null }
    try { return ($text | ConvertFrom-Json) } catch { return $null }
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
    return ""
}

function Ensure-ConversationFile([string]$cwd, [datetime]$when) {
    if (-not $cwd -or -not (Test-Path $cwd)) { return $null }
    try {
        $convDir = Join-Path $cwd "conversations"
        if (-not (Test-Path $convDir)) {
            New-Item -ItemType Directory -Path $convDir -Force -ErrorAction Stop | Out-Null
        }
        $dateKey = $when.ToString("yyyy-MM-dd")
        $convFile = Join-Path $convDir "$dateKey-codex.md"
        if (-not (Test-Path $convFile)) {
            $header = @"
---
date: $dateKey
project: $(Split-Path $cwd -Leaf)
keywords: []
summary: ""
---

# $dateKey

"@
            [System.IO.File]::WriteAllText($convFile, $header, [System.Text.Encoding]::UTF8)
        }
        return $convFile
    } catch {
        return $null
    }
}

function Normalize-AssistantText([string]$text) {
    if (-not $text) { return "" }
    $t = $text.Trim()
    if ($t.Length -lt 5) { return "" }
    return [regex]::Replace($t, '(?s)```.*?```', '[code block]')
}

function Load-State([string]$path) {
    if (-not (Test-Path $path)) { return @{} }
    $obj = Parse-JsonSafe (Get-Content -Path $path -Raw -Encoding UTF8)
    if (-not $obj) { return @{} }
    $map = @{}
    foreach ($p in $obj.PSObject.Properties) {
        $map[$p.Name] = $p.Value
    }
    return $map
}

function Save-State([string]$path, $state) {
    $dir = Split-Path $path -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $json = ($state | ConvertTo-Json -Depth 8)
    [System.IO.File]::WriteAllText($path, $json, [System.Text.Encoding]::UTF8)
}

function Normalize-PathSafe([string]$p) {
    if (-not $p) { return "" }
    try {
        return ([System.IO.Path]::GetFullPath($p)).TrimEnd('\').ToLowerInvariant()
    } catch {
        return $p.TrimEnd('\').ToLowerInvariant()
    }
}

$sessionRoot = Join-Path $HOME ".codex\sessions"
if (-not (Test-Path $sessionRoot)) { exit 0 }

$stateFile = Join-Path $HOME ".codex\hooks\sync-state.json"
$state = Load-State $stateFile

$targetsFile = Join-Path $HOME ".codex\hooks\sync-targets.txt"
$targets = @()
if (Test-Path $targetsFile) {
    $targets = Get-Content -Path $targetsFile -Encoding UTF8 -ErrorAction SilentlyContinue |
        ForEach-Object { Normalize-PathSafe $_ } |
        Where-Object { $_ } |
        Select-Object -Unique
}
if ($targets.Count -eq 0) { exit 0 }

$files = Get-ChildItem -Path $sessionRoot -Recurse -Filter "*.jsonl" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime |
    Select-Object -Last 60

foreach ($file in $files) {
    $key = $file.FullName
    $entry = $state[$key]
    if (-not $entry) {
        $entry = [pscustomobject]@{
            line = 0
            cwd = ""
        }
    }

    $processed = 0
    try { $processed = [int]$entry.line } catch { $processed = 0 }
    $cwd = ""
    try { $cwd = "$($entry.cwd)".Trim() } catch { $cwd = "" }

    $lines = Get-Content -Path $file.FullName -Encoding UTF8 -ErrorAction SilentlyContinue
    if (-not $lines) { continue }
    if ($processed -gt $lines.Count) { $processed = 0 }

    for ($i = $processed; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if (-not $line) { continue }
        $obj = Parse-JsonSafe $line
        if (-not $obj) { continue }

        if ("$($obj.type)" -eq "session_meta" -and -not $cwd) {
            try {
                $metaCwd = "$($obj.payload.cwd)".Trim()
                if ($metaCwd -and (Test-Path $metaCwd)) { $cwd = $metaCwd }
            } catch {}
            continue
        }

        if ("$($obj.type)" -ne "response_item") { continue }
        $payload = $obj.payload
        if ("$($payload.type)" -ne "message") { continue }

        $role = "$($payload.role)"
        if ($role -ne "user" -and $role -ne "assistant") { continue }
        if (-not $cwd -or -not (Test-Path $cwd)) { continue }
        if ($targets.Count -gt 0) {
            $cwdNorm = Normalize-PathSafe $cwd
            if ($targets -notcontains $cwdNorm) { continue }
        }

        $text = (Extract-Text $payload.content).Trim()
        if (-not $text) { continue }
        if ($role -eq "assistant") {
            $text = Normalize-AssistantText $text
            if (-not $text) { continue }
        }

        $dt = Get-Date
        try { $dt = [DateTime]::Parse("$($obj.timestamp)").ToLocalTime() } catch {}
        $convFile = Ensure-ConversationFile -cwd $cwd -when $dt
        if (-not $convFile) { continue }

        $ts = $dt.ToString("HH:mm:ss")
        $heading = if ($role -eq "assistant") { "Assistant" } else { "User" }
        $record = "`n## [$ts] $heading`n`n$text`n"
        try {
            [System.IO.File]::AppendAllText($convFile, $record, [System.Text.Encoding]::UTF8)
        } catch {}
    }

    $state[$key] = [pscustomobject]@{
        line = $lines.Count
        cwd = $cwd
    }
}

Save-State -path $stateFile -state $state
