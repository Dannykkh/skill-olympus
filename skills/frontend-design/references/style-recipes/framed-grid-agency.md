# 프레임드 그리드 에이전시 (framed-grid-agency)

> 가시적 12컬럼 그리드 + 프레임 라인 + 코너 마커 — 구조 자체가 디자인인 에이전시/포트폴리오 미학.
> Credits: MengTo/Skills(MIT) `framed-grid-layout`+`agency-grid-layout-minimal`+`container-lines` 결합 각색.

## 정체성 (경계 선언)

- **이것**: 그리드가 배경에 드러나는 "설계 도면 위의 포트폴리오". 미니멀하되 구조적 긴장감.
- **이것이 아님**: 브루탈리스트가 아님(90도 강박·거대 타이포 없음). 라인이 장식이 아니라 구조.

## 토큰

```css
:root {
  --fg-bg: #fafafa;
  --fg-surface: #ffffff;
  --fg-ink: #18181b;
  --fg-copy: #52525b;
  --fg-line: rgba(24, 24, 27, 0.14);
  --fg-line-strong: rgba(24, 24, 27, 0.28);
  --fg-texture: rgba(24, 24, 27, 0.06);
  --fg-gap: 16px;
  --fg-pad: clamp(16px, 2vw, 28px);
  --fg-accent: #2563eb;        /* 절제된 액센트 1색 — 브랜드로 치환 */
  --fg-on-accent: #fafafa;
}
```

다크 변형: `--fg-bg: #101012; --fg-surface: #17171a; --fg-ink: #f4f4f5; --fg-line: rgba(244,244,245,0.14)`.

## 폰트 (한·영 스택)

| 역할 | 스택 |
|------|------|
| Heading | `"Space Grotesk", "Pretendard", sans-serif` |
| Body | `"Archivo", "Pretendard", sans-serif` |
| Index/Meta | `"JetBrains Mono", "IBM Plex Sans KR", monospace` |

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Archivo:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=IBM+Plex+Sans+KR:wght@400;500&display=swap');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
```

## 핵심 CSS

```css
.framed-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--fg-gap);
  padding: var(--fg-pad);
  border: 1px solid var(--fg-line);
  position: relative;
}

/* 대각선 텍스처 — 빈 셀/여백 영역에 도면 해칭 */
.framed-grid--hatched {
  background-image: repeating-linear-gradient(135deg,
    transparent 0 11px, var(--fg-texture) 11px 12px);
}
```

- 페이지 레벨 세로 가이드 + 코너 스퀘어: technique-recipes §5 Container Lines 사용 (`--container-max: 1120px` 공유).

## Visual Target

- 콘텐츠 블록이 그리드 트랙에 정박 — 12컬럼에서 4/8, 5/7, 3/9 같은 비대칭 스팬.
- 섹션 경계마다 전폭 프레임 라인. 프레임 안에 프레임(nested)은 1단계까지.
- 프로젝트 인덱스(`01 — 브랜딩`, `02 — 웹`)가 모노로 라인을 따라 배치.
- 이미지는 프레임에 딱 맞게 크롭 — 떠다니는 이미지 금지.

## 권장 패턴

- **내비게이션**: 프레임 최상단 라인에 붙은 텍스트 링크 + 우측 모노 인덱스.
- **히어로**: 좌 8컬럼 헤드라인 + 우 4컬럼 메타 정보(연도·분야·소재지).
- **작업 목록**: 라인으로만 구분된 전폭 로우 — hover 시 배경 `--fg-surface` + 이미지 프리뷰.
- **푸터**: 그리드 해칭 텍스처 + 코너 스퀘어로 도면 마감.

## 모션 기본값

- 프레임 라인이 그려지는 등장(scaleX 0→1, 0.8s power3.out) — 페이지 로드 1회만.
- 텍스트는 masked reveal(→ technique-recipes §7), 이미지 hover는 scale 1→1.04.
- 그리드 자체는 움직이지 않는다 — 구조는 고정, 콘텐츠만 등장.

## Tuning Knobs

- **라인 가시성**: `--fg-line` alpha 0.08(은은) ~ 0.2(도면).
- **해칭 사용량**: 푸터/빈 셀만 ↔ 섹션 배경까지.
- **밀도**: 여백형 포트폴리오 ↔ 촘촘한 아카이브.

## Avoid

- 그리드를 무시하고 떠 있는 요소.
- 섹션마다 다른 컨테이너 폭.
- 라인 + 그림자 + 배경색 3중 구분 (구분 수단은 라인 하나로).
- 3열 균일 카드 반복.

## DESIGN.md 컴파일

```yaml
colors:
  primary: "#18181B"
  neutral: "#FAFAFA"
  accent: "#2563EB"
  on-primary: "#FAFAFA"
  on-accent: "#FAFAFA"
  copy: "#52525B"
  border: "rgba(24, 24, 27, 0.14)"
typography:
  h1: { fontFamily: "Space Grotesk, Pretendard, sans-serif", fontSize: 3.5rem, fontWeight: 500, lineHeight: 1.08, letterSpacing: "-0.02em" }
  body-md: { fontFamily: "Archivo, Pretendard, sans-serif", fontSize: 1rem, lineHeight: 1.6 }
  label-mono: { fontFamily: "JetBrains Mono, IBM Plex Sans KR, monospace", fontSize: 0.75rem, letterSpacing: "0.06em" }
rounded: { none: 0px, sm: 2px }
spacing: { gap: 16px, pad: 24px, section: 96px }
```

프리셋 근사값: VARIANCE 6 · MOTION 4 · DENSITY 5 (대담/매거진 프리셋 계열)
