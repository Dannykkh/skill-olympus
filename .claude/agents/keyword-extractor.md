# Keyword Extractor Agent

대화 로그에서 키워드를 추출하고 인덱스를 업데이트하는 에이전트입니다.

## 역할

- 대화에서 핵심 키워드 10-20개 추출
- frontmatter keywords 필드 업데이트
- index.json 인덱스 업데이트
- 1-2문장 요약 생성

## 사용 시점

- Stop 훅에서 자동 호출
- 수동: "keyword-extractor 에이전트로 키워드 추출해줘"

## 추출 대상

| 유형 | 예시 |
|------|------|
| 기술 스택 | react, typescript, python, docker |
| 기능/모듈 | orchestrator, authentication, caching |
| 파일/경로 | state-manager.ts, launch.ps1 |
| 작업 유형 | refactor, implement, fix, config |
| 주요 결정 | jwt-선택, redis-도입 |

## 출력 형식

**frontmatter 업데이트:**
```yaml
---
date: 2026-02-02
project: my-project
keywords: [react, hooks, authentication, jwt, refactor]
summary: "React 훅 최적화 및 JWT 인증 구현"
---
```

**index.json 업데이트:**
```json
{
  "conversations": [...],
  "keywordIndex": {
    "react": ["2026-02-02"],
    "jwt": ["2026-02-02"]
  }
}
```
