# check-new-file.ps1
# 새 파일 생성 전 reducing-entropy 원칙 확인 (PreToolUse 훅)
# 트리거: Write 도구 사용 전 (새 파일 생성 시)

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

# 이미 존재하는 파일이면 통과 (수정이므로)
if (Test-Path $FilePath) {
    exit 0
}

$FileName = Split-Path $FilePath -Leaf
$DirName = Split-Path $FilePath -Parent
$Extension = [System.IO.Path]::GetExtension($FileName)
$BaseName = [System.IO.Path]::GetFileNameWithoutExtension($FileName)

Write-Host "[Hook] New file creation detected: $FilePath"

$Warnings = @()

# === 1. Reducing Entropy 체크 ===
# 테스트/목/스텁 파일은 허용
if ($FileName -match "test|spec|mock|stub|fixture|__init__.py") {
    exit 0
}

# === 2. 유사한 파일 존재 여부 확인 ===
if ((Test-Path $DirName) -and $BaseName.Length -ge 5) {
    $Prefix = $BaseName.Substring(0, 5)
    $SimilarFiles = Get-ChildItem -Path $DirName -File -Filter "$Prefix*" -ErrorAction SilentlyContinue | Select-Object -First 5

    if ($SimilarFiles) {
        $Warnings += "[Reducing Entropy] Similar files exist in directory:"
        foreach ($file in $SimilarFiles) {
            $Warnings += "  -> $($file.Name)"
        }
        $Warnings += "Consider extending existing file instead of creating new one."
    }
}

# === 3. 유틸/헬퍼 파일 생성 경고 ===
if ($FileName -match "util|utils|helper|helpers|common|shared") {
    $Warnings += "[Reducing Entropy] Utility file detected: $FileName"
    $Warnings += "  -> Question: Can this logic be placed in the file that uses it?"
    $Warnings += "  -> Consider: Is this truly reusable across 3+ files?"
}

# === 4. 새 모듈/패키지 생성 경고 ===
if ($FileName -match "^(index\.ts|index\.js|__init__\.py|mod\.rs)$") {
    if (Test-Path $DirName) {
        $FileCount = (Get-ChildItem -Path $DirName -File -ErrorAction SilentlyContinue | Measure-Object).Count
        if ($FileCount -eq 0) {
            $Warnings += "[Reducing Entropy] Creating new module/package: $DirName"
            $Warnings += "  -> Question: Is a new module necessary, or can existing modules be extended?"
        }
    }
}

# === 5. 설정 파일 중복 경고 ===
if ($FileName -match "\.config\.|\.conf$|\.cfg$|rc\.js$|rc\.json$") {
    $ExistingConfigs = Get-ChildItem -Path "." -Recurse -Depth 2 -Include "*.config.*", "*.conf" -ErrorAction SilentlyContinue | Select-Object -First 5
    if ($ExistingConfigs) {
        $Warnings += "[Reducing Entropy] New config file: $FileName"
        $Warnings += "  -> Existing configs found. Consider consolidating."
    }
}

# === 결과 출력 ===
if ($Warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "================================================================"
    Write-Host "          REDUCING ENTROPY - Pre-Creation Check"
    Write-Host "================================================================"
    Write-Host "  Before creating new files, ask:"
    Write-Host "  1. Can I extend an existing file instead?"
    Write-Host "  2. Will this file be used by 3+ other files?"
    Write-Host "  3. Is this abstraction necessary NOW, or premature?"
    Write-Host "================================================================"
    Write-Host ""
    foreach ($warn in $Warnings) {
        Write-Host "  [!] $warn"
    }
    Write-Host ""
    Write-Host "[Hook] Proceeding with file creation (warnings only, not blocking)"
}

# 경고만 출력하고 차단하지 않음
exit 0
