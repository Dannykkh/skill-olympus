# validate-docs.ps1
# 마크다운 문서 작성 후 AI 글쓰기 패턴 검출 (PostToolUse 훅)
# 기반: Wikipedia "Signs of AI writing" + humanizer 스킬

# Claude Code는 stdin으로 JSON을 전달함
try {
    $json = [Console]::In.ReadToEnd() | ConvertFrom-Json
    $FilePath = $json.tool_input.file_path
} catch {
    exit 0
}

# 파일 경로가 없으면 통과
if ([string]::IsNullOrEmpty($FilePath)) {
    exit 0
}

# 마크다운 파일만 검사
$Extension = [System.IO.Path]::GetExtension($FilePath)
if ($Extension -notin @(".md", ".mdx")) {
    exit 0
}

# 파일이 존재하는지 확인
if (-not (Test-Path $FilePath)) {
    exit 0
}

Write-Host "[Hook] Checking documentation: $FilePath"

$Warnings = @()
$Content = Get-Content $FilePath -Raw -ErrorAction SilentlyContinue

# === 1. AI 과잉 어휘 검출 ===
$AiWords = @(
    "delve", "crucial", "pivotal", "moreover", "furthermore",
    "comprehensive", "cutting-edge", "groundbreaking", "game-changing",
    "revolutionary", "paradigm", "synergy", "leverage", "robust",
    "seamless", "streamline", "utilize", "facilitate", "endeavor",
    "paramount", "plethora", "myriad", "embark", "foster", "bolster"
)

$FoundAiWords = @()
foreach ($word in $AiWords) {
    if ($Content -match "\b$word\b") {
        $FoundAiWords += $word
    }
}

if ($FoundAiWords.Count -ge 3) {
    $Warnings += "[AI Pattern] Overused AI vocabulary detected ($($FoundAiWords.Count) words):"
    $Warnings += "  -> Found: $($FoundAiWords -join ', ')"
    $Warnings += "  -> Consider using simpler, more direct language"
}

# === 2. Em-dash 과다 사용 검출 ===
$EmDashCount = ([regex]::Matches($Content, "—")).Count
$WordCount = ($Content -split '\s+').Count

if ($WordCount -gt 100) {
    $EmDashRatio = [math]::Round(($EmDashCount * 1000) / $WordCount)
    if ($EmDashRatio -gt 10) {
        $Warnings += "[AI Pattern] Excessive em-dash usage: $EmDashCount em-dashes in $WordCount words"
        $Warnings += "  -> Consider using commas, parentheses, or separate sentences"
    }
}

# === 3. 과잉 부사 검출 ===
$ExcessiveAdverbs = @(
    "extremely", "incredibly", "absolutely", "definitely", "certainly",
    "undoubtedly", "remarkably", "exceptionally", "tremendously", "significantly"
)

$FoundAdverbs = @()
foreach ($adverb in $ExcessiveAdverbs) {
    if ($Content -match "\b$adverb\b") {
        $FoundAdverbs += $adverb
    }
}

if ($FoundAdverbs.Count -ge 3) {
    $Warnings += "[AI Pattern] Excessive intensifying adverbs ($($FoundAdverbs.Count) found):"
    $Warnings += "  -> Found: $($FoundAdverbs -join ', ')"
    $Warnings += "  -> Let facts speak for themselves without amplification"
}

# === 4. 판촉성 문구 검출 ===
$PromotionalPatterns = @(
    "take .* to the next level",
    "stands out",
    "best practices",
    "industry-leading",
    "world-class",
    "state-of-the-art",
    "unlock .* potential",
    "empower"
)

foreach ($pattern in $PromotionalPatterns) {
    if ($Content -match $pattern) {
        $Warnings += "[AI Pattern] Promotional language detected: '$pattern'"
        $Warnings += "  -> Use neutral, factual descriptions instead"
        break
    }
}

# === 결과 출력 ===
if ($Warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "================================================================"
    Write-Host "           HUMANIZER - AI Writing Pattern Check"
    Write-Host "================================================================"
    Write-Host ""
    foreach ($warn in $Warnings) {
        Write-Host "  $warn"
    }
    Write-Host ""
    Write-Host "Tip: Review and revise to sound more natural and human-written."
    Write-Host ""
}

if ($Warnings.Count -eq 0) {
    Write-Host "[Hook] [OK] Documentation check passed: $FilePath"
}

exit 0
