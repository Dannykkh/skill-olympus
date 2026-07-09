# 북 세리프 에디토리얼 (book-serif-editorial)

> 책의 인덱스 페이지 같은 세리프 지배 레이아웃 — 크림 지면, 문학적 위계, 넘버링된 목차 감각.
> Credits: MengTo/Skills(MIT) `book-serif-index` 각색 — 원본에 없던 hex/폰트 바인딩.

## 정체성 (경계 선언)

- **이것**: 출판물의 조판 규율을 웹에 — 세리프 본문까지 세리프, 챕터 넘버, 각주형 메타.
- **이것이 아님**: notion-minimal(세리프는 히어로만)이 아님 — 여기는 **본문까지 세리프**. UI 산세리프 최소화.

## 토큰

```css
:root {
  --bk-paper: #fbf8f3;         /* 크림 지면 */
  --bk-paper-deep: #f4efe6;
  --bk-ink: #201a14;           /* 세피아 잉크 (순흑 금지) */
  --bk-copy: #5c5347;
  --bk-line: rgba(32, 26, 20, 0.16);
  --bk-accent: #8b2f2b;        /* 머룬 — 챕터 넘버·링크·드롭캡 */
  --bk-on-accent: #fbf8f3;
}
```

## 폰트 (한·영 스택)

| 역할 | 스택 | 비고 |
|------|------|------|
| Display | `"Libre Bodoni", "Gowun Batang", serif` | 고대비 세리프 헤드라인. 한글은 고운바탕 폴백 |
| Body | `"Source Serif 4", "Noto Serif KR", serif` | 본문도 세리프 — 장문 가독 최적화 |
| Index/Meta | `"JetBrains Mono", "IBM Plex Sans KR", monospace` | 챕터 번호·페이지 표기 |

```css
@import url('https://fonts.googleapis.com/css2?family=Libre+Bodoni:wght@400;500;600;700&family=Gowun+Batang:wght@400;700&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,400&family=Noto+Serif+KR:wght@400;500;600&family=JetBrains+Mono:wght@400&family=IBM+Plex+Sans+KR:wght@400&display=swap');
```

한글 본격 문학 톤이면 Display를 `"Nanum Myeongjo"` 또는 눈누의 마루부리로 교체 검토.

## Visual Target

- 지면 중심 1컬럼 (max-w-3xl) + 좌우로 튀어나온 마지널리아(각주·챕터 마커).
- 챕터/섹션 넘버(`I.` `II.` 또는 `01`)가 위계의 앵커.
- 이미지보다 타이포 — 이미지는 도판(figure)처럼 캡션과 함께 절제 배치.
- 라인은 얇은 수평 룰(`--bk-line`)만 — 카드/박스 최소화.

## 권장 패턴

- **목차형 인덱스**: 넘버 + 제목 + 점선 리더 + 페이지/메타가 정렬된 로우.
- **드롭캡**: 첫 문단 첫 글자를 Display 3~4줄 높이 + `--bk-accent`.
- **인용**: 이탤릭 세리프(라틴) / 한글은 고운바탕 + 들여쓰기 + 좌측 룰. 한글에 라틴 이탤릭 강제 금지.
- **각주형 메타**: 본문 옆 작은 모노 번호 + 하단 각주 목록.
- **내비게이션**: 상단 얇은 룰 위 텍스트 링크만 — 로고도 텍스트.

## 모션 기본값

- 최소한: 문단 fade-in(0.5s), 점선 리더가 그려지는 등장 정도.
- 스크롤 하이재킹·패럴랙스 금지 — 책은 조용히 넘어간다.

## Tuning Knobs

- **지면 온도**: `#FBF8F3`(크림) ↔ `#FFFFFF`(모던 출판).
- **액센트**: 머룬 ↔ 딥 그린(`#2F4A38`) ↔ 클래식 블루(`#1E3A5F`).
- **문학성**: 드롭캡/마지널리아 사용량.

## Avoid

- UI 산세리프 대량 사용 (모노 메타 제외).
- 카드 그리드·그림자·글래스.
- 한글 강조에 라틴 전용 이탤릭 (시스템 세리프 폴백으로 깨짐).
- 과도한 이미지 — 도판 이상은 매거진이지 책이 아니다.

## DESIGN.md 컴파일

```yaml
colors:
  primary: "#201A14"
  neutral: "#FBF8F3"
  accent: "#8B2F2B"
  on-primary: "#FBF8F3"
  on-accent: "#FBF8F3"
  on-neutral: "#201A14"
  copy: "#5C5347"
typography:
  h1: { fontFamily: "Libre Bodoni, Gowun Batang, serif", fontSize: 3.5rem, fontWeight: 500, lineHeight: 1.12, letterSpacing: "-0.01em" }
  body-md: { fontFamily: "Source Serif 4, Noto Serif KR, serif", fontSize: 1.125rem, lineHeight: 1.75 }
  label-mono: { fontFamily: "JetBrains Mono, IBM Plex Sans KR, monospace", fontSize: 0.75rem, letterSpacing: "0.04em" }
rounded: { none: 0px, sm: 2px }
```

프리셋 근사값: VARIANCE 5 · MOTION 2 · DENSITY 3 (매거진/미니멀 프리셋 계열)
