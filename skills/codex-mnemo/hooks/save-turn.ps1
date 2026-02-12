# save-turn.ps1 - Codex CLI notify 훅: User+Assistant 턴을 대화 파일에 저장
# Codex는 argv 마지막 인자로 JSON 페이로드를 전달함
# AI 호출 없음 = 빠름

# UTF-8 인코딩 설정 (BOM 없음)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# argv 마지막 인자에서 JSON 페이로드 파싱
$payload = $null
try {
    $lastArg = $args[$args.Count - 1]
    $payload = $lastArg | ConvertFrom-Json
} catch {
    exit 0
}

if (-not $payload) { exit 0 }

# agent-turn-complete 이벤트만 처리
if ($payload.type -ne "agent-turn-complete") { exit 0 }

# turn-id 추출 (중복 방지용)
$turnId = $payload.'turn-id'
if (-not $turnId) { $turnId = "" }

# User 입력 추출: input-messages 배열 → join
$userMessages = $payload.'input-messages'
$userText = ""
if ($userMessages -is [array]) {
    $userText = ($userMessages -join "`n").Trim()
} elseif ($userMessages) {
    $userText = "$userMessages".Trim()
}

# Assistant 응답 추출: last-assistant-message 문자열
$response = "$($payload.'last-assistant-message')".Trim()

# 둘 다 비어있으면 스킵
if ((-not $userText -or $userText.Length -lt 1) -and (-not $response -or $response.Length -lt 5)) {
    exit 0
}

# 대화 디렉토리 및 파일
$ConvDir = Join-Path $PWD.Path "conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$ConvFile = Join-Path $ConvDir "$Today-codex.md"

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

# turn-id 기반 중복 방지
if ($turnId -and (Test-Path $ConvFile)) {
    $existing = Get-Content $ConvFile -Raw -Encoding UTF8
    if ($existing -match [regex]::Escape("<!-- turn:$turnId -->")) {
        exit 0
    }
}

$ts = Get-Date -Format 'HH:mm:ss'
$entry = ""

# User 입력 기록
if ($userText -and $userText.Length -ge 1) {
    $entry += "`n## [$ts] User`n`n$userText`n"
}

# Assistant 응답 처리
if ($response -and $response.Length -ge 5) {
    # 코드 블록 제거 (```...``` 사이의 내용을 [code block] 으로 대체)
    $response = [regex]::Replace($response, '(?s)```[^\n]*\n.*?```', '[code block]')

    # 2000자 제한
    if ($response.Length -gt 2000) {
        $response = $response.Substring(0, 2000) + "..."
    }

    $entry += "`n## [$ts] Assistant`n`n$response`n"
}

# turn-id 주석 추가 (중복 방지 마커)
if ($turnId) {
    $entry += "<!-- turn:$turnId -->`n"
}

# append (BOM 없는 UTF-8로 저장)
if ($entry) {
    [System.IO.File]::AppendAllText($ConvFile, $entry, [System.Text.Encoding]::UTF8)
}
