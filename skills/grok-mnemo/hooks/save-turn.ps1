# save-turn.ps1 - Grok Build 훅: User+Assistant 턴을 대화 파일에 저장
# 한 스크립트가 두 이벤트를 처리한다 (hookEventName으로 분기):
#   - user_prompt_submit: payload.prompt (<user_query> 래퍼 제거) -> User 저장
#   - stop (reason == end_turn): payload.lastAssistantMessage -> Assistant 저장
# Grok 훅 envelope는 camelCase (Claude snake_case와 다름). AI 호출 없음 = 빠름.
#
# 주의 (실측 근거, Grok Build 0.2.111):
# - Stop은 세션 종료 시 observe-only로 한 번 더 발화 -> reason == "end_turn"만 저장
# - Stop stdout에 JSON을 쓰면 stop 결정으로 파싱됨 -> stdout 출력 금지 (stderr만 사용)
# - prompt는 <user_query>...</user_query>로 래핑되어 옴 -> 스트립 필요
#
# 에러 처리 (P1 parity):
# - 실패는 .claude/mnemo-errors.log에 기록
# - $env:MNEMO_STRICT='1' 이면 실패 시 exit 1

# 저장 opt-out: MNEMO_DISABLE=1|true|yes 면 mnemo 자동 저장 전체 비활성화 (개인정보처리방침 거부 방법)
# (Grok Stop 이벤트는 stdout 출력 금지 규칙이 있으나, 조용한 exit 0은 안전)
if ($env:MNEMO_DISABLE -match '^(1|true|yes)$') { exit 0 }

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
        $line = "[$ts] [grok-mnemo/save-turn.ps1] [$Context] $Message`r`n"
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
    # stdin 워치독 v2 (gotcha 063): stdin이 전달되지 않으면 무한 대기 -> 15초 내 미도착 시 fail-open.
    # 기존 StreamReader.ReadToEndAsync + Wait는 PS 5.1(.NET Framework)에서 동기 블로킹되어
    # 워치독이 무효였음 (실측: EOF까지 대기) -> raw stream ReadAsync(byte[]) chunk 루프 +
    # deadline만 PS 5.1/7 모두 진짜 비동기 (실측).
    $mnemoDeadline = [DateTime]::UtcNow.AddSeconds(15)
    $mnemoStdin = [Console]::OpenStandardInput()
    $mnemoBuf = New-Object System.IO.MemoryStream
    $mnemoChunk = New-Object byte[] 65536
    while ($true) {
        $mnemoReadTask = $mnemoStdin.ReadAsync($mnemoChunk, 0, $mnemoChunk.Length)
        $mnemoRemainMs = [int][Math]::Max(0, ($mnemoDeadline - [DateTime]::UtcNow).TotalMilliseconds)
        if (-not $mnemoReadTask.Wait($mnemoRemainMs)) { exit 0 }
        if ($mnemoReadTask.Result -le 0) { break }
        $mnemoBuf.Write($mnemoChunk, 0, $mnemoReadTask.Result)
    }
    $rawInput = [System.Text.Encoding]::UTF8.GetString($mnemoBuf.ToArray())
    if (-not $rawInput) { exit 0 }
    $payload = $rawInput | ConvertFrom-Json
} catch {
    Exit-MnemoError -Context 'stdin-json' -Message "stdin JSON 파싱 실패: $($_.Exception.Message)"
}

if (-not $payload) { exit 0 }

# 이벤트 분기 (Grok camelCase envelope)
$eventName = "$($payload.hookEventName)"
$userText = ""
$response = ""

if ($eventName -eq 'user_prompt_submit') {
    $userText = "$($payload.prompt)".Trim()
    # Grok은 prompt를 <user_query>...</user_query>로 래핑함 -> 스트립
    $m = [regex]::Match($userText, '(?s)^\s*<user_query>\s*(.*?)\s*</user_query>\s*$')
    if ($m.Success) { $userText = $m.Groups[1].Value.Trim() }
} elseif ($eventName -eq 'stop') {
    # 세션 종료 observe fire(channel_closed/shutdown)는 저장하지 않음 -> 중복 방지
    if ("$($payload.reason)" -ne 'end_turn') { exit 0 }
    $response = "$($payload.lastAssistantMessage)".Trim()
} else {
    exit 0
}

# <private> 블록 제거 (민감 정보 보호)
if ($userText) { $userText = $userText -replace '(?s)<private>.*?</private>', '[PRIVATE]' }
if ($response) { $response = $response -replace '(?s)<private>.*?</private>', '[PRIVATE]' }

# 둘 다 비어있으면 스킵
if ((-not $userText -or $userText.Length -lt 1) -and (-not $response -or $response.Length -lt 5)) {
    exit 0
}

# 프로젝트 루트 결정
# Grok payload는 workspaceRoot/cwd(camelCase)를 제공한다. transcriptPath는
# ~/.grok/sessions/ 내부 경로라 프로젝트 루트 추정에 쓰지 않는다.
# - 1순위: payload의 workspaceRoot / cwd
# - 2순위: git -C rev-parse --show-toplevel
# - 3순위: PWD
$ProjectRoot = ""
foreach ($k in @("workspaceRoot", "cwd")) {
    $v = ""
    try { $v = "$($payload.$k)".Trim() } catch {}
    if ($v -and (Test-Path $v)) {
        $ProjectRoot = $v
        break
    }
}
if (-not $ProjectRoot) { $ProjectRoot = $PWD.Path }
# 8.3 단축경로(ADMINI~1 등) 정규화 — 단축경로가 HOME 가드 문자열 비교를 우회하는 것 방지
try { $ProjectRoot = (Get-Item -LiteralPath $ProjectRoot -ErrorAction Stop).FullName } catch {}

# ── 비-git 프로젝트 루트 보정 (gotcha 047) ─────────────────────
# git이 없어도 프로젝트 루트를 지킨다. 빌드 출력 폴더(bin/Debug 등)에서 실행된
# 세션이 그 폴더를 루트로 삼아 conversations/가 흩어지는 것을 방지.
# Pass A: 상위로 걸어 올라가며 기존 mnemo 루트 마커(MEMORY.md 또는 conversations/) 탐색 (HOME 제외)
# Pass B: 빌드 출력 세그먼트(bin|obj|dist|build|out|target|node_modules) 첫 등장 앞에서 절단
# Temp 계열 경로는 프로젝트 루트로 승격 금지 (gotcha 065): Temp에서 뜬 세션이
# Temp에 스캐폴드를 만들면, 그 마커가 이후 세션의 walk-up까지 끌어당겨 대화가
# 계속 Temp로 쌓인다. Temp 루트로 판정되면 호출부에서 저장을 skip한다 (fail-open).
function Test-MnemoTempPath {
    param([string]$Path)
    if (-not $Path) { return $false }
    $p = $Path.Replace('/', '\').TrimEnd('\')
    foreach ($t in @($env:TEMP, $env:TMP)) {
        if ($t) {
            $tn = $t.Replace('/', '\').TrimEnd('\')
            if ($p -eq $tn -or $p.StartsWith("$tn\", [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
        }
    }
    return ($p -match '(?i)[\\/]AppData[\\/]Local[\\/]Temp([\\/]|$)' -or $p -match '(?i)^([A-Za-z]:)?[\\/]tmp([\\/]|$)')
}

function Get-NonGitProjectRoot {
    param([string]$StartPath)
    if (-not $StartPath) { return $StartPath }
    $hn = if ($env:USERPROFILE) { $env:USERPROFILE.TrimEnd('\') } else { $null }
    try {
        $cur = New-Object System.IO.DirectoryInfo($StartPath)
        while ($cur) {
            $curPath = $cur.FullName.TrimEnd('\')
            if ($hn -and $curPath -eq $hn) { break }
            if (Test-MnemoTempPath $curPath) { break }
            if ((Test-Path (Join-Path $curPath 'MEMORY.md')) -or (Test-Path (Join-Path $curPath 'conversations'))) {
                return $curPath
            }
            $cur = $cur.Parent
        }
    } catch {}
    $m = [regex]::Match($StartPath, '(?i)^(.+?)[\\/](?:bin|obj|dist|build|out|target|node_modules)(?:[\\/]|$)')
    if ($m.Success) {
        $prefix = $m.Groups[1].Value
        if ($prefix -and (Test-Path $prefix) -and (-not $hn -or $prefix.TrimEnd('\') -ne $hn) -and (-not (Test-MnemoTempPath $prefix))) {
            return $prefix
        }
    }
    if (Test-MnemoTempPath $StartPath) { return $null }
    return $StartPath
}

$gitRootAdopted = $false
try {
    $gitRoot = & git -C $ProjectRoot rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0 -and $gitRoot) {
        $win = $gitRoot.Replace('/', '\')
        # HOME 자체가 git repo(dotfiles)면 git root 채택 금지 — HOME/conversations 오배치 방지 (gotcha 033)
        $homeNorm = if ($env:USERPROFILE) { $env:USERPROFILE.TrimEnd('\') } else { $null }
        if (-not $homeNorm -or $win.TrimEnd('\') -ne $homeNorm) {
            $ProjectRoot = $win
            $gitRootAdopted = $true
        }
    }
} catch {}
# git 루트를 못 잡은 비-git 경로는 프로젝트 루트 보정 (gotcha 047)
if ($ProjectRoot -and -not $gitRootAdopted) {
    $ProjectRoot = Get-NonGitProjectRoot $ProjectRoot
}
# Temp/무효 루트면 저장 skip (fail-open) — gotcha 065
if ((-not $ProjectRoot) -or (Test-MnemoTempPath $ProjectRoot)) { exit 0 }

# 대화 디렉토리 및 파일
$ConvDir = Join-Path $ProjectRoot "conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$ConvFile = Join-Path $ConvDir "$Today-grok.md"

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
# truncation 없음: lastAssistantMessage가 유일한 원문 소스이므로 온전히 저장.
# (Grok 자체 transcript는 ~/.grok/sessions/ 내부 백업 취급 — 검색 대상 아님)
if ($response -and $response.Length -ge 5) {
    # 중복 방지: stop 재발화로 같은 초에 동일 Assistant 저장되어 있으면 스킵
    if (Test-Path $ConvFile) {
        $existing = Get-Content $ConvFile -Raw -Encoding UTF8
        if ($existing -match [regex]::Escape("## [$ts] Assistant") -and $existing -match [regex]::Escape($response.Substring(0, [Math]::Min(50, $response.Length)))) {
            exit 0
        }
    }
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
# stop 이벤트에서만 수행 (턴 단위 관찰)
# ─────────────────────────────────────────────
if ($response -and $response.Length -ge 5) {
    $hasError = $response -match '(?i)(error|fail|exception|denied|not found|cannot|unable|ENOENT|ERR_)'
    $secretPattern = '(?i)(api[_-]?key|token|secret|password|authorization)["''\s:=]+[A-Za-z0-9_\-/.+=]{8,}'
    $safeResponse = $response
    if ($safeResponse.Length -gt 3000) { $safeResponse = $safeResponse.Substring(0, 3000) + "...[truncated]" }
    $safeResponse = $safeResponse -replace $secretPattern, '$1: [REDACTED]'

    $sessionId = "$($payload.sessionId)"
    if (-not $sessionId) { $sessionId = "unknown" }

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
        cli = "grok"
        input = ""
        output = $safeResponse
        session = $sessionId
    } | ConvertTo-Json -Compress
    [System.IO.File]::AppendAllText($obsFile, "$obs`n", $Utf8NoBom)

    # 파일 크기 제한 (10MB)
    if ((Test-Path $obsFile) -and ((Get-Item $obsFile).Length / 1MB) -ge 10) {
        $archiveDir = Join-Path $obsTargetDir "archive"
        if (-not (Test-Path $archiveDir)) { New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null }
        Move-Item $obsFile (Join-Path $archiveDir "observations-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').jsonl") -Force
    }
}

# ── mnemo status notify (LLM 호출 X, 비용 0) ──────────────────
# 주의: stop 이벤트의 stdout은 결정 JSON으로 파싱되므로 stderr만 사용한다.
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
            if ($latest) { $days = [int](((Get-Date) - $latest.LastWriteTime).TotalDays) }
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
        $baseG = -1; $baseL = -1; $markerRef = -1
        if (Test-Path $markerFile) {
            try {
                $parts = ((Get-Content $markerFile -Raw -ErrorAction SilentlyContinue).Trim() -split '\s+')
                if ($parts.Count -ge 3) { $baseG = [int64]$parts[0]; $baseL = [int64]$parts[1]; $markerRef = [int64]$parts[2] }
            } catch { $baseG = -1 }
        }
        if ($baseG -lt 0 -or $refEpoch -gt $markerRef) {
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
        $content = "# mnemo status`n`n- 새 관찰(정제 이후): **$delta** / 누적 **$total** (gotchas $gCount + learned $lCount)`n- last handoff: **${days}일 전**`n- 권장: ``/memory-distill --rebuild`` 또는 핸드오프`n- updated: $now`n"
        [System.IO.File]::WriteAllText($statusFile, $content, $Utf8NoBom)
        [Console]::Error.WriteLine("[mnemo] 새 관찰 $delta 건(누적 $total) / 마지막 핸드오프 $days 일 전 -> /memory-distill --rebuild 권장")
    } catch {}
}
if ($response) {
    Notify-MnemoStatus -Root $ProjectRoot
}
