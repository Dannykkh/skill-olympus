# 대화 로그 저장 (단순 append)
param([string]$Prompt)

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

# append
Add-Content -Path $ConvFile -Value "`n## [$(Get-Date -Format 'HH:mm')] User`n`n$Prompt`n" -Encoding UTF8
