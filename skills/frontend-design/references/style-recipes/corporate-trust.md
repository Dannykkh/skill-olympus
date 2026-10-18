# 신뢰 우선 엔터프라이즈 (corporate-trust)

> 흰 지면 + 딥 블루 1색 + 정밀한 표 + 거의 없는 모션 — 아무도 놀라지 않아서 선택되는 화면.
> Credits: [madebymustafa/design-taste](https://github.com/madebymustafa/design-taste)(MIT) `corporate-trust`(`c4a6bff`) 각색 — 팔레트 hex와 H1 상한 2.8rem은 원본 값.
> 한글 폰트 스택, 한국 신뢰 신호(인증·가격·푸터), 컨트롤 경계 대비 토큰, KRDS 경계는 이 레포에서 추가.
> 상태: 초안(2026-10-18) — 프리셋 후보 풀에는 조건부로만 등록.

## 정체성 (경계 선언)

- **이것**: 결정이 신뢰에 달린 청중(규제 산업·B2B 구매 위원회·공공 대상 납품)을 위한 의도된 절제.
  **근거가 장식이다** — 표·출처 줄·인증 칩이 시각 정체성을 만든다.
- **이것이 아님**: notion-minimal(따뜻한 문서형 모노크롬·세리프 히어로)이 아님 — 여기는 차가운 흰 지면에 세리프 0.
  tech-green-dark(상태 신호 다크)도 아님 — 마케팅 지면의 다크 히어로 금지.
  "무난한 SaaS 템플릿"도 아님 — 근거 없는 주장·사람 일러스트·그라데이션 블롭이 하나라도 있으면 이 레시피가 아니다.
- **적용 범위**: 민간 B2B·핀테크·의료·보안 제품, 공공기관에 납품하는 제품의 소개·도입 화면.
  **공공기관 사이트 자체는 이 레시피가 아니라 [KRDS](https://krds.go.kr/)가 정본**이다
  (KRDS 디자인 자산은 Pretendard GOV 서체를 요구 — 2026-10-18 krds.go.kr 확인).
- **타이포 근거**: 시스템 계열 서체와 Pretendard 중간 굵기 디스플레이는 `frontend-design/SKILL.md`
  Typography의 **신뢰 우선 예외**로 허용된다. DESIGN.md Typography에 선택 이유를 적는다.
- **근거가 없으면 고르지 않는다**: 실제 수치·인증·도입 사례가 없는 제품에 이 레시피를 쓰면 빈 템플릿만 남는다.

## 토큰

```css
:root {
  --ct-page: #ffffff;           /* 마케팅 지면 — 순백 */
  --ct-panel: #f8fafc;          /* 패널·표 헤더 */
  --ct-inset: #f1f5f9;          /* hover 행·인셋 */
  --ct-ink: #0f1722;            /* 헤딩·핵심 수치 — page 18.0:1 */
  --ct-body: #3b4657;           /* 본문 — page 9.6:1 */
  --ct-muted: #5b6777;          /* 라벨·보조 — page 5.8:1, inset 5.3:1 */
  --ct-border: #e1e7ef;         /* 구분선·카드 테두리 전용 (1.2:1 — 장식선) */
  --ct-border-strong: #c7d0dc;  /* 카드 hover·표 외곽·인증 칩 */
  --ct-border-control: #7f8a9b; /* 입력·체크박스 경계 — page 3.5:1, inset 3.2:1 (WCAG 1.4.11) */
  --ct-accent: #1f4fe0;         /* 유일한 액센트 — page 6.5:1 */
  --ct-accent-hover: #1a41bc;   /* 흰 글자 8.3:1 */
  --ct-on-accent: #ffffff;      /* 액센트 위 텍스트 — 6.5:1 */
  --ct-success: #0e7f4b;        /* 상태 전용 — page 5.1:1 */
  --ct-danger: #c0362c;         /* 상태 전용 — page 5.5:1 */
}
```

- 표면은 톤 3단(page → panel → inset)과 1px 선으로만 나눈다. 그림자는 기본 없음, 필요하면 `0 1px 2px rgba(15,23,34,0.06)`이 상한.
- `--ct-border`는 장식선이라 **컨트롤 경계에 쓰지 않는다** — 입력·체크박스·셀렉트는 `--ct-border-control`.
  원본에는 없던 토큰이다(원본 보더 1.2:1로는 입력 필드 경계가 WCAG 1.4.11의 3:1에 못 미친다).
- 액센트는 뷰포트당 주 버튼 1개·링크·활성 상태·강조 표식 1개에만. 성공·위험색은 상태 의미로만 쓰고 장식에 쓰지 않는다.

## 폰트 (한·영 스택)

| 역할 | 스택 | 파라미터 |
|------|------|----------|
| Display/헤딩 | `"Pretendard Variable", Pretendard, system-ui, -apple-system, "Segoe UI", sans-serif` | weight `600` · H1 `clamp(1.75rem, 1.25rem + 2vw, 2.75rem)`(상한 2.8rem) · tracking `-0.02em` · leading `1.3` |
| Body/UI | 같은 스택 | `1rem` · weight `400` · leading `1.7` |
| Label/메타 | 같은 스택 | `0.8125rem`(13px) · weight `500` · `--ct-muted` |
| 숫자(표·가격·지표) | 같은 스택 + `font-variant-numeric: tabular-nums` | 표의 숫자 열은 오른쪽 정렬 |

```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
:root { --ct-font: "Pretendard Variable", Pretendard, system-ui, -apple-system, "Segoe UI", sans-serif; }
body { font-family: var(--ct-font); word-break: keep-all; overflow-wrap: break-word; }
```

- **family 이름 주의**: 위 가변 CSS가 정의하는 이름은 `"Pretendard Variable"` 하나뿐이다. `"Pretendard"`만 적으면
  로컬에 설치되지 않은 기기에서 한글이 시스템 고딕으로 대체된다(2026-10-18 실측: 같은 문장 폭 446.8px = 맑은 고딕, 389.3px = Pretendard Variable).
  스택의 `Pretendard`는 정적 Pretendard가 로컬에 설치된 경우를 위한 것이다.
- 라틴도 Pretendard(Inter 기반 라틴 글리프)로 렌더된다 — 의도된 선택이다. 라틴 전용 폰트를 뒤에 붙이면 로드되지 않는 죽은 폰트가 된다(`design-md-guide.md` 스택 순서 규칙).
- `word-break: keep-all`로 한글 어절 중간 줄바꿈을 막는다. 굵기는 400·500·600 세 가지까지. 세리프·이탤릭·대문자 헤더·12px 미만 텍스트(법적 고지 포함) 없음.

## Visual Target

- **기본 레이아웃이 정답**: 왼쪽 정렬 히어로, 12열 그리드, 비교 표, 데이터 표, 완결된 푸터. 조달 위원회가 "안전한 선택"으로 읽는 화면.
- 콘텐츠 폭 `max-width: 1200px`, 섹션 간격 `96px`(모바일 `64px`).
- **근거가 장식**: 고객사 로고(회색조, 6개 이하), 출처 줄이 붙은 지표, 인증 칩(텍스트), 이름·직함·회사가 붙은 인용.
- **표가 시그니처 컴포넌트**: 1px `--ct-border` 행선, 헤더 13px weight 500 `--ct-muted` 왼쪽 정렬, 행 14~15px,
  숫자 오른쪽 정렬 + `tabular-nums`, hover 행 `--ct-panel`.

### SKILL.md 지침의 비적용·재해석 (이 레시피에서만)

| 지침 | 이 레시피에서 | 이유 |
|------|---------------|------|
| Backgrounds — atmosphere, technique-recipes §11-A 그레인·§11-B 메시 | **적용 안 함**. 깊이는 표면 톤 3단과 1px 선으로만 | 장식 자체가 신뢰를 깎는 장르 |
| Layout — 3열 카드 반복 금지 | 기능은 **2열 교차 행** 또는 **기능 표**로. 3열 카드 그리드를 쓰지 않는다 | 원본은 3열을 허용하지만 우리 금지 규칙을 따른다 |
| §11-C 강조 이탈 | 추천 요금제 1개, 비교 표의 자사 열 1개로 충족 | 강조도 근거(추천 이유)가 있어야 한다 |
| §11-D 지속 비대칭 | 히어로의 7:5 분할(텍스트 7 / 근거 패널 5)을 보안·도입 근거 섹션에서 5:7로 재사용 | 균등 그리드로만 복귀하지 않는다 |
| §11-E 지루함 테스트 | 이 제품의 실제 수치·인증·도입 사례로 채운 **근거 표**가 "이 제품이 아니면 나올 수 없는 배치" | 근거가 곧 차별점 — 근거가 없으면 이 레시피를 고르지 않는다 |

## 권장 패턴

- **히어로**: eyebrow(13px, `--ct-accent` 또는 muted) → H1(2.8rem 이하) → 한 줄 서브 → 주 버튼 1 + 보조 버튼 1(아웃라인)
  → 오른쪽에 테두리 있는 제품·지표 패널. 근거 없는 주장과 히어로 연출 없음.
- **증거 띠**: 회색조 로고 6개 이하 → 지표 3개(숫자 + 무엇을 쟀는지 + 출처 줄 "고객사 2,400곳 기준, 2025.12").
  수치의 상태는 Experience Contract의 Content Integrity가 정한다 — verified가 아니면 싣지 않는다.
- **인증 칩**: 텍스트 칩(`1px solid var(--ct-border-strong)`, radius `4px`, 13px weight 500).
  ISMS-P · CSAP(클라우드 보안인증) · GS인증 · ISO/IEC 27001 중 **실제 보유하고 verified인 것만**. 로고 이미지 대신 텍스트로 쓴다.
  결정 지점(가격 표·문의 폼 옆)에 두고, 푸터에만 묻지 않는다.
- **가격**: 카드보다 **테두리 표**. 금액은 `월 29,000원`처럼 원 단위 + `(VAT 별도)`/`(VAT 포함)`을 명시하고, 연간 결제 할인은 조건과 함께 적는다.
  추천 요금제 1개만 `--ct-accent` 테두리. 모바일은 추천 요금제를 맨 앞에 쌓거나, 가로 스크롤 + 스크롤 안내로 바꾼다.
- **카드**: 1px `--ct-border`, radius `8px`, 헤더 + 본문 + (선택)푸터. hover는 테두리만 `--ct-border-strong`, 들어올림 없음. pill은 상태 태그에만.
- **폼**: 라벨은 필드 위, 입력 경계 `--ct-border-control`, 포커스 링 `--ct-accent` 2px. 오류는 필드 바로 아래에 "무엇 + 고치는 법" 한 문장.
  도입 문의 폼 필드는 최소(이름·회사·업무 이메일·문의 내용).
- **카피**: 한 페이지 한 어조 — 주장·설명은 합니다체. 버튼은 명사형 동작("도입 문의", "데모 신청", "무료로 시작").
  최상급은 근거가 붙을 때만 — "금융권 도입 1위"가 아니라 "국내 은행 12곳 도입(2025.12 기준)".
- **날짜·숫자**: `2025.12.31` 형식, 천 단위 쉼표, 정밀한 수치("가용성 99.9% SLA").
- **푸터(완결)**: 제품·회사·자료·법적 고지 열 + 상호·대표자·사업자등록번호·주소·연락처 + 인증 칩.
  사업자등록번호·전화번호는 항목마다 `white-space: nowrap` — 하이픈에서 끊기면 번호가 두 줄로 갈린다(390px 실측).
  **개인정보처리방침** 링크는 다른 링크와 구분되게 굵게 표시한다(국내 관행 — 법적 요건 여부는 `/themis` 또는 법무 확인).
  처리방침 본문은 `/themis`로 코드 근거 기반 작성한다.

## 모션 기본값

- hover: 배경·테두리 색만 120~150ms, 이동 없음.
- 등장: 섹션 순차 등장 1회(200ms, `translateY(6px)`, stagger 없음) **또는 없음** — 없는 쪽도 정답.
- 스크롤 애니메이션·패럴랙스·자동 캐러셀·숫자 카운트업·지표 펄스 없음. `prefers-reduced-motion: reduce`에서는 등장도 끈다.

## Tuning Knobs

- **액센트**: 딥 블루 `#1F4FE0`(6.5:1) ↔ 네이비 `#1E3A8A`(10.4:1, 보수적 금융) ↔ 의료 틸 `#0F766E`(5.5:1). 브랜드색으로 바꾸면 흰 지면·inset 위 4.5:1을 다시 잰다.
- **서체**: Pretendard Variable(기본) ↔ IBM Plex Sans KR(`font-pairings.csv` #83, 기술 엔터프라이즈 톤)
  ↔ Pretendard GOV(공공 대상 납품에서 KRDS 서체와 맞출 때 — `pretendard@v1.3.9/dist/web/static/pretendard-gov-dynamic-subset.min.css`, family `"Pretendard GOV"`).
- **밀도**: 마케팅(섹션 96px) ↔ 제품 화면(섹션 48px, 표 행 높이 40px).
- **등장 모션**: 순차 등장 1회 ↔ 없음.

## Avoid

- 그라데이션, 흐린 큰 그림자, 마케팅 지면의 다크 히어로, 사람 일러스트·그라데이션 블롭, 이모지.
- 세리프·대문자·2.8rem 초과 헤드라인, 12px 미만 텍스트, 네 가지 이상 굵기.
- 뷰포트당 액센트 2개 이상, 의미 없는 색, 3열 카드 반복.
- 출처 없는 주장·수치, 보유하지 않은 인증 표기, "John Doe"/"Acme Corp"/Lorem Ipsum.
- 숫자 왼쪽 정렬 표, 지표 카운트업·펄스, 자동 캐러셀.
- 조달 위원회가 고개를 갸웃할 레이아웃.

## DESIGN.md 컴파일

```yaml
colors:
  primary: "#1F4FE0"
  on-primary: "#FFFFFF"
  neutral: "#FFFFFF"
  on-neutral: "#0F1722"
  surface: "#F8FAFC"
  on-surface: "#3B4657"
  muted: "#5B6777"
  border: "#E1E7EF"
  border-control: "#7F8A9B"
  success: "#0E7F4B"
  danger: "#C0362C"
typography:
  h1: { fontFamily: "Pretendard Variable, Pretendard, system-ui, sans-serif", fontSize: 2.75rem, fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.02em" }
  body-md: { fontFamily: "Pretendard Variable, Pretendard, system-ui, sans-serif", fontSize: 1rem, fontWeight: 400, lineHeight: 1.7 }
  label: { fontFamily: "Pretendard Variable, Pretendard, system-ui, sans-serif", fontSize: 0.8125rem, fontWeight: 500 }
  data: { fontFamily: "Pretendard Variable, Pretendard, system-ui, sans-serif", fontSize: 0.875rem, fontWeight: 400, fontFeature: "tnum" }
rounded: { sm: 4px, md: 8px }
components:
  page: { backgroundColor: "{colors.neutral}", textColor: "{colors.on-neutral}" }
  button-primary: { backgroundColor: "{colors.primary}", textColor: "{colors.on-primary}", rounded: "{rounded.sm}", padding: 12px }
  panel: { backgroundColor: "{colors.surface}", textColor: "{colors.on-surface}", rounded: "{rounded.md}", padding: 24px }
  label: { backgroundColor: "{colors.neutral}", textColor: "{colors.muted}", typography: "{typography.label}" }
  status-success: { backgroundColor: "{colors.neutral}", textColor: "{colors.success}" }
  status-danger: { backgroundColor: "{colors.neutral}", textColor: "{colors.danger}" }
  divider: { backgroundColor: "{colors.border}" }              # 1px 구분선
  control-outline: { backgroundColor: "{colors.border-control}" } # 입력 경계 1px — 텍스트 배경 금지
```

프리셋 근사값: VARIANCE 2 · MOTION 1 · DENSITY 5 (깔끔하게·대시보드 프리셋의 신뢰 우선 조건부 후보)
