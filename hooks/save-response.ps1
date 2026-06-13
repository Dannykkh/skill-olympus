# save-response.ps1 - Stop 훅: Assistant 응답을 대화 파일에 저장
# transcript_path에서 마지막 assistant 메시지를 추출하여 append
# AI 호출 없음 = 빠름
#
# 에러 처리 철학 (P1):
# - 정상 skip 케이스(빈 응답, 중복, transcript 없음): 조용히 exit 0
# - 진짜 실패(파싱 에러, IO 에러): .claude/mnemo-errors.log에 기록 후 exit 0
# - $env:MNEMO_STRICT = '1' 이면 실패 시 exit 1 (디버깅용)

# UTF-8 인코딩 설정 (BOM 없음)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# BOM 없는 UTF-8 인코더 (PS의 [System.Text.Encoding]::UTF8은 BOM 포함이라 사용 안 함)
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

# ── mnemo 에러 로깅 ──────────────────────────────────────────────
# 실패 상황(파싱 에러, IO 에러 등)을 $ProjectRoot\.claude\mnemo-errors.log에
# 기록한다. 로그 쓰기 자체가 실패해도 메인 훅이 막히지 않도록 try/catch로 감쌈.
function Write-MnemoError {
    param(
        [Parameter(Mandatory = $true)][string]$Context,
        [Parameter(Mandatory = $true)][string]$Message
    )
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
        $line = "[$ts] [save-response.ps1] [$Context] $Message`r`n"
        # BOM 없는 UTF-8로 append (PowerShell Add-Content -Encoding UTF8은 첫 줄에 BOM을 붙임)
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::AppendAllText($logPath, $line, $utf8NoBom)
    } catch {
        # 로그 쓰기 실패는 무시 (훅이 막히면 안 됨)
    }
}

function Exit-MnemoError {
    param(
        [Parameter(Mandatory = $true)][string]$Context,
        [Parameter(Mandatory = $true)][string]$Message
    )
    Write-MnemoError -Context $Context -Message $Message
    if ($env:MNEMO_STRICT -eq '1') { exit 1 }
    exit 0
}

# ── 프로젝트 루트 결정 ────────────────────────────────────────
# 문제: 마지막 cwd/PWD가 하위 폴더(bin/Debug, reference/1week 등)면
#       비-git 프로젝트에서 conversations/가 프로젝트 루트가 아닌 하위 폴더에 생긴다.
#       (전역 `cd`로 작업 디렉터리가 옮겨진 뒤 그대로 유지되는 경우)
# 해결: 후보(세션 시작 cwd -> 마지막 cwd -> transcript 디코딩 -> PWD)를 2-pass로 평가.
#       Pass 1 = git 루트가 잡히는 첫 후보, Pass 2 = 비-git이면 세션 시작(launch) cwd.
function Get-ClaudeProjectRoot {
    param([string]$TranscriptPath)

    $userHome = $env:USERPROFILE
    $homeNorm = if ($userHome) { $userHome.TrimEnd('\') } else { $null }

    $firstCwd = $null; $lastCwd = $null
    if ($TranscriptPath -and (Test-Path $TranscriptPath)) {
        try {
            foreach ($line in [System.IO.File]::ReadLines($TranscriptPath, [System.Text.Encoding]::UTF8)) {
                if ($line -match '"cwd"\s*:\s*"((?:[^"\\]|\\.)*)"') {
                    $firstCwd = $Matches[1] -replace '\\\\', '\' -replace '\\"', '"'; break
                }
            }
        } catch {}
        try {
            $tail = Get-Content $TranscriptPath -Tail 200 -Encoding UTF8 -ErrorAction SilentlyContinue
            for ($i = $tail.Count - 1; $i -ge 0; $i--) {
                if ($tail[$i] -match '"cwd"\s*:\s*"((?:[^"\\]|\\.)*)"') {
                    $lastCwd = $Matches[1] -replace '\\\\', '\' -replace '\\"', '"'; break
                }
            }
        } catch {}
    }

    $decoded = $null
    if ($TranscriptPath) {
        try {
            $parent = Split-Path -Leaf (Split-Path $TranscriptPath -Parent)
            if ($parent -match '^([A-Za-z])--(.+)$') {
                $decoded = "$($Matches[1]):\$($Matches[2] -replace '-', '\')"
            }
        } catch {}
    }

    # 후보: launch cwd -> last cwd -> decoded -> PWD (HOME 제외, 중복 제거)
    $candidates = New-Object System.Collections.Generic.List[string]
    foreach ($c in @($firstCwd, $lastCwd, $decoded)) {
        if ($c -and (-not $homeNorm -or $c.TrimEnd('\') -ne $homeNorm) -and (-not $candidates.Contains($c))) {
            $candidates.Add($c)
        }
    }
    if (-not $candidates.Contains($PWD.Path)) { $candidates.Add($PWD.Path) }

    # Pass 1: git 루트가 잡히는 첫 후보 (git 루트가 HOME이면 dotfiles repo로 보고 제외)
    foreach ($cand in $candidates) {
        if (Test-Path $cand) {
            try {
                $gitRoot = & git -C $cand rev-parse --show-toplevel 2>$null
                if ($LASTEXITCODE -eq 0 -and $gitRoot) {
                    $win = $gitRoot.Replace('/', '\')
                    if (-not $homeNorm -or $win.TrimEnd('\') -ne $homeNorm) { return $win }
                }
            } catch {}
        }
    }
    # Pass 2: git 없음(비-git) -> 첫 유효 후보(= launch cwd)
    foreach ($cand in $candidates) {
        if (Test-Path $cand) { return $cand }
    }
    return $PWD.Path
}

# ── 사이드카 인덱스 I/O (reconcile과 공유) ─────────────────────
# conversations/.mnemo-index.json 포맷:
#   { "version": 1, "claude": { "YYYY-MM-DD": ["uuid", "uuid", ...] } }
# PS 5.1 호환: -AsHashtable 없이 PSCustomObject → Hashtable 수동 변환.
function Test-UuidInIndex {
    param([string]$ConvDir, [string]$Today, [string]$Uuid)
    if (-not $Uuid) { return $false }
    $indexPath = Join-Path $ConvDir '.mnemo-index.json'
    if (-not (Test-Path $indexPath)) { return $false }
    try {
        $obj = Get-Content $indexPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if (-not $obj -or -not $obj.claude) { return $false }
        $prop = $obj.claude.PSObject.Properties[$Today]
        if (-not $prop) { return $false }
        return @($prop.Value) -contains $Uuid
    } catch {
        return $false
    }
}

function Add-UuidToIndex {
    param([string]$ConvDir, [string]$Today, [string]$Uuid)
    if (-not $Uuid) { return }
    $indexPath = Join-Path $ConvDir '.mnemo-index.json'
    $data = @{ version = 1; claude = @{} }
    if (Test-Path $indexPath) {
        try {
            $obj = Get-Content $indexPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($obj.version) { $data.version = $obj.version }
            if ($obj.claude) {
                foreach ($prop in $obj.claude.PSObject.Properties) {
                    $data.claude[$prop.Name] = @($prop.Value)
                }
            }
        } catch {}
    }
    if (-not $data.claude.ContainsKey($Today)) {
        $data.claude[$Today] = @()
    }
    if ($data.claude[$Today] -notcontains $Uuid) {
        $data.claude[$Today] = @($data.claude[$Today]) + $Uuid
    }
    try {
        $json = $data | ConvertTo-Json -Depth 10
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($indexPath, $json, $utf8NoBom)
    } catch {
        Write-MnemoError -Context 'index-write' -Message $_.Exception.Message
    }
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

try {
    $json = [Console]::In.ReadToEnd() | ConvertFrom-Json
} catch {
    Exit-MnemoError -Context 'stdin-json' -Message "stdin JSON 파싱 실패: $($_.Exception.Message)"
}
$transcriptPath = $json.transcript_path

# transcript_path가 없거나 파일이 없는 경우는 정상 skip (로그 X)
if (-not $transcriptPath -or -not (Test-Path $transcriptPath)) { exit 0 }

# 프로젝트 루트 결정: JSONL cwd → transcript path 디코딩 → PWD fallback
$ProjectRoot = Get-ClaudeProjectRoot -TranscriptPath $transcriptPath

# 대화 파일 경로 결정
$ConvDir = Join-Path $ProjectRoot "conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$ConvFile = Join-Path $ConvDir "$Today-claude.md"

Ensure-MemoryScaffold -BaseDir $ProjectRoot

# conversations 폴더 자동 생성
if (-not (Test-Path $ConvDir)) {
    New-Item -ItemType Directory -Path $ConvDir -Force | Out-Null
}

# 파일 없으면 헤더 자동 생성 (save-conversation이 아직 안 돌았을 수 있음)
if (-not (Test-Path $ConvFile)) {
    $ProjectName = Split-Path $ProjectRoot -Leaf
    $Header = @"
---
date: $Today
project: $ProjectName
keywords: []
summary: ""
---

# $Today

"@
    [System.IO.File]::WriteAllText($ConvFile, $Header, $Utf8NoBom)
}

# JSONL 전체를 line-by-line으로 스캔하며 마지막 assistant text 줄을 찾는다.
# P3: 이전에는 파일 끝에서 청크 단위 역방향 탐색 + remainder 이월 로직을 썼지만
#     (1) $chunkLines[0]을 항상 스킵해 첫 줄/파일 시작 근처 줄을 놓치는 버그,
#     (2) remainder 경계 누수 버그가 있었다.
#     오늘자 JSONL은 보통 수 MB이고 [System.IO.File]::ReadLines는 lazy iterator로
#     메모리 효율적이라 전체 스캔이 충분히 빠르다. 단순함이 정확성을 보장.
# 마지막 1개만 필요하므로 전체 스캔하며 match할 때마다 덮어쓴다.
$lastTextLine = $null
try {
    foreach ($line in [System.IO.File]::ReadLines($transcriptPath, [System.Text.Encoding]::UTF8)) {
        if ($line -match '"type"\s*:\s*"assistant"' -and $line -match '"type"\s*:\s*"text"') {
            $lastTextLine = $line
        }
    }
} catch {
    Exit-MnemoError -Context 'transcript-read' -Message "JSONL 읽기 실패: $($_.Exception.Message)"
}
# 마지막 text 라인을 못 찾은 경우 → 이상 상황 (전체 스캔 후에도 없음).
# reconcile-conversations가 다음 세션 시작 시 JSONL 전체를 다시 훑어 복구하므로
# 여기서는 기록만 남기고 정상 종료.
if (-not $lastTextLine) {
    Write-MnemoError -Context 'no-assistant-text' -Message "transcript=$transcriptPath 에서 assistant text 줄을 찾지 못함 (전체 스캔)"
    exit 0
}

# 텍스트 + uuid 추출
# uuid는 JSONL 줄마다 고유하므로 dedup 키로 완벽함 (message.id는 여러 줄 공유됨)
try {
    $msg = $lastTextLine | ConvertFrom-Json
    $texts = @()
    foreach ($block in $msg.message.content) {
        if ($block.type -eq "text" -and $block.text) {
            $texts += $block.text
        }
    }
    $response = ($texts -join "`n").Trim()
    $lineUuid = $msg.uuid  # JSONL 줄 고유 식별자
} catch {
    Exit-MnemoError -Context 'message-json' -Message "assistant 라인 JSON 파싱 실패: $($_.Exception.Message)"
}

# <private> 블록 제거 (민감 정보 보호)
$response = $response -replace '(?s)<private>.*?</private>', '[PRIVATE]'

# 빈 응답이면 스킵
if (-not $response -or $response.Length -lt 5) { exit 0 }

# P2: 4000자 truncation 제거. JSONL 원본에 온전히 있으니 미러도 온전히 저장.

# 중복 방지 (P2): uuid 기반 사이드카 인덱스가 1순위, 레거시 fingerprint는 fallback
if ($lineUuid -and (Test-UuidInIndex -ConvDir $ConvDir -Today $Today -Uuid $lineUuid)) {
    exit 0
}

# 레거시 호환: 인덱스 도입 전에 저장된 파일은 fingerprint로 매칭
if (Test-Path $ConvFile) {
    $existing = Get-Content $ConvFile -Raw -Encoding UTF8
    $fpLen = [Math]::Min(80, $response.Length)
    $fingerprint = $response.Substring(0, $fpLen)
    if ($existing.Contains($fingerprint)) {
        # 이미 저장되어 있음 → 인덱스에만 등록하고 종료 (재실행 시 빠른 skip)
        if ($lineUuid) {
            Add-UuidToIndex -ConvDir $ConvDir -Today $Today -Uuid $lineUuid
        }
        exit 0
    }
}

# append (BOM 없는 UTF-8로 저장)
$ts = Get-Date -Format 'HH:mm:ss'
$entry = "`n## [$ts] Assistant`n`n$response`n"
[System.IO.File]::AppendAllText($ConvFile, $entry, $Utf8NoBom)

# 인덱스에 uuid 등록 (다음 Stop 훅과 reconcile이 이걸 보고 skip)
if ($lineUuid) {
    Add-UuidToIndex -ConvDir $ConvDir -Today $Today -Uuid $lineUuid
}

# ── mnemo status notify (LLM 호출 X, 비용 0) ──────────────────
# raw 누적 500건 또는 마지막 핸드오프 14일 초과 시 status 파일 + stderr 안내.
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
        if ($total -lt 500 -and $days -lt 14) { return }
        $statusDir = Join-Path $Root 'memory'
        if (-not (Test-Path $statusDir)) {
            New-Item -ItemType Directory -Path $statusDir -Force -ErrorAction SilentlyContinue | Out-Null
        }
        $statusFile = Join-Path $statusDir '.mnemo-status.md'
        $now = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        $content = "# mnemo status`n`n- raw observations: **$total** (gotchas $gCount + learned $lCount)`n- last handoff: **${days}일 전**`n- 권장: ``/memory-distill --rebuild`` 또는 핸드오프`n- updated: $now`n"
        [System.IO.File]::WriteAllText($statusFile, $content, $Utf8NoBom)
        [Console]::Error.WriteLine("[mnemo] raw $total 건 / 마지막 핸드오프 $days 일 전 -> /memory-distill --rebuild 권장")
    } catch {}
}
Notify-MnemoStatus -Root $ProjectRoot
