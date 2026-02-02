# validate-api.ps1
# API 엔드포인트 파일 수정 시 유효성 검사

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

# API 라우터 파일인지 확인
if ($FilePath -notmatch "[\\/]api[\\/]" -and $FilePath -notmatch "[\\/]routes[\\/]") {
    exit 0
}

Write-Host "[Hook] Validating API file: $FilePath"

$Extension = [System.IO.Path]::GetExtension($FilePath)

# Python 파일 검증
if ($Extension -eq ".py") {
    # 구문 검사
    $python = Get-Command python3 -ErrorAction SilentlyContinue
    if (-not $python) {
        $python = Get-Command python -ErrorAction SilentlyContinue
    }

    if ($python) {
        $result = & $python.Source -m py_compile $FilePath 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[Hook] ERROR: Python syntax error in $FilePath"
            Write-Host $result
            exit 1
        }
    }

    # mypy 검사 (있으면)
    if (Get-Command mypy -ErrorAction SilentlyContinue) {
        & mypy $FilePath --ignore-missing-imports 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[Hook] WARNING: Type hint issues found (not blocking)"
        }
    }
}

# TypeScript 파일 검증
if ($Extension -in @(".ts", ".tsx")) {
    if (Get-Command npx -ErrorAction SilentlyContinue) {
        & npx tsc --noEmit $FilePath 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[Hook] WARNING: TypeScript errors found (not blocking)"
        }
    }
}

Write-Host "[Hook] API validation passed: $FilePath"
exit 0
