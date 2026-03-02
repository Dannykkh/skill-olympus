---
name: web-preview-development
description: 웹 프리뷰 모드 개발 가이드. 채팅 모드에서 dev server + PreviewPanel 활성화 시 프론트엔드 우선 개발 순서를 자동 적용.
auto_apply:
  - "chat-mode"
  - "preview-panel"
  - "dev-server"
---

# Web Preview Mode Development Guide (Passive)

채팅 모드에서 웹 프리뷰(WebView2 + CDP)가 활성화된 환경의 개발 가이드라인.
사용자가 다른 순서를 명시적으로 요청하면 그에 따른다.

## 기본 개발 순서: Frontend → Backend

|단계|작업|확인 방법|
|---|---|---|
|1. UI 구현|프론트엔드 컴포넌트/페이지 구현|dev server 실행 → 프리뷰 패널에서 즉시 확인|
|2. 인터랙션|Mock 데이터로 폼, 버튼, 페이지 전환 연결|프리뷰에서 클릭/입력 동작 확인|
|3. 백엔드 API|실제 API 엔드포인트 구현|프리뷰에서 실 데이터 연동 확인|
|4. 에러 처리|로딩 상태, 에러 UI, 유효성 검증|CDP 콘솔/네트워크 에러 자동 감지|

## 이유

- PreviewPanel(WebView2 + CDP)이 프론트엔드 변경을 실시간으로 표시
- Hot reload로 코드 수정 → 프리뷰 반영이 즉시
- 브라우저 에러(JS, Network)가 CDP를 통해 자동 감지 → 즉시 수정 가능
- UI를 먼저 만들면 필요한 API 스펙이 자연스럽게 도출됨

## Dev Server 실행 규칙

|규칙|설명|
|---|---|
|즉시 실행|UI 코드 작성 후 바로 `npm run dev` 또는 해당 프레임워크의 dev 명령 실행|
|Hot reload 활용|전체 재시작 대신 HMR(Hot Module Replacement) 유지|
|에러 즉시 확인|CDP가 콘솔 에러를 캡처하면 다음 코드 작성 전에 수정|

## Mock 데이터 전략

|상황|방법|
|---|---|
|단순 리스트/폼|컴포넌트 내 하드코딩 상수|
|API 호출 패턴 필요|`json-server` 또는 `msw` (Mock Service Worker)|
|인증 필요|더미 토큰 + localStorage|

## 적용 조건

- 채팅 모드에서 웹 프리뷰가 활성화된 경우에만 적용
- 순수 백엔드/CLI/시스템 프로젝트에는 적용하지 않음
- 사용자가 "백엔드부터", "API 먼저" 등 다른 순서를 요청하면 그에 따름
