# save-tool-use.ps1 - PostToolUse 훅: 도구 호출을 한 줄로 기록
# 도구명 + 파일경로만 append. AI 호출 없음 = 빠름
# claude-mem의 관찰 캡처 아이디어를 차용하되, 파일 기반으로 단순 구현
#
# 에러 처리 (P1 parity):
# - 정상 skip 케이스(빈 stdin, skipTools): 조용히 exit 0
# - 진짜 실패(파싱 에러): .claude/mnemo-errors.log 기록 후 exit 0
# - $env:MNEMO_STRICT='1' 이면 실패 시 exit 1

# Grok 세션 가드: Grok envelope는 camelCase(toolName)라 이 스크립트의 저장 경로가 오동작한다.
# 대화·관찰 저장은 grok-mnemo가 전담. 다만 post_tool_use에서는 앵커 조회만 수행한다 —
# Grok은 Claude와 같은 hookSpecificOutput.additionalContext 스키마를 받아들이고
# 모델에게 도구 결과 옆에 전달한다 (~/.grok/docs/user-guide/10-hooks.md "PostToolUse Output").
if ($env:GROK_HOOK_EVENT -and $env:GROK_HOOK_EVENT -ne "post_tool_use") { exit 0 }

# 저장 opt-out: MNEMO_DISABLE=1|true|yes 면 mnemo 자동 저장 전체 비활성화 (개인정보처리방침 거부 방법)
if ($env:MNEMO_DISABLE -match '^(1|true|yes)$') { exit 0 }

# UTF-8 인코딩 설정 (BOM 없음)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# BOM 없는 UTF-8 인코더 (PS의 [System.Text.Encoding]::UTF8은 BOM 포함이라 사용 안 함)
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Write-MnemoError {
    param([string]$Context, [string]$Message)
    try {
        if (-not $ProjectRoot) { return }
        $root = $ProjectRoot
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

# MNEMO_RELPATH_START
# 기록에 남기는 경로는 프로젝트 루트 기준 상대경로(슬래시 구분)로 쓴다. 루트 밖 경로는 그대로 둔다.
# 절대경로를 그대로 남기면 프로젝트를 옮기거나 다른 컴퓨터에서 열었을 때 기록이 옛 위치를 가리킨다.
# 대상은 file_path·notebook_path·path 필드뿐이다. command·content 같은 본문은 내용이므로 손대지 않는다.
function ConvertTo-MnemoRelativePath {
    param([string]$Path, [string]$Root)
    if (-not $Path -or -not $Root) { return $Path }
    $p = $Path -replace '\\', '/'
    $r = ($Root -replace '\\', '/').TrimEnd('/')
    # Windows 드라이브 경로만 대소문자를 무시한다. POSIX 경로는 대소문자가 다른 파일이다.
    $comparison = if ($r -match '^[A-Za-z]:/') { [System.StringComparison]::OrdinalIgnoreCase } else { [System.StringComparison]::Ordinal }
    if ($p.Equals($r, $comparison)) { return '.' }
    if ($p.StartsWith($r + '/', $comparison)) { return $p.Substring($r.Length + 1) }
    return $Path
}
function ConvertTo-MnemoRelativeInput {
    param($ToolInput, [string]$Root)
    if ($null -eq $ToolInput -or -not $Root) { return $ToolInput }
    foreach ($key in @('file_path', 'notebook_path', 'path')) {
        $prop = $ToolInput.PSObject.Properties[$key]
        if ($prop -and ($prop.Value -is [string])) { $prop.Value = ConvertTo-MnemoRelativePath -Path $prop.Value -Root $Root }
    }
    return $ToolInput
}
# MNEMO_RELPATH_END

try {
    $rawInput = [Console]::In.ReadToEnd()
    if (-not $rawInput) { exit 0 }
    $json = $rawInput | ConvertFrom-Json
} catch {
    Exit-MnemoError -Context 'stdin-json' -Message "stdin JSON 파싱 실패: $($_.Exception.Message)"
}
if (-not $json) { exit 0 }

# MNEMO_ANCHOR_START
# 방금 고친 파일에 기대는 결정을 모델에게 알린다 (PostToolUse additionalContext).
#
# 왜 여기인가: PostToolUse만 additionalContext를 지원한다(PreToolUse는 deny로만 말할 수 있어 조회에 못 쓴다).
# 왜 Read에는 안 붙이나: 루트 판정이 node를 띄우고 Windows에서 프로세스 하나가 172ms다. Read는 위 skipTools에서
# 이미 빠져 그 비용을 안 내고 있는데, 조회를 위해 되살리면 도구 호출마다 세금이 붙는다.
# Edit/Write는 이미 node를 띄운 뒤라, 미리 만든 색인을 읽는 6ms만 추가된다.
# 근거와 실측: memory/architecture/057-hook-budget-llm-never-process-rarely-constant-time-per-tool.md
function Invoke-MnemoAnchorNotify {
    param([string]$Root, [string]$Tool, $ToolInput, [string]$Session)
    if (@("Edit", "Write", "NotebookEdit") -notcontains $Tool) { return }
    $index = Join-Path $Root "memory/.mnemo-anchor-index.md"
    if (-not (Test-Path -LiteralPath $index)) { return }

    $target = $null
    foreach ($key in @("file_path", "notebook_path")) {
        $prop = $ToolInput.PSObject.Properties[$key]
        if ($prop -and $prop.Value) { $target = "$($prop.Value)".Replace('\', '/'); break }
    }
    if (-not $target) { return }
    if ($target -match '^(/|[A-Za-z]:/)') { return }

    # 기억 항목을 고쳤으면 색인이 낡았다. 재생성은 비싸므로(파이썬 400ms) 떼어내 돌리고 기다리지 않는다.
    if ($target -match '^memory/[^/]+/[0-9].*\.md$') {
        $builder = Join-Path $Root "skills/mnemo/scripts/build_anchor_index.py"
        if (-not (Test-Path -LiteralPath $builder)) {
            $builder = Join-Path $HOME ".claude/skills/mnemo/scripts/build_anchor_index.py"
        }
        if ((Test-Path -LiteralPath $builder) -and (Get-Command python -ErrorAction SilentlyContinue)) {
            try {
                Start-Process -FilePath "python" -ArgumentList @($builder, "--project-root", $Root, "--out") `
                    -WindowStyle Hidden -ErrorAction Stop | Out-Null
            } catch { }
        }
        return
    }
    if ($target -match '^(memory/|conversations/|docs/handoffs/)') { return }

    Invoke-MnemoAnchorEmit -Root $Root -Target $target -Session $Session
}

# 조회·중복 억제·출력. Claude와 Grok이 공유한다 — 두 런타임의 출력 스키마가 같다.
function Invoke-MnemoAnchorEmit {
    param([string]$Root, [string]$Target, [string]$Session)
    $target = $Target
    $index = Join-Path $Root "memory/.mnemo-anchor-index.md"
    if (-not (Test-Path -LiteralPath $index)) { return }

    # 같은 파일을 한 세션에서 반복 주입하지 않는다. 세션이 바뀌면 표시를 비운다.
    $seen = Join-Path $Root "memory/.mnemo-anchor-seen"
    $lines = @()
    if (Test-Path -LiteralPath $seen) {
        $lines = @(Get-Content -LiteralPath $seen -Encoding UTF8 -ErrorAction SilentlyContinue)
    }
    if ($lines.Count -eq 0 -or $lines[0] -ne $Session) { $lines = @($Session) }
    elseif ($lines -contains $target) { return }

    # 색인에서 해당 파일 절만 읽는다.
    $found = @()
    $collecting = $false
    foreach ($line in (Get-Content -LiteralPath $index -Encoding UTF8 -ErrorAction SilentlyContinue)) {
        if ($collecting) {
            if ($line.StartsWith("## ")) { break }
            if ($line.StartsWith("- ")) { $found += $line }
        } elseif ($line -eq "## $target") { $collecting = $true }
    }
    if ($found.Count -eq 0) { return }

    $lines += $target
    try {
        [System.IO.File]::WriteAllLines($seen, $lines, (New-Object System.Text.UTF8Encoding $false))
    } catch { return }

    $context = "이 파일에 기대는 결정입니다. 뒤집는다면 해당 기억 항목에 SUPERSEDED와 바꾼 이유를 남기세요.`n" +
               ($found -join "`n")
    $payload = @{ hookSpecificOutput = @{ hookEventName = "PostToolUse"; additionalContext = $context } }
    $payload | ConvertTo-Json -Compress -Depth 5
}
# Grok 경로: 봉투가 camelCase(toolName/toolInput)이고 transcript_path가 없다.
# 저장은 grok-mnemo가 전담하므로 조회만 하고 끝낸다. 루트는 payload의 workspaceRoot/cwd를
# 그대로 쓴다 — 읽기와 seen 표시뿐이고 색인이 없으면 아무것도 하지 않는다.
function Invoke-MnemoGrokAnchor {
    param($Payload)
    $root = if ($Payload.workspaceRoot) { "$($Payload.workspaceRoot)" } elseif ($Payload.cwd) { "$($Payload.cwd)" } else { $null }
    if (-not $root) { return }
    $root = $root.TrimEnd([char]'/', [char]'\')
    if (-not (Test-Path -LiteralPath (Join-Path $root "memory/.mnemo-anchor-index.md"))) { return }

    $toolArgs = if ($null -ne $Payload.toolInput) { $Payload.toolInput } else { $Payload.tool_input }
    if ($null -eq $toolArgs) { return }
    $target = $null
    foreach ($key in @("file_path", "filePath", "notebook_path", "path")) {
        $prop = $toolArgs.PSObject.Properties[$key]
        if ($prop -and $prop.Value) { $target = ("$($prop.Value)" -replace '\\', '/'); break }
    }
    if (-not $target) { return }
    $base = ($root -replace '\\', '/').TrimEnd('/')
    if ($target.StartsWith($base + '/', [System.StringComparison]::OrdinalIgnoreCase)) {
        $target = $target.Substring($base.Length + 1)
    } elseif ($target -match '^(/|[A-Za-z]:/)') { return }
    if ($target -match '^(memory/|conversations/|docs/handoffs/)') { return }

    $session = if ($Payload.sessionId) { "$($Payload.sessionId)" } elseif ($Payload.session_id) { "$($Payload.session_id)" } else { "unknown" }
    Invoke-MnemoAnchorEmit -Root $root -Target $target -Session $session
}

if ($env:GROK_HOOK_EVENT) {
    Invoke-MnemoGrokAnchor -Payload $json
    exit 0
}

# MNEMO_ANCHOR_END

$toolName = $json.tool_name
$toolInput = $json.tool_input

# 기록하지 않을 도구 (너무 빈번하거나 노이즈)
$skipTools = @("Glob", "Grep", "Read", "LS", "TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskOutput", "TeamCreate", "TeamDelete", "SendMessage")
if ($skipTools -contains $toolName) { exit 0 }

# 프로젝트 루트 결정: 명시 workspace → payload cwd → transcript metadata
$transcriptPath = $json.transcript_path
$ProjectRoot = Get-ClaudeProjectRoot -TranscriptPath $transcriptPath -Payload $json

# Temp/무효 루트면 저장 skip (fail-open) — gotcha 065
if (-not $ProjectRoot) { exit 0 }

# 기록용 도구 입력: 경로 필드를 루트 기준 상대경로로 바꾼다 (toollog·관찰 로그 공용)
$toolInput = ConvertTo-MnemoRelativeInput -ToolInput $toolInput -Root $ProjectRoot

$sessionForAnchor = if ($json.session_id) { "$($json.session_id)" } else { "unknown" }
Invoke-MnemoAnchorNotify -Root $ProjectRoot -Tool $toolName -ToolInput $toolInput -Session $sessionForAnchor


# 대화 로그 경로
if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot '.mnemo-root'))) { [System.IO.File]::WriteAllText((Join-Path $ProjectRoot '.mnemo-root'), '', (New-Object System.Text.UTF8Encoding $false)) }
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

    # 실패 판정은 '출력 어딘가에 error라는 단어가 있는가'가 아니라 '출력이 에러 형태인가'로 본다.
    # 예전 규칙은 편집한 소스에 Failed( 나 Error enum이 있다는 이유로 성공을 gotchas에 넣었다.
    # Edit/Write/Read는 응답이 파일 내용을 그대로 되돌려주므로 본문 매칭 자체를 하지 않는다.
    $echoesContent = $toolName -in @("Edit", "Write", "NotebookEdit", "Read", "NotebookRead")
    $errorShape = '(?im)^\s*(?:(?:fatal|error|err)\s*:|Traceback \(most recent call last\)|' +
                  '[A-Za-z_.]*(?:Error|Exception)\s*:|' +
                  '(?:bash|sh|cmd|zsh)?:?[^\n]{0,40}(?:command not found|No such file or directory|Permission denied)|' +
                  'ENOENT|ERR_[A-Z_]+|npm ERR!|error TS\d+|error CS\d+)'
    $hasError = (-not $echoesContent) -and ($outputStr -match $errorShape)

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

        # MNEMO_ROTATION_START
        # 기준값이 없거나 잘못됐으면 상태 알림의 초기화 이후에 회전한다.
        if ((Test-Path -LiteralPath $obsFile) -and (Get-Item -LiteralPath $obsFile).Length -ge 10MB) {
            $rotationMarker = Join-Path (Split-Path $targetDir -Parent) ".mnemo-distill-offset"
            $rotationText = if (Test-Path -LiteralPath $rotationMarker) { [IO.File]::ReadAllText($rotationMarker).Trim() } else { "" }
            if ($rotationText -match '^(-?\d+)\s+(-?\d+)\s+(\d+)$') {
                $rotationG = [long]$Matches[1]; $rotationL = [long]$Matches[2]; $rotationRef = $Matches[3]
                $rotationCount = [long]0
                foreach ($line in [IO.File]::ReadLines($obsFile)) { $rotationCount++ }
                if ((Split-Path $targetDir -Leaf) -eq "gotchas") { $rotationG -= $rotationCount } else { $rotationL -= $rotationCount }
                $archiveDir = Join-Path $targetDir "archive"
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
} catch {
    # 관찰 기록 실패해도 메인 기능에 영향 없음 — 그러나 로그에는 남김
    Write-MnemoError -Context 'observation' -Message $_.Exception.Message
}
