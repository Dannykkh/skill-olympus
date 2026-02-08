---
name: fullstack-development-workflow
description: |
  풀스택 개발 종합 워크플로우. 프론트엔드~백엔드 구현, 문서화, 테스트, 릴리즈까지
  전체 개발 사이클을 관리합니다. 프로젝트 시작 시 자동 적용.
auto_apply: true
priority: high
references:
  - agents/frontend-react.md
  - agents/backend-spring.md
  - agents/python-fastapi-guidelines.md
  - agents/react-best-practices.md
  - agents/documentation.md
  - agents/qa-engineer.md
  - agents/qa-writer.md
  - agents/code-reviewer.md
---

# Fullstack Development Workflow

프론트엔드~백엔드 전체 개발 사이클 관리 에이전트.

## Core Principles

### 코드 품질 규칙 (항상 적용)
|규칙|제한|
|---|---|
|파일 크기|≤ 500줄|
|함수 크기|≤ 50줄|
|클래스 크기|≤ 300줄|
|중복 코드|금지 → 추출/재사용|
|타입 안전성|필수 (TypeScript/Type hints)|

### 레이어 아키텍처
```
Frontend (React/Next.js)
    ↓ API 호출 (Proxy 설정)
Backend (FastAPI/Spring)
    ↓ Repository Pattern
Database (MySQL/PostgreSQL)
```

---

## Development Workflow

### Phase 1: 설계 (SPEC Interview)

SPEC.md 기반 심층 인터뷰 진행:
1. 기술적 구현 방식
2. UI/UX 상세 설계
3. 우려 사항 및 리스크
4. 트레이드오프 분석
5. 완료까지 반복 질문

### Phase 1.5: 아키텍처 설계

SPEC.md 기반으로 시스템 아키텍처를 설계:
1. 아키텍처 패턴 선택 (모놀리식/모듈러/마이크로서비스)
2. 기술 스택 평가 및 선정
3. 확장성 전략 수립
4. ADR (Architecture Decision Record) 작성
5. 시스템 다이어그램 생성

> **에이전트**: `architect` → `mermaid-diagram-specialist` 순서로 실행

### Phase 2: 문서화

|문서|내용|도구|
|---|---|---|
|PRD|제품 요구사항, 기능 명세|`/write-prd`|
|ERD|데이터베이스 스키마|`/mermaid-diagrams`|
|기술문서|아키텍처, API 스펙|`/write-api-docs`|
|요구사항|기능별 요구사항 번호|수동|

### Phase 3: 구현

작업리스트 기반 구현:
```
각 기능별:
1. 프론트엔드 구현 (React/Next.js)
2. 백엔드 구현 (FastAPI/Spring)
3. API 연동 (프록시 설정)
4. 코드 리뷰 (`/review`)
5. 영향도 평가
```

#### 영향도 평가 체크리스트
- [ ] 수정 파일 목록
- [ ] 영향 받는 다른 기능
- [ ] 기존 테스트 영향
- [ ] API 계약 변경 여부
- [ ] 마이그레이션 필요 여부

### Phase 4: 테스트

|테스트|도구|자동화|
|---|---|---|
|QA 시나리오|qa-writer|문서 생성|
|E2E 테스트|Playwright|자동 실행|
|API 연동|api-tester|자동 검증|
|프록시 확인|Manual|체크리스트|

#### QA 프로세스
```
1. QA 테스트 시나리오 작성
2. 시나리오 → Playwright 테스트 코드
3. API 연동 테스트 실행
4. 프록시 연결 확인
5. 통과 → 체크리스트 완료
6. 실패 → 수정 후 재테스트
```

### Phase 5: 릴리즈

```bash
# 1. 버전 수정
npm version patch/minor/major  # 또는 pyproject.toml

# 2. 문서 업데이트
/write-changelog
/update-docs  # README 등

# 3. 빌드 & 푸시
npm run build && git push

# 4. GitHub 릴리즈
gh release create v1.x.x --generate-notes

# 5. 마스터 머지
git checkout master && git merge develop
```

---

## Required Documents Checklist

|문서|생성|검토|
|---|---|---|
|[ ] PRD|/write-prd|팀 리뷰|
|[ ] ERD|mermaid-diagrams|DBA 리뷰|
|[ ] 기술문서|/write-api-docs|개발자 리뷰|
|[ ] 요구사항 정의서|수동|PM 리뷰|
|[ ] QA 시나리오|qa-writer|QA 리뷰|
|[ ] QA 테스트 결과|Playwright|자동|
|[ ] 릴리즈 노트|/write-changelog|PM 리뷰|

---

## Sub-Agents to Use

|단계|에이전트|용도|
|---|---|---|
|설계|spec-interviewer|SPEC.md 심층 인터뷰|
|설계|architect|시스템 아키텍처 설계, 기술 스택 평가|
|프론트|frontend-react|React 구현|
|백엔드|backend-spring / python-fastapi|API 구현|
|DB|database-mysql, database-postgresql|스키마 설계|
|문서|documentation|PRD, 기술문서|
|테스트|qa-engineer, qa-writer|테스트 전략/시나리오|
|리뷰|code-reviewer|코드 품질 검증|
|API|api-tester|연동 테스트|

---

## Hooks Applied

|훅|시점|동작|
|---|---|---|
|validate-code.sh|PostToolUse|500줄 제한, 보안 검사|
|check-new-file.sh|PreToolUse|새 파일 필요성 확인|
|validate-docs.sh|PostToolUse|문서 AI 패턴 검출|

---

## Quick Commands

```bash
# 설계
/write-prd [feature]

# 구현
/generate [component]
/review [file]

# 테스트
/test
qa-writer로 시나리오 생성
api-tester로 연동 검증

# 릴리즈
/write-changelog
gh release create
```
