# 대화 로그 저장 (단순 append)
# Claude Code는 stdin으로 JSON을 전달함 (UTF-8)
#
# 에러 처리 (P1):
# - UserPromptSubmit 훅이라 crash 시 입력이 차단될 수 있음 → 반드시 fail-open
# - 실패는 .claude/mnemo-errors.log에 기록
# - $env:MNEMO_STRICT='1' 이면 실패 시 exit 1 (디버깅용)

# Grok 세션 가드: Grok Build는 ~/.claude/settings.json 훅도 로드함 (compat.claude).
# Grok에서는 grok-mnemo 훅이 저장을 전담하므로 이중/오분류 저장 방지 위해 즉시 종료.
if ($env:GROK_HOOK_EVENT) { exit 0 }

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
# ── 비-git 프로젝트 루트 보정 (gotcha 047) ─────────────────────
# git이 없어도 프로젝트 루트를 지킨다. 빌드 출력 폴더(bin/Debug 등)에서 실행된
# 세션이 그 폴더를 루트로 삼아 conversations/가 흩어지는 것을 방지.
# Pass A: 상위로 걸어 올라가며 기존 mnemo 루트 마커(MEMORY.md 또는 conversations/) 탐색 (HOME 제외)
# Pass B: 빌드 출력 세그먼트(bin|obj|dist|build|out|target|node_modules) 첫 등장 앞에서 절단
function Get-NonGitProjectRoot {
    param([string]$StartPath)
    if (-not $StartPath) { return $StartPath }
    $hn = if ($env:USERPROFILE) { $env:USERPROFILE.TrimEnd('\') } else { $null }
    try {
        $cur = New-Object System.IO.DirectoryInfo($StartPath)
        while ($cur) {
            $curPath = $cur.FullName.TrimEnd('\')
            if ($hn -and $curPath -eq $hn) { break }
            if ((Test-Path (Join-Path $curPath 'MEMORY.md')) -or (Test-Path (Join-Path $curPath 'conversations'))) {
                return $curPath
            }
            $cur = $cur.Parent
        }
    } catch {}
    $m = [regex]::Match($StartPath, '(?i)^(.+?)[\\/](?:bin|obj|dist|build|out|target|node_modules)(?:[\\/]|$)')
    if ($m.Success) {
        $prefix = $m.Groups[1].Value
        if ($prefix -and (Test-Path $prefix) -and (-not $hn -or $prefix.TrimEnd('\') -ne $hn)) {
            return $prefix
        }
    }
    return $StartPath
}

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
    # Pass 2: git 없음(비-git) -> 첫 유효 후보(= launch cwd)를 비-git 루트 보정 후 반환
    foreach ($cand in $candidates) {
        if (Test-Path $cand) { return (Get-NonGitProjectRoot $cand) }
    }
    return (Get-NonGitProjectRoot $PWD.Path)
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
    # stdin 워치독 v2 (gotcha 063, 실측 재검증): 활성 턴 진행 중 제출된 프롬프트는 stdin이
    # 전달되지 않을 수 있어 무한 대기 → 훅 타임아웃(60s)까지 매달림.
    # 기존 워치독(StreamReader.ReadToEndAsync + Wait)은 PS 5.1(.NET Framework)에서
    # ReadToEndAsync가 동기 블로킹되어 Wait(timeout)에 도달하지 못해 무효였음 (실측: EOF까지 대기).
    # raw stream의 ReadAsync(byte[])는 PS 5.1/7 모두 진짜 비동기(실측) → chunk 루프 + deadline.
    # 5초 내 미도착 시 fail-open으로 조용히 종료. (미저장분은 SessionStart reconcile이 backfill)
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
