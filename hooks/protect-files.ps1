# protect-files.ps1
# 중요 파일 수정 방지 (PreToolUse 훅)

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

# 보호할 파일/패턴 목록
$ProtectedPatterns = @(
    "*.env",
    "*.env.local",
    "*.env.production",
    ".git\*",
    "node_modules\*",
    "__pycache__\*",
    "*.pyc",
    "credentials.json",
    "secrets.yaml",
    "*.key",
    "*.pem",
    "*.p12"
)

# 보호할 디렉토리 목록
$ProtectedDirs = @(
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv"
)

$FileName = Split-Path $FilePath -Leaf

# 패턴 매칭 검사
foreach ($pattern in $ProtectedPatterns) {
    if ($FilePath -like $pattern -or $FileName -like $pattern) {
        Write-Host "[Hook] BLOCKED: Cannot modify protected file: $FilePath"
        Write-Host "This file is protected for security reasons."
        exit 1
    }
}

# 디렉토리 검사
foreach ($dir in $ProtectedDirs) {
    if ($FilePath -like "*\$dir\*" -or $FilePath -like "$dir\*") {
        Write-Host "[Hook] BLOCKED: Cannot modify files in protected directory: $dir"
        exit 1
    }
}

# 민감 정보 포함 여부 경고
if ($FileName -match "secret|credential|password") {
    Write-Host "[Hook] WARNING: Modifying potentially sensitive file: $FilePath"
    Write-Host "Please ensure no secrets are being committed."
}

exit 0
