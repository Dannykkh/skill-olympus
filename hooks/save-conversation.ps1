# 대화 로그 저장 (단순 append)
# Claude Code는 stdin으로 JSON을 전달함 (UTF-8)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$Prompt = $json.prompt

$ConvDir = Join-Path $PWD.Path ".claude\conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$ConvFile = Join-Path $ConvDir "$Today.md"

# 폴더 생성
if (-not (Test-Path $ConvDir)) {
    New-Item -ItemType Directory -Path $ConvDir -Force | Out-Null
}

# 파일 없으면 헤더
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
    Set-Content -Path $ConvFile -Value $Header -Encoding UTF8
}

# 중복 방지: 같은 분(minute)에 동일 프롬프트가 이미 저장되어 있으면 스킵
$TimeStamp = Get-Date -Format 'HH:mm'
$Entry = "`n## [$TimeStamp] User`n`n$Prompt`n"

if (Test-Path $ConvFile) {
    $Existing = Get-Content $ConvFile -Raw -Encoding UTF8
    if ($Existing -match [regex]::Escape("## [$TimeStamp] User") -and $Existing -match [regex]::Escape($Prompt)) {
        exit 0
    }
}

# append
Add-Content -Path $ConvFile -Value $Entry -Encoding UTF8
