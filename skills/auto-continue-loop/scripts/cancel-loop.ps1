# cancel-loop.ps1 — Chronos 루프 중단
# 상태 파일을 삭제하여 Stop 훅이 루프 재투입을 멈추도록 함
# Claude가 Bash로 rm을 호출할 필요가 없도록, 사용자가 터미널에서 직접 실행합니다.

param(
    [string]$BaseDir = (Get-Location).Path
)

$stateFiles = @(
    (Join-Path $BaseDir ".claude\loop-state.md"),
    (Join-Path $BaseDir ".codex\loop-state.md"),
    (Join-Path $BaseDir ".chronos\loop-state.md")
)

$removed = 0
foreach ($path in $stateFiles) {
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "removed: $path"
        $removed++
    }
}

if ($removed -eq 0) {
    Write-Host "Chronos 상태 파일이 없습니다. 이미 루프가 비활성 상태입니다."
} else {
    Write-Host "Chronos 루프를 중단했습니다. ($removed개 상태 파일 삭제)"
}
