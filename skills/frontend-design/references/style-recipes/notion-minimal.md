# 프리미엄 유틸리테리언 미니멀 (notion-minimal)

> Notion류 "문서형" 인터페이스 — 따뜻한 모노크롬, 에디토리얼 세리프 히어로, 울트라 플랫 벤토.
> Credits: MengTo/Skills(MIT) `minimalist-ui` 각색 — 한글 폰트 바인딩 추가.

## 정체성 (경계 선언)

- **이것**: 문서 같은 워크스페이스 미학. 색은 희소 자원 — 의미와 미묘한 액센트에만.
- **이것이 아님**: 차가운 회색 SaaS 아님(따뜻한 본 화이트). 그라데이션/네온/3D 글래스 금지.

## 토큰

```css
:root {
  --nm-canvas: #f7f6f3;        /* 따뜻한 본 화이트 (#FBFBFA 대안, 순백 #FFFFFF도 허용) */
  --nm-surface: #ffffff;       /* 카드 (#F9F9F8 대안) */
  --nm-border: #eaeaea;        /* 모든 보더·디바이더는 이 1px — rgba(0,0,0,0.06) 대안 */
  --nm-ink: #111111;           /* 본문은 절대 순흑 금지 — #2F3437 대안 */
  --nm-muted: #787774;
  /* 스팟 파스텔 (배경/텍스트 쌍) — 태그·인라인 코드·아이콘 배경 전용 */
  --nm-red-bg: #fdebec;    --nm-red-text: #9f2f2d;
  --nm-blue-bg: #e1f3fe;   --nm-blue-text: #1f6c9f;
  --nm-green-bg: #edf3ec;  --nm-green-text: #346538;
  --nm-yellow-bg: #fbf3db; --nm-yellow-text: #956400;
}
```

## 폰트 (한·영 스택)

| 역할 | 스택 | 파라미터 |
|------|------|----------|
| Hero/인용 세리프 | `"Newsreader", "Gowun Batang", serif` | tracking `-0.02em`~`-0.04em` · leading `1.1` |
| Body/UI | `"Pretendard", sans-serif` | leading `1.6` (한글 우선 제품 — Pretendard가 라틴도 렌더) |
| Mono (코드/키/메타) | `"JetBrains Mono", monospace` | Geist Mono 선호 시 별도 로드 후 스택 앞에 추가 |

```css
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Gowun+Batang:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
```

라틴 본문을 별도 페어링으로 보이고 싶으면 `"Geist Sans, Pretendard, sans-serif"`처럼 라틴을 앞에.

## Visual Target

- 매크로 여백 먼저: 섹션 간 수직 패딩 `py-24`~`py-32`. 콘텐츠 폭 `max-w-4xl`~`max-w-5xl`.
- 극단적 타이포 대비(세리프 히어로 ↔ 작은 UI 텍스트)가 위계를 만든다.
- 그림자는 사실상 없음 — 필요하면 초확산 저opacity(`0 2px 8px rgba(0,0,0,0.04)` 이하).
- 섹션이 비어 보이지 않게: 초저opacity 배경 이미지, 따뜻한 radial 광점(opacity 0.03), 미니멀 기하 라인 패턴.

## 권장 패턴

- **벤토 그리드**: 비대칭 CSS Grid + 카드는 정확히 `border: 1px solid var(--nm-border)` + radius `8px`~`12px` + 내부 패딩 `24px`~`40px`.
- **CTA**: 솔리드 `#111111` 배경 + 흰 텍스트 + radius `4px`~`6px` + 그림자 없음. hover `#333333`, active `scale(0.98)`.
- **태그/뱃지**: pill + `text-xs` 대문자 + tracking `0.05em` + 파스텔 배경/텍스트 쌍.
- **아코디언(FAQ)**: 박스 제거, `border-bottom: 1px solid var(--nm-border)`만. `+`/`-` 토글.
- **키스트로크**: `<kbd>` — border 1px + radius 4px + `--nm-canvas` 배경 + 모노 폰트.
- **Faux-OS 크롬**: 소프트웨어 목업은 화이트 톱바 + 연회색 원 3개.

## 모션 기본값

- 스크롤 진입: `translateY(12px)` + `opacity: 0` → 600ms `cubic-bezier(0.16,1,0.3,1)`. IntersectionObserver만(scroll 리스너 금지).
- 카드 hover: `box-shadow 0 0 0 → 0 2px 8px rgba(0,0,0,0.04)` 200ms.
- 리스트 캐스케이드: `animation-delay: calc(var(--index) * 80ms)`.
- 배경 앰비언트(선택): 초저속 radial 블롭 1개(20s+, opacity 0.02~0.04, `position: fixed; pointer-events: none`).

## Tuning Knobs

- **온도**: `#F7F6F3`(따뜻) ↔ `#FFFFFF`(순백).
- **세리프 비중**: 히어로만 ↔ 섹션 헤딩까지.
- **파스텔 사용량**: 태그만 ↔ 아이콘 배경·인라인 코드까지.

## Avoid

- Inter/Roboto/Open Sans, 얇은 라인 아이콘(Lucide/Feather) — Phosphor(Bold/Fill)나 Radix로.
- `shadow-md` 이상 기본 그림자, 대형 요소의 원색 배경, `rounded-full` 대형 컨테이너.
- 이모지, "John Doe"/"Acme Corp"/Lorem Ipsum, AI 카피 클리셰.

## DESIGN.md 컴파일

```yaml
colors:
  primary: "#111111"
  neutral: "#F7F6F3"
  accent: "#9F2F2D"
  on-primary: "#FFFFFF"
  on-neutral: "#111111"
  border: "#EAEAEA"
  muted: "#787774"
typography:
  h1: { fontFamily: "Newsreader, Gowun Batang, serif", fontSize: 3.25rem, fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.03em" }
  body-md: { fontFamily: "Pretendard, sans-serif", fontSize: 1rem, lineHeight: 1.6 }
  label-caps: { fontFamily: "Pretendard, sans-serif", fontSize: 0.75rem, letterSpacing: "0.05em" }
rounded: { sm: 4px, md: 8px, lg: 12px }
components:
  button-primary: { backgroundColor: "{colors.primary}", textColor: "{colors.on-primary}", rounded: "{rounded.sm}" }
  card: { backgroundColor: "#FFFFFF", rounded: "{rounded.lg}", padding: 32px }
```

프리셋 근사값: VARIANCE 4 · MOTION 2 · DENSITY 3 (미니멀 프리셋 계열)
