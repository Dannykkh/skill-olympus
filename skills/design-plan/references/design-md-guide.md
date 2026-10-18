# DESIGN.md Guide — 아프로디테의 정본 디자인 컨텍스트

> 구글 `@google/design.md`(Apache-2.0, **alpha**) 포맷을 아프로디테의 **단일 정본**으로 채택합니다.
> 기존에 `design-system.md`(산문) / `design-tokens.json`(W3C DTCG) / `DESIGN.md`(Stitch)로 흩어져 있던
> 디자인 컨텍스트를 **DESIGN.md 하나**로 모으고, 파생물은 `export`로 만듭니다.

## 1. 왜 DESIGN.md인가

"부를 때마다 색·간격·폰트가 미묘하게 달라지는" 문제는 **정답 값(토큰)** 과 **판단 근거(산문)** 가
한 파일에 영속(persistent)으로 박혀 있지 않기 때문입니다. DESIGN.md는 2층 구조로 이를 해결합니다.

| 층 | 위치 | 독자 | 역할 |
|----|------|------|------|
| **토큰** | YAML frontmatter (`---` 펜스) | 기계(AI/CLI) | 정확한 값 — primary 색, 본문 px, 라운드 |
| **산문** | 마크다운 본문 (`##` 섹션) | 사람/AI | 왜 그 값인지, 어떻게 쓰는지 |

AI는 토큰에서 **정답 값**을, 산문에서 **판단 근거**를 읽습니다.

## 2. YAML 토큰 층 — 스키마

`colors / typography / rounded / spacing / components` 다섯 그룹. 값은 CSS 색(hex/`rgb()`/**`oklch()`**/named),
치수는 `px`/`rem`/`em`. **토큰 참조는 중괄호** `"{colors.tertiary}"` 구문을 씁니다.

```md
---
name: Acme SaaS
colors:
  primary: "#2563EB"          # 신규 색은 oklch() 권장 (프로젝트 프론트 가드레일), hex 폴백
  secondary: "#475569"
  accent: "#EA580C"
  neutral: "#F8FAFC"
  on-primary: "#FFFFFF"       # primary 배경 위 텍스트 — 대비 짝꿍은 명시해 lint 통과
typography:
  h1:
    fontFamily: "Space Grotesk, Pretendard, sans-serif"   # 한글 UI면 라틴 폰트 뒤에 한글 웹폰트(Pretendard)를 스택으로 — 한글 글리프 폴백 방지
    fontSize: 3rem            # typography는 fontFamily + fontSize 필수, 나머지는 선택
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body-md:
    fontFamily: "Pretendard, DM Sans, sans-serif"   # 한글 본문은 가독성 우선 — Pretendard를 앞에
    fontSize: 1rem           # 16px 본문
  label-caps:
    fontFamily: "Pretendard, DM Sans, sans-serif"
    fontSize: 0.75rem
rounded:
  sm: 4px
  md: 8px                     # 버튼 기본
  lg: 12px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 12px
  card:
    backgroundColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
---
```

**규칙**
- `typography.*`는 `fontFamily`+`fontSize` 필수. `fontWeight/lineHeight/letterSpacing/fontFeature/fontVariation`은 선택.
- **폰트는 실제 로드**: `fontFamily`에 적은 폰트는 구현 시 `@import`/`<link>`로 **실제 로드**해야 함(이름만 쓰면 시스템 폴백).
  - **family 이름은 불러온 CSS의 `@font-face`에서 복사한다**: 같은 폰트도 CSS 파일마다 이름이 다르다. Pretendard v1.3.9는 가변 CSS(`dist/web/variable/pretendardvariable-dynamic-subset.min.css`)가 `'Pretendard Variable'`, 정적 CSS(`dist/web/static/pretendard-dynamic-subset.min.css`)가 `Pretendard`, GOV 정적 CSS가 `'Pretendard GOV'`만 선언한다(2026-10-18 CSS 원문 확인). 가변 CSS를 불러오고 스택에 `Pretendard`만 쓰면 CSS 요청은 정상인데 그 이름의 face가 없어 **한글이 시스템 고딕으로 렌더된다** → 가변 CSS면 `"Pretendard Variable", "Pretendard"` 순서로 쓴다(뒤는 정적 Pretendard를 로컬에 설치한 기기용 대체, gotcha 112).
  - **로드 판정은 face 로드 결과 + 렌더 폭으로 한다**. 아래를 브라우저 콘솔에 붙여 넣거나, Playwright면 `async () => { … return {…}; }`로 감싸 `page.evaluate`에 넘긴다(페이지에 한글이 아직 없어도 동작):
    ```js
    const name  = 'Pretendard Variable';                                          // 확인할 웹폰트 하나 (스택에 웹폰트가 여럿이면 이름마다 따로 돌린다)
    const stack = '"Space Grotesk", "Pretendard Variable", "Pretendard", sans-serif'; // DESIGN.md 스택 그대로 (이름의 따옴표 유무는 CSS에서 같은 뜻)
    const rest  = '"Space Grotesk", sans-serif';                                   // stack에서 확인할 웹폰트와 그 대체만 뺀 나머지
    const font  = '700 32px';                                                      // 그 스타일의 실제 굵기
    const text  = '한글렌더확인문장';                                               // 공백 없이 — 공백은 앞쪽 라틴 폰트로 그려져 폭을 바꾼다
    const faces = await document.fonts.load(`${font} "${name}"`, text);           // 0개면 그 이름의 @font-face가 없다(이름 불일치)
    const width = (s) => { const el = document.createElement('span'); el.textContent = text;
      el.style.cssText = `position:absolute;white-space:nowrap;font:${font} ${s}`;
      document.body.append(el); const w = el.getBoundingClientRect().width; el.remove(); return w; };
    ({ faces: faces.length, applied: width(stack) !== width(rest) });              // applied:false면 폴백 중
    ```
    - `faces`는 이름이 CSS와 맞는지, `applied`는 실제로 그 폰트로 그려졌는지를 본다. **둘 다 통과해야 한다** — 같은 이름의 폰트가 로컬에 설치된 기기에서는 이름이 틀려도 `applied`만 true가 될 수 있다(추정, 미실측).
    - 라틴 웹폰트는 `name`을 그 폰트로, `text`를 라틴 문장(공백 없이)으로, `rest`를 그 라틴 폰트만 뺀 스택으로 바꿔 같은 코드를 돌린다.
    - 기준을 `rest` 대신 `sans-serif`로, 문장을 공백 있는 한글로 두면 라틴이 앞에 있는 스택에서 **이름이 틀려도 `applied: true`가 나온다**(2026-10-18 실측 — Space Grotesk 로드 상태의 h1 스택). 위처럼 둘 다 지킨다.
    - 2026-10-18 실측(Space Grotesk·Pretendard 가변 CSS 로드, 한글 없는 페이지): 이름이 틀리면 `faces: 0`·`applied: false`, 맞으면 `faces: 5`·`applied: true`. 본문 스택과 라틴 확인도 같은 판정이 나왔다.
  - **`document.fonts.check()`·computed 값은 근거가 아니다**: `check()`는 양쪽으로 틀린다. 한글 등 unicode-range 서브셋 폰트는 로드돼도 false일 수 있고(gotcha 045), **등록되지 않은 이름은 폴백 중이어도 true**다(존재하지 않는 이름도 true, gotcha 112). computed `font-family`는 선언값을 그대로 돌려준다. `await document.fonts.ready`는 dynamic-subset에서 끝나지 않을 수 있어 위 코드는 쓰지 않는다(gotcha 056).
- **한글 UI는 한글 전용 페어링을 우선(권장)**: `font-pairings.csv`의 한글 행(#74~84 — Noto Serif KR/Hahmlet/Gowun Batang 등 헤딩 + Noto Sans KR/Nanum Gothic/IBM Plex Sans KR 등 본문)은 한글·라틴 글리프를 모두 가져 **폴백 함정을 구조적으로 회피**한다. 라틴+Pretendard를 덧대기 전에 이 경로를 먼저 검토하라. CSV는 Google Fonts 기준이라 Pretendard 행이 없다 — Pretendard는 위 jsDelivr CSS로 불러온다.
- **(라틴 페어링을 쓸 때) 한글은 정본 스택에 함께(필수)**: `fontFamily`는 단일 이름이 아니라 **CSS 스택 문자열**로 적을 수 있다(`"라틴, 한글, sans-serif"`). 한글이 들어가는 UI는 라틴 폰트(Space Grotesk 등)에 한글 글리프가 없어 한글만 시스템 폴백되므로, **정본(DESIGN.md) 단계에서** 한글 웹폰트(Pretendard 등)를 스택에 함께 박는다 — 헤딩은 `"라틴, Pretendard Variable, Pretendard, sans-serif"`(라틴 디스플레이는 라틴이 렌더, 한글만 Pretendard로 폴백. 가변 CSS 기준 이름). 정본이 라틴 단일값이면 Phase 5의 "토큰 그대로 사용"이 그 값을 전파해 한글이 깨진다(gotcha 041).
  - **스택 순서 = 라틴 폰트의 운명(검증으로 확인, 2026-06-30)**: Pretendard는 라틴 글리프도 가지므로 **본문에 `"Pretendard Variable, Pretendard, DM Sans, sans-serif"`처럼 Pretendard를 앞에 두면 라틴 본문까지 Pretendard로 렌더되고, 뒤의 DM Sans는 lazy-load라 한 번도 다운로드되지 않아 죽은 폰트가 된다**(`document.fonts.check('"DM Sans"')` → false — 등록된 face가 안 쓰여 unloaded인 경우라 이 false는 맞다). 한·영을 한 목소리로 통일하려면(한글 우선 제품) Pretendard-first가 맞고 라틴 본문 폰트는 생략해도 된다. 반대로 **라틴 본문은 페어링 폰트(DM Sans)로 보이고 한글만 Pretendard로** 떨어뜨리려면 `"DM Sans, Pretendard Variable, Pretendard, sans-serif"`처럼 **라틴을 앞에** 둔다. 어느 쪽이든 위 판정 코드(face 로드 결과 + 렌더 폭)로 의도한 폰트가 실제로 쓰였는지 확인.
- `components.*`는 `backgroundColor/textColor/typography/rounded/padding`를 가지며 토큰을 중괄호로 참조.
- **대비 짝꿍 명시**: 컴포넌트의 `backgroundColor`/`textColor`가 한 쌍이어야 lint의 contrast 규칙(4.5:1)이 동작합니다. `on-primary` 같은 전경색을 colors에 정의하세요.

## 3. 산문 층 — `##` 섹션

토큰 아래에 "왜"를 사람 말로 적습니다. 최소 섹션:

```md
## Overview
하나의 의도된 방향(미니멀/에디토리얼/브루탈/레트로퓨처 중 하나)을 한 문단으로. "그냥 모던" 금지.

## Colors
- **Primary (#2563EB):** {언제 쓰는지 — CTA·핵심 UI}. {왜 이 색인지 — 브랜드/심리}.
- **Accent (#EA580C):** {날카로운 액센트로 제한적으로}.

## Typography
{serif headline + sans 본문 같은 위계 의도. Inter 기본값을 피한 이유.}

## Layout
{비대칭/그리드 전면화/의도된 밀도. 균일 3열 카드 회피.}

## Components
{버튼/카드/입력의 상태(hover/active/disabled)와 사용 경계.}
```

## 4. 아프로디테 파이프라인에서의 생성

Phase 3의 DB 매칭(`MODULE_ROOT[frontend-design]/references/*.csv`) + 가중 루브릭 채점 결과를 그대로 DESIGN.md에 박습니다.

1. 선택된 **색상 팔레트** → `colors:` (Primary/Accent/Neutral + `on-*` 전경색)
2. 선택된 **폰트 페어링** → `typography:` (heading/body/label)
3. 프리셋 파라미터(VARIANCE/MOTION/DENSITY) + 간격/라운드 → `spacing:` / `rounded:`
4. 핵심 컴포넌트(button/card/input) → `components:`
5. 채점 근거·선택 이유 → 산문 `##` 섹션

> 상세 토큰(50~150개 스케일)이 필요하면 먼저 DESIGN.md에서 `export --format dtcg`로
> `design-tokens.json`(W3C DTCG)을 파생합니다. 사용자가 디자인 시스템 scaffold를 명시적으로
> 요청했고 상위 하네스가 `MODULE_SKILL[design-system-starter]`를 해석한 경우에만 그 모듈 계약을
> 추가 적용합니다. 어느 경우든 **정본은 DESIGN.md**입니다.

## 5. Lint 게이트 (기계 검증 — Phase 6)

`MODULE_SKILL[ui-ux-auditor]`에서 직접 읽은 스크린샷 시각 감사는 1차 신호이고,
**토큰 계약/대비는 lint로 외부 검증**합니다.

```bash
npx @google/design.md lint DESIGN.md      # macOS/Linux
designmd lint DESIGN.md                    # Windows 별칭 (.md 확장자 연결 충돌 회피)
```

9개 규칙 중 핵심:
- **broken-ref** — 존재하지 않는 토큰 참조(`"{colors.없는값}"`)
- **orphaned-tokens** — 어디서도 안 쓰는 고아 색
- **contrast-ratio** — 컴포넌트 `backgroundColor`/`textColor` 쌍이 **WCAG AA 4.5:1 미달**

**⚠️ 헤드리스 한계 (2026-06 실측)**: `@google/design.md@0.3.0`은 **TTY 대화형 렌더러**라 헤드리스(에이전트/CI/파이프 출력) 환경에선 `--help`조차 출력이 비고, lint도 **무출력 + exit 0으로 no-op** 됩니다(의도적으로 broken-ref·orphan·저대비를 심은 파일도 그대로 통과). 따라서 **헤드리스 자동 게이트로 신뢰하지 말 것** — 사람이 대화형 터미널에서 수동 검증할 때만 의미가 있습니다.

**자동(헤드리스) enforcement는 lint가 아니라** ① 에이전트가 DESIGN.md 토큰을 그대로 따르는지(프론트 가드레일의 "DESIGN.md 먼저 읽기") + ② 해석된 `MODULE_SKILL[ui-ux-auditor]`의 대비/시각 검증으로 대신합니다.

**graceful degradation (필수)**: npx/네트워크/헤드리스 — 어느 쪽이든 lint 신호가 없으면 **건너뛰고** 보고에 `lint: NOT RUN`으로 표기. 도구 부재가 파이프라인을 막지 않지만 무출력은 통과가 아닙니다. `--json`/headless 출력을 지원하는 버전이 나오면 자동 게이트로 재평가.

## 6. Export (파생물)

```bash
npx @google/design.md export --format tailwind DESIGN.md      # Tailwind v3 theme.extend (JSON)
npx @google/design.md export --format css-tailwind DESIGN.md  # Tailwind v4 @theme (CSS)
npx @google/design.md export --format dtcg DESIGN.md          # W3C Design Tokens → design-tokens.json
```

`diff`로 버전 비교: `npx @google/design.md diff DESIGN.md DESIGN-v2.md`

## 7. 레거시 마이그레이션

기존 자산이 있으면 새로 묻지 말고 DESIGN.md로 흡수합니다.

| 기존 파일 | 처리 |
|-----------|------|
| `DESIGN.md` (Stitch Mode 1 산출) | 그대로 정본 채택 — lint만 돌림 |
| `design-tokens.json` (W3C DTCG) | `colors/typography/spacing/rounded`를 DESIGN.md YAML로 추림(정본), 원본은 export 파생물로 유지 |
| `design-system.md` (구 산문) | 산문을 DESIGN.md `##` 섹션으로 이관 후 deprecated |

## 8. 주의 (alpha 의존)

- `@google/design.md`는 **alpha** — 스키마/CLI가 바뀔 수 있습니다. 하드 의존 금지, 항상 폴백 경로 유지.
- DESIGN.md **파일 자체는 도구 없이도 유효**합니다(그냥 마크다운). lint/export만 CLI에 의존하므로, CLI가 없어도 정본·산문 가치는 그대로입니다.
