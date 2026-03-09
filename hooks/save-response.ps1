# save-response.ps1 - Stop 훅: Assistant 응답을 대화 파일에 저장
# transcript_path에서 마지막 assistant 메시지를 추출하여 append
# AI 호출 없음 = 빠름

# UTF-8 인코딩 설정 (BOM 없음)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

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
        [System.IO.File]::WriteAllText($memoryFile, $memoryContent.TrimStart(), [System.Text.Encoding]::UTF8)
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
            [System.IO.File]::WriteAllText($filePath, $categoryFiles[$fileName].TrimStart(), [System.Text.Encoding]::UTF8)
        }
    }
}

$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$transcriptPath = $json.transcript_path

if (-not $transcriptPath -or -not (Test-Path $transcriptPath)) { exit 0 }

# 대화 파일 경로 결정
$ConvDir = Join-Path $PWD.Path "conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$ConvFile = Join-Path $ConvDir "$Today-claude.md"

Ensure-MemoryScaffold -BaseDir $PWD.Path

# conversations 폴더 자동 생성
if (-not (Test-Path $ConvDir)) {
    New-Item -ItemType Directory -Path $ConvDir -Force | Out-Null
}

# 파일 없으면 헤더 자동 생성 (save-conversation이 아직 안 돌았을 수 있음)
if (-not (Test-Path $ConvFile)) {
    $ProjectName = Split-Path $PWD.Path -Leaf
    $Header = @"
---
date: $Today
project: $ProjectName
keywords: []
summary: ""
---

# $Today

"@
    [System.IO.File]::WriteAllText($ConvFile, $Header, [System.Text.Encoding]::UTF8)
}

# JSONL 파일 끝에서 역방향으로 assistant text 메시지 찾기
# Get-Content -Tail은 파일 전체를 읽으므로, 대용량 JSONL(수백MB)에서 느림
# → FileStream.Seek로 끝에서 청크 단위로 읽어 성능 확보
$lastTextLine = $null
try {
    $fs = [System.IO.FileStream]::new($transcriptPath, 'Open', 'Read', 'ReadWrite')
    $chunkSize = 512KB
    $maxRead = 5MB  # 최대 5MB까지만 탐색
    $totalRead = 0
    $remainder = ""

    while ($totalRead -lt $maxRead -and $fs.Length -gt 0) {
        $readSize = [Math]::Min($chunkSize, $fs.Length - $totalRead)
        if ($readSize -le 0) { break }
        $seekPos = [Math]::Max(0, $fs.Length - $totalRead - $readSize)
        $fs.Seek($seekPos, 'Begin') | Out-Null
        $buffer = New-Object byte[] $readSize
        $fs.Read($buffer, 0, $readSize) | Out-Null
        $chunk = [System.Text.Encoding]::UTF8.GetString($buffer) + $remainder
        $totalRead += $readSize

        # 줄 단위로 분리 후 역순 탐색
        $chunkLines = $chunk -split "`n"
        $remainder = $chunkLines[0]  # 첫 줄은 잘렸을 수 있으므로 다음 청크에 이월
        for ($i = $chunkLines.Count - 1; $i -ge 1; $i--) {
            $line = $chunkLines[$i]
            # assistant 메시지 중 text 블록이 포함된 줄 찾기
            # Claude Code JSONL은 "type":"assistant"과 "type":"text"가 같은 줄에 있음
            # 공백 유무에 관계없이 매칭
            if ($line -match '"type"\s*:\s*"assistant"' -and $line -match '"type"\s*:\s*"text"') {
                $lastTextLine = $line
                break
            }
        }
        if ($lastTextLine) { break }
        if ($seekPos -eq 0) { break }
    }
    $fs.Close()
} catch {
    if ($fs) { $fs.Close() }
}
if (-not $lastTextLine) { exit 0 }

# 텍스트 추출
try {
    $msg = $lastTextLine | ConvertFrom-Json
    $texts = @()
    foreach ($block in $msg.message.content) {
        if ($block.type -eq "text" -and $block.text) {
            $texts += $block.text
        }
    }
    $response = ($texts -join "`n").Trim()
} catch {
    exit 0
}

# 빈 응답이면 스킵
if (-not $response -or $response.Length -lt 5) { exit 0 }

# 4000자 제한 (코드 블록 포함 시 충분한 여유)
if ($response.Length -gt 4000) {
    $response = $response.Substring(0, 4000) + "..."
}

# 중복 방지: 타임스탬프 + 응답 내용 fingerprint 이중 체크
$ts = Get-Date -Format 'HH:mm:ss'
if (Test-Path $ConvFile) {
    $existing = Get-Content $ConvFile -Raw -Encoding UTF8
    # 1) 같은 초에 이미 저장되어 있으면 스킵
    if ($existing -match [regex]::Escape("## [$ts] Assistant")) {
        exit 0
    }
    # 2) 응답 첫 80자가 이미 파일에 있으면 스킵 (다른 초에 같은 내용 방지)
    $fpLen = [Math]::Min(80, $response.Length)
    $fingerprint = $response.Substring(0, $fpLen)
    if ($existing.Contains($fingerprint)) {
        exit 0
    }
}

# append (BOM 없는 UTF-8로 저장)
$entry = "`n## [$ts] Assistant`n`n$response`n"
[System.IO.File]::AppendAllText($ConvFile, $entry, [System.Text.Encoding]::UTF8)
