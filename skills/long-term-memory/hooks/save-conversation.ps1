# Session Conversation Logger Hook (PowerShell)
# 모든 대화를 날짜별 .md 파일로 저장 (frontmatter 형식)
# 해시태그(#keyword) 자동 추출하여 keywords에 추가
#
# 사용법: powershell -File hooks/save-conversation.ps1 "$PROMPT"
# 저장 위치: .claude/conversations/YYYY-MM-DD.md
#
# 해시태그 예시:
#   "jwt 인증 구현해줘 #authentication #security"
#   → keywords: [authentication, security]

param(
    [Parameter(Position=0)]
    [string]$Prompt
)

$ProjectDir = $PWD.Path
$ConvDir = Join-Path $ProjectDir ".claude\conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$Timestamp = Get-Date -Format "HH:mm:ss"
$ConvFile = Join-Path $ConvDir "$Today.md"
$ProjectName = Split-Path $ProjectDir -Leaf

# conversations 폴더 생성
if (-not (Test-Path $ConvDir)) {
    New-Item -ItemType Directory -Path $ConvDir -Force | Out-Null
}

# 프롬프트에서 해시태그 추출 (#keyword 형식)
$HashtagMatches = [regex]::Matches($Prompt, '#([a-zA-Z가-힣0-9_-]+)')
$NewKeywords = @()
foreach ($match in $HashtagMatches) {
    $NewKeywords += $match.Groups[1].Value.ToLower()
}

# 파일이 없으면 frontmatter 헤더 추가
if (-not (Test-Path $ConvFile)) {
    $KeywordsJson = if ($NewKeywords.Count -gt 0) {
        "[" + (($NewKeywords | ForEach-Object { "`"$_`"" }) -join ", ") + "]"
    } else {
        "[]"
    }

    $Header = @"
---
date: $Today
project: $ProjectName
keywords: $KeywordsJson
summary: ""
---

# Conversation Log - $Today

프로젝트: $ProjectName

---

"@
    Set-Content -Path $ConvFile -Value $Header -Encoding UTF8
}
elseif ($NewKeywords.Count -gt 0) {
    # 기존 파일에서 keywords 업데이트
    $Content = Get-Content -Path $ConvFile -Raw -Encoding UTF8

    # 기존 keywords 추출
    if ($Content -match 'keywords:\s*\[([^\]]*)\]') {
        $ExistingKeywordsStr = $Matches[1]
        $ExistingKeywords = @()
        if ($ExistingKeywordsStr -ne "") {
            $ExistingKeywords = $ExistingKeywordsStr -split ',' | ForEach-Object {
                $_.Trim().Trim('"').Trim("'")
            } | Where-Object { $_ -ne "" }
        }

        # 새 키워드 병합 (중복 제거)
        $AllKeywords = @($ExistingKeywords) + @($NewKeywords) | Select-Object -Unique
        $NewKeywordsJson = "[" + (($AllKeywords | ForEach-Object { "`"$_`"" }) -join ", ") + "]"

        # frontmatter 업데이트
        $UpdatedContent = $Content -replace 'keywords:\s*\[[^\]]*\]', "keywords: $NewKeywordsJson"
        Set-Content -Path $ConvFile -Value $UpdatedContent -Encoding UTF8 -NoNewline
    }
}

# 사용자 프롬프트 추가
$Entry = @"

## [$Timestamp] User

$Prompt

---
"@
Add-Content -Path $ConvFile -Value $Entry -Encoding UTF8

# 로그 출력
if ($NewKeywords.Count -gt 0) {
    $TagsStr = $NewKeywords -join ", "
    Write-Host "[Session Logger] 대화 저장됨 + 키워드: $TagsStr"
} else {
    Write-Host "[Session Logger] 대화 저장됨: $ConvFile"
}
