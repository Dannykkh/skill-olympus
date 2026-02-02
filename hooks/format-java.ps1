# format-java.ps1
# Java 파일 자동 포맷팅

param(
    [Parameter(Position=0)]
    [string]$FilePath
)

# Java 파일인지 확인
if (-not $FilePath.EndsWith(".java")) {
    exit 0
}

# google-java-format 존재 확인
if (Get-Command google-java-format -ErrorAction SilentlyContinue) {
    Write-Host "[Hook] Formatting Java file: $FilePath"
    & google-java-format -i $FilePath
    Write-Host "[OK] Formatted: $FilePath"
}
elseif (Test-Path ".\gradlew.bat") {
    Write-Host "[Hook] Running Gradle spotlessApply..."
    & .\gradlew.bat spotlessApply -q
}
else {
    Write-Host "[!] No Java formatter found. Skipping formatting."
}

exit 0
