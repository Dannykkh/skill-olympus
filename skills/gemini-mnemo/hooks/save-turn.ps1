# save-turn.ps1 - Gemini CLI AfterAgent 훅: User+Assistant 턴을 대화 파일에 저장
# Gemini는 stdin으로 JSON 페이로드를 전달함 (prompt + prompt_response)
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

# stdin에서 JSON 페이로드 파싱
$payload = $null
try {
    $payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
} catch {
    exit 0
}

if (-not $payload) { exit 0 }

# User 입력 추출: prompt 필드
$userText = "$($payload.prompt)".Trim()

# Assistant 응답 추출: prompt_response 필드
$response = "$($payload.prompt_response)".Trim()

# 둘 다 비어있으면 스킵
if ((-not $userText -or $userText.Length -lt 1) -and (-not $response -or $response.Length -lt 5)) {
    exit 0
}

# 대화 디렉토리 및 파일
$ConvDir = Join-Path $PWD.Path "conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$ConvFile = Join-Path $ConvDir "$Today-gemini.md"

Ensure-MemoryScaffold -BaseDir $PWD.Path

# 폴더 생성
if (-not (Test-Path $ConvDir)) {
    New-Item -ItemType Directory -Path $ConvDir -Force | Out-Null
}

# 파일 없으면 frontmatter 헤더 생성
if (-not (Test-Path $ConvFile)) {
    $Header = @"
---
date: $Today
project: $(Split-Path $PWD.Path -Leaf)
keywords: []
summary: ""
---

# $Today

"@
    [System.IO.File]::WriteAllText($ConvFile, $Header, [System.Text.Encoding]::UTF8)
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
if ($response -and $response.Length -ge 5) {
    # 4000자 제한 (코드 블록 포함 시 충분한 여유)
    if ($response.Length -gt 4000) {
        $response = $response.Substring(0, 4000) + "..."
    }

    $entry += "`n## [$ts] Assistant`n`n$response`n"
}

# append (BOM 없는 UTF-8로 저장)
if ($entry) {
    [System.IO.File]::AppendAllText($ConvFile, $entry, [System.Text.Encoding]::UTF8)
}
