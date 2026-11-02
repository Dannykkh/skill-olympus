# Korean Line Break — 한글 줄바꿈 실측과 자리별 처방

한글 UI에서 어절이 두 줄로 갈리는 자리(`간단/한 방법`, `걸립니/다.`)를 **실제 브라우저로 재서** 찾고,
자리별로 고친 뒤 다시 잰다. 브라우저는 한글을 글자 사이 어디서나 꺾기 때문에, 손대지 않은 한국어
화면은 이렇게 갈린다. 영어 틀에 한국어를 넣은 화면과 AI가 만든 화면에서 가장 흔한 티다.

> 원본: [hanmariyang/giting-skills `plugins/hangul-wrap`](https://github.com/hanmariyang/giting-skills/tree/main/plugins/hangul-wrap)
> v0.2.2 (커밋 `131a8b3`, MIT, Copyright (c) 2026 Giting). 검사기는 `scripts/wrapcheck.mjs`로 옮겼고
> 라이선스 전문은 `scripts/LICENSE-hangul-wrap.txt`에 있다. 바꾼 곳 네 가지는 검사기 머리 주석에 적었다.
> 업스트림을 다시 맞출 때는 이 문서·검사기·라이선스를 함께 대조한다.

## 언제 쓰나

| 단계 | 할 일 |
|---|---|
| Phase 3-2 시각 시스템 | `DESIGN.md` Typography에 아래 자리별 처방을 줄바꿈 규칙으로 적는다 |
| Phase 5 구현 | 프로젝트에 줄바꿈 규칙이 하나도 없으면 아래 기본 CSS를 넣는다 |
| Phase 6-4 품질 검증 | 한국어 텍스트가 있는 화면이면 검사기로 재고, 고친 뒤 같은 조건으로 다시 잰다 |

한국어 텍스트가 없는 화면이면 `NOT APPLICABLE`이다.

## 1. 잰다 (고치기 전에 반드시)

```sh
node "<module_root>/scripts/wrapcheck.mjs" <url|파일> [폭들] [--scope 셀렉터] [--text 150,200] [--zoom 150,200] [--wait ms] [--font-timeout ms] [--json]
node "<module_root>/scripts/wrapcheck.mjs" http://localhost:3000 360,390,768,1280
node "<module_root>/scripts/wrapcheck.mjs" http://localhost:3000 390 --text 200 --zoom 200
```

- `<module_root>`는 이번에 읽은 design-plan `SKILL.md`의 디렉터리다. 사용자 프로젝트의 `scripts/`가 아니다.
- 필요한 것: Node 22 이상(내장 WebSocket), 크롬 계열 브라우저(Chrome·Edge·Chromium). 설치할 패키지 없음.
  자동으로 못 찾으면 `CHROME_PATH`로 경로를 준다.
- 글자 하나하나의 실제 화면 위치로 줄을 되살린다. CSS를 읽고 추측하지 않는다.
- 끝 코드: `0` 문제 없음 · `1` 쪼개짐·넘침·버튼 글자 잘림·안 눌림 중 하나라도 있음 · `2` 실행 못 함.
- 화면을 늦게 그리는 SPA는 `--wait`를 늘린다(기본 1200ms, load 이벤트 뒤). 웹폰트 대기는 `--font-timeout`
  (기본 3000ms)에서 끊는다. dynamic-subset 폰트는 `document.fonts.ready`가 끝나지 않을 수 있어서다(gotcha 056).

| 표시 | 뜻 | 끝 코드에 넣나 |
|---|---|---|
| ✂ 쪼개짐 | 이웃한 두 글자가 띄어쓰기 없이 다른 줄로 갈림 | 넣는다 |
| ⛔ 넘침 | 글자가 상자를 뚫었거나 페이지가 옆으로 밀림. 대개 `keep-all`·`nowrap` 부작용 | 넣는다 |
| · 외톨이 | 마지막 줄에 한두 글자만 남음 | 알리기만 |

가로 스크롤 상자 안과 말줄임(…)은 일부러 그런 것이라 넘침으로 치지 않는다.

### 글자를 키운 상태 (`--text` · `--zoom`)

- `--text 200`: 글자만 키운다. 상자 폭은 그대로라 폰의 글자 크기 설정과 같은 상태다.
- `--zoom 200`: 브라우저 확대. 배치 폭이 `폭 ÷ 배율`로 준다(390px에서 200%면 195px).
- 기준은 200%다(WCAG 1.4.4). 둘 중 하나라도 주면 기본 크기와 같이 재고 버튼·링크를 더 센다.
  - ✂ 버튼 글자 잘림: 버튼 상자보다 글자가 커서 일부가 안 보임(말줄임 제외)
  - ⛔ 안 눌림: 버튼을 화면 가운데로 끌어와 한가운데를 누르면 다른 요소가 눌림(고정 바에 덮임 등)
- 100%에서도 안 눌리는 버튼은 글자 크기 문제가 아니다. 보고할 때 나눠 적는다.
- 글자만 키우기는 흉내다. 실기기 확인을 대신하지 않는다.

### 수가 PC마다 다르다

같은 시험 페이지(`scripts/fixtures/wrapcheck/before.html`, 360·390px)가 업스트림 README에서는 쪼개짐 11·넘침 2,
이 레포의 Windows 11 Chrome·Edge에서는 둘 다 쪼개짐 9·넘침 0이었다(2026-11-02). 시험 페이지는 웹폰트 없이
시스템 폰트(`-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif` — Windows에서는 대개 맑은 고딕)로
그려지므로, 운영체제마다 글자 폭이 달라진 것으로 보인다. 그래서:

- 검사 결과를 배포 기준으로 쓰려면 **화면이 쓰는 웹폰트가 실제로 로드된 상태**에서 잰다
  ([design-md-guide.md](design-md-guide.md)의 로드 판정).
- "0건"은 잰 폭·브라우저·폰트에서의 결과다. 보고에 그 조건을 함께 적는다.

## 2. 자리별로 고친다

같은 `keep-all`이 제목에서는 약이고 좁은 표 칸에서는 칸을 뚫는다. 그래서 처방은 자리마다 다르다.
검사기 보고서는 블록마다 자리(제목·본문·좁은 칸·코드·주소·버튼)를 붙인다.

| 자리 | 처방 | 이유 |
|---|---|---|
| 제목 | `word-break: keep-all` + `text-wrap: balance` | 어절 단위로 꺾고 줄 길이를 고르게. `balance`는 몇 줄 이하에만 먹으니 제목 전용 |
| 본문 | `word-break: keep-all` + `text-wrap: pretty` | 어절 단위 + 마지막 줄 외톨이 줄이기 |
| 좁은 칸 (표·배지·버튼·태그) | **`keep-all`을 주지 않는다.** 칸 폭을 늘리거나 말줄임. 꺾이면 안 되는 짧은 묶음(`월 9,900원`·`3분 전`)만 `white-space: nowrap` | `keep-all`은 어절이 칸보다 길면 칸을 뚫는다 |
| 코드·주소 | `overflow-wrap: anywhere` (`keep-all`은 그대로) | 긴 주소·토큰은 칸 안에서 아무 데서나 끊고, 코드 속 한글 어절은 지킨다 |

프로젝트에 줄바꿈 규칙이 하나도 없으면 기본값으로 이것을 넣는다:

```css
/* :where() 라 명시도가 0 이다. 컴포넌트에 이미 있는 규칙이 언제나 이긴다 */
:where(h1, h2, h3, h4, h5, h6, p, li, dd, dt, blockquote, figcaption) {
  word-break: keep-all;
  overflow-wrap: break-word;   /* 어절 하나가 줄보다 길 때만 마지막 수단으로 자른다 */
}
:where(h1, h2, h3, h4, h5, h6) { text-wrap: balance; }
:where(p, li, dd, blockquote, figcaption) { text-wrap: pretty; }
:where(pre, code, kbd, samp) { overflow-wrap: anywhere; }
```

`body`에 걸어 상속시키는 방법(`body { word-break: keep-all; overflow-wrap: break-word; }`)도 된다.
더 넓게 먹지만 그만큼 좁은 칸까지 내려가니, 걸고 나서 넘침을 꼭 다시 잰다.

### 하지 말 것

- 한글 글에 `word-break: break-all`을 주지 않는다. 넘침을 고치겠다며 가장 자주 넣는 한 줄인데 어절을
  아무 데서나 자른다. 넘침은 자리별 처방으로 푼다.
- `white-space: nowrap`을 넓게 주지 않는다. 묶어야 할 짧은 조각에만 `span` 단위로.
- 중국어·일본어가 섞인 글에 `keep-all`을 주지 않는다. 띄어쓰기가 없는 글이라 줄이 아예 안 꺾인다.
- 한 폭만 보고 "됐다"고 하지 않는다. 쪼개짐은 특정 폭에서만 생긴다. 최소 폰 폭 하나와 데스크톱 하나.
- `text-wrap: balance`·`pretty`를 지원하지 않는 브라우저는 그냥 무시한다. 지원 여부로 막지 않는다.

### 손으로 다듬을 때

- 제목 속 긴 합성어는 원하는 자리에 `<wbr>`을 넣어 거기서만 꺾이게 한다.
- 절대 갈리면 안 되는 두 어절(`3월 5일`)은 사이를 `&nbsp;`로 붙인다.
- 분할 텍스트 모션은 어절·구 단위로 나눈다([web-motion-contract.md](web-motion-contract.md)).

## 3. 다시 잰다

같은 폭과 같은 `--text`·`--zoom`으로 다시 돌려 쪼개짐 0·넘침 0(키운 상태를 쟀다면 버튼 글자 잘림 0·안 눌림 0)을
확인한다. 넘침이 새로 생겼다면 거의 늘 좁은 칸에 `keep-all`이 내려간 것이다. 그 칸만 되돌린다.
자동 수정→재측정은 Phase 6의 최대 2라운드 규칙을 따르고, 남은 것은 잔여 이슈로 보고한다.

## 보고

```
한글 줄바꿈 실측 (Chrome, Pretendard Variable 로드 확인, 360·390·768·1280 + 390 글자 200%·확대 200%)
  고치기 전  쪼개짐 11 · 넘침 2 · 버튼 글자 잘림 1 · 안 눌림 0
  고친 뒤    쪼개짐 0 · 넘침 0 · 버튼 글자 잘림 0 · 안 눌림 0
  바꾼 곳    제목·본문 기본값 1블록, 요금표 칸 nowrap, 연동 주소 code 처리
```

- 검사기를 돌리지 못했으면(Node 22 없음, 브라우저 없음, 끝 코드 2) `NOT RUN`과 이유를 적는다.
  돌리지 않은 측정을 통과로 적지 않는다. 처방은 제안으로만 낸다.
- 시험 페이지로 검사기 자체를 확인할 수 있다: `scripts/fixtures/wrapcheck/before.html`(규칙 없음 +
  카드에 `break-all`, 끝 코드 1), `after.html`(자리별 처방, 끝 코드 0), `textsize.html`(글자 키운 상태용).
