# save-response.ps1 - Stop 훅: Assistant 응답을 대화 파일에 저장
# transcript_path에서 마지막 assistant 메시지를 추출하여 append
# AI 호출 없음 = 빠름

[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$transcriptPath = $json.transcript_path

if (-not $transcriptPath -or -not (Test-Path $transcriptPath)) { exit 0 }

# 대화 파일 확인
$ConvDir = Join-Path $PWD.Path ".claude\conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$ConvFile = Join-Path $ConvDir "$Today.md"
if (-not (Test-Path $ConvFile)) { exit 0 }

# JSONL 마지막 줄들에서 assistant text 메시지 찾기
# Claude Code는 thinking/text/tool_use를 별도 JSONL 줄로 분리함
# → "type":"assistant" AND "type":"text" 둘 다 포함된 줄을 찾아야 함
$lastTextLine = $null
$lines = Get-Content -Path $transcriptPath -Tail 20 -Encoding UTF8
for ($i = $lines.Count - 1; $i -ge 0; $i--) {
    if ($lines[$i] -match '"type"\s*:\s*"assistant"' -and $lines[$i] -match '"type"\s*:\s*"text"') {
        $lastTextLine = $lines[$i]
        break
    }
}
if (-not $lastTextLine) { exit 0 }

# 텍스트 추출
try {
    $msg = $lastTextLine | ConvertFrom-Json
    $texts = @()
    foreach ($block in $msg.message.content) {
        if ($block.type -eq "text" -and $block.text) {
            $texts += $block.text
        }
    }
    $response = ($texts -join "`n").Trim()
} catch {
    exit 0
}

# 빈 응답이면 스킵
if (-not $response -or $response.Length -lt 5) { exit 0 }

# 500자 제한
if ($response.Length -gt 500) {
    $response = $response.Substring(0, 500) + "..."
}

# 중복 방지: 같은 분에 이미 Assistant 저장되어 있으면 스킵
$ts = Get-Date -Format 'HH:mm'
if (Test-Path $ConvFile) {
    $existing = Get-Content $ConvFile -Raw -Encoding UTF8
    if ($existing -match [regex]::Escape("## [$ts] Assistant")) {
        exit 0
    }
}

# append
$entry = "`n## [$ts] Assistant`n`n$response`n"
Add-Content -Path $ConvFile -Value $entry -Encoding UTF8
