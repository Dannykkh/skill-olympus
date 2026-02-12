# save-response.ps1 - Stop 훅: Assistant 응답을 대화 파일에 저장
# transcript_path에서 마지막 assistant 메시지를 추출하여 append
# AI 호출 없음 = 빠름

# UTF-8 인코딩 설정 (BOM 없음)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$transcriptPath = $json.transcript_path

if (-not $transcriptPath -or -not (Test-Path $transcriptPath)) { exit 0 }

# 대화 파일 확인
$ConvDir = Join-Path $PWD.Path "conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$ConvFile = Join-Path $ConvDir "$Today-claude.md"
if (-not (Test-Path $ConvFile)) { exit 0 }

# JSONL 파일 끝에서 역방향으로 assistant text 메시지 찾기
# Get-Content -Tail은 파일 전체를 읽으므로, 대용량 JSONL(수백MB)에서 느림
# → FileStream.Seek로 끝에서 청크 단위로 읽어 성능 확보
$lastTextLine = $null
try {
    $fs = [System.IO.FileStream]::new($transcriptPath, 'Open', 'Read', 'ReadWrite')
    $chunkSize = 512KB
    $maxRead = 5MB  # 최대 5MB까지만 탐색
    $totalRead = 0
    $remainder = ""

    while ($totalRead -lt $maxRead -and $fs.Length -gt 0) {
        $readSize = [Math]::Min($chunkSize, $fs.Length - $totalRead)
        if ($readSize -le 0) { break }
        $seekPos = [Math]::Max(0, $fs.Length - $totalRead - $readSize)
        $fs.Seek($seekPos, 'Begin') | Out-Null
        $buffer = New-Object byte[] $readSize
        $fs.Read($buffer, 0, $readSize) | Out-Null
        $chunk = [System.Text.Encoding]::UTF8.GetString($buffer) + $remainder
        $totalRead += $readSize

        # 줄 단위로 분리 후 역순 탐색
        $chunkLines = $chunk -split "`n"
        $remainder = $chunkLines[0]  # 첫 줄은 잘렸을 수 있으므로 다음 청크에 이월
        for ($i = $chunkLines.Count - 1; $i -ge 1; $i--) {
            if ($chunkLines[$i] -match '"type"\s*:\s*"assistant"' -and $chunkLines[$i] -match '"type"\s*:\s*"text"') {
                $lastTextLine = $chunkLines[$i]
                break
            }
        }
        if ($lastTextLine) { break }
        if ($seekPos -eq 0) { break }
    }
    $fs.Close()
} catch {
    if ($fs) { $fs.Close() }
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

# 코드 블록 제거 (```...``` 사이의 내용을 [code block] 으로 대체)
$response = [regex]::Replace($response, '(?s)```[^\n]*\n.*?```', '[code block]')

# 2000자 제한
if ($response.Length -gt 2000) {
    $response = $response.Substring(0, 2000) + "..."
}

# 중복 방지: 같은 초에 이미 Assistant 저장되어 있으면 스킵
$ts = Get-Date -Format 'HH:mm:ss'
if (Test-Path $ConvFile) {
    $existing = Get-Content $ConvFile -Raw -Encoding UTF8
    if ($existing -match [regex]::Escape("## [$ts] Assistant")) {
        exit 0
    }
}

# append (BOM 없는 UTF-8로 저장)
$entry = "`n## [$ts] Assistant`n`n$response`n"
[System.IO.File]::AppendAllText($ConvFile, $entry, [System.Text.Encoding]::UTF8)
