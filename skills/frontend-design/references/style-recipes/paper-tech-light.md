# 페이퍼 테크니컬 라이트 (paper-tech-light)

> 따뜻한 오프화이트 "종이" 위의 테크니컬 문서 감각 — 잉크 타이포 + 모노 라벨 + 오렌지 시그널 1색.
> Credits: MengTo/Skills(MIT) `light-mode-paper-technical`+`orange-clean-paper-saas` 결합 각색 — 원본에 없던 hex/폰트 바인딩.

## 정체성 (경계 선언)

- **이것**: 크림/파치먼트 표면 + 낮은 대비 보더 + 오렌지가 스텝·버튼·active의 시그널 색인 SaaS.
- **이것이 아님**: 차가운 순백 SaaS 아님(스타크 화이트+콜드 그레이 금지). 순수 종이 문서 시스템도 아님 — 제품 UI의 정밀함 유지.

## 토큰

```css
:root {
  --pt-bg: #faf7f2;            /* 따뜻한 오프화이트 */
  --pt-surface: #f5f1e8;       /* 파치먼트/페일 스톤 */
  --pt-card: #fffdf9;
  --pt-ink: #1c1917;           /* 잉크 (순흑 금지) */
  --pt-copy: #57534e;
  --pt-line: rgba(28, 25, 23, 0.12);
  --pt-line-strong: rgba(28, 25, 23, 0.24);
  --pt-accent: #ea580c;        /* 오렌지 시그널 — 아이콘·라인·대형 타이포·active 표시 (흰 텍스트와 3.5:1 — 본문 텍스트 배경 금지) */
  --pt-accent-strong: #c2410c; /* 버튼 배경용 — 흰 텍스트와 5.1:1 (WCAG AA 통과) */
  --pt-on-accent: #fffdf9;
  --pt-accent-soft: #ffedd5;   /* 오렌지 워시 (뱃지/하이라이트 배경) */
}
```

## 폰트 (한·영 스택)

| 역할 | 스택 |
|------|------|
| Heading | `"Space Grotesk", "Pretendard", sans-serif` |
| Body | `"Pretendard", sans-serif` |
| Label/Step | `"JetBrains Mono", "IBM Plex Sans KR", monospace` |

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=IBM+Plex+Sans+KR:wght@400;500&display=swap');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
```

## Visual Target

- 레이어드 뉴트럴: `--pt-bg` 페이지 → `--pt-surface` 섹션 → `--pt-card` 카드의 3단 온도.
- 보더는 항상 저대비(`--pt-line`) — 구분은 색이 아니라 지면의 층위로.
- 모노 라벨(`01`, `STEP 02`, `v2.4`)이 문서의 각주처럼 흩어져 기술적 신뢰를 만든다.
- 오렌지는 "지금 여기"를 가리키는 시그널 — 현재 스텝, primary 버튼, active 탭, 링크 hover.

## 권장 패턴

- **히어로**: 좌측 정렬 헤드라인 + 모노 오버라인(`GUIDE / 01`) + 오렌지 CTA 1개 (버튼 배경은 `--pt-accent-strong` — `--pt-accent`+흰 텍스트는 대비 미달).
- **스텝 플로우**: 번호 모노 마커 + 가는 커넥터 라인 + 현재 스텝만 오렌지.
- **카드**: `--pt-card` 배경 + 1px `--pt-line` 보더 + radius 10px + 그림자 최소(technique-recipes §1 sm 이하).
- **구분**: 카드 남발 대신 `border-t`/`divide-y` + 여백.
- **테이블/스펙**: 모노 숫자 + 로우 보더만 — 기술 문서처럼.

## 모션 기본값

- 절제: fade-up 리빌(0.6s, cubic-bezier(0.16,1,0.3,1)), 스텝 마커 순차 등장(stagger 80ms).
- hover: 보더 `--pt-line` → `--pt-line-strong` + 오렌지 언더라인 확장.

## Tuning Knobs

- **종이 온도**: `#FAF7F2`(웜) ↔ `#F8F7F4`(중성).
- **오렌지 강도**: `#EA580C`(기본) ↔ `#C2410C`(차분) ↔ `#F97316`(밝게).
- **테크니컬 밀도**: 모노 라벨/스펙 표 양.

## Avoid

- 스타크 화이트 배경 + 차가운 그레이 보더.
- 오렌지를 대면적 배경으로 (시그널이 소음이 된다).
- 두꺼운 그림자·글래스 — 종이는 떠 있지 않는다.
- 제네릭 스타트업 그라데이션.

## DESIGN.md 컴파일

```yaml
colors:
  primary: "#1C1917"
  neutral: "#FAF7F2"
  accent: "#EA580C"           # 시그널 전용 (흰 텍스트와 3.5:1 — 텍스트 배경 금지)
  accent-strong: "#C2410C"    # 버튼 배경 (on-accent와 5.1:1)
  on-primary: "#FFFDF9"
  on-accent: "#FFFDF9"
  on-neutral: "#1C1917"
  copy: "#57534E"
typography:
  h1: { fontFamily: "Space Grotesk, Pretendard, sans-serif", fontSize: 3.25rem, fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.02em" }
  body-md: { fontFamily: "Pretendard, sans-serif", fontSize: 1rem, lineHeight: 1.65 }
  label-mono: { fontFamily: "JetBrains Mono, IBM Plex Sans KR, monospace", fontSize: 0.75rem, letterSpacing: "0.08em" }
rounded: { sm: 6px, md: 10px, lg: 14px }
components:
  button-primary: { backgroundColor: "{colors.accent-strong}", textColor: "{colors.on-accent}", rounded: "{rounded.md}" }
  card: { backgroundColor: "#FFFDF9", rounded: "{rounded.md}", padding: 28px }
```

프리셋 근사값: VARIANCE 4 · MOTION 3 · DENSITY 5 (깔끔 프리셋 계열)
