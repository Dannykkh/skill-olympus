# Web Motion Engineering

아프로디테의 창작·레퍼런스 확보·구현·검증에서 **움직임 자체가 중요한 장면**에 읽습니다.
단순 버튼 피드백에는 Web Motion Contract만으로 충분합니다. `DESIGN.md`, Experience Contract,
direction/layout이 정본이며 별도 모션 설계 하네스나 영상 composition을 만들지 않습니다.

## 1. 창작: 콘텐츠와 입력에서 대표 움직임 찾기

- 제품의 실제 행동에서 메커니즘을 고릅니다. 묶음 탐색은 펼치기·재배치, 재질 소개는 누르기·변형,
  공간 이해는 회전·깊이처럼 입력과 결과를 연결합니다. 도메인과 무관한 파티클을 기본값으로 쓰지 않습니다.
- 방향 탐색에 필요한 핵심 상호작용만 작은 프로토타입으로 실행합니다. 임시 화면은 prototype으로
  구분하며 최종 CTA·상태·실제 콘텐츠를 구현한 것으로 보고하지 않습니다.
- 사용자가 조작 방법을 발견할 수 있는 단서를 두고 실제 포인터·키보드로 반응을 확인합니다.
  자동 데모나 내부 카운터가 움직이는 것만으로 사용자 입력이 작동한다고 판정하지 않습니다.
- 정적 또는 reduced-motion 화면의 위계·정보·CTA도 함께 비평합니다. 대표 움직임 하나가 주변
  텍스트 읽기와 클릭을 방해하면 범위·강도를 줄입니다. 익숙한 과업 패턴은 재사용해도 됩니다.

## 2. 구현: 렌더링 방식과 조작감을 따로 결정

| 표현에 필요한 것 | 먼저 검토할 방식 |
|---|---|
| 요소 상태·레이아웃·텍스트·경로 | 기존 CSS/DOM/SVG와 Web Motion Contract의 엔진 |
| 많은 2D 도형·입자·문자·연속 변형 | Canvas 2D, 접근 가능한 DOM 설명·조작부 |
| 실제 원근·공간·조명·셰이더 | 기존 Three.js/WebGL 스택, 정적 대체와 자산 예산 |

3D처럼 보인다는 이유만으로 모델·WebGL·R3F를 추가하지 않습니다. 기존 엔진의 composition point를
사용하며 프레임 루프·스크롤 소스를 중복 생성하지 않습니다. dependency 추가는 구현 승인 범위와
manifest를 따릅니다. DOM의 transform 규칙을 Canvas 내부 좌표까지 확장하지 않습니다.

### 시간과 물리

- `requestAnimationFrame` timestamp로 초 단위 `dt`를 계산합니다. 프레임마다 같은 비율을 빼거나
  더하는 감쇠는 주사율에 따라 감각이 달라집니다. 탭 복귀의 큰 `dt`는 엔진의 substep·상한 정책으로 처리합니다.
- 연속 추종의 1차 모델은 `dx/dt = λ(target - x)`입니다. 목표가 고정된 한 step의 정확한 해는
  `x_next = target + (x - target) * exp(-λ * dt)`입니다. 목표가 계속 움직이면 지연과 허용 오차도 계측합니다.
- 탄성은 `m*x'' + c*x' + k*(x-target) = 0`으로 설명할 수 있습니다. 감쇠비
  `ζ = c / (2*sqrt(k*m))`에 따라 반동을 허용하거나 억제합니다. 읽기·포인터 정합성이 중요하면
  반동을 줄이고, 놓는 동작의 촉각 표현이면 허용 overshoot를 명세합니다.
- 이미 쓰는 spring 엔진을 우선합니다. 직접 적분해야 하면 고정 step/substep을 써서 낮은 FPS의
  불안정을 줄입니다. 30/60/120Hz 등 프로젝트 목표의 시간 step으로 같은 입력을 재생해 위치·속도·수렴을 비교합니다.
- 2차 회전·늘어남은 실제 속도·가속도에서 파생하고 상한을 둡니다. CSS transition을 덧씌워
  기존 spring의 지연을 중복시키거나 모든 동작에 bounce를 강제하지 않습니다.

### 런타임 수명

라우트·컴포넌트 해제 때 rAF, listener, observer, timeline을 해제합니다. 화면 밖과 숨겨진 탭의
장식 루프는 중단합니다. Canvas는 resize와 DPR 상한을, WebGL은 renderer·geometry·material·texture의
소유자와 dispose 시점을 명시합니다. 글·폼·내비게이션은 canvas 밖에서도 읽고 조작할 수 있어야 합니다.

## 3. 가져오기·복제: 원본 관찰과 채택값 분리

1. 갤러리 소개 페이지가 아닌 **실제 작품 URL**을 확인합니다. URL·날짜·viewport·DPR·입력 장치·
   motion 설정을 기록하고 lazy 콘텐츠와 폰트가 준비된 뒤 관찰합니다.
2. 장면의 입력 범위를 나눕니다. 진입, 주 조작, 전환, 이탈, 입력을 멈춘 뒤를 실제 휠·포인터로
   재생합니다. pin/scrub 장면은 주요 스크롤 구간의 시작·중간·끝을 별도로 표본화합니다.
3. 요소별 viewport/document 좌표, transform, opacity, SVG 속성을 비교합니다. 일반 스크롤은
   viewport 좌표만 바꿀 수 있으므로 이를 요소 자체의 애니메이션으로 세지 않습니다. 이동 거리,
   pin 범위, 레이어 간 상대 이동, 반응 지연과 수렴 시간에 관찰 근거를 붙입니다.
4. Canvas/WebGL box만으로 내부 도형의 궤적을 알 수 없습니다. 실제 프레임을 관찰하고 소스가
   제공되면 렌더 코드와 대조합니다. context 존재만으로 WebGL 장면이나 라이브러리를 단정하지 않습니다.
5. 한 스크린샷은 포즈만 알려줍니다. 영상은 전환보다 충분히 짧은 간격으로 표본화하고 CSS px와
   녹화 픽셀을 구분합니다. 보지 못한 궤적·타이밍은 추측 대신 `UNVERIFIED`로 남깁니다.
6. 같은 조건으로 구현을 계측하고 **원본 관찰값 / 제품 채택값 / 차이·이유 / 검증**을 direction
   또는 layout에 기록합니다. 정확 재현과 각색의 경계·브랜드·카피·에셋 사용은 reference-capture 계약을 따릅니다.

아래 도구는 DOM·SVG 수치와 선택적인 소유 페이지의 상태를 기록합니다. 브라우저 번들 분석,
셰이더 역공학, Canvas 픽셀 추적을 했다고 주장하지 않습니다.

## 4. 검증: 장면이 약속한 반응을 검사

| 확인할 계약 | 관찰할 근거 |
|---|---|
| 입력이 작동함 | 실제 gesture 뒤 해당 대상·업무 상태의 변화; 같은 길이 idle 대조군 |
| 전환이 연속적임 | 초기·최종 사이의 명시한 중간 구간을 통과; 의도된 hard cut은 별도 기준 |
| 탄성이 안정적임 | 목표 오차·속도의 상한, 입력 종료 후 충분한 구간의 수렴, NaN·발산 부재 |
| 스크롤 순서가 맞음 | 구간별 진입·pin·이탈과 역방향 복구; 빈 구간에는 읽기·휴식 목적을 기록 |
| 조작이 발견 가능함 | 단서·hover/focus·hit target·키보드 대체; 주변 클릭과 스크롤을 방해하지 않음 |
| 대체 상태가 사용 가능함 | reduced-motion·작은 화면·coarse pointer·엔진 실패에서 콘텐츠와 과업 |

기준은 장면마다 정합니다. 움직이는 요소의 비율·반동·3개 섹션·큰 제목을 모든 사이트의
합격 조건으로 강제하지 않습니다. 수치 통과와 시각 비평을 별도로 보고합니다.

- 기존 프로젝트의 Playwright 테스트가 있으면 그 하네스에서 입력→반응을 검사합니다.
- 복제 비교나 반복 계측이 필요하면 이 스킬의 `scripts/measure_web_motion.py`를 사용합니다.
  Python 3.10+, Python Playwright와 실행 가능한 Chromium이 필요합니다. 기존 환경을 우선하고,
  필요할 때만 `python -m pip install playwright`, `python -m playwright install chromium`으로 준비합니다.
  설치된 Chrome/Edge를 쓸 때는 `--channel chrome` 또는 `--channel msedge`를 지정할 수 있습니다.
- Windows/macOS/Linux에서 로컬 HTML 경로 또는 HTTP(S) URL을 받습니다. 폰트·자산 fetch가 필요한
  페이지는 로컬 서버를 사용합니다. 모바일 폭 재실행은 viewport 검사이며 실제 터치·기기 성능 검증과 구분합니다.
- 캡처·입력 실패는 `FAIL`, 기준 없이 기록만 했으면 `UNVERIFIED`입니다. 기준이 있으면 `PASS`는
  **그 기준만** 통과했다는 뜻입니다. 생략한 장면·접근성·성능은 `NOT RUN`으로 따로 보고합니다.
- 상태 reader는 소유 페이지에 이미 있는 상태의 JSON snapshot만 반환하게 합니다. 민감 데이터·토큰을
  포함하지 않고 실제 입력을 대체하지 않습니다. Canvas/WebGL에서는 이 상태와 실제 화면을 대조합니다.
- 시간·random seed가 있는 A/B 비교는 같은 조건으로 초기화합니다. 입자 수명·spring처럼 이력이 있는
  장면은 실제 경로를 재생합니다. 처음 만드는 계측은 정상·무반응·즉시 점프 대조군으로 검사합니다.

### 시나리오와 실행

다음은 **클릭 후 100px 이동하는 장면을 위한 예시**입니다. selector·구간·시간·허용 오차는 실제
계약값으로 바꿉니다. 외부 레퍼런스는 조회 범위의 move/wheel/wait로 관찰하고, 상태를 바꾸는 click/drag/key는
승인된 테스트 페이지에서 실행합니다.

```json
{
  "observe": {"object": ".product-object"},
  "sample_ms": 16,
  "steps": [
    {"action": "click", "selector": ".preview-trigger"},
    {"action": "wait", "ms": 900}
  ],
  "checks": [
    {"kind": "range", "metric": "elements.object.document_x", "min": 90},
    {"kind": "visits", "metric": "elements.object.document_x", "min": 60, "max": 100},
    {"kind": "settled", "metric": "elements.object.document_x", "window_ms": 200, "max": 1}
  ]
}
```

```bash
python "<module_root>/scripts/measure_web_motion.py" http://localhost:3000 \
  --scenario <scenario.json> --out <motion-trace.json>
python "<module_root>/scripts/measure_web_motion.py" http://localhost:3000 \
  --scenario <reduced-scenario.json> --reduced-motion --width 390 --height 844 \
  --out <reduced-motion-trace.json>
```

`module_root`는 이번에 읽은 `design-plan/SKILL.md`의 디렉터리입니다. scenario에는 `observe`
(이름→selector), 선택적 `state`(예: `motionDebug.read`), `steps`, 선택적 `checks`를 넣습니다.
입력은 move/drag(`x`, `y`, 선택적 `ms`), wheel(`dy`, 선택적 `dx`), click(`selector` 또는 `x`/`y`),
key(`key`), wait(`ms`)입니다. `sample_ms`는 목표 표본 간격이며 rAF·프레임 지연보다 촘촘하게
관찰할 수는 없습니다. trace의 실제 timestamp와 빈 구간을 확인합니다.
report는 scenario와 같은 시간축의 실제 DOM input events도 담아 반응 지연과 입력 유무를 대조할 수 있습니다.

check의 `metric`은 `elements.<이름>.document_x/document_y/viewport_x/viewport_y/width/height/opacity`
또는 `state.<숫자 경로>`입니다. range는 최대−최소, final은 마지막 값, visits는 해당 구간의
표본 존재, settled는 마지막 `window_ms` 동안의 최대−최소를 검사합니다. min/max가 합격 범위이며,
settled에는 window_ms와 max가 필요합니다. 값 누락·비수치·불충분한 관찰은 실패합니다.
스크린샷을 표본 루프마다 찍어 재생을 지연시키지 않고 trace 뒤 실제 시작·중간·끝 프레임을
별도 실행에서 관찰합니다. screenshot 한 장이나 state 값만으로 렌더 품질을 통과시키지 않습니다.

## 출처와 적용 범위

조사 계기: [motion-web](https://github.com/feitangyuan/motion-web). 원문·실행 코드·예제·에셋을
편입하지 않고 기존 아프로디테 계약과 아래 공개 기술 근거를 바탕으로 독립 작성했습니다.
채택·기각 근거는 [분석 기록](../../../docs/research/2026-10-06-motion-web-assessment.md)에 있습니다.
이 기록은 소스 checkout용이며 설치 환경에 없어도 실행에 필요하지 않습니다.

- [requestAnimationFrame 시간 기준](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [시간 step과 적분 안정성](https://gafferongames.com/post/fix_your_timestep/)
- [Motion spring 옵션](https://motion.dev/docs/animate)
- [Playwright 입력](https://playwright.dev/python/docs/input), [emulation](https://playwright.dev/python/docs/emulation)
