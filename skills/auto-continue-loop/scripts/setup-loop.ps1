# setup-loop.ps1 — Chronos 강제 루프 시작 (Windows)
# 상태 파일을 생성하고, Stop 훅(loop-stop.ps1)이 세션 종료를 가로채게 함

param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

$maxIterations = 50
$completionPromise = "null"
$promptParts = @()
$goalMode = $false
$i = 0

while ($i -lt $Arguments.Count) {
    switch ($Arguments[$i]) {
        "--help" {
            Write-Host @"
Chronos Loop — AI가 반복하며 작업을 완성합니다

사용법:
  /chronos 할일 [옵션]

옵션:
  --max-iterations <횟수>         최대 반복 횟수 (기본: 50, 0=무제한)
  --completion-promise '<조건>'   완료 조건
  --help                         도움말

예시:
  /chronos TODO API 만들어줘 --completion-promise '모든 테스트 통과' --max-iterations 20
  /chronos --max-iterations 10 인증 버그 고쳐줘

중단: pwsh -File skills/auto-continue-loop/scripts/cancel-loop.ps1
"@
            exit 0
        }
        "--max-iterations" {
            $i++
            if ($i -ge $Arguments.Count -or $Arguments[$i] -notmatch '^\d+$') {
                Write-Error "max-iterations에는 숫자를 넣어주세요."
                exit 1
            }
            $maxIterations = [int]$Arguments[$i]
        }
        "--completion-promise" {
            $i++
            if ($i -ge $Arguments.Count) {
                Write-Error "completion-promise에 완료 조건을 넣어주세요."
                exit 1
            }
            $completionPromise = $Arguments[$i]
        }
        "--goal-mode" {
            $goalMode = $true
        }
        default {
            $promptParts += $Arguments[$i]
        }
    }
    $i++
}

$prompt = $promptParts -join " "

# goal 모드 하드 가드: 네이티브 /goal이 Stop 게이트를 담당하므로, 폴백 상태 파일을
# 만들지 않고 3곳(.claude/.codex/.chronos)의 기존 loop-state.md를 모두 제거한다.
# → Stop 훅(loop-stop)이 발동할 대상이 사라져 이중 재투입 충돌이 코드 레벨에서 불가능.
if ($goalMode) {
    $guardTargets = @(".claude/loop-state.md", ".codex/loop-state.md", ".chronos/loop-state.md")
    $removed = 0
    foreach ($p in $guardTargets) {
        if (Test-Path $p) { Remove-Item $p -Force; $removed++ }
    }
    Write-Host "Chronos goal 모드: 네이티브 /goal이 Stop 게이트를 담당합니다."
    Write-Host "loop-state.md 정리: ${removed}개 제거 — Stop 훅 비활성(충돌 방지)."
    exit 0
}

if (-not $prompt) {
    Write-Error "할 일을 알려주세요!`n`n  예시: /chronos TODO API 만들어줘 --max-iterations 20"
    exit 1
}

$stateDir = if ($env:CODEX_THREAD_ID) {
    ".codex"
} elseif ($env:GEMINI_SESSION_ID) {
    ".chronos"
} else {
    ".claude"
}
$statePath = Join-Path $stateDir "loop-state.md"

New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

# 기존 루프 감지 — 다른 세션의 루프가 활성 상태이면 경고
if (Test-Path $statePath) {
    $existingContent = Get-Content $statePath -Raw
    $existingSession = if ($existingContent -match "session_id:\s*(.+)") { $Matches[1].Trim() } else { "" }
    $currentSession = if ($env:CLAUDE_CODE_SESSION_ID) {
        $env:CLAUDE_CODE_SESSION_ID
    } elseif ($env:CODEX_THREAD_ID) {
        $env:CODEX_THREAD_ID
    } elseif ($env:GEMINI_SESSION_ID) {
        $env:GEMINI_SESSION_ID
    } else {
        ""
    }
    if ($existingSession -and $currentSession -and $existingSession -ne $currentSession) {
        Write-Host "⚠️ 다른 세션($($existingSession.Substring(0, [Math]::Min(8, $existingSession.Length)))...)의 루프가 활성 상태입니다."
        Write-Host "   기존 루프를 덮어쓰고 새 루프를 시작합니다."
    }
}

$sessionId = if ($env:CLAUDE_CODE_SESSION_ID) {
    $env:CLAUDE_CODE_SESSION_ID
} elseif ($env:CODEX_THREAD_ID) {
    $env:CODEX_THREAD_ID
} elseif ($env:GEMINI_SESSION_ID) {
    $env:GEMINI_SESSION_ID
} else {
    ""
}
$cpYaml = if ($completionPromise -ne "null") { "`"$completionPromise`"" } else { "null" }
$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$stateContent = @"
---
active: true
iteration: 1
session_id: $sessionId
last_turn_id: ""
max_iterations: $maxIterations
completion_promise: $cpYaml
started_at: "$now"
---

$prompt
"@

Set-Content -Path $statePath -Value $stateContent

$maxLabel = if ($maxIterations -gt 0) { "${maxIterations}회" } else { "무제한" }
$cpLabel = if ($completionPromise -ne "null") { $completionPromise } else { "없음" }

Write-Host @"
Chronos Loop 시작

반복: 1회차
최대 반복: $maxLabel
완료 조건: $cpLabel
상태 파일: $statePath

AI가 작업 → 끝내려 함 → CLI 훅 체인이 같은 프롬프트 재투입
매 반복마다 이전 결과를 보면서 점진적으로 완성도를 높입니다.

중단: pwsh -File skills/auto-continue-loop/scripts/cancel-loop.ps1 (Linux/Mac: bash ./cancel-loop.sh)

"@

Write-Host $prompt

if ($completionPromise -ne "null") {
    Write-Host ""
    Write-Host "════════════════════════════════════════"
    Write-Host "  완료하려면 이걸 출력하세요:"
    Write-Host "  <promise>$completionPromise</promise>"
    Write-Host ""
    Write-Host "  진짜 완료됐을 때만 출력하세요!"
    Write-Host "════════════════════════════════════════"
}
