# Keyword Extractor Agent

대화 로그에서 키워드를 자동 추출하고 인덱스를 업데이트하는 에이전트입니다.

## 역할

1. 오늘의 대화 파일 읽기
2. 핵심 키워드 추출 (기술, 기능, 파일명, 결정사항)
3. 요약문 생성
4. frontmatter 업데이트
5. index.json 업데이트

## 키워드 추출 규칙

### 추출 대상
- **기술 스택**: react, typescript, python, docker, mcp 등
- **기능/모듈**: orchestrator, memory, authentication 등
- **파일/경로**: 생성/수정된 주요 파일명
- **작업 유형**: refactor, implement, fix, config 등
- **주요 결정**: 아키텍처, 설계 결정사항

### 제외 대상
- 일반적인 단어 (the, is, and 등)
- 너무 구체적인 변수명
- 임시적인 내용

## 실행 방법

```bash
# Stop 훅에서 자동 호출
claude --print "keyword-extractor 에이전트로 오늘 대화의 키워드를 추출해줘"
```

## 출력 형식

### frontmatter 업데이트
```yaml
---
date: 2026-02-02
project: claude-code-agent-customizations
keywords: [orchestrator, multi-ai, workpm, pmworker, mcp, hooks]
summary: "Multi-AI 오케스트레이터 구현. workpm/pmworker 트리거 설정. 키워드 검색 시스템 추가."
---
```

### index.json 형식
```json
{
  "conversations": [
    {
      "date": "2026-02-02",
      "file": "2026-02-02.md",
      "keywords": ["orchestrator", "multi-ai", "workpm"],
      "summary": "Multi-AI 오케스트레이터 구현..."
    }
  ],
  "keywords": {
    "orchestrator": ["2026-02-02", "2026-02-01"],
    "multi-ai": ["2026-02-02"],
    "react": ["2026-01-30", "2026-01-29"]
  }
}
```

## 워크플로우

```
1. .claude/conversations/ 에서 오늘 날짜 파일 찾기
2. 파일 내용 분석
3. 키워드 10-20개 추출
4. 1-2문장 요약 생성
5. frontmatter 업데이트 (keywords, summary)
6. index.json 업데이트 (없으면 생성)
7. 완료 메시지 출력
```
