# Session Conversation Logger Hook (PowerShell)
# 모든 대화를 날짜별 .md 파일로 저장
#
# 사용법: powershell -File hooks/save-conversation.ps1 "$PROMPT"
# 저장 위치: .claude/conversations/YYYY-MM-DD.md

param(
    [Parameter(Position=0)]
    [string]$Prompt
)

$ProjectDir = $PWD.Path
$ConvDir = Join-Path $ProjectDir ".claude\conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$Timestamp = Get-Date -Format "HH:mm:ss"
$ConvFile = Join-Path $ConvDir "$Today.md"

# conversations 폴더 생성
if (-not (Test-Path $ConvDir)) {
    New-Item -ItemType Directory -Path $ConvDir -Force | Out-Null
}

# 파일이 없으면 헤더 추가
if (-not (Test-Path $ConvFile)) {
    $ProjectName = Split-Path $ProjectDir -Leaf
    $Header = @"
# Conversation Log - $Today

프로젝트: $ProjectName
생성일: $Today

---

"@
    Set-Content -Path $ConvFile -Value $Header -Encoding UTF8
}

# 사용자 프롬프트 추가
$Entry = @"

## [$Timestamp] User

$Prompt

---
"@
Add-Content -Path $ConvFile -Value $Entry -Encoding UTF8

Write-Host "[Session Logger] 대화 저장됨: $ConvFile"
