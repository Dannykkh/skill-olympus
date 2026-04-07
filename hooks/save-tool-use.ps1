# save-tool-use.ps1 - PostToolUse 훅: 도구 호출을 한 줄로 기록
# 도구명 + 파일경로만 append. AI 호출 없음 = 빠름
# claude-mem의 관찰 캡처 아이디어를 차용하되, 파일 기반으로 단순 구현
#
# 에러 처리 (P1 parity):
# - 정상 skip 케이스(빈 stdin, skipTools): 조용히 exit 0
# - 진짜 실패(파싱 에러): .claude/mnemo-errors.log 기록 후 exit 0
# - $env:MNEMO_STRICT='1' 이면 실패 시 exit 1

# UTF-8 인코딩 설정 (BOM 없음)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# BOM 없는 UTF-8 인코더 (PS의 [System.Text.Encoding]::UTF8은 BOM 포함이라 사용 안 함)
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

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
        $line = "[$ts] [save-tool-use.ps1] [$Context] $Message`r`n"
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::AppendAllText($logPath, $line, $utf8NoBom)
    } catch {}
}

function Exit-MnemoError {
    param([string]$Context, [string]$Message)
    Write-MnemoError -Context $Context -Message $Message
    if ($env:MNEMO_STRICT -eq '1') { exit 1 }
    exit 0
}

# ── 프로젝트 루트 결정 (save-response.ps1과 동일 로직) ──────────
function Get-ClaudeProjectRoot {
    param([string]$TranscriptPath)

    if ($TranscriptPath -and (Test-Path $TranscriptPath)) {
        try {
            $lines = Get-Content $TranscriptPath -Tail 200 -Encoding UTF8 -ErrorAction SilentlyContinue
            $cwd = $null
            for ($i = $lines.Count - 1; $i -ge 0; $i--) {
                if ($lines[$i] -match '"cwd"\s*:\s*"((?:[^"\\]|\\.)*)"') {
                    $cwd = $Matches[1] -replace '\\\\', '\' -replace '\\"', '"'
                    break
                }
            }
            if ($cwd -and (Test-Path $cwd)) {
                try {
                    $gitRoot = & git -C $cwd rev-parse --show-toplevel 2>$null
                    if ($LASTEXITCODE -eq 0 -and $gitRoot) {
                        return $gitRoot.Replace('/', '\')
                    }
                } catch {}
                return $cwd
            }
        } catch {}
    }

    if ($TranscriptPath) {
        try {
            $parent = Split-Path -Leaf (Split-Path $TranscriptPath -Parent)
            if ($parent -match '^([A-Za-z])--(.+)$') {
                $drive = $Matches[1]
                $rest = $Matches[2] -replace '-', '\'
                $decoded = "${drive}:\$rest"
                if (Test-Path $decoded) {
                    try {
                        $gitRoot = & git -C $decoded rev-parse --show-toplevel 2>$null
                        if ($LASTEXITCODE -eq 0 -and $gitRoot) {
                            return $gitRoot.Replace('/', '\')
                        }
                    } catch {}
                    return $decoded
                }
            }
        } catch {}
    }

    $root = $PWD.Path
    try {
        $gitRoot = git rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -eq 0 -and $gitRoot) {
            $root = $gitRoot.Replace('/', '\')
        }
    } catch {}
    return $root
}

try {
    $rawInput = [Console]::In.ReadToEnd()
    if (-not $rawInput) { exit 0 }
    $json = $rawInput | ConvertFrom-Json
} catch {
    Exit-MnemoError -Context 'stdin-json' -Message "stdin JSON 파싱 실패: $($_.Exception.Message)"
}
if (-not $json) { exit 0 }

$toolName = $json.tool_name
$toolInput = $json.tool_input

# 기록하지 않을 도구 (너무 빈번하거나 노이즈)
$skipTools = @("Glob", "Grep", "Read", "LS", "TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskOutput", "TeamCreate", "TeamDelete", "SendMessage")
if ($skipTools -contains $toolName) { exit 0 }

# 프로젝트 루트 결정: JSONL cwd → transcript path 디코딩 → PWD fallback
$transcriptPath = $json.transcript_path
$ProjectRoot = Get-ClaudeProjectRoot -TranscriptPath $transcriptPath

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
    [System.IO.File]::WriteAllText($LogFile, $Header, $Utf8NoBom)
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

[System.IO.File]::AppendAllText($LogFile, $entry, $Utf8NoBom)

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

    # PS 5.1 호환: Join-Path는 3개 인수 미지원. 중첩 호출로 처리.
    $memoryDir = Join-Path $ProjectRoot "memory"
    if ($hasError) {
        $targetDir = Join-Path $memoryDir "gotchas"
        $eventType = "tool_error"
    } elseif ($toolName -in @("Edit", "Write", "Bash", "Agent", "Skill")) {
        $targetDir = Join-Path $memoryDir "learned"
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

        [System.IO.File]::AppendAllText($obsFile, "$obs`n", $Utf8NoBom)

        # 파일 크기 제한 (10MB 초과 시 아카이브)
        if ((Get-Item $obsFile -ErrorAction SilentlyContinue).Length / 1MB -ge 10) {
            $archiveDir = Join-Path $targetDir "archive"
            if (-not (Test-Path $archiveDir)) { New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null }
            $archiveTs = Get-Date -Format "yyyy-MM-dd-HHmmss"
            Move-Item $obsFile (Join-Path $archiveDir "observations-$archiveTs.jsonl") -Force
        }
    }
} catch {
    # 관찰 기록 실패해도 메인 기능에 영향 없음 — 그러나 로그에는 남김
    Write-MnemoError -Context 'observation' -Message $_.Exception.Message
}
