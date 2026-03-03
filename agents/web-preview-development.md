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

## Phase 2: Performance & Quality Audit

화면 완성 후 배포 전 성능 측정 + 품질 검증을 수행한다.

|단계|작업|방법|
|---|---|---|
|1. 성능 측정|Web Vitals 측정|PreviewPanel CDP 내장 (포트 충돌 없음)|
|2. 번들 분석|초기 로드 크기 확인|빌드 후 출력 크기 분석|
|3. 반응형|뷰포트별 레이아웃 확인|CDP Emulation으로 375/768/1024/1440px 전환|
|4. SEO|메타/OG/sitemap|랜딩/홈페이지 프로젝트에서만 적용|

**자동 수정 루프**: 페이지 로드 시 CDP 자동 측정 → 기준 미달 시 AI CLI에 전달 → 수정.

**기준**: LCP < 2.5s, CLS < 0.1, INP < 200ms, FCP < 1.8s.

## GSAP Quick Reference

웹 프리뷰 모드에서 애니메이션을 구현할 때 GSAP를 기본으로 사용한다.

### 설치 및 임포트

```bash
npm install gsap
```

```ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Flip } from 'gsap/Flip'
import { TextPlugin } from 'gsap/TextPlugin'
gsap.registerPlugin(ScrollTrigger, Flip, TextPlugin)
```

### Quick Reference Table

|패턴|코드|
|---|---|
|Fade in|`gsap.from(el, { autoAlpha: 0, y: 40, duration: 0.6, ease: 'power3.out' })`|
|Scroll trigger|`gsap.from(el, { y: 40, autoAlpha: 0, scrollTrigger: { trigger: el, start: 'top 85%' } })`|
|Stagger|`gsap.from('.items > *', { autoAlpha: 0, y: 20, stagger: 0.08 })`|
|Parallax|`gsap.to('.bg', { yPercent: -20, scrollTrigger: { scrub: true } })`|
|Hover scale|`gsap.to(card, { scale: 1.03, duration: 0.3 })`|
|Flip layout|`const state = Flip.getState(items); /* 변경 */ Flip.from(state, { duration: 0.5 })`|
|Text reveal|`gsap.to(el, { text: { value: '텍스트' }, duration: 1, ease: 'none' })`|

### 5가지 규칙

1. **Context cleanup 필수**: React에서 `gsap.context()` + `ctx.revert()` 패턴을 항상 사용. 언마운트 시 애니메이션 잔여물을 남기지 않는다.
2. **Reduced motion 존중**: `prefers-reduced-motion: reduce` 미디어 쿼리 감지 시 `gsap.globalTimeline.timeScale(20)`으로 모션을 즉시 완료 처리한다.
3. **autoAlpha 우선**: `opacity: 0` 대신 `autoAlpha: 0`을 사용해 `visibility: hidden`도 함께 처리한다. 스크린 리더 접근성과 GPU 최적화에 유리하다.
4. **Scale > Position**: 레이아웃 애니메이션에서 `width/height` 변경보다 `scale`을 우선 사용. GPU 합성으로 리플로우가 발생하지 않는다.
5. **플러그인 목록 숙지**: ScrollTrigger(스크롤 연동), Flip(레이아웃 전환), TextPlugin(타이핑), Observer(제스처). 유료: MorphSVG, DrawSVG, SplitText.

## 적용 조건

- 채팅 모드에서 웹 프리뷰가 활성화된 경우에만 적용
- 순수 백엔드/CLI/시스템 프로젝트에는 적용하지 않음
- 사용자가 "백엔드부터", "API 먼저" 등 다른 순서를 요청하면 그에 따름
