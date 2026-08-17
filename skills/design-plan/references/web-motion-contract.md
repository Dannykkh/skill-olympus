# Web Motion Contract

아프로디테의 브라우저 실시간 모션을 목적·비용·fallback·검증 증거로 고정하는 계약입니다. 웹 UI의
상태와 사용자 조작을 다루며 영상 파일 제작은 다루지 않습니다.

## 1. 범위

포함:

- CSS transition·keyframes
- View Transitions API
- CSS Scroll-driven Animations
- GSAP Timeline과 ScrollTrigger
- GSAP Flip, SplitText
- SVG DrawSVG, MorphSVG, MotionPath 또는 core attribute animation

제외:

- Remotion과 HyperFrames
- BGM·SFX·voiceover·caption timeline
- MP4/WebM/GIF 렌더링
- 영상용 camera·shot·storyboard

제외 항목은 `video-maker`의 책임입니다. 웹 프리뷰를 영상 composition으로 감싸지 않습니다.

## 2. Engine Ladder

가장 낮은 복잡도로 목적을 달성하는 첫 경로를 선택합니다.

| 단계 | 선택 | 적합한 경우 |
|---|---|---|
| 0 | 모션 없음 | 기능형 UI에서 상태 변화만으로 충분 |
| 1 | CSS transition/keyframes | hover·focus·open/close·단순 entrance |
| 2 | View Transitions API | SPA/MPA 화면 전환과 shared element |
| 3 | CSS Scroll-driven Animations | 단순 reveal·progress·parallax |
| 4 | GSAP core Timeline | 여러 요소의 정교한 순서·중첩·제어 |
| 5 | ScrollTrigger | pin·scrub·snap·복잡한 scroll storytelling |
| 6 | Flip | DOM·grid·filter 상태 사이의 실제 layout 재배치 |
| 7 | SplitText | display text의 line·word·character 기반 모션 |
| 8 | GSAP SVG plugins | path draw·morph·motion path가 핵심 의미를 전달 |

높은 단계가 낮은 단계보다 더 좋은 디자인을 의미하지 않습니다. 같은 결과를 CSS로 안정적으로
구현할 수 있으면 GSAP dependency를 추가하지 않습니다.

## 3. GSAP Dependency Gate

- 프로젝트 manifest와 lockfile에서 기존 `gsap`과 `@gsap/react` 여부를 먼저 확인합니다.
- 공식 package와 문서만 사용하고 검증한 정확한 version을 lockfile에 고정합니다.
- 과거 private registry, Club membership, auth token 설치법을 사용하지 않습니다.
- 현재 GSAP은 public `gsap` package에 formerly bonus plugin을 포함하지만, 코드와 skill의 MIT
  라이선스를 GSAP runtime의 라이선스로 오해하지 않고 공식 standard license를 확인합니다.
- 사용할 plugin만 import하고 한 번 등록합니다.
- dependency가 없고 승인 범위에 package 변경이 없으면 CSS fallback으로 진행하고 GSAP 경로를
  `NOT RUN`으로 남깁니다.

공식 근거:

- GSAP repository: https://github.com/greensock/GSAP
- Installation: https://gsap.com/docs/v3/Installation/
- Plugin index: https://gsap.com/docs/v3/
- Standard license: https://gsap.com/standard-license

## 4. Plugin Contracts

### Timeline

- 서로 연관된 두 개 이상의 motion beat를 하나의 timeline으로 조율할 때 사용합니다.
- component마다 분산된 delay 숫자보다 label과 상대 위치를 사용합니다.
- 초기 상태가 JS 실패 시 콘텐츠를 숨기지 않도록 `.js`/enhancement gate를 둡니다.
- route unmount에서 timeline과 context를 정리합니다.

### ScrollTrigger

- CSS Scroll-driven Animations로 표현할 수 없는 pin·scrub·snap·복합 sequence에만 사용합니다.
- 메인스레드 `scroll` listener를 병렬로 만들지 않습니다.
- 이미지·폰트·layout shift 이후 refresh 시점을 명시합니다.
- 모바일에서 pin 길이, sticky UI, browser chrome과의 충돌을 실제 기기로 검증합니다.
- smooth scroll을 쓰면 하나의 scroll source만 유지하고 ticker와 동기화합니다.

### Flip

- filter·sort·expand·route 전환처럼 동일 항목이 실제 DOM 위치를 바꿀 때 사용합니다.
- `Flip.getState()` → DOM/state 변경 → `Flip.from()` 순서를 지킵니다.
- 애니메이션이 focus order와 screen-reader reading order를 바꾸지 않는지 확인합니다.
- leaving element를 absolute 처리할 때 container collapse를 검증합니다.

### SplitText

- 짧은 display headline과 의미 있는 reveal에만 사용합니다. 본문과 인터랙티브 링크 묶음을 글자
  단위로 분해하지 않습니다.
- custom font가 준비된 뒤 split하거나 `autoSplit`과 `onSplit`을 사용합니다.
- screen reader가 원문을 한 번만 읽도록 접근성 옵션 또는 별도 원문을 둡니다.
- 한글은 character보다 word·phrase 단위를 우선하고 조사·줄바꿈 왜곡을 직접 확인합니다.
- cleanup에서 원래 markup으로 revert합니다.

### SVG

- 단순 색·opacity·transform이면 GSAP core 또는 CSS를 사용합니다.
- DrawSVG는 stroke path reveal, MorphSVG는 의미 있는 shape 전환, MotionPath는 경로 기반 이동에만
  사용합니다.
- 장식 SVG는 접근성 트리에서 숨기고, 정보 SVG는 정적 label·설명을 유지합니다.
- morph 대상 path의 호환성과 viewBox clipping을 데스크톱·모바일에서 확인합니다.

## 5. Motion Artifact

`DESIGN.md`의 motion 원칙과 Experience Contract의 성능·접근성 계약을 소비해 다음 표를 direction
또는 layout artifact에 기록합니다.

| Scene/component | User purpose | Trigger | Engine/plugin | Timing | Reduced-motion | No-JS fallback | Cleanup/test |
|---|---|---|---|---|---|---|---|

각 행에는 장식 명칭이 아니라 사용자가 이해하거나 조작하는 목적을 씁니다. 목적을 설명할 수 없는
motion은 삭제합니다.

## 6. Performance and Accessibility

- 기본적으로 `transform`과 `opacity`만 애니메이트합니다.
- `will-change`는 실제 활성 구간에만 제한합니다.
- 지속 motion과 scroll hijacking을 기본값으로 만들지 않습니다.
- `prefers-reduced-motion: reduce`에서는 duration 축소만이 아니라 pin·scrub·parallax를 제거하고
  최종 정보 상태를 즉시 보여줍니다.
- keyboard focus, click target, selection, scroll restoration을 motion보다 우선합니다.
- motion 없이도 주 과업과 콘텐츠가 모두 작동해야 합니다.
- long task의 진행 상태를 장식 spinner로 대체하지 않습니다.

## 7. Validation

1. no-JS 또는 library load 실패 상태에서 콘텐츠와 과업 확인
2. reduced-motion에서 정적 대체 확인
3. desktop·mobile에서 시작·중간·종료 프레임 관찰
4. route 이동과 component unmount 뒤 orphan trigger·listener 확인
5. layout shift, long task, dropped frame을 성능 도구로 측정
6. keyboard와 screen reader reading order 확인

검증하지 못한 plugin은 `SUPPORTED`가 아니라 `NOT RUN` 또는 `UNVERIFIED`로 기록합니다.
