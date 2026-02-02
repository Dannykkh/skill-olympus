# validate-code.ps1
# 코드 파일 수정 후 자동 검증 (PostToolUse 훅)
# 트리거: Edit, Write 도구 사용 후 (*.py, *.ts, *.tsx, *.jsx, *.java)

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

# 파일 경로가 없으면 통과
if ([string]::IsNullOrEmpty($FilePath)) {
    exit 0
}

# 코드 파일 확장자 확인
$Extension = [System.IO.Path]::GetExtension($FilePath)
$CodeExtensions = @(".py", ".ts", ".tsx", ".jsx", ".java", ".js")
if ($Extension -notin $CodeExtensions) {
    exit 0
}

# 파일이 존재하는지 확인
if (-not (Test-Path $FilePath)) {
    exit 0
}

Write-Host "[Hook] Validating code: $FilePath"

$Warnings = @()
$Errors = @()

# 파일 내용 읽기
$Content = Get-Content $FilePath -Raw -ErrorAction SilentlyContinue
$Lines = Get-Content $FilePath -ErrorAction SilentlyContinue

# === 1. 파일 줄 수 검사 (500줄 제한) ===
$LineCount = $Lines.Count
if ($LineCount -gt 500) {
    $Errors += "[Line Limit] File has $LineCount lines (max: 500). Split into modules."
} elseif ($LineCount -gt 400) {
    $Warnings += "[Line Limit] File has $LineCount lines. Consider splitting soon (max: 500)."
}

# === 2. 보안 취약점 패턴 검사 ===
# SQL Injection 패턴
if ($Content -match "(execute|query|raw)\s*\([^)]*\+|f[`"'].*SELECT|f[`"'].*INSERT|f[`"'].*UPDATE|f[`"'].*DELETE") {
    $Errors += "[Security] Potential SQL Injection: Use parameterized queries instead of string concatenation"
}

# XSS 패턴 (React dangerouslySetInnerHTML)
if ($Content -match "dangerouslySetInnerHTML") {
    $Warnings += "[Security] dangerouslySetInnerHTML detected: Ensure input is sanitized"
}

# eval() 사용
if ($Content -match "\beval\s*\(") {
    $Errors += "[Security] eval() detected: Avoid using eval() for security reasons"
}

# 하드코딩된 시크릿 패턴
if ($Content -match "(?i)(password|secret|api_key|apikey|token)\s*=\s*[`"'][^`"']+[`"']") {
    $Warnings += "[Security] Potential hardcoded secret detected: Use environment variables"
}

# === 3. TODO/FIXME 없이 주석 처리된 코드 경고 ===
$CommentedCode = ($Lines | Where-Object { $_ -match "^\s*(#|//)\s*(if|for|while|def|function|class|return|import|const|let|var)" }).Count
if ($CommentedCode -gt 5) {
    $Warnings += "[Clean Code] $CommentedCode lines of commented-out code detected: Remove or add TODO"
}

# === 결과 출력 ===
if ($Errors.Count -gt 0) {
    Write-Host ""
    Write-Host "=== ERRORS (must fix) ==="
    foreach ($err in $Errors) {
        Write-Host "  [X] $err"
    }
}

if ($Warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "=== WARNINGS (recommend fix) ==="
    foreach ($warn in $Warnings) {
        Write-Host "  [!] $warn"
    }
}

if ($Errors.Count -eq 0 -and $Warnings.Count -eq 0) {
    Write-Host "[Hook] [OK] Code validation passed: $FilePath"
}

# 에러가 있으면 실패 (차단), 경고만 있으면 통과
if ($Errors.Count -gt 0) {
    Write-Host ""
    Write-Host "[Hook] BLOCKED: Fix errors before proceeding"
    exit 1
}

exit 0
