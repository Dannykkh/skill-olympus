# loop-stop.ps1 - Stop 훅: 루프 활성화 시 세션 종료를 가로채서 같은 프롬프트를 재투입
# 상태 파일: .claude/loop-state.md

$ErrorActionPreference = "Stop"

$hookInput = $input | Out-String
$stateFile = ".claude/loop-state.md"

# 상태 파일 없으면 루프 비활성 — 그냥 통과
if (-not (Test-Path $stateFile)) {
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

# 완료 감지 1: AI가 "더 이상 할 게 없다" 패턴 출력
$donePatterns = @(
    'Chronos Complete',
    '더 이상.*(할|수정할|고칠).*(없|작업이 없)',
    'all issues.*fixed',
    'no more.*issues',
    '남은.*이슈.*없',
    '모든.*이슈.*수정.*완료',
    '모든.*작업.*완료'
)
foreach ($p in $donePatterns) {
    if ($lastOutput -match $p) {
        Write-Host "loop: AI가 작업 완료를 보고했습니다. 루프를 종료합니다."
        Remove-Item $stateFile -Force
        exit 0
    }
}

# 완료 감지 2: <promise> 매칭
if ($completionPromise -and $completionPromise -ne "null") {
    $promiseMatch = [regex]::Match($lastOutput, '<promise>(.*?)</promise>')
    if ($promiseMatch.Success -and $promiseMatch.Groups[1].Value.Trim() -eq $completionPromise) {
        Write-Host "loop: 완료 조건 달성! <promise>$completionPromise</promise>"
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
