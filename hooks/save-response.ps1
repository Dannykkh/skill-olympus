# save-response.ps1 - Stop 훅: Assistant 응답을 대화 파일에 저장
# transcript_path에서 마지막 assistant 메시지를 추출하여 append
# AI 호출 없음 = 빠름
#
# 에러 처리 철학 (P1):
# - 정상 skip 케이스(빈 응답, 중복, transcript 없음): 조용히 exit 0
# - 진짜 실패(파싱 에러, IO 에러): .claude/mnemo-errors.log에 기록 후 exit 0
# - $env:MNEMO_STRICT = '1' 이면 실패 시 exit 1 (디버깅용)

# Grok 세션 가드: Grok Build는 ~/.claude/settings.json 훅도 로드함 (compat.claude).
# Grok에서는 grok-mnemo 훅이 저장을 전담하므로 이중 저장 방지 위해 즉시 종료.
if ($env:GROK_HOOK_EVENT) { exit 0 }
if ($env:DEVIN_PROJECT_DIR) { exit 0 }

# 저장 opt-out: MNEMO_DISABLE=1|true|yes 면 mnemo 자동 저장 전체 비활성화 (개인정보처리방침 거부 방법)
if ($env:MNEMO_DISABLE -match '^(1|true|yes)$') { exit 0 }

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
        if (-not $ProjectRoot) { return }
        $root = $ProjectRoot
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
        # 분할 디렉터리(memory/architecture/)가 정본이면 평평한 파일을 만들지 않는다.
        $splitDir = Join-Path $memoryDir ([System.IO.Path]::GetFileNameWithoutExtension($fileName))
        if (Test-Path (Join-Path $splitDir "index.md")) { continue }
        if (-not (Test-Path $filePath)) {
            [System.IO.File]::WriteAllText($filePath, $categoryFiles[$fileName].TrimStart(), $Utf8NoBom)
        }
    }
}

try {
    # stdin 워치독 v2 (gotcha 063): 기존엔 워치독 없는 블로킹 ReadToEnd라 stdin이 열린 채
    # 닫히지 않으면 훅 타임아웃(60s)까지 매달렸음 (창 내 16회 실측).
    # StreamReader.ReadToEndAsync + Wait는 PS 5.1에서 동기 블로킹이라 무효 —
    # raw stream ReadAsync(byte[])만 PS 5.1/7 모두 진짜 비동기(실측) → chunk 루프 + deadline.
    # 5초 내 미도착 시 fail-open. (미저장분은 SessionStart reconcile이 backfill)
    $mnemoDeadline = [DateTime]::UtcNow.AddSeconds(5)
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
    $json = $rawInput | ConvertFrom-Json
} catch {
    Exit-MnemoError -Context 'stdin-json' -Message "stdin JSON 파싱 실패: $($_.Exception.Message)"
}
$transcriptPath = $json.transcript_path
$hasTranscript = [bool]($transcriptPath -and (Test-Path $transcriptPath))

# Claude Code는 Stop 입력에 마지막 답(last_assistant_message)을 넣어 준다. 기록 파일(JSONL)은
# 몰아서 쓰여 훅이 읽는 순간 마지막 답이 아직 없을 수 있다(2026-10-11, Stop 310건 중 1건 누락).
# 이 값을 먼저 쓰고, 값이 없는 옛 CLI에서만 기록 파일의 마지막 텍스트 줄로 대신한다.
$lastAssistant = "$($json.last_assistant_message)".Trim()

# 답을 얻을 곳이 하나도 없으면 정상 skip (로그 X)
if (-not $lastAssistant -and -not $hasTranscript) { exit 0 }

# 프로젝트 루트 결정: 명시 workspace → payload cwd → transcript metadata
$ProjectRoot = Get-ClaudeProjectRoot -TranscriptPath $transcriptPath -Payload $json

# Temp/무효 루트면 저장 skip (fail-open) — gotcha 065
if (-not $ProjectRoot) { exit 0 }

# 대화 파일 경로 결정
if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot '.mnemo-root'))) { [System.IO.File]::WriteAllText((Join-Path $ProjectRoot '.mnemo-root'), '', (New-Object System.Text.UTF8Encoding $false)) }
$ConvDir = Join-Path $ProjectRoot "conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$ConvFile = Join-Path $ConvDir "$Today-claude.md"

Ensure-MemoryScaffold -BaseDir $ProjectRoot

$store = Join-Path $PSScriptRoot 'claude-event-store.js'
$stored = $null
try {
    $receipt = ($json | ConvertTo-Json -Depth 40 -Compress) | & node $store $ProjectRoot assistant
    $stored = ($receipt -join "`n") | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { Exit-MnemoError -Context 'file-io' -Message '답변 저장 대기 또는 실패; 오류 로그와 대기 파일 확인' }
} catch { Exit-MnemoError -Context 'file-io' -Message $_.Exception.Message }
$response = "$($stored.response)"
if ($stored.status -eq 'empty' -or $stored.status -eq 'duplicate') { exit 0 }

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
    } catch {}
}
Notify-MnemoStatus -Root $ProjectRoot
