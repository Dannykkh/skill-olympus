# Reference Capture Guide — 레퍼런스 자산화 (Phase 1)

> 아프로디테 Phase 1의 증거 확보 가이드. 레퍼런스(스크린샷/URL/영상/HTML)를 "첨부 파일"로
> 끝내지 않고 재사용 가능한 관찰 자산으로 변환합니다. 사이트 벤치마크라면 이 파일을 읽은 뒤
> [site-benchmark-guide.md](site-benchmark-guide.md)로 구조·메시지·반응형·품질을 해부하고,
> [experience-contract-guide.md](experience-contract-guide.md)로 프로젝트 결정을 컴파일합니다.
>
> Credits: [MengTo/Skills](https://github.com/MengTo/Skills)(MIT)의 `video-to-superprompt`,
> `html-to-interaction-prompts`, `stitched-full-page-capture` 워크플로우를 이 파이프라인에 맞게 각색.

## 0. 원칙

- **프롬프트는 자산이다**: 좋은 레퍼런스 분석은 1회용 대화가 아니라 버전 관리되는 파일로.
- **스크린샷은 스타일 스펙이 아니라 경험의 증거다**: 색·폰트의 정본은 언제나 DESIGN.md 토큰.
  레퍼런스에서 먼저 가져오는 것은 메시지·CTA·신뢰의 순서, 구성, 위계, 반응형 변환, 상태,
  모션 메커니즘과 페이싱이다. 색·폰트까지 베낄지는 사용자가 "정확 재현"을 요구했을 때만.
- **경계 먼저 선언**: 슈퍼프롬프트 첫 줄에 "정확 재현(exact recreation)"인지 "영감 각색(inspiration)"인지 명시.
- **모호어 금지**: "make it beautiful", "세련되게" 금지 — 취향을 구체 지시(수치·메커니즘 이름)로 변환.
- **관찰과 결정을 분리**: 이 가이드의 파일은 원본 증거층입니다. 프로젝트에 적용할 결정은
  Experience Contract의 Adopt·Adapt·Avoid에 기록합니다.

## 1. 입력 유형별 절차

### A. 라이브 URL

1. Playwright MCP(`browser_navigate`)로 실제 페이지 열기 (썸네일/커버 이미지 금지).
2. 데스크톱과 모바일 기준 뷰포트를 각각 정하고 URL·캡처일·뷰포트를 기록.
3. **Warm scroll**: top→bottom 1회 스크롤해 lazy 미디어·리빌 섹션을 마운트.
4. top 복귀 후 뷰포트 단위(뷰포트 높이 - 150px 스텝)로 하향 스크롤.
5. 각 정지마다 **2초 대기**(lazy load·리빌·sticky 정착) 후 `browser_take_screenshot`.
6. primary CTA와 주 과업을 실행해 시작·진행·완료·오류 상태를 별도 캡처.
7. 스크린샷들을 섹션 순서와 상태별로 분석. 모바일 증거가 없으면 추측하지 말고 누락 표시.

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

### E. 공개 프롬프트/디자인/컴포넌트 라이브러리 샘플링

라이브러리는 한 작품을 정확 재현하는 레퍼런스와 다르게 처리합니다. 먼저 소스의 역할을
분류하고, 그 역할에 맞는 것만 추출합니다.

| 소스 유형 | 예 | 추출할 것 |
|---|---|---|
| Prompt / inspiration library | MotionSites | 결정 문법, 장면 구성, 모션 명명, 실패 조건 |
| Product interface | TraceDR, API Finder, Orca | 정보 구조, 밀도, 상태 위계, 핵심 작업 흐름 |
| Component / effect source | React Bits | 효과 카테고리, bounded preview, 의존성·성능·cleanup 게이트 |
| State pattern source | CSS Loaders | 최소 마크업, 토큰, timing, 접근성, reduced-motion 계약 |

목표는 개별 프롬프트·코드 수집이 아니라 **반복되는 선택 규칙과 빠진 다양성 축을 찾는 것**입니다.

1. 공개 홈/카테고리에서 제목, 분류, 무료/유료 상태, 미디어 유형을 확인합니다.
2. 공식 저장소가 있으면 README, LICENSE, 파일 구조를 확인합니다. 공개 사이트라는 이유만으로
   오픈소스라고 가정하지 않습니다.
3. Prompt library는 무료로 열람·복사 가능한 항목만 6~10개 표본화합니다. 유료 접근 우회는 금지합니다.
4. Product interface는 첫 화면만 보지 말고 주 작업, 결과/상태, 오류·빈 상태, 모바일 역할을 캡처합니다.
5. Component source는 아래 채택 게이트를 기록합니다:
   - 구현 단계: CSS / DOM Motion / Canvas-WebGL
   - 추가 의존성·번들 비용
   - SSR/hydration과 mount/unmount cleanup
   - reduced-motion, coarse pointer, keyboard
   - 라이선스·고지·재배포 제한
6. 각 표본에서 소스 유형에 맞는 항목만 추출합니다:
   - 결과/작업 계약
   - 구성과 위계
   - 정보 밀도와 상태 모델
   - 색의 역할 구조
   - 타이포 역할
   - 모션 메커니즘과 효과 예산
   - 반응형 규칙
   - 실패 조건
7. 문구·브랜드 카피·외부 에셋 URL·긴 원문 프롬프트·외부 컴포넌트 소스는 저장하지 않습니다.
8. 공통 패턴과 충돌 패턴을 나눕니다:
   - **흡수**: 구체적인 섹션/작업 해부, 상태 위계, 명명된 모션, 성공 조건
   - **변환**: `h-screen`→`100dvh`, 순흑→near-black, 라틴 전용 폰트→한글 폴백,
     데모 팔레트→DESIGN.md 토큰
   - **기각**: 유료 문구 복제, 소유하지 않은 미디어 URL, 같은 색/구성 반복,
     cleanup·폴백 없는 무거운 효과
9. 결과는 `docs/design-refs/YYYY-MM-DD-{library}-synthesis.md`로 저장하고 표본 수·캡처일·공개 범위·라이선스 경계를 적습니다.

프롬프트 구조 합성은
[`frontend-design/references/motion-first-prompt-playbook.md`](../../frontend-design/references/motion-first-prompt-playbook.md)의
컴파일러와 색상 다양성 게이트를 기준으로 합니다.
기능형 코더 UI와 컴포넌트 채택은
[`frontend-design/references/coder-interface-pattern-playbook.md`](../../frontend-design/references/coder-interface-pattern-playbook.md)의
Interface Mode와 효과 예산을 기준으로 합니다.

## 2. 증거 슈퍼프롬프트 템플릿

`docs/design-refs/YYYY-MM-DD-{slug}.md`로 저장. 섹션은 **레퍼런스의 실제 순서대로 전부** 기록합니다.

````markdown
# Design Ref: {레퍼런스 이름}

- 소스: {URL/파일 경로}
- 캡처일: {YYYY-MM-DD}
- 모드: **영감 각색** | 정확 재현   ← 하나만
- 적용 대상: {이 프로젝트의 어떤 페이지/컴포넌트에}
- 벤치마크 역할: {구조/메시지/반응형/모션/기능형 흐름 중 무엇을 참고하는지}

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
- Core message: {약속 → 설명 → 증거의 순서}
- CTA: {정확한 문구, 위계, 목적지, 등장 시점}
- Trust: {불안 지점과 그 직전에 제시되는 검증 가능한 근거}
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
- Mobile evidence: {기준 뷰포트 또는 unavailable}

| Desktop element | Operation | Mobile result | Observed reason |
|---|---|---|---|
| {요소} | retain/reorder/compress/collapse/defer/replace/sticky/remove | {실제 변화} | {과업·위계 근거} |

## STATES

- Loading:
- Empty:
- Error and recovery:
- Success feedback:

## QUALITY OBSERVATIONS

- Performance: {첫 화면 자산, 지연 로드, 폰트·영상·스크립트 비용 관찰}
- Accessibility: {랜드마크, 헤딩 순서, 키보드, 포커스, 레이블, 대비, reduced-motion 관찰}
- Unknowns: {소스나 관찰만으로 확인할 수 없는 것}

## SUCCESS CHECK

- 첫 뷰포트에서 보여야 하는 것: {...}
- 스크롤 중: {...}
- 실패 조건 (The build fails if): {예 — 히어로가 중앙 정렬 카드가 되면 실패, 모션이 bounce면 실패}
````

## 3. 품질 기준

- **원본 없이 재현 가능할 만큼** 구체적으로 — 시퀀스·페이싱·특이한 quirk 보존.
- **모션 메커니즘을 정확히 명명**: pinned section / scrubbed timeline / `video.currentTime` 스크러빙 / parallax layer / opacity reveal / mask reveal / marquee / magnetic hover / shader field.
- **모바일 + reduced-motion을 매번 포함** — 빠뜨리면 미완성.
- **`mobile: stack` 금지** — 요소별 변환 연산과 과업상 이유를 기록.
- **메시지·CTA·신뢰 순서를 포함** — 색·폰트·레이아웃만 기록하면 미완성.
- **속도·접근성은 독립 평가** — 벤치마크가 나쁜 관행을 쓴다고 그대로 복제하지 않음.
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

## 5. Experience Contract와 Phase 5 인계

- 관찰 완료 후 [site-benchmark-guide.md](site-benchmark-guide.md)의 Adopt·Adapt·Avoid를 판정하고
  [experience-contract-guide.md](experience-contract-guide.md)의 Contract를 생성합니다.
- Phase 5는 **DESIGN.md(시각 시스템) + Experience Contract(과업·메시지·상태·반응형) +
  이 증거 파일(근거)**을 함께 참조합니다.
- 충돌 시 우선순위: 사용자 과업·접근성 > Experience Contract > DESIGN.md 시각 토큰 > 증거 파일 > 임의 판단.
  정확 재현 모드에서 색을 가져오면 DESIGN.md에 역반영해 정본을 갱신합니다.
- 슈퍼프롬프트가 여러 개면 적용 대상 페이지별로 매핑 표를 만들어 혼선 방지.
