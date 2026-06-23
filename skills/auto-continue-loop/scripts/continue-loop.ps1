# continue-loop.ps1 - Codex notify 기반 Chronos 자동 재개

[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
$ErrorActionPreference = "Stop"

function Write-DebugLog([string]$message) {
    try {
        $debugDir = Join-Path $HOME ".codex\hooks"
        if (-not (Test-Path $debugDir)) {
            New-Item -ItemType Directory -Path $debugDir -Force | Out-Null
        }
        $debugFile = Join-Path $debugDir "chronos-continue.log"
        $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
        [System.IO.File]::AppendAllText($debugFile, $line + [Environment]::NewLine, [System.Text.Encoding]::UTF8)
    } catch {}
}

function Parse-JsonSafe([string]$text) {
    if (-not $text) { return $null }
    try { return ($text | ConvertFrom-Json) } catch { return $null }
}

function Get-PropertyValue($obj, [string]$name) {
    if ($null -eq $obj) { return $null }
    try {
        return $obj.PSObject.Properties[$name].Value
    } catch {
        return $null
    }
}

function Get-String($obj, [string]$name) {
    $value = Get-PropertyValue $obj $name
    if ($null -eq $value) { return "" }
    return "$value"
}

function Get-FirstString($obj, [string[]]$names) {
    foreach ($name in $names) {
        $value = Get-String $obj $name
        if ($value) { return $value.Trim() }
    }
    return ""
}

function Extract-Text($value) {
    if ($null -eq $value) { return "" }
    if ($value -is [string]) { return $value }
    if ($value -is [array]) {
        $parts = @()
        foreach ($item in $value) {
            $text = Extract-Text $item
            if ($text) { $parts += $text }
        }
        return ($parts -join "`n")
    }
    if ($value.PSObject.Properties["text"]) { return (Extract-Text $value.text) }
    if ($value.PSObject.Properties["content"]) { return (Extract-Text $value.content) }
    return "$value"
}

function Resolve-StateFile([string]$baseDir) {
    $candidates = @(
        (Join-Path $baseDir ".codex\loop-state.md"),
        (Join-Path $baseDir ".claude\loop-state.md"),
        (Join-Path $baseDir ".chronos\loop-state.md")
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return ""
}

function Get-FrontmatterMatch([string]$content) {
    return [regex]::Match($content, '(?s)^---\r?\n(.*?)\r?\n---')
}

function Get-FmValue([string]$frontmatter, [string]$key) {
    $match = [regex]::Match($frontmatter, "(?m)^${key}:\s*(.+)$")
    if ($match.Success) {
        return $match.Groups[1].Value.Trim().Trim('"')
    }
    return ""
}

function Upsert-FmValue([string]$content, [string]$key, [string]$rawValue) {
    $pattern = "(?m)^${key}:\s*.*$"
    if ($content -match $pattern) {
        return ([regex]::Replace($content, $pattern, "${key}: ${rawValue}", 1))
    }

    $match = Get-FrontmatterMatch $content
    if (-not $match.Success) { return $content }

    $insertAt = $match.Index + $match.Length - 3
    return $content.Insert($insertAt, "${key}: ${rawValue}`r`n")
}

function Escape-DoubleQuoted([string]$value) {
    if ($null -eq $value) { return "" }
    return ($value -replace '\\', '\\' -replace '"', '\"')
}

function Remove-StateFile([string]$path, [string]$reason) {
    try {
        Remove-Item $path -Force
        Write-DebugLog $reason
    } catch {
        Write-DebugLog "remove-state-failed: $path | $($_.Exception.Message)"
    }
}

function Should-StopLoop([string]$lastOutput, [string]$completionPromise) {
    if (-not $lastOutput) { return $false }

    # 느슨한 서술형 패턴은 진행 보고를 완료로 오인해 조기 종료시킨다.
    # 종료 계약은 'Chronos Complete' 마커와 <promise> 태그뿐.
    $donePatterns = @(
        'Chronos Complete'
    )

    foreach ($pattern in $donePatterns) {
        if ($lastOutput -match $pattern) {
            return $true
        }
    }

    if ($completionPromise -and $completionPromise -ne "null") {
        # (?s)로 여러 줄 promise도 매칭. 내용이 일치하지 않는 promise는 종료로 인정하지 않는다 —
        # 거짓/불일치 promise를 종료로 보상하면 검증 게이트가 무력화됨 (SKILL.md "거짓 promise 출력 금지"와 짝).
        $promiseMatch = [regex]::Match($lastOutput, '(?s)<promise>(.*?)</promise>')
        if ($promiseMatch.Success) {
            $promiseValue = $promiseMatch.Groups[1].Value.Trim()
            if ($promiseValue -eq $completionPromise -or $promiseValue -match [regex]::Escape($completionPromise) -or $completionPromise -match [regex]::Escape($promiseValue)) {
                return $true
            }
            Write-DebugLog "promise-mismatch: got '$promiseValue' expected '$completionPromise' — not a completion"
        }
    }

    return $false
}

$payload = ([Console]::In.ReadToEnd()).Trim()
if (-not $payload) {
    try {
        $pipelineParts = @()
        foreach ($item in $input) {
            if ($null -ne $item) { $pipelineParts += "$item" }
        }
        $payload = ($pipelineParts -join [Environment]::NewLine).Trim()
    } catch {}
}
if (-not $payload -and $args.Count -gt 0) {
    $candidate = $args[-1]
    if (Test-Path $candidate) {
        $payload = (Get-Content $candidate -Raw)
    } else {
        $payload = $candidate
    }
}

if (-not $payload) {
    exit 0
}

$hook = Parse-JsonSafe $payload
if (-not $hook) {
    Write-DebugLog "skip: invalid notify payload"
    exit 0
}

$baseDir = Get-FirstString $hook @("cwd", "working-directory", "working_directory", "project-root", "project_root", "workspace-root", "workspace_root")
if (-not $baseDir) {
    $baseDir = $PWD.Path
}
if (-not (Test-Path $baseDir)) {
    Write-DebugLog "skip: baseDir not found $baseDir"
    exit 0
}

# Codex notify payload can point at a subdirectory. Loop state is stored at the
# project root, so normalize before looking for .codex/.claude state files.
try {
    $gitRoot = & git -C $baseDir rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0 -and $gitRoot) {
        $normalizedRoot = $gitRoot.Replace('/', '\')
        if (Test-Path $normalizedRoot) {
            $baseDir = $normalizedRoot
        }
    }
} catch {}

$stateFile = Resolve-StateFile $baseDir
if (-not $stateFile) {
    exit 0
}

$content = Get-Content $stateFile -Raw
$frontmatterMatch = Get-FrontmatterMatch $content
if (-not $frontmatterMatch.Success) {
    Remove-StateFile $stateFile "invalid-state-frontmatter"
    exit 0
}

$frontmatter = $frontmatterMatch.Groups[1].Value
$iteration = Get-FmValue $frontmatter "iteration"
$maxIterations = Get-FmValue $frontmatter "max_iterations"
$completionPromise = Get-FmValue $frontmatter "completion_promise"
$stateSession = Get-FmValue $frontmatter "session_id"
$lastTurnId = Get-FmValue $frontmatter "last_turn_id"

$turnId = Get-FirstString $hook @("turn-id", "turn_id")
$hookSession = Get-FirstString $hook @("session-id", "session_id")
$assistantValue = Get-PropertyValue $hook "last-assistant-message"
if ($null -eq $assistantValue) {
    $assistantValue = Get-PropertyValue $hook "last_assistant_message"
}
$lastOutput = (Extract-Text $assistantValue).Trim()

if ($stateSession -and $hookSession -and $stateSession -ne $hookSession) {
    exit 0
}

if ($turnId -and $lastTurnId -and $turnId -eq $lastTurnId) {
    Write-DebugLog "skip: duplicate turn $turnId"
    exit 0
}

# Stale guard: 2시간 초과 시 자동 종료
$startedAt = Get-FmValue $frontmatter "started_at"
if ($startedAt) {
    try {
        $startTime = [DateTimeOffset]::Parse($startedAt)
        $elapsed = [DateTimeOffset]::UtcNow - $startTime
        if ($elapsed.TotalHours -ge 2) {
            Remove-StateFile $stateFile "stale-loop: $([int]$elapsed.TotalSeconds)s elapsed (>2h)"
            exit 0
        }
    } catch {
        # 파싱 실패 시 무시 — stale guard 비활성
    }
}

if ($iteration -notmatch '^\d+$' -or $maxIterations -notmatch '^\d+$') {
    Remove-StateFile $stateFile "invalid-state-counters"
    exit 0
}

$iter = [int]$iteration
$maxIter = [int]$maxIterations

if ($maxIter -gt 0 -and $iter -ge $maxIter) {
    Remove-StateFile $stateFile "loop-exhausted: max-iterations=$maxIter (not success)"
    exit 0
}

if (Should-StopLoop $lastOutput $completionPromise) {
    Remove-StateFile $stateFile "loop-complete: assistant signalled completion"
    exit 0
}

$promptText = $content.Substring($frontmatterMatch.Index + $frontmatterMatch.Length).Trim()
if (-not $promptText) {
    Remove-StateFile $stateFile "invalid-state-empty-prompt"
    exit 0
}

$nextIter = $iter + 1
$updatedContent = Upsert-FmValue $content "iteration" "$nextIter"
if ($turnId) {
    $updatedContent = Upsert-FmValue $updatedContent "last_turn_id" ('"' + (Escape-DoubleQuoted $turnId) + '"')
}
Set-Content -Path $stateFile -Value $updatedContent -NoNewline

$docsDir = Join-Path $baseDir "docs\chronos"
New-Item -ItemType Directory -Path $docsDir -Force | Out-Null

$maxLabel = if ($maxIter -gt 0) { "${maxIter}회" } else { "무제한" }
$resumePrompt = @(
    "Chronos auto-continue ${nextIter}/${maxLabel}",
    "",
    "Original task:",
    $promptText,
    "",
    "Continue from the current repository state.",
    "- Inspect the latest files, tests, logs, and diff before acting.",
    "- Promote the top actionable next step immediately instead of stopping.",
    "- Park blocked issues in docs/chronos/chronos-log.md with a reason ('Parked: {issue} - {reason}') and move on; parked issues do not count as actionable work.",
    "- Do not ask the user to continue.",
    "- Keep changes inside the saved scope and avoid unrelated refactors.",
    "- If no actionable in-scope work remains, output 'Chronos Complete' with the final report (one Owner Decision Brief per parked issue)."
)

if ($completionPromise -and $completionPromise -ne "null") {
    $resumePrompt += "- Only after the verification gate actually passes, output <promise>$completionPromise</promise>. Never output a promise that is not literally true."
}

if ($maxIter -gt 0 -and $nextIter -ge $maxIter) {
    $resumePrompt += "- NOTE: this is the final allowed iteration ($nextIter/$maxIter). If the work is not done, stop changing things and report the current state honestly as EXHAUSTED (incomplete): leave a requirement-to-evidence table, and do NOT output <promise> or 'Chronos Complete' unless the verification gate actually passed."
}

$resumePromptText = ($resumePrompt -join "`n")
$promptFile = Join-Path $docsDir ("codex-resume-{0}-{1}.prompt.txt" -f (Get-Date -Format "yyyyMMdd-HHmmss"), ([guid]::NewGuid().ToString("N").Substring(0, 8)))
$logFile = Join-Path $docsDir "codex-resume.log"
Set-Content -Path $promptFile -Value $resumePromptText -NoNewline

if ($env:CHRONOS_DRY_RUN -eq "1") {
    $previewFile = Join-Path $docsDir "codex-resume-preview.txt"
    Set-Content -Path $previewFile -Value $resumePromptText
    Write-DebugLog "dry-run: prepared resume prompt at $promptFile"
    exit 0
}

$codexCommand = Get-Command codex -ErrorAction SilentlyContinue
if (-not $codexCommand) {
    Write-DebugLog "skip: codex command not found"
    exit 0
}

$baseDirCmd = $baseDir.Replace('"', '""')
$promptFileCmd = $promptFile.Replace('"', '""')
$logFileCmd = $logFile.Replace('"', '""')
$resumeCommand = 'cd /d "{0}" && codex exec --skip-git-repo-check resume --last - < "{1}" >> "{2}" 2>&1 && del /q "{1}"' -f $baseDirCmd, $promptFileCmd, $logFileCmd

try {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/d", "/c", $resumeCommand -WindowStyle Hidden | Out-Null
    Write-DebugLog "spawned: turn=$turnId next=$nextIter state=$stateFile"
} catch {
    Write-DebugLog "spawn-failed: $($_.Exception.Message)"
}
