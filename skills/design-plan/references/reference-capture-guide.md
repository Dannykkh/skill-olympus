# Reference Capture Guide — 레퍼런스 자산화 (Phase 2)

> 아프로디테 Phase 2의 실행 가이드. 레퍼런스(스크린샷/URL/영상/HTML)를 "첨부 파일"로 끝내지 않고,
> **섹션 해부 슈퍼프롬프트**라는 재사용 가능한 파일 자산으로 변환합니다.
> 산출물은 `docs/design-refs/YYYY-MM-DD-{slug}.md` — Phase 3이 이 파일을 구현 스펙으로 사용합니다.
>
> Credits: [MengTo/Skills](https://github.com/MengTo/Skills)(MIT)의 `video-to-superprompt`,
> `html-to-interaction-prompts`, `stitched-full-page-capture` 워크플로우를 이 파이프라인에 맞게 각색.

## 0. 원칙

- **프롬프트는 자산이다**: 좋은 레퍼런스 분석은 1회용 대화가 아니라 버전 관리되는 파일로.
- **스크린샷은 스타일 스펙이 아니라 구조·모션의 증거다**: 색·폰트의 정본은 언제나 DESIGN.md 토큰. 레퍼런스에서 가져오는 것은 **구성(레이아웃 리듬), 위계, 모션 메커니즘, 페이싱**이다. 색·폰트까지 베낄지는 사용자가 "정확 재현"을 요구했을 때만.
- **경계 먼저 선언**: 슈퍼프롬프트 첫 줄에 "정확 재현(exact recreation)"인지 "영감 각색(inspiration)"인지 명시.
- **모호어 금지**: "make it beautiful", "세련되게" 금지 — 취향을 구체 지시(수치·메커니즘 이름)로 변환.

## 1. 입력 유형별 절차

### A. 라이브 URL

1. Playwright MCP(`browser_navigate`)로 실제 페이지 열기 (썸네일/커버 이미지 금지).
2. **Warm scroll**: top→bottom 1회 스크롤해 lazy 미디어·리빌 섹션을 마운트.
3. top 복귀 후 뷰포트 단위(뷰포트 높이 - 150px 스텝)로 하향 스크롤.
4. 각 정지마다 **2초 대기**(lazy load·리빌·sticky 정착) 후 `browser_take_screenshot`.
5. 필요 시 스크린샷들을 스크래치패드에 저장해 섹션 순서대로 분석.

> **one-shot fullPage 캡처의 함정**: lazy-load/스크롤 애니메이션/WebGL 페이지는 한 번에 찍은
> 풀페이지가 빈 밴드·회색 스트립으로 나옵니다. 정착된 뷰포트 샷 여러 장이 진실입니다.
> (원본 스크립트의 세로 stitching은 `sips` 의존이라 macOS 전용 — Windows에서는 뷰포트 샷
> 시퀀스를 그대로 분석에 쓰거나, 필요 시 ffmpeg `crop`+`vstack` 필터로 병합.)

### B. 스크린샷 첨부

1. 이미지를 섹션 단위로 해석 — 여러 섹션이 한 장에 압축되어 있으면 섹션별로 나눠 분석.
2. 크롭은 spacing/타입 스케일/비례를 왜곡하므로, 판단은 원본 비율 기준으로.
3. 텍스트·버튼·간격이 읽히지 않는 저해상도면 사용자에게 더 큰 캡처 요청 (추측 금지).

### C. 영상 (화면 녹화)

1. `ffprobe`로 duration/해상도/프레임레이트 확인.
2. `ffmpeg -vf fps=1`로 대표 프레임 추출 — 균등 썸네일보다 **전환 순간**(섹션 경계, 리빌 시작/끝) 우선.
3. 스크롤 영상이면 start/middle/end + 각 전환 지점 프레임 확보.
4. 모션 분석: 무엇이 언제 움직이는지 프레임 쌍으로 대조 (아래 §3 모션 메커니즘 명명).

### D. HTML 소스 (코드가 있을 때)

소스가 있으면 스크린샷 추측보다 소스가 진실. 인터랙션 키워드로 grep:

```
mousemove, pointermove, canvas, webgl, ScrollTrigger, requestAnimationFrame,
hover, sticky, pin, parallax, magnetic, glow, shader, animation-timeline,
IntersectionObserver, lenis, framer-motion
```

발견한 인터랙션을 "재사용 가능한 아이디어 단위"로 분리 (구현 라인 수 아님) — 예: "마우스를 따라오는 히어로 파티클 필드".

## 2. 슈퍼프롬프트 템플릿

`docs/design-refs/YYYY-MM-DD-{slug}.md`로 저장. 섹션은 **레퍼런스의 실제 순서대로 전부** 기록합니다.

````markdown
# Design Ref: {레퍼런스 이름}

- 소스: {URL/파일 경로}
- 캡처일: {YYYY-MM-DD}
- 모드: **영감 각색** | 정확 재현   ← 하나만
- 적용 대상: {이 프로젝트의 어떤 페이지/컴포넌트에}

## GLOBAL — 전역 시스템

- 전체 인상: {한 문장 — 톤, 도메인 비주얼 언어}
- 레이아웃 그리드: {컬럼 수, 컨테이너 폭, 비대칭 패턴}
- 타이포 위계: {디스플레이/본문/라벨의 크기 대비, 케이싱} ※ 폰트 자체는 DESIGN.md 토큰 사용
- 색 구조: {다크/라이트, 지배색 1 + 액센트 구조} ※ 실제 색은 DESIGN.md 토큰 사용
- 표면 처리: {글래스/보더/그림자/텍스처의 종류와 강도}
- 안티패턴(이 레퍼런스가 하지 않는 것): {예 — 카드 그리드 없음, 중앙 정렬 히어로 없음}

## MOTION SYSTEM — 전역 모션

- 전체 감각: {즉각적/시네마틱/절제}
- Easing/Duration 추정: {예 — power3.out 계열, 리빌 0.8s 내외}
- 리빌 규칙: {fade-up / masked / blur-in — 어느 요소에}
- 스크롤 규칙: {패럴랙스 speed 추정, pin 여부, scrub 여부}
- Hover: {대상과 반응}
- 상시 루프: {마퀴/앰비언트 — 있으면}
- reduced-motion 대응: {정적 폴백 계획 — 필수}

## SECTION 1: {섹션 이름 — 예: 히어로}

- Purpose: {이 섹션의 역할}
- Layout: {배치 — 좌 8컬럼 헤드라인 + 우 4컬럼 메타처럼 구체적으로}
- Visual details: {보더/그림자/이미지 처리/장식 요소}
- Animation: {등장 순서와 방식 — "배경 먼저, 헤드라인 줄 단위, CTA 마지막"}
- Interaction: {hover/클릭 반응}
- Scroll behavior: {스크롤 연동 — pinned/scrubbed/parallax/없음}
- Implementation notes: {라이브러리 매핑 — 아래 §4 기준}

## SECTION 2: {...}
(레퍼런스의 모든 가시적 섹션을 순서대로 반복)

## RESPONSIVE

- Desktop: {기준 뷰포트에서의 구성}
- Mobile: {스택 순서 변화, 숨김 요소, 텍스트 겹침 주의점}

## SUCCESS CHECK

- 첫 뷰포트에서 보여야 하는 것: {...}
- 스크롤 중: {...}
- 실패 조건 (The build fails if): {예 — 히어로가 중앙 정렬 카드가 되면 실패, 모션이 bounce면 실패}
````

## 3. 품질 기준

- **원본 없이 재현 가능할 만큼** 구체적으로 — 시퀀스·페이싱·특이한 quirk 보존.
- **모션 메커니즘을 정확히 명명**: pinned section / scrubbed timeline / `video.currentTime` 스크러빙 / parallax layer / opacity reveal / mask reveal / marquee / magnetic hover / shader field.
- **모바일 + reduced-motion을 매번 포함** — 빠뜨리면 미완성.
- 안티패턴 명시: 제네릭 랜딩 섹션, 장식용 블롭, 미스매치 스톡 이미지, 텍스트 겹침.
- 색·폰트를 hex/폰트명으로 베끼지 않는다(영감 각색 모드) — "지배색 1 + 액센트, 다크" 같은 **구조**로 기술하고 값은 DESIGN.md가 공급.

## 4. 라이브러리 매핑 (Implementation notes 작성 기준)

| 필요 | 선택 |
|------|------|
| 단순 hover/opacity | CSS만 |
| 가벼운 리빌 | IntersectionObserver / CSS `animation-timeline: view()` |
| React 진입/레이아웃 전환 | Framer Motion (Motion) |
| 복잡한 스크롤 (pin/scrub/parallax/masked) | GSAP ScrollTrigger |
| 부드러운 스크롤 | Lenis (불필요한 polish면 생략) |
| 캐러셀 | CSS scroll-snap → Embla/Keen |
| 3D/셰이더/파티클 | Three.js/WebGL (DPR cap + 정적 폴백) |

구체 기본값(duration/stagger/ease)은 `frontend-design/references/technique-recipes.md`의 값을 사용.

## 5. Phase 3 인계 규칙

- Phase 3은 **DESIGN.md(색·폰트·간격의 정본) + 이 슈퍼프롬프트(구조·모션의 스펙)** 두 파일을 함께 참조.
- 충돌 시 우선순위: DESIGN.md 토큰 > 슈퍼프롬프트 > 임의 판단. (정확 재현 모드에서만 슈퍼프롬프트의 색 지시가 우선하며, 이 경우 그 값을 DESIGN.md에 역반영해 정본을 갱신.)
- 슈퍼프롬프트가 여러 개면 적용 대상 페이지별로 매핑 표를 만들어 혼선 방지.
