# format-typescript.ps1
# TypeScript/JavaScript 파일 자동 포맷팅

param(
    [Parameter(Position=0)]
    [string]$FilePath
)

# TS/JS 파일인지 확인
$ValidExtensions = @(".ts", ".tsx", ".js", ".jsx")
$Extension = [System.IO.Path]::GetExtension($FilePath)
if ($Extension -notin $ValidExtensions) {
    exit 0
}

# node_modules 제외
if ($FilePath -match "node_modules") {
    exit 0
}

Write-Host "[Hook] Formatting TypeScript file: $FilePath"

if (Get-Command npx -ErrorAction SilentlyContinue) {
    # Prettier 실행
    & npx prettier --write $FilePath 2>$null

    # ESLint fix
    & npx eslint --fix $FilePath 2>$null

    Write-Host "[OK] Formatted: $FilePath"
}
else {
    Write-Host "[!] npx not found. Skipping formatting."
}

exit 0
