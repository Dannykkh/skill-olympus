# Stop 훅 데이터 덤프 (디버그용)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$raw = [Console]::In.ReadToEnd()
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outFile = Join-Path $PWD.Path ".claude\debug-stop-$timestamp.json"
Set-Content -Path $outFile -Value $raw -Encoding UTF8
