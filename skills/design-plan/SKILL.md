---
name: design-plan
description: >
  디자인 오케스트레이터. 프론트엔드 디자인 계획 수립부터 구현, 리뷰까지
  디자인 관련 스킬을 순서대로 호출하여 일관된 디자인 품질을 보장.
  /aphrodite로 실행.
triggers:
  - "aphrodite"
  - "아프로디테"
  - "design-plan"
  - "디자인 계획"
  - "디자인 플랜"
  - "프론트 디자인"
auto_apply: false
---

# Aphrodite (아프로디테) — 디자인 오케스트레이터

> **아프로디테(Aphrodite)**: 미(美)의 여신.
> 디자인 관련 스킬을 순서대로 호출하여 일관된 디자인 품질을 보장합니다.

## Quick Start

```
/aphrodite                          # 전체 디자인 파이프라인
/aphrodite --plan-only              # 디자인 시스템만 (Phase 1~2)
/aphrodite --review-only            # 리뷰만 (Phase 4)
```

**공식 호출명:** `/aphrodite` (별칭: `아프로디테`, `디자인 계획`, `프론트 디자인`)

## 디자인 스킬 맵

```
/aphrodite가 오케스트레이션하는 스킬:

  Phase 1: 스타일 레시피 + DB 매칭    → 레시피/팔레트/폰트 선택 → DESIGN.md 생성 (YAML 토큰 + 산문 정본)
           (frontend-design/references/style-recipes/ + CSV DB + design-system-starter)
  Phase 2: 레퍼런스 자산화            → 레퍼런스 → 섹션 해부 슈퍼프롬프트 파일 (docs/design-refs/)
           (references/reference-capture-guide.md)
  Phase 3: frontend-design (구현)    → DESIGN.md 토큰 + 슈퍼프롬프트 + technique-recipes 기반 코딩
  Phase 4: design.md lint            → 기계 검증 (broken-ref/orphan/대비 4.5:1)
           ui-ux-auditor             → 9영역 감사 + 시각 검증 (스크린샷 관찰)
           web-design-guidelines     → 가이드라인 준수 체크

  보조:
  - /stitch loop                     → Stitch MCP 멀티페이지 (선택)
  - /stitch react                    → HTML → React 변환 (선택)
  - seo-audit                        → SEO/AEO/GEO 감사 (선택)
```

---

## CRITICAL: First Actions

### 1. Print Intro

```
Aphrodite(아프로디테) — 미의 여신이 디자인을 이끕니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 1 (시스템) → Phase 2 (레퍼런스 자산화·선택) → Phase 3 (구현) → Phase 4 (리뷰)
```

### 2. 기존 디자인 자산 확인

```
📂 디자인 자산 확인 (정본 우선순위):
  DESIGN.md:           {있음/없음} ★ 정본 (YAML 토큰 + 산문)
  design-tokens.json:  {있음/없음} (W3C DTCG — DESIGN.md로 흡수/파생)
  design-system.md:    {있음/없음} (구 산문 — DESIGN.md로 이관)
  tailwind.config.*:   {있음/없음} (export 파생물)
```

**DESIGN.md 있으면**: 그대로 정본 채택 → Phase 4 lint만 돌리고 Phase 1 건너뜀
**레거시(design-system.md/design-tokens.json)만 있으면**: DESIGN.md로 마이그레이션 후 진행
**없으면**: Phase 1부터 시작

> 마이그레이션·스키마·lint/export 상세: [`references/design-md-guide.md`](references/design-md-guide.md)

---

## Phase 1: 디자인 시스템 수립

### 1-1. 스타일 질문

`frontend-design` 스킬의 프리셋을 사용자에게 제시합니다.

> **옵션 4개 한도 가드 (필수)**: 프리셋은 7개지만 `AskUserQuestion`은 한 호출당 **옵션 2~4개**만 받습니다(초과 시 `Invalid tool parameters`). 구조화 도구를 쓸 땐 ① 대표 4개만 넣고 나머지는 자동 제공되는 "Other"로 받거나, ② **일반 텍스트 번호 목록(1~7)**으로 제시해 번호로 답을 받으세요. 아래 7개는 채워 넣을 **참조 목록**이지 한 번에 다 넣는 payload가 아닙니다. `header`는 12자 이내. 타입 질문(1-2)도 동일.

현재 CLI의 질문 방식:

```
question: "어떤 느낌으로 만들까요?"
header: "디자인 스타일"
options:
  - label: "깔끔하게"
    description: "정돈된 기업 사이트, 안정적인 레이아웃"
  - label: "럭셔리하게"
    description: "여백 많고 프리미엄한 느낌, 고급 브랜드"
  - label: "대담하게"
    description: "비대칭, 애니메이션, 눈에 띄는 디자인"
  - label: "미니멀하게"
    description: "차분하고 절제된, 군더더기 없는"
  - label: "대시보드"
    description: "데이터 중심, 빽빽하고 효율적"
  - label: "매거진"
    description: "에디토리얼, 사진 중심, 읽는 재미"
  - label: "직접 설정"
    description: "VARIANCE/MOTION/DENSITY 숫자로 직접 조정"
```

### 1-2. 산업/프로젝트 타입 확인

> 1-1과 동일하게 **옵션 4개 한도** 적용 — 대표 4개 + "Other" 또는 텍스트 번호 목록(아래 7개는 참조용).

현재 CLI의 질문 방식:

```
question: "어떤 종류의 서비스인가요?"
header: "프로젝트 타입"
options:
  - label: "SaaS"
  - label: "이커머스"
  - label: "대시보드/관리자"
  - label: "랜딩 페이지"
  - label: "포트폴리오/블로그"
  - label: "모바일 앱"
  - label: "기타 (직접 입력)"
```

### 1-3. 스타일 레시피 제시 (신규 — 레시피 우선 경로)

프리셋 선택 직후, [`frontend-design/references/style-recipes/index.md`](../frontend-design/references/style-recipes/index.md)의
**프리셋 → 레시피 후보 매핑**에서 레시피 2~3개를 카드로 제시합니다 (index만 읽고, 개별 레시피 파일은 선택 후에 Read):

```
📇 스타일 레시피 후보 (프리셋: 매거진):

  1. editorial-tech   — 매거진 구성 × 테크 정밀. 다크 뉴트럴 + Fraunces/Hahmlet
  2. book-serif-editorial — 책의 조판 규율. 크림 지면 + Libre Bodoni/고운바탕
  3. framed-grid-agency  — 가시적 그리드 + 프레임 라인. Space Grotesk/Pretendard
  4. 레시피 없이 CSV 매칭으로 (1-4로)
```

**레시피 선택 시**: 해당 레시피 파일의 `## DESIGN.md 컴파일` 값을 정본의 기반으로 사용하고,
1-4의 CSV 매칭은 **액센트/팔레트 변주 제안**으로 축소 (무드·대비 구조는 레시피 유지).
**레시피 미선택 시**: 아래 1-4 CSV 매칭 경로로 진행.

### 1-4. 디자인 DB 매칭

`frontend-design/references/`의 CSV 데이터에서 자동 매칭:

1. **color-palettes.csv** → 프로젝트 타입에 맞는 팔레트 3개 추천
2. **font-pairings.csv** → 스타일 키워드에 맞는 폰트 페어링 3개 추천
3. **design-styles.csv** → 프리셋에 맞는 디자인 스타일 참조

```
📎 추천 디자인 조합:

  색상 팔레트 (3개 후보):
  1. SaaS Trust Blue — Primary #2563EB + Accent #EA580C
  2. Micro SaaS Indigo — Primary #6366F1 + Accent #059669
  3. SaaS Enterprise — Primary #0F172A + Accent #3B82F6

  폰트 페어링 (3개 후보):
  1. Modern Professional — Poppins + Open Sans
  2. Tech Startup — Space Grotesk + DM Sans
  3. Clean Corporate — Outfit + Inter

  디자인 스타일: Minimalism & Swiss Style
```

각 색상/폰트 조합을 가중 루브릭으로 채점합니다: 명도대비(contrast) 40% · 브랜드 적합성(brand-fit) 35% · 접근성(accessibility) 25%, 각 1~5점에 한 줄 근거. 후보별 가중 합계를 점수표로 제시합니다.

> 채점 없이 후보만 나열 금지 — 사용자가 감으로 고르도록 떠넘기지 말고 점수를 함께 보여줍니다. 최종 선택권은 사용자에게 있되, 점수와 추천을 근거로 제시합니다.

사용자가 선택하면 → 디자인 시스템 문서 생성.

### 1-5. DESIGN.md 생성 (정본)

Phase 1에서 **선택된** 레시피/팔레트/폰트를 [`references/design-md-guide.md`](references/design-md-guide.md) 스키마에 따라 `DESIGN.md`로 박습니다 (값을 지어내지 말고 레시피의 `## DESIGN.md 컴파일` 또는 CSV에서 고른 값 그대로):

- 선택된 **색상 팔레트**(color-palettes.csv) → `colors:` (Primary/Accent/Neutral + `on-*` 전경색 — 대비 짝꿍 명시해야 lint contrast 동작)
- 선택된 **폰트 페어링**(font-pairings.csv) → `typography:` (heading/body/label, `fontFamily`+`fontSize` 필수)
  - **한글 UI 폰트 (필수)**: ① **먼저 한글 전용 페어링을 픽한다** — `font-pairings.csv`의 한글 행(#74-82: Hahmlet/Noto Serif KR/Gowun Batang 헤딩 + Pretendard/Noto Sans KR/Nanum Gothic 본문 등)은 한글·라틴 글리프를 모두 가져 폴백 함정을 **구조적으로 회피**(권장 경로). ② 굳이 라틴 페어링(Space Grotesk 등)을 쓸 때만 **Pretendard를 정본 스택에 함께 박는다** — 라틴엔 한글 글리프가 없어 라틴 단일값만 적으면 Phase 3의 "토큰 그대로 사용"이 전파돼 한글이 시스템 폴백된다(gotcha 041). 이때 `fontFamily`는 **스택**으로 — 예: `"Space Grotesk, Pretendard, sans-serif"`(헤딩), `"Pretendard, DM Sans, sans-serif"`(본문). 개성 한글 폰트는 눈누(noonnu.cc). 라틴 전용 데모만 단일값 허용.
- 프리셋(VARIANCE/MOTION/DENSITY) + 간격/라운드 → `spacing:` / `rounded:`
- 핵심 컴포넌트(button/card/input) → `components:` (토큰 중괄호 참조 `"{colors.primary}"`)
- 채점 근거·선택 이유 → 산문 `##` 섹션 (왜 이 값인지)

> 상세 스케일 토큰이 필요하면 `design-system-starter`의 `design-tokens.json`을 병행하되 **정본은 DESIGN.md** (DTCG는 `export --format dtcg`로도 파생).

**출력:** `DESIGN.md` (프로젝트 루트)

---

## Phase 2: 레퍼런스 자산화 (선택)

레퍼런스를 "첨부하고 끝"이 아니라 **재사용 가능한 슈퍼프롬프트 파일**로 변환합니다.
절차·템플릿 상세: [`references/reference-capture-guide.md`](references/reference-capture-guide.md)

현재 CLI의 질문 방식:

```
question: "참고할 디자인이 있나요?"
header: "레퍼런스"
options:
  - label: "스크린샷 첨부"
    description: "Dribbble, Behance, 실제 사이트 스크린샷"
  - label: "URL 입력"
    description: "참고 사이트 URL (라이브 캡처 후 분석)"
  - label: "영상/HTML"
    description: "화면 녹화 또는 HTML 소스"
  - label: "없음, AI에게 맡김"
    description: "Phase 1에서 선택한 조합으로 진행"
```

**레퍼런스가 있으면** (유형별 절차는 가이드 §1):

1. **증거 확보** — URL이면 Playwright MCP로 warm scroll → 뷰포트 단위 캡처(정지마다 2초 정착 대기). 영상이면 ffprobe/ffmpeg 프레임 추출. HTML이면 인터랙션 키워드 grep(소스가 진실).
2. **섹션 해부** — 모든 가시적 섹션을 순서대로 Purpose/Layout/Visual/Animation/Interaction/Scroll/Implementation notes로 분해. 모션 메커니즘은 정확히 명명(pinned/scrubbed/parallax/masked reveal 등).
3. **슈퍼프롬프트 저장** — `docs/design-refs/YYYY-MM-DD-{slug}.md` (가이드 §2 템플릿). 첫 줄에 **영감 각색 vs 정확 재현** 모드 명시.

> **경계**: 레퍼런스에서 가져오는 것은 구조·위계·모션·페이싱. 색·폰트의 정본은 DESIGN.md 토큰
> (정확 재현 모드에서만 예외 — 이때 값을 DESIGN.md에 역반영).

**없으면**: Phase 1 디자인 시스템만으로 진행 (스킵해도 파이프라인 정상)

---

## Phase 3: 구현 (외관 한정 — 디자이너의 경계)

`frontend-design` 스킬이 자동 적용(auto_apply)되어 구현합니다.

**아프로디테의 구현 범위는 "외관"입니다:**

| 담당 (아프로디테) | 범위 밖 (포세이돈/다이달로스 몫) |
|------------------|--------------------------------|
| 디자인 토큰, 레이아웃/마크업 | 상태 관리, 데이터 페칭 |
| 스타일 (Tailwind/CSS), 컴포넌트 외관 | API 연동, 비즈니스 로직 |
| 호버·트랜지션 등 비주얼 인터랙션 | 라우팅 설계, 백엔드 |

- **파이프라인 모드** (포세이돈 구현 후): 기존 기능 코드에 디자인 시스템을 입히고 정교화. **로직 변경 금지** — 스타일·마크업·비주얼 인터랙션만 수정
- **단독 모드** (처음부터 UI 생성): 정적 컴포넌트/페이지까지 생성하되, 데이터·로직이 필요한 부분은 mock + `TODO(기능)` 주석으로 남기고 포세이돈/다이달로스에 인계

이 Phase에서는:
- Phase 1에서 생성한 `DESIGN.md`의 토큰을 참조 (색·타이포·간격·라운드를 그대로 사용 — 새 값 발명 금지)
- Phase 1에서 레시피를 골랐으면 해당 스타일 레시피 파일의 패턴/Avoid를 함께 참조
- 선택된 프리셋 파라미터 적용 (VARIANCE/MOTION/DENSITY)
- Phase 2 슈퍼프롬프트(`docs/design-refs/*.md`)가 있으면 **구조·모션의 스펙**으로 사용 — 충돌 시 DESIGN.md 토큰이 우선
- 그림자·blur·보더 그라데이션·텍스트 리빌 등 디테일은 [`frontend-design/references/technique-recipes.md`](../frontend-design/references/technique-recipes.md)의 검증된 값으로
- `frontend-design`의 Banned Patterns(AI Slop 금지) 적용

**구현 지시 스켈레톤 (섹션/컴포넌트 단위 작업 지시 시):**

에이전트/서브태스크에 구현을 지시할 때는 소원("예쁘게")이 아니라 디자인 시스템처럼 지시합니다:

```
GOAL     — 무엇을, 누구를 위해, 성공 기준
LAYOUT   — 그리드/배치/위계 (H1 → 서브 → 본문 → CTA)
TYPE     — DESIGN.md typography 토큰 지정
COLOR    — DESIGN.md colors 토큰 지정 (액센트 1개)
COPY     — 실제 렌더할 문구 그대로 (placeholder 금지)
CONSTRAINTS — 변경 금지 항목 명시
NEGATIVE — 하지 말 것 (레시피 Avoid + Banned Patterns에서)
```

**반복 규율 (variants > rerolls)**: 첫 결과에서 레이아웃+위계+카피를 먼저 고정하고,
이후 수정은 **한 번에 변수 1~2개만** 바꿉니다(액센트/배경 톤/카드 배치/크롭). 전체 재생성 금지 —
"다른 건 바꾸지 마" / "히어로는 유지"를 지시에 명시해 이미 잘 된 부분의 파괴를 방지합니다.

**Stitch 프로젝트인 경우:**
- `/stitch loop` → 멀티페이지 생성
- `/stitch react` → React 컴포넌트 변환

---

## Phase 4: 디자인 리뷰

구현 완료 후 자동으로 lint 게이트 + 2개 리뷰를 실행합니다.

### 4-0. DESIGN.md lint (기계 검증 — 대화형 best-effort)

토큰 계약(참조 무결성·대비)을 기계로 검증합니다. **단 `@google/design.md@0.3.0`은 TTY 전용**이라 헤드리스(에이전트/CI)에선 무출력·exit 0으로 no-op됨(실측) — 사람이 터미널에서 돌릴 때만 신호를 줍니다.

```bash
npx @google/design.md lint DESIGN.md      # macOS/Linux
designmd lint DESIGN.md                    # Windows 별칭
```

- **broken-ref**(없는 토큰 참조) / **orphaned-tokens**(고아 색) / **contrast-ratio**(컴포넌트 bg/text 쌍 WCAG AA 4.5:1 미달)
- **graceful fallback (필수)**: npx/네트워크 실패 **또는 헤드리스 무출력** 시 lint를 **건너뛰고** 보고에 `lint: 건너뜀` 표기 — 파이프라인 안 막음. **헤드리스 자동 enforcement는 lint가 아니라 ui-ux-auditor의 대비/시각 검증이 담당** (상세·재평가 조건은 [`references/design-md-guide.md`](references/design-md-guide.md)).
- lint FAIL 항목(대화형에서 잡힌 경우)은 확인 없이 바로 DESIGN.md 토큰 수정 → 재실행.

**export (선택):** `npx @google/design.md export --format tailwind DESIGN.md` → Tailwind 테마, `--format dtcg` → `design-tokens.json`.

상세: [`references/design-md-guide.md`](references/design-md-guide.md)

### 4-1. UI/UX 감사

`ui-ux-auditor` 스킬 실행 — **9영역 자동 감사 + 시각 검증 + 0-10 채점**:

> **시각 검증 필수**: Grep 정적 스캔은 1차 신호일 뿐, dev server를 띄워 스크린샷
> (데스크톱/모바일 × 라이트/다크)을 찍고 **렌더링된 화면을 직접 보고** 채점합니다.
> 관찰과 코드 추정이 충돌하면 관찰이 이깁니다. 서버 구동 불가 시에만 정적 스캔으로
> 폴백하며 등급에 `*`(신뢰도 제한)를 표기합니다.
1. 다크모드
2. 반응형
3. 접근성
4. 로딩 상태
5. 폼 UX
6. 네비게이션
7. 타이포그래피
8. 애니메이션
9. **AI Slop 탐지** (공유 블랙리스트 기반 — `frontend-design/references/ai-slop-blacklist.md`)

**채점**: 영역별 0-10 + 가중 총점 → A~F 등급

### 4-2. 가이드라인 준수

`web-design-guidelines` 스킬 실행 — Web Interface Guidelines 체크

### 4-3. 결과 보고

```
📊 디자인 리뷰 결과:

  UI/UX 감사:    총점 {X.X}/10 (등급: {A~F})
    다크모드: {N}/10 | 반응형: {N}/10 | 접근성: {N}/10
    로딩: {N}/10 | 폼UX: {N}/10 | 네비: {N}/10
    타이포: {N}/10 | 애니: {N}/10 | AI Slop: {N}/10
  가이드라인:    {통과율}% ({통과}/{전체} 항목)

  ⚠️ 수정 필요:
  - {항목 1}: {문제} → {수정 방법}
  - {항목 2}: {문제} → {수정 방법}
```

**수정 필요한 항목이 있으면**: 확인 없이 바로 수정 → 재검증

---

## 완료 안내

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Aphrodite 완료! 미의 여신이 승인합니다.

📁 산출물:
  DESIGN.md           — 디자인 정본 (YAML 토큰 + 산문 근거)
  docs/design-refs/   — 레퍼런스 슈퍼프롬프트 (Phase 2 진행 시)
  구현 코드           — DESIGN.md 토큰 + 레시피/DB 매칭 적용
  리뷰 결과           — design.md lint + UI/UX 9영역 + 0-10 채점 + 가이드라인

📎 적용된 조합:
  프리셋: {선택한 프리셋}
  레시피: {스타일 레시피명 또는 "CSV 매칭"}
  색상: {팔레트명}
  폰트: {Heading} + {Body}
  스타일: {디자인 스타일}

👉 다음 단계:
  /seo-audit           → SEO 감사 (웹 프로젝트)
  /clio              → 최종 산출물 생성
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--plan-only` | Phase 1~2만 (디자인 시스템 + 레퍼런스) | false |
| `--review-only` | Phase 4만 (기존 코드 리뷰) | false |
| `--no-review` | Phase 4 건너뜀 | false |
| `--no-lint` | Phase 4의 design.md lint 건너뜀 | false |
| `--export` | DESIGN.md → Tailwind/DTCG export 생성 | false |
| `--stitch` | Stitch MCP 모드로 구현 | false |

---

## 연관 스킬

| 스킬 | 역할 | Phase |
|------|------|-------|
| design-system-starter | DESIGN.md 토큰층 보강 + DTCG 파생 | 1 |
| frontend-design | 미학 적용 + 레시피/DB 매칭 + 구현 (auto_apply) | 1~3 |
| design.md lint | DESIGN.md 토큰 계약 기계 검증 (broken-ref/orphan/대비) | 4 |
| ui-ux-auditor | 9영역 UI/UX 감사 + 시각 검증(스크린샷) | 4 |
| web-design-guidelines | Web Interface Guidelines 체크 | 4 |
| stitch (design 모드) | DESIGN.md ↔ Stitch 화면 양방향 (같은 스키마 공유) | 1·3 |
| stitch (loop 모드) | Stitch 멀티페이지 생성 (선택) | 3 |
| stitch (react 모드) | HTML → React 변환 (선택) | 3 |
| seo-audit | SEO/AEO/GEO 감사 (후행, 선택) | - |
| ui-ux-designer (에이전트) | 디자인 비평/조언 (필요 시) | - |

## Related Files

| 파일 | 역할 |
|------|------|
| `skills/frontend-design/SKILL.md` | 미학 가이드 + 프리셋 + Banned Patterns |
| `skills/frontend-design/references/style-recipes/index.md` | 스타일 레시피 12종 카탈로그 + 프리셋 매핑 (Phase 1) |
| `skills/frontend-design/references/technique-recipes.md` | 그림자/blur/보더/리빌/모션 복붙 레시피 (Phase 3) |
| `skills/frontend-design/references/color-palettes.csv` | 161개 색상 팔레트 |
| `skills/frontend-design/references/font-pairings.csv` | 84개 폰트 페어링 |
| `skills/frontend-design/references/design-styles.csv` | 84개 디자인 스타일 |
| `skills/design-plan/references/design-md-guide.md` | DESIGN.md 정본 스키마 + lint/export + 마이그레이션 |
| `skills/design-plan/references/reference-capture-guide.md` | 레퍼런스 자산화 절차 + 슈퍼프롬프트 템플릿 (Phase 2) |
| `skills/design-system-starter/SKILL.md` | 디자인 토큰 생성 (DTCG 파생) |
| `skills/ui-ux-auditor/SKILL.md` | UI/UX 9영역 감사 + 시각 검증 |
| `skills/web-design-guidelines/SKILL.md` | Web Interface Guidelines |
| `agents/ui-ux-designer.md` | 디자인 비평 에이전트 |
