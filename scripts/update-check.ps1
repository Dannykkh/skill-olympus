# update-check.ps1 — 주기적 버전 체크
#
# 출력 (한 줄 또는 없음):
#   UPGRADE_AVAILABLE <old> <new>   — 원격 VERSION이 로컬보다 높음 (점으로 나눈 숫자 비교)
#   (없음)                          — 최신 상태, 스누즈 중, 또는 체크 건너뜀
#
# 사용법:
#   powershell -ExecutionPolicy Bypass -File update-check.ps1 [--force]
#
# 환경 변수 오버라이드 (테스트용):
#   OLYMPUS_DIR          — 레포 루트 오버라이드
#   OLYMPUS_REMOTE_URL   — 원격 VERSION URL 오버라이드
#   OLYMPUS_STATE_DIR    — 상태 디렉토리 오버라이드
#   OLYMPUS_UPDATE_CHECK_DISABLE — 1|true|yes 면 버전 체크 비활성화 (원격 요청 없음)

param([switch]$Force)

$ErrorActionPreference = 'SilentlyContinue'

# 버전 체크 opt-out: 세션 시작마다 나가는 원격 GET을 원치 않는 사용자를 위한 플래그 (개인정보처리방침 거부 방법)
if ($env:OLYMPUS_UPDATE_CHECK_DISABLE -match '^(1|true|yes)$') { exit 0 }

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

# ── 버전 비교 함수: $A가 $B보다 높으면 $true ──
# 글자 비교가 아니라 숫자 묶음을 앞에서부터 비교한다(7.10.0 > 7.6.0). 숫자 아닌 꼬리(-dev)는 무시한다.
function Test-VersionGreater {
    param([string]$A, [string]$B)
    $pa = @([regex]::Matches($A, '\d+') | ForEach-Object { [long]$_.Value })
    $pb = @([regex]::Matches($B, '\d+') | ForEach-Object { [long]$_.Value })
    $n = [Math]::Max($pa.Count, $pb.Count)
    for ($i = 0; $i -lt $n; $i++) {
        $x = if ($i -lt $pa.Count) { $pa[$i] } else { 0 }
        $y = if ($i -lt $pb.Count) { $pb[$i] } else { 0 }
        if ($x -gt $y) { return $true }
        if ($x -lt $y) { return $false }
    }
    return $false
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
            # 고치기 전 버전이 남긴 "UPGRADE_AVAILABLE <로컬> <더 낮은 원격>" 캐시는 믿지 않고 다시 확인한다.
            if ($cacheAge -lt $cacheTtl -and $cachedOld -eq $Local -and (Test-VersionGreater $cachedNew $Local)) {
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

# 원격이 같거나 낮으면 최신이다. 릴리즈를 푸시한 직후에는 원격 파일 캐시가 몇 분간 옛 VERSION을
# 주므로, "다르다"로 판단하면 로컬이 앞선 순간에 업그레이드를 안내하게 된다 (gotcha 126).
if (-not (Test-VersionGreater $Remote $Local)) {
    "UP_TO_DATE $Local" | Set-Content $CacheFile -NoNewline
    exit 0
}

# 원격이 더 높음 → 업그레이드 가능
$result = "UPGRADE_AVAILABLE $Local $Remote"
$result | Set-Content $CacheFile -NoNewline

if (Test-Snoozed $Remote) { exit 0 }

Write-Output $result
