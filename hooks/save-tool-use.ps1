# save-tool-use.ps1 - PostToolUse 훅: 도구 호출을 한 줄로 기록
# 도구명 + 파일경로만 append. AI 호출 없음 = 빠름
# claude-mem의 관찰 캡처 아이디어를 차용하되, 파일 기반으로 단순 구현

# UTF-8 인코딩 설정 (BOM 없음)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$json = [Console]::In.ReadToEnd() | ConvertFrom-Json

$toolName = $json.tool_name
$toolInput = $json.tool_input

# 기록하지 않을 도구 (너무 빈번하거나 노이즈)
$skipTools = @("Glob", "Grep", "Read", "LS", "TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskOutput")
if ($skipTools -contains $toolName) { exit 0 }

# 대화 로그 경로
$ConvDir = Join-Path $PWD.Path "conversations"
$Today = Get-Date -Format "yyyy-MM-dd"
$LogFile = Join-Path $ConvDir "$Today-toollog.md"

# conversations 폴더 자동 생성
if (-not (Test-Path $ConvDir)) {
    New-Item -ItemType Directory -Path $ConvDir -Force | Out-Null
}

# 파일 없으면 헤더
if (-not (Test-Path $LogFile)) {
    $Header = @"
---
date: $Today
type: tool-log
---

# Tool Usage Log - $Today

"@
    [System.IO.File]::WriteAllText($LogFile, $Header, [System.Text.Encoding]::UTF8)
}

# 도구별 핵심 정보 추출
$detail = ""
switch ($toolName) {
    "Edit"    { $detail = $toolInput.file_path }
    "Write"   { $detail = $toolInput.file_path }
    "Bash"    {
        $cmd = "$($toolInput.command)"
        # 명령어 첫 80자만
        if ($cmd.Length -gt 80) { $cmd = $cmd.Substring(0, 80) + "..." }
        $detail = $cmd
    }
    "Agent"   { $detail = "$($toolInput.subagent_type): $($toolInput.description)" }
    "Skill"   { $detail = $toolInput.skill }
    "WebFetch"   { $detail = $toolInput.url }
    "WebSearch"  { $detail = $toolInput.query }
    default   { $detail = "" }
}

$ts = Get-Date -Format 'HH:mm:ss'
$entry = "- ``[$ts]`` **$toolName** $detail`n"

# 중복 방지: 같은 초에 같은 도구+내용이 있으면 스킵
if (Test-Path $LogFile) {
    $existing = Get-Content $LogFile -Raw -Encoding UTF8
    $fingerprint = "[$ts]`` **$toolName**"
    if ($existing.Contains($fingerprint)) { exit 0 }
}

[System.IO.File]::AppendAllText($LogFile, $entry, [System.Text.Encoding]::UTF8)
