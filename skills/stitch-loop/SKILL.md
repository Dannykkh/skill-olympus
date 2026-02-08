---
name: stitch-loop
description: Stitch MCP로 멀티페이지 웹사이트 자율 생성. 바톤 시스템으로 페이지별 반복 생성, SITE.md 로드맵 관리. "멀티페이지 생성", "사이트 빌드 루프" 요청 시 사용.
---

# Stitch Build Loop

바톤(Baton) 시스템으로 멀티페이지 웹사이트를 자율적으로 생성합니다.

## 핵심 메커니즘

`next-prompt.md` 파일이 각 반복 간 작업을 릴레이하는 바톤 역할을 수행.

```
[SITE.md 계획] → [바톤 읽기] → [Stitch 생성] → [통합] → [검증] → [바톤 전달] → 반복
```

## 사전 준비

### SITE.md (사이트 로드맵)

```markdown
# SITE.md

## 프로젝트 정보
- 이름: My Project
- Stitch 프로젝트 ID: {stitch_project_id}

## 사이트맵
| 페이지 | 경로 | 상태 | 설명 |
|--------|------|------|------|
| Home | / | ⬜ | 랜딩 페이지 |
| About | /about | ⬜ | 소개 페이지 |
| Dashboard | /dashboard | ⬜ | 메인 대시보드 |
| Settings | /settings | ⬜ | 설정 페이지 |

## 네비게이션
- Header: Home, About, Dashboard
- Footer: Privacy, Terms
```

### next-prompt.md (바톤 파일)

```markdown
# 다음 작업

## 페이지: Home
## 경로: /
## 프롬프트:
{stitch-enhance-prompt로 최적화된 상세 프롬프트}

## 디자인 컨텍스트:
{DESIGN.md의 관련 섹션}
```

## 실행 흐름 (1회 반복)

### 1. 바톤 읽기
`next-prompt.md`에서 페이지명, 경로, 프롬프트 추출

### 2. 컨텍스트 확인
- `SITE.md`: 사이트맵, 로드맵 참조
- `DESIGN.md`: 디자인 시스템 스타일 참조

### 3. Stitch 생성
```
generate_screen_from_text(prompt, project_id)
→ HTML + 스크린샷 반환
```

### 4. 통합
- HTML을 `site/public/{경로}/index.html`로 저장
- 네비게이션 링크 연결 (다른 페이지와의 링크)
- 공통 헤더/푸터 일관성 확인

### 5. 검증
- 시각적 확인 (스크린샷 검토)
- 링크 동작 확인
- 반응형 레이아웃 확인

### 6. 문서 갱신
`SITE.md` 사이트맵 상태 업데이트: `⬜` → `✅`

### 7. 다음 바톤 준비
`next-prompt.md`에 다음 페이지 작업 작성

## 필수 규칙

|규칙|설명|
|---|---|
|디자인 컨텍스트 포함|DESIGN.md 블록을 모든 프롬프트에 포함|
|바톤 업데이트|각 반복 완료 전 `next-prompt.md` 갱신|
|중복 방지|사이트맵에 `✅`인 페이지 재생성 금지|
|ID 저장|프로젝트 생성 후 `stitch.json`에 ID 기록|
|일관성|모든 페이지가 동일한 디자인 시스템 사용|

## 오케스트레이션 모드

|모드|설명|
|---|---|
|수동|각 페이지 생성 후 사용자 확인 후 다음 진행|
|자율|전체 사이트맵을 순서대로 자동 생성|
|하이브리드|핵심 페이지는 수동, 나머지는 자율|

## 사용법

```
/stitch-loop
# 또는
"SITE.md 기반으로 전체 사이트를 빌드해줘"
"남은 페이지들을 루프로 생성해줘"
```
