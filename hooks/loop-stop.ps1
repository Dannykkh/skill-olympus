# loop-stop.ps1 - Stop 훅: 루프 활성화 시 세션 종료를 가로채서 같은 프롬프트를 재투입
# 상태 파일: .claude/.codex/.chronos/loop-state.md 중 먼저 발견된 것
# (CLI별 setup-loop가 자기 디렉토리에 만들기 때문에 3곳 모두 검사해야 모든 CLI에서 작동)

$ErrorActionPreference = "Stop"

# stdin을 UTF-8로 읽기. `$input | Out-String`은 PS 5.1 환경에서
# 시스템 코드페이지(cp949 등)로 디코드하여 한글 페이로드를 mojibake로 만들고,
# 결국 ConvertFrom-Json이 'invalid object' 에러로 실패함.
try { [Console]::InputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$hookInput = [Console]::In.ReadToEnd()

# 상태 파일 탐색: Claude(.claude), Codex(.codex), Gemini(.chronos) 순.
# 이전에는 ".claude/loop-state.md"만 봐서 Gemini 세션의 .chronos 상태를 못 찾는 버그가 있었음.
$stateCandidates = @(".claude/loop-state.md", ".codex/loop-state.md", ".chronos/loop-state.md")
$stateFile = $stateCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

# 상태 파일 없으면 루프 비활성 — 그냥 통과
if (-not $stateFile) {
    exit 0
}

$content = Get-Content $stateFile -Raw

# frontmatter 파싱
$frontmatterMatch = [regex]::Match($content, '(?s)^---\r?\n(.*?)\r?\n---')
if (-not $frontmatterMatch.Success) {
    Write-Error "loop: 상태 파일이 손상되었습니다. 루프를 중단합니다."
    Remove-Item $stateFile -Force
    exit 0
}
$fm = $frontmatterMatch.Groups[1].Value

function Get-FmValue($key) {
    $m = [regex]::Match($fm, "(?m)^${key}:\s*(.+)$")
    if ($m.Success) { return $m.Groups[1].Value.Trim().Trim('"') }
    return ""
}

$iteration = Get-FmValue "iteration"
$maxIterations = Get-FmValue "max_iterations"
$completionPromise = Get-FmValue "completion_promise"
$stateSession = Get-FmValue "session_id"
$startedAt = Get-FmValue "started_at"

# stale 감지: started_at이 2시간 이상 지났으면 자동 비활성화
if ($startedAt) {
    try {
        $startTime = [DateTimeOffset]::Parse($startedAt)
        $elapsed = [DateTimeOffset]::UtcNow - $startTime
        if ($elapsed.TotalHours -ge 2) {
            Write-Host "loop: started_at($startedAt)이 2시간 이상 경과. 이전 세션의 stale 루프를 자동 종료합니다."
            Remove-Item $stateFile -Force
            exit 0
        }
    } catch {
        # 파싱 실패 시 무시하고 계속 진행
    }
}

# 세션 격리
$hookObj = $hookInput | ConvertFrom-Json -ErrorAction SilentlyContinue
$hookSession = if ($hookObj.session_id) { $hookObj.session_id } else { "" }
if ($stateSession -and $stateSession -ne $hookSession) {
    exit 0
}

# 숫자 검증
if ($iteration -notmatch '^\d+$' -or $maxIterations -notmatch '^\d+$') {
    Write-Error "loop: 상태 파일이 손상되었습니다. 루프를 중단합니다."
    Remove-Item $stateFile -Force
    exit 0
}

$iter = [int]$iteration
$maxIter = [int]$maxIterations

# 최대 반복 도달
if ($maxIter -gt 0 -and $iter -ge $maxIter) {
    Write-Host "loop: 최대 반복 횟수($maxIter)에 도달했습니다."
    Remove-Item $stateFile -Force
    exit 0
}

# 트랜스크립트에서 마지막 assistant 메시지 추출
$transcriptPath = $hookObj.transcript_path
if (-not $transcriptPath -or -not (Test-Path $transcriptPath)) {
    Write-Error "loop: 트랜스크립트를 찾을 수 없습니다. 루프를 중단합니다."
    Remove-Item $stateFile -Force
    exit 0
}

$lastLines = Get-Content $transcriptPath -Tail 500 | Where-Object { $_ -match '"role":"assistant"' }
if (-not $lastLines) {
    Write-Error "loop: assistant 메시지를 찾을 수 없습니다. 루프를 중단합니다."
    Remove-Item $stateFile -Force
    exit 0
}

$lastLine = $lastLines | Select-Object -Last 1
try {
    $parsed = $lastLine | ConvertFrom-Json
    $lastOutput = ($parsed.message.content | Where-Object { $_.type -eq "text" } | Select-Object -Last 1).text
} catch {
    Write-Error "loop: JSON 파싱 실패. 루프를 중단합니다."
    Remove-Item $stateFile -Force
    exit 0
}

# 완료 감지 1: AI가 'Chronos Complete' 마커 출력
# 명시적 마커만 검사하므로 tail-500 가드는 불필요 (전체 출력 검사).
# 가드가 있으면 마커 뒤에 긴 설명/표/태그가 붙을 때 미탐(끝 500자 밖으로 밀림)이 발생.
$donePatterns = @(
    'Chronos Complete'
)
foreach ($p in $donePatterns) {
    if ($lastOutput -match $p) {
        Write-Host "loop: AI가 작업 완료를 보고했습니다. 루프를 종료합니다."
        Remove-Item $stateFile -Force
        exit 0
    }
}

# 완료 감지 2: <promise> 매칭 (정확 일치 또는 포함 매칭) — 전체 출력 검사
if ($completionPromise -and $completionPromise -ne "null") {
    $promiseMatch = [regex]::Match($lastOutput, '<promise>(.*?)</promise>')
    if ($promiseMatch.Success) {
        $promiseValue = $promiseMatch.Groups[1].Value.Trim()
        # 정확 일치 또는 포함 매칭 (공백/줄바꿈 차이 허용)
        if ($promiseValue -eq $completionPromise -or $promiseValue -match [regex]::Escape($completionPromise) -or $completionPromise -match [regex]::Escape($promiseValue)) {
            Write-Host "loop: 완료 조건 달성! <promise>$promiseValue</promise>"
            Remove-Item $stateFile -Force
            exit 0
        }
    }
    # <promise> 태그가 있기만 하면 완료로 간주 (completion_promise 없이 태그만 쓴 경우)
    if ($lastOutput -match '<promise>') {
        Write-Host "loop: <promise> 태그 감지 — 완료로 판정"
        Remove-Item $stateFile -Force
        exit 0
    }
}

# 다음 반복으로 진행
$nextIter = $iter + 1

# frontmatter 이후의 프롬프트 본문 추출
$parts = $content -split '(?m)^---\s*$', 3
if ($parts.Count -lt 3 -or $parts[2].Trim() -eq "") {
    Write-Error "loop: 프롬프트를 찾을 수 없습니다. 루프를 중단합니다."
    Remove-Item $stateFile -Force
    exit 0
}
$promptText = $parts[2].Trim()

# iteration 카운터 업데이트
$newContent = $content -replace "(?m)^iteration:\s*\d+", "iteration: $nextIter"
Set-Content -Path $stateFile -Value $newContent -NoNewline

# 시스템 메시지 구성
$maxLabel = if ($maxIter -gt 0) { "${maxIter}회" } else { "무제한" }
$commonMsg = "Chronos loop ${nextIter}/${maxLabel} | 이전 작업 결과를 확인하고 다음 할 일을 찾아 진행하세요. 더 이상 할 작업이 없으면 반드시 'Chronos Complete'를 포함하여 최종 보고를 출력하세요."

if ($completionPromise -and $completionPromise -ne "null") {
    $sysMsg = "${commonMsg} 또는 완료 조건 달성 시: <promise>$completionPromise</promise>"
} else {
    $sysMsg = $commonMsg
}

# Stop 훅 block 응답
@{
    decision = "block"
    reason = $promptText
    systemMessage = $sysMsg
} | ConvertTo-Json -Compress
