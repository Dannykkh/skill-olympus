# save-turn.ps1 - Gemini CLI AfterAgent 훅: User+Assistant 턴을 대화 파일에 저장
# Gemini는 stdin으로 JSON 페이로드를 전달함 (prompt + prompt_response)
# AI 호출 없음 = 빠름
#
# 에러 처리 (P1 parity):
# - 실패는 .claude/mnemo-errors.log에 기록
# - $env:MNEMO_STRICT='1' 이면 실패 시 exit 1
#
# Note: Gemini는 JSONL transcript가 없어 reconcile이 불가능하다.
#       훅이 실패하면 해당 턴은 영구 유실되므로 fail-open 로깅이 특히 중요하다.

# UTF-8 인코딩 설정 (BOM 없음)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

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
        $line = "[$ts] [gemini-mnemo/save-turn.ps1] [$Context] $Message`r`n"
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

function Ensure-MemoryScaffold {
    param(
        [Parameter(Mandatory = $true)][string]$BaseDir
    )

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

# stdin에서 JSON 페이로드 파싱
$payload = $null
try {
    $rawInput = [Console]::In.ReadToEnd()
    if (-not $rawInput) { exit 0 }
    $payload = $rawInput | ConvertFrom-Json
} catch {
    Exit-MnemoError -Context 'stdin-json' -Message "stdin JSON 파싱 실패: $($_.Exception.Message)"
}

if (-not $payload) { exit 0 }

# User 입력 추출: prompt 필드
$userText = "$($payload.prompt)".Trim()

# Assistant 응답 추출: prompt_response 필드
$response = "$($payload.prompt_response)".Trim()

# <private> 블록 제거 (민감 정보 보호)
if ($userText) { $userText = $userText -replace '(?s)<private>.*?</private>', '[PRIVATE]' }
if ($response) { $response = $response -replace '(?s)<private>.*?</private>', '[PRIVATE]' }

# 둘 다 비어있으면 스킵
if ((-not $userText -or $userText.Length -lt 1) -and (-not $response -or $response.Length -lt 5)) {
    exit 0
}

# 프로젝트 루트 결정
# Gemini hook payload는 transcript_path가 없으므로 PWD 기반 결정.
# Sub-directory(예: bin/Debug)를 부모 git root로 정규화한다.
# - 1순위: payload의 cwd / working_directory / project_root 필드
# - 2순위: PWD에서 git -C rev-parse --show-toplevel
# - 3순위: PWD 그대로
$ProjectRoot = ""
foreach ($k in @("cwd", "working_directory", "project_root", "workspace_root")) {
    $v = ""
    try { $v = "$($payload.$k)".Trim() } catch {}
    if ($v -and (Test-Path $v)) {
        $ProjectRoot = $v
        break
    }
}
if (-not $ProjectRoot) { $ProjectRoot = $PWD.Path }
try {
    $gitRoot = & git -C $ProjectRoot rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0 -and $gitRoot) {
        $ProjectRoot = $gitRoot.Replace('/', '\')
    }
} catch {}

# 대화 디렉토리 및 파일
$ConvDir = Join-Path $ProjectRoot "conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$ConvFile = Join-Path $ConvDir "$Today-gemini.md"

Ensure-MemoryScaffold -BaseDir $ProjectRoot

# 폴더 생성
if (-not (Test-Path $ConvDir)) {
    New-Item -ItemType Directory -Path $ConvDir -Force | Out-Null
}

# 파일 없으면 frontmatter 헤더 생성
if (-not (Test-Path $ConvFile)) {
    $Header = @"
---
date: $Today
project: $(Split-Path $ProjectRoot -Leaf)
keywords: []
summary: ""
---

# $Today

"@
    [System.IO.File]::WriteAllText($ConvFile, $Header, $Utf8NoBom)
}

$ts = Get-Date -Format 'HH:mm:ss'
$entry = ""

# User 입력 기록
if ($userText -and $userText.Length -ge 1) {
    # 중복 방지: 같은 초에 동일 User 저장되어 있으면 스킵
    if (Test-Path $ConvFile) {
        $existing = Get-Content $ConvFile -Raw -Encoding UTF8
        if ($existing -match [regex]::Escape("## [$ts] User") -and $existing -match [regex]::Escape($userText.Substring(0, [Math]::Min(50, $userText.Length)))) {
            exit 0
        }
    }
    $entry += "`n## [$ts] User`n`n$userText`n"
}

# Assistant 응답 처리
# P2 parity: 4000자 truncation 제거. JSONL 원본이 없는 Gemini에서는 유실된 부분을
# 복구할 경로가 없으므로 온전한 원문을 저장해야 한다.
if ($response -and $response.Length -ge 5) {
    $entry += "`n## [$ts] Assistant`n`n$response`n"
}

# append (BOM 없는 UTF-8로 저장)
if ($entry) {
    try {
        [System.IO.File]::AppendAllText($ConvFile, $entry, $Utf8NoBom)
    } catch {
        Exit-MnemoError -Context 'file-io' -Message "대화 파일 쓰기 실패: $($_.Exception.Message)"
    }
}

# ─────────────────────────────────────────────
# Gotchas/Learned 관찰 기록 (memory/gotchas/ + memory/learned/)
# ─────────────────────────────────────────────
if ($response -and $response.Length -ge 5) {
    $hasError = $response -match '(?i)(error|fail|exception|denied|not found|cannot|unable|ENOENT|ERR_)'
    $secretPattern = '(?i)(api[_-]?key|token|secret|password|authorization)["''\s:=]+[A-Za-z0-9_\-/.+=]{8,}'
    $safeResponse = $response
    if ($safeResponse.Length -gt 3000) { $safeResponse = $safeResponse.Substring(0, 3000) + "...[truncated]" }
    $safeResponse = $safeResponse -replace $secretPattern, '$1: [REDACTED]'
    $safeUser = if ($userText) { $userText } else { "" }
    if ($safeUser.Length -gt 1000) { $safeUser = $safeUser.Substring(0, 1000) + "...[truncated]" }

    # PS 5.1 호환: Join-Path는 3개 인수 미지원. 중첩 호출로 처리.
    $memoryDir = Join-Path $ProjectRoot "memory"
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
        cli = "gemini"
        input = $safeUser
        output = $safeResponse
        session = "unknown"
    } | ConvertTo-Json -Compress
    [System.IO.File]::AppendAllText($obsFile, "$obs`n", $Utf8NoBom)

    # 파일 크기 제한 (10MB)
    if ((Test-Path $obsFile) -and ((Get-Item $obsFile).Length / 1MB) -ge 10) {
        $archiveDir = Join-Path $obsTargetDir "archive"
        if (-not (Test-Path $archiveDir)) { New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null }
        Move-Item $obsFile (Join-Path $archiveDir "observations-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').jsonl") -Force
    }
}
