# Memory Update Hook - 세션 종료 시 MEMORY.md 및 키워드 자동 업데이트
#
# 사용법: Stop 훅에서 실행
# 기능:
#   1. keyword-extractor 에이전트로 대화 키워드 추출
#   2. memory-writer 에이전트로 MEMORY.md 업데이트
#   3. index.json 업데이트

$ProjectDir = $PWD.Path
$Today = Get-Date -Format "yyyy-MM-dd"
$ConvDir = Join-Path $ProjectDir ".claude\conversations"
$ConvFile = Join-Path $ConvDir "$Today.md"
$MemoryFile = Join-Path $ProjectDir "MEMORY.md"
$IndexFile = Join-Path $ConvDir "index.json"

# 대화 로그가 있는 경우만 실행
if (Test-Path $ConvFile) {

    # 1. 키워드 추출 및 frontmatter 업데이트
    Write-Host "[Keyword Extractor] 대화 키워드 추출 중..."

    $keywordPrompt = @"
keyword-extractor 에이전트로 오늘 대화(.claude/conversations/$Today.md)를 분석해서:
1. 핵심 키워드 10-20개 추출 (기술, 기능, 파일명, 작업 유형)
2. 1-2문장 요약 생성
3. 파일의 frontmatter(keywords, summary) 업데이트
4. .claude/conversations/index.json 업데이트 (없으면 생성)

frontmatter 형식:
---
date: $Today
project: $(Split-Path $ProjectDir -Leaf)
keywords: [keyword1, keyword2, ...]
summary: "요약문"
---
"@

    & claude --print --max-turns 5 $keywordPrompt 2>$null

    Write-Host "[Keyword Extractor] 키워드 추출 완료"

    # 2. MEMORY.md 업데이트 (파일이 있는 경우)
    if (Test-Path $MemoryFile) {
        Write-Host "[Memory Writer] 세션 대화 분석 중..."

        $memoryPrompt = "memory-writer 에이전트로 오늘 대화(.claude/conversations/$Today.md)를 분석해서 MEMORY.md에 중요한 내용을 추가해줘. 중복은 피하고 간결하게."

        & claude --print --max-turns 3 $memoryPrompt 2>$null

        Write-Host "[Memory Writer] MEMORY.md 업데이트 완료"
    }

} else {
    Write-Host "[Memory Hook] 오늘 대화 로그 없음 - 스킵"
}
