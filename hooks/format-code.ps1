# format-code.ps1
# 파일 저장 후 자동 포맷팅 (PostToolUse 훅)

param(
    [Parameter(Position=0)]
    [string]$ToolInput
)

# JSON에서 파일 경로 추출
try {
    $InputObj = $ToolInput | ConvertFrom-Json
    $FilePath = $InputObj.file_path
} catch {
    exit 0
}

# 파일 경로가 없으면 종료
if ([string]::IsNullOrEmpty($FilePath)) {
    exit 0
}

# 파일이 존재하지 않으면 종료
if (-not (Test-Path $FilePath)) {
    exit 0
}

$Extension = [System.IO.Path]::GetExtension($FilePath)

# Python 파일 포맷팅
if ($Extension -eq ".py") {
    Write-Host "[Hook] Formatting Python file: $FilePath"

    # ruff가 설치되어 있으면 사용
    if (Get-Command ruff -ErrorAction SilentlyContinue) {
        & ruff format $FilePath 2>$null
        & ruff check --fix $FilePath 2>$null
    }
    # 아니면 black 사용
    elseif (Get-Command black -ErrorAction SilentlyContinue) {
        & black $FilePath 2>$null
    }
}

# TypeScript/JavaScript 파일 포맷팅
if ($Extension -in @(".ts", ".tsx", ".js", ".jsx")) {
    Write-Host "[Hook] Formatting TypeScript/JavaScript file: $FilePath"

    if (Get-Command npx -ErrorAction SilentlyContinue) {
        # Prettier 사용
        & npx prettier --write $FilePath 2>$null

        # ESLint 자동 수정
        $ParentDir = Split-Path $FilePath -Parent
        if ((Test-Path "$ParentDir\..\eslintrc.js") -or (Test-Path "$ParentDir\..\eslint.config.js")) {
            & npx eslint --fix $FilePath 2>$null
        }
    }
}

# JSON 파일 포맷팅
if ($Extension -eq ".json") {
    Write-Host "[Hook] Formatting JSON file: $FilePath"
    if (Get-Command npx -ErrorAction SilentlyContinue) {
        & npx prettier --write $FilePath 2>$null
    }
}

# CSS/SCSS 파일 포맷팅
if ($Extension -in @(".css", ".scss")) {
    Write-Host "[Hook] Formatting CSS file: $FilePath"
    if (Get-Command npx -ErrorAction SilentlyContinue) {
        & npx prettier --write $FilePath 2>$null
    }
}

# Java 파일 포맷팅
if ($Extension -eq ".java") {
    Write-Host "[Hook] Formatting Java file: $FilePath"

    if (Get-Command google-java-format -ErrorAction SilentlyContinue) {
        & google-java-format -i $FilePath
    }
    elseif (Test-Path ".\gradlew.bat") {
        & .\gradlew.bat spotlessApply -q 2>$null
    }
}

exit 0
