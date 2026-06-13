# 대화 로그 저장 (단순 append)
# Claude Code는 stdin으로 JSON을 전달함 (UTF-8)
#
# 에러 처리 (P1):
# - UserPromptSubmit 훅이라 crash 시 입력이 차단될 수 있음 → 반드시 fail-open
# - 실패는 .claude/mnemo-errors.log에 기록
# - $env:MNEMO_STRICT='1' 이면 실패 시 exit 1 (디버깅용)

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
        $line = "[$ts] [save-conversation.ps1] [$Context] $Message`r`n"
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
    $rawInput = [Console]::In.ReadToEnd()
    if (-not $rawInput) { exit 0 }
    $json = $rawInput | ConvertFrom-Json
} catch {
    Exit-MnemoError -Context 'stdin-json' -Message "stdin JSON 파싱 실패: $($_.Exception.Message)"
}
$Prompt = $json.prompt
if (-not $Prompt) { exit 0 }

# <private> 블록 제거 (민감 정보 보호)
if ($Prompt) {
    $Prompt = $Prompt -replace '(?s)<private>.*?</private>', '[PRIVATE]'
}

# 프로젝트 루트 결정: JSONL cwd → transcript path 디코딩 → PWD fallback
# UserPromptSubmit hook도 transcript_path가 payload에 포함됨 (Claude Code 표준)
$transcriptPath = $json.transcript_path
$ProjectRoot = Get-ClaudeProjectRoot -TranscriptPath $transcriptPath

$ConvDir = Join-Path $ProjectRoot "conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$ConvFile = Join-Path $ConvDir "$Today-claude.md"

Ensure-MemoryScaffold -BaseDir $ProjectRoot

# 폴더 생성
if (-not (Test-Path $ConvDir)) {
    New-Item -ItemType Directory -Path $ConvDir -Force | Out-Null
}

# 파일 없으면 헤더 (BOM 없는 UTF-8로 저장)
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

# 중복 방지: 같은 분(minute)에 동일 프롬프트가 이미 저장되어 있으면 스킵
$TimeStamp = Get-Date -Format 'HH:mm'
$Entry = "`n## [$TimeStamp] User`n`n$Prompt`n"

try {
    if (Test-Path $ConvFile) {
        $Existing = Get-Content $ConvFile -Raw -Encoding UTF8
        if ($Existing -match [regex]::Escape("## [$TimeStamp] User") -and $Existing -match [regex]::Escape($Prompt)) {
            exit 0
        }
    }

    # append (BOM 없는 UTF-8로 저장)
    [System.IO.File]::AppendAllText($ConvFile, $Entry, $Utf8NoBom)
} catch {
    Exit-MnemoError -Context 'file-io' -Message "대화 파일 쓰기 실패: $($_.Exception.Message)"
}
