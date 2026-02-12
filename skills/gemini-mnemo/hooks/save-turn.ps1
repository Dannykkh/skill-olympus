# save-turn.ps1 - Gemini CLI AfterAgent 훅: User+Assistant 턴을 대화 파일에 저장
# Gemini는 stdin으로 JSON 페이로드를 전달함 (prompt + prompt_response)
# AI 호출 없음 = 빠름

# UTF-8 인코딩 설정 (BOM 없음)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

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
    # 코드 블록 제거 (```...``` 사이의 내용을 [code block] 으로 대체)
    $response = [regex]::Replace($response, '(?s)```[^\n]*\n.*?```', '[code block]')

    # 2000자 제한
    if ($response.Length -gt 2000) {
        $response = $response.Substring(0, 2000) + "..."
    }

    $entry += "`n## [$ts] Assistant`n`n$response`n"
}

# append (BOM 없는 UTF-8로 저장)
if ($entry) {
    [System.IO.File]::AppendAllText($ConvFile, $entry, [System.Text.Encoding]::UTF8)
}
