# save-tool-use.ps1 - PostToolUse 훅: 도구 호출을 한 줄로 기록
# 도구명 + 파일경로만 append. AI 호출 없음 = 빠름
# claude-mem의 관찰 캡처 아이디어를 차용하되, 파일 기반으로 단순 구현

# UTF-8 인코딩 설정 (BOM 없음)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

try {
    $json = [Console]::In.ReadToEnd() | ConvertFrom-Json
} catch {
    exit 0
}
if (-not $json) { exit 0 }

$toolName = $json.tool_name
$toolInput = $json.tool_input

# 기록하지 않을 도구 (너무 빈번하거나 노이즈)
$skipTools = @("Glob", "Grep", "Read", "LS", "TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskOutput")
if ($skipTools -contains $toolName) { exit 0 }

# 프로젝트 루트 결정: git root → 없으면 CWD fallback
$ProjectRoot = $PWD.Path
try {
    $gitRoot = git rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0 -and $gitRoot) {
        $ProjectRoot = $gitRoot.Replace('/', '\')
    }
} catch {}

# 대화 로그 경로
$ConvDir = Join-Path $ProjectRoot "conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$LogFile = Join-Path $ConvDir "$Today-toollog.md"

# conversations 폴더 자동 생성
if (-not (Test-Path $ConvDir)) {
    New-Item -ItemType Directory -Path $ConvDir -Force | Out-Null
}

# 파일 없으면 헤더
if (-not (Test-Path $LogFile)) {
    $Header = @"
---
date: $Today
type: tool-log
---

# Tool Usage Log - $Today

"@
    [System.IO.File]::WriteAllText($LogFile, $Header, [System.Text.Encoding]::UTF8)
}

# 도구별 핵심 정보 추출
$detail = ""
switch ($toolName) {
    "Edit"    { $detail = $toolInput.file_path }
    "Write"   { $detail = $toolInput.file_path }
    "Bash"    {
        $cmd = "$($toolInput.command)"
        # 명령어 첫 80자만
        if ($cmd.Length -gt 80) { $cmd = $cmd.Substring(0, 80) + "..." }
        $detail = $cmd
    }
    "Agent"   { $detail = "$($toolInput.subagent_type): $($toolInput.description)" }
    "Skill"   { $detail = $toolInput.skill }
    "WebFetch"   { $detail = $toolInput.url }
    "WebSearch"  { $detail = $toolInput.query }
    default   { $detail = "" }
}

$ts = Get-Date -Format 'HH:mm:ss'
$entry = "- ``[$ts]`` **$toolName** $detail`n"

# 중복 방지: 같은 초에 같은 도구+내용이 있으면 스킵
if (Test-Path $LogFile) {
    $existing = Get-Content $LogFile -Raw -Encoding UTF8
    $fingerprint = "[$ts]`` **$toolName**"
    if ($existing.Contains($fingerprint)) { exit 0 }
}

[System.IO.File]::AppendAllText($LogFile, $entry, [System.Text.Encoding]::UTF8)

# ─────────────────────────────────────────────
# 학습 관찰 기록 (memory/gotchas/ + memory/learned/)
# 에러 → gotchas, 성공 → learned 에 각각 기록
# ─────────────────────────────────────────────

try {
    $toolOutput = $json.tool_response
    if (-not $toolOutput) { $toolOutput = $json.tool_output }
    if (-not $toolOutput) { $toolOutput = $json.output }

    $outputStr = ""
    if ($toolOutput) { $outputStr = "$toolOutput" }

    $hasError = $outputStr -match '(?i)(error|fail|exception|denied|not found|cannot|unable|ENOENT|ERR_)'

    $secretPattern = '(?i)(api[_-]?key|token|secret|password|authorization)["\s:=]+[A-Za-z0-9_\-/.+=]{8,}'
    $inputStr = ""
    if ($toolInput) { $inputStr = ($toolInput | ConvertTo-Json -Compress -Depth 3) }
    if ($inputStr.Length -gt 3000) { $inputStr = $inputStr.Substring(0, 3000) + "...[truncated]" }
    if ($outputStr.Length -gt 3000) { $outputStr = $outputStr.Substring(0, 3000) + "...[truncated]" }
    $inputStr = $inputStr -replace $secretPattern, '$1: [REDACTED]'
    $outputStr = $outputStr -replace $secretPattern, '$1: [REDACTED]'

    $sessionId = "unknown"
    if ($json.session_id) { $sessionId = $json.session_id }

    $targetDir = $null
    $eventType = $null

    if ($hasError) {
        $targetDir = Join-Path $ProjectRoot "memory" "gotchas"
        $eventType = "tool_error"
    } elseif ($toolName -in @("Edit", "Write", "Bash", "Agent", "Skill")) {
        $targetDir = Join-Path $ProjectRoot "memory" "learned"
        $eventType = "tool_success"
    }

    if ($targetDir) {
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }

        $obsFile = Join-Path $targetDir "observations.jsonl"

        $obs = @{
            timestamp = (Get-Date -Format "o")
            event = $eventType
            tool = $toolName
            input = $inputStr
            output = $outputStr
            session = $sessionId
        } | ConvertTo-Json -Compress

        [System.IO.File]::AppendAllText($obsFile, "$obs`n", [System.Text.Encoding]::UTF8)

        # 파일 크기 제한 (10MB 초과 시 아카이브)
        if ((Get-Item $obsFile -ErrorAction SilentlyContinue).Length / 1MB -ge 10) {
            $archiveDir = Join-Path $targetDir "archive"
            if (-not (Test-Path $archiveDir)) { New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null }
            $archiveTs = Get-Date -Format "yyyy-MM-dd-HHmmss"
            Move-Item $obsFile (Join-Path $archiveDir "observations-$archiveTs.jsonl") -Force
        }
    }
} catch {
    # 관찰 기록 실패해도 메인 기능에 영향 없음
}
