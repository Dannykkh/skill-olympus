# update-check.ps1 — 주기적 버전 체크
#
# 출력 (한 줄 또는 없음):
#   UPGRADE_AVAILABLE <old> <new>   — 원격 VERSION이 로컬과 다름
#   (없음)                          — 최신 상태, 스누즈 중, 또는 체크 건너뜀
#
# 사용법:
#   powershell -ExecutionPolicy Bypass -File update-check.ps1 [--force]
#
# 환경 변수 오버라이드 (테스트용):
#   OLYMPUS_DIR          — 레포 루트 오버라이드
#   OLYMPUS_REMOTE_URL   — 원격 VERSION URL 오버라이드
#   OLYMPUS_STATE_DIR    — 상태 디렉토리 오버라이드

param([switch]$Force)

$ErrorActionPreference = 'SilentlyContinue'

# ── 경로 설정 ──
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = if ($env:OLYMPUS_DIR) { $env:OLYMPUS_DIR } else { Split-Path -Parent $ScriptDir }
$StateDir = if ($env:OLYMPUS_STATE_DIR) { $env:OLYMPUS_STATE_DIR } else { Join-Path $env:USERPROFILE '.skill-olympus' }
$CacheFile = Join-Path $StateDir 'last-update-check'
$SnoozeFile = Join-Path $StateDir 'update-snoozed'
$VersionFile = Join-Path $RepoRoot 'VERSION'
$RemoteUrl = if ($env:OLYMPUS_REMOTE_URL) { $env:OLYMPUS_REMOTE_URL } else { 'https://raw.githubusercontent.com/Dannykkh/skill-olympus/master/VERSION' }

# ── Force 플래그: 캐시 + 스누즈 초기화 ──
if ($Force) {
    Remove-Item $CacheFile -ErrorAction SilentlyContinue
    Remove-Item $SnoozeFile -ErrorAction SilentlyContinue
}

# ── 스누즈 체크 함수 ──
function Test-Snoozed {
    param([string]$RemoteVer)
    if (-not (Test-Path $SnoozeFile)) { return $false }
    try {
        $parts = (Get-Content $SnoozeFile -Raw).Trim() -split '\s+'
        if ($parts.Count -lt 3) { return $false }
        $snoozedVer = $parts[0]
        $snoozedLevel = [int]$parts[1]
        $snoozedEpoch = [long]$parts[2]
        # 새 버전이면 스누즈 무시
        if ($snoozedVer -ne $RemoteVer) { return $false }
        # 레벨별 기간: 1=24h, 2=48h, 3+=7일
        if ($snoozedLevel -eq 1) { $duration = 86400 }
        elseif ($snoozedLevel -eq 2) { $duration = 172800 }
        else { $duration = 604800 }
        $now = [long](Get-Date -UFormat %s)
        $expires = $snoozedEpoch + $duration
        return ($now -lt $expires)
    } catch { return $false }
}

# ── Step 1: 로컬 버전 읽기 ──
if (-not (Test-Path $VersionFile)) { exit 0 }
$Local = (Get-Content $VersionFile -Raw).Trim()
if (-not $Local) { exit 0 }

# ── Step 2: 캐시 확인 ──
if (-not $Force -and (Test-Path $CacheFile)) {
    try {
        $cached = (Get-Content $CacheFile -Raw).Trim()
        $cacheAge = ((Get-Date) - (Get-Item $CacheFile).LastWriteTime).TotalMinutes
        if ($cached -match '^UP_TO_DATE') {
            $cacheTtl = 60
            $cachedVer = ($cached -split '\s+')[1]
            if ($cacheAge -lt $cacheTtl -and $cachedVer -eq $Local) { exit 0 }
        }
        elseif ($cached -match '^UPGRADE_AVAILABLE') {
            $cacheTtl = 720
            $parts = $cached -split '\s+'
            $cachedOld = $parts[1]
            $cachedNew = $parts[2]
            if ($cacheAge -lt $cacheTtl -and $cachedOld -eq $Local) {
                if (Test-Snoozed $cachedNew) { exit 0 }
                Write-Output $cached
                exit 0
            }
        }
    } catch {}
}

# ── Step 3: 원격 VERSION fetch ──
if (-not (Test-Path $StateDir)) {
    New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
}

$Remote = ''
try {
    $Remote = (Invoke-WebRequest -Uri $RemoteUrl -UseBasicParsing -TimeoutSec 5).Content.Trim()
} catch {}

# 유효성 검증: 버전 번호 형태인지
if (-not ($Remote -match '^\d+\.\d+[\d.]*$')) {
    "UP_TO_DATE $Local" | Set-Content $CacheFile -NoNewline
    exit 0
}

if ($Local -eq $Remote) {
    "UP_TO_DATE $Local" | Set-Content $CacheFile -NoNewline
    exit 0
}

# 버전 다름 → 업그레이드 가능
$result = "UPGRADE_AVAILABLE $Local $Remote"
$result | Set-Content $CacheFile -NoNewline

if (Test-Snoozed $Remote) { exit 0 }

Write-Output $result
