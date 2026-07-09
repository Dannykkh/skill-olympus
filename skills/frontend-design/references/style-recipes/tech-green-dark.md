# 테크 그린 다크 (tech-green-dark)

> near-black 그린 베이스 위의 모던 테크 시스템 — 에메랄드 시그널, 모노 데이터, 시스템 마커.
> Credits: MengTo/Skills(MIT) `tech-green-dark-mode-modern` 각색 — 원본에 없던 hex/폰트 바인딩.

## 정체성 (경계 선언)

- **이것**: 절제된 다크 그린 시스템 — 인프라/개발자 도구/모니터링의 신뢰감.
- **이것이 아님**: 매트릭스 터미널 코스프레 아님(그건 swiss-brutalist의 Tactical 모드). 네온 게이밍도 아님.

## 토큰

```css
:root {
  --tg-bg: #04100a;            /* near-black 그린 (플랫 블랙 금지) */
  --tg-bg-deep: #020805;
  --tg-surface: rgba(10, 26, 18, 0.72);
  --tg-line: rgba(52, 211, 153, 0.16);
  --tg-line-strong: rgba(52, 211, 153, 0.32);
  --tg-text: #ecfdf5;
  --tg-copy: #9db8ab;
  --tg-muted: #5f7a6d;
  --tg-accent: #34d399;        /* 에메랄드 시그널 */
  --tg-on-accent: #04100a;
  --tg-warn: #fbbf24;          /* 상태 표시용 보조 (사용 최소화) */
}
```

## 폰트 (한·영 스택)

| 역할 | 스택 |
|------|------|
| Heading | `"Space Grotesk", "Pretendard", sans-serif` |
| Body | `"DM Sans", "Pretendard", sans-serif` |
| Data/Status | `"JetBrains Mono", "IBM Plex Sans KR", monospace` |

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500&family=IBM+Plex+Sans+KR:wght@400;500&display=swap');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
```

## Visual Target

- 배경: `--tg-bg-deep` → `--tg-bg` 그라데이션 + 상단 낮은 opacity 그린 radial 글로우 1개.
- 그린은 시그널 — 상태 도트, 활성 라인, 그래프 스트로크, primary CTA. 대면적 그린 배경 금지.
- 데이터는 모노 — 숫자·상태·버전·로그는 전부 모노 폰트.
- 시스템 마커: 얇은 레일, 상태 도트(`● LIVE`), 틱 라벨이 "가동 중인 시스템" 감각을 만든다.

## 권장 패턴

- **내비게이션**: 다크 반투명 바 + 우측 상태 인디케이터(그린 도트 + 모노 라벨).
- **히어로**: 좌측 헤드라인 + 우측 라이브 데이터 패널(모노 숫자 + 미니 스파크라인).
- **메트릭 카드**: `--tg-surface` + 1px `--tg-line` 보더 + 모노 대형 숫자 + 라벨.
- **CTA**: 에메랄드 솔리드 primary + 고스트 secondary(그린 보더).
- **그래프/차트**: 스트로크는 `--tg-accent`, 그리드는 `--tg-line` — 색 추가 금지.

## 모션 기본값

- 상태 도트 pulse(2s, opacity 0.6→1), 숫자 카운트업(1회), 스파크라인 그려지기.
- 리빌은 fade-up. 글로우 애니메이션 금지 — 시스템은 침착하다.

## Tuning Knobs

- **그린 휴**: 에메랄드(#34D399) ↔ 라임(#A3E635, 더 공격적) ↔ 틸(#2DD4BF).
- **데이터 밀도**: 마케팅 페이지(희소) ↔ 콘솔(촘촘).
- **글로우**: 배경 radial 1개 opacity 0.05~0.12.

## Avoid

- 매트릭스 레인, 터미널 커서 장식 남발.
- 그린 + 다른 채도색 혼합 (warn 옐로는 상태 표시 예외).
- 밝은 그린 대면적 배경.
- 순수 #000 배경.

## DESIGN.md 컴파일

```yaml
colors:
  primary: "#04100A"
  neutral: "#0A1A12"
  accent: "#34D399"
  on-primary: "#ECFDF5"
  on-accent: "#04100A"
  copy: "#9DB8AB"
typography:
  h1: { fontFamily: "Space Grotesk, Pretendard, sans-serif", fontSize: 3.5rem, fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.02em" }
  body-md: { fontFamily: "DM Sans, Pretendard, sans-serif", fontSize: 1rem, lineHeight: 1.6 }
  label-mono: { fontFamily: "JetBrains Mono, IBM Plex Sans KR, monospace", fontSize: 0.75rem, letterSpacing: "0.08em" }
rounded: { sm: 6px, md: 10px, lg: 16px }
components:
  button-primary: { backgroundColor: "{colors.accent}", textColor: "{colors.on-accent}", rounded: "{rounded.md}" }
```

프리셋 근사값: VARIANCE 4 · MOTION 4 · DENSITY 6 (대시보드/깔끔 프리셋 계열)
