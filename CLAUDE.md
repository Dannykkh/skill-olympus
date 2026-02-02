@MEMORY.md

# CLAUDE.md

이 파일은 Claude Code가 프로젝트 작업 시 참조하는 지침입니다.

## 프로젝트 정보

- 프로젝트 이름: claude-code-agent-customizations
- 생성일: 2026-01-29

## 코딩 스타일

- 대답은 한국어로 해주세요
- 코드 작성 시 주석은 한국어로 작성해주세요

## 메모리 자동 기록 규칙

세션 중 다음 내용은 MEMORY.md에 자동으로 요약해서 추가하세요:
- 아키텍처/설계 결정사항
- 버그 원인과 해결 방법
- 기술 스택 선택 이유
- 반복되는 작업 패턴
- 주의해야 할 함정/이슈
- 성능 개선 방법

매 작업 완료 시 중요한 내용이 있으면 MEMORY.md의 적절한 섹션에 추가하세요.
이미 기록된 내용은 중복 추가하지 마세요.

## 대화 키워드 자동 태깅

매 작업 완료 후, 오늘 대화 파일의 frontmatter keywords를 업데이트하세요:

- 파일 위치: `.claude/conversations/YYYY-MM-DD.md`
- 파일이 있을 때만 업데이트 (없으면 무시)

**추출 대상:**
- 기술 스택: react, typescript, spring, docker, mcp 등
- 작업 내용: authentication, refactoring, bug-fix, api-연동 등
- 기능/모듈명: login, payment, user-profile 등
- 주요 파일명: state-manager.ts, launch.ps1 등

**형식:**
```yaml
keywords: ["jwt-authentication", "login-bug-fix", "react", "api-연동"]
```

**규칙:**
- 기존 키워드에 새 키워드 추가 (중복 제거)
- 키워드는 소문자, 하이픈(-) 사용
- 한국어 키워드도 허용
- 5-15개 범위로 유지
