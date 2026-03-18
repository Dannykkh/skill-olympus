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

  Phase 1: design-system-starter     → 디자인 토큰 생성
  Phase 2: frontend-design (DB 매칭) → 팔레트/폰트/스타일 선택
  Phase 3: frontend-design (구현)    → 실제 코딩
  Phase 4: ui-ux-auditor             → 8영역 감사
           web-design-guidelines     → 가이드라인 준수 체크

  보조:
  - stitch-loop                      → Stitch MCP 멀티페이지 (선택)
  - stitch-react                     → HTML → React 변환 (선택)
  - seo-audit                        → SEO/AEO/GEO 감사 (선택)
```

---

## CRITICAL: First Actions

### 1. Print Intro

```
Aphrodite(아프로디테) — 미의 여신이 디자인을 이끕니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 1 (시스템) → Phase 2 (선택) → Phase 3 (구현) → Phase 4 (리뷰)
```

### 2. 기존 디자인 자산 확인

```
📂 디자인 자산 확인:
  design-system.md:    {있음/없음} (젭마인 산출물)
  DESIGN.md:           {있음/없음} (Stitch 산출물)
  tailwind.config.*:   {있음/없음} (기존 테마)
  design-system/:      {있음/없음} (디자인 토큰)
```

**있으면**: 기존 자산을 기반으로 Phase 1 건너뜀
**없으면**: Phase 1부터 시작

---

## Phase 1: 디자인 시스템 수립

### 1-1. 스타일 질문

`frontend-design` 스킬의 프리셋을 사용자에게 제시합니다.

AskUserQuestion:

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

AskUserQuestion:

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

### 1-3. 디자인 DB 매칭

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

사용자가 선택하면 → 디자인 시스템 문서 생성.

### 1-4. 디자인 시스템 생성

`design-system-starter` 스킬을 참조하여 `design-system.md` 생성:

- 선택된 색상 팔레트 → CSS 변수 / Tailwind config
- 선택된 폰트 페어링 → Google Fonts import + font-family 정의
- 프리셋 파라미터 (VARIANCE/MOTION/DENSITY) 기록
- 간격, 라운딩, 그림자 등 기본 토큰

**출력:** `design-system.md` (프로젝트 루트 또는 `docs/`)

---

## Phase 2: 레퍼런스 수집 (선택)

AskUserQuestion:

```
question: "참고할 디자인이 있나요?"
header: "레퍼런스"
options:
  - label: "스크린샷 첨부"
    description: "Dribbble, Behance, 실제 사이트 스크린샷"
  - label: "URL 입력"
    description: "참고 사이트 URL"
  - label: "없음, AI에게 맡김"
    description: "Phase 1에서 선택한 조합으로 진행"
```

**스크린샷/URL이 있으면**: Phase 3에서 해당 레퍼런스를 참조하여 구현
**없으면**: Phase 1 디자인 시스템만으로 진행

---

## Phase 3: 구현

`frontend-design` 스킬이 자동 적용(auto_apply)되어 구현합니다.

이 Phase에서는:
- Phase 1에서 생성한 `design-system.md`를 참조
- 선택된 프리셋 파라미터 적용 (VARIANCE/MOTION/DENSITY)
- Phase 2 레퍼런스가 있으면 스타일 매칭
- `frontend-design`의 Banned Patterns(AI Slop 금지) 적용

**Stitch 프로젝트인 경우:**
- `/stitch-loop` → 멀티페이지 생성
- `/stitch-react` → React 컴포넌트 변환

---

## Phase 4: 디자인 리뷰

구현 완료 후 자동으로 2개 리뷰를 실행합니다.

### 4-1. UI/UX 감사

`ui-ux-auditor` 스킬 실행 — 8영역 자동 감사:
1. 다크모드
2. 반응형
3. 접근성
4. 로딩 상태
5. 폼 UX
6. 네비게이션
7. 타이포그래피
8. 애니메이션

### 4-2. 가이드라인 준수

`web-design-guidelines` 스킬 실행 — Web Interface Guidelines 체크

### 4-3. 결과 보고

```
📊 디자인 리뷰 결과:

  UI/UX 감사:    {통과율}% ({통과}/{전체} 항목)
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
  design-system.md    — 디자인 시스템 (색상, 폰트, 토큰)
  구현 코드           — 프리셋 + DB 매칭 적용
  리뷰 결과           — UI/UX 8영역 + 가이드라인

📎 적용된 조합:
  프리셋: {선택한 프리셋}
  색상: {팔레트명}
  폰트: {Heading} + {Body}
  스타일: {디자인 스타일}

👉 다음 단계:
  /seo-audit           → SEO 감사 (웹 프로젝트)
  /closer              → 최종 산출물 생성
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--plan-only` | Phase 1~2만 (디자인 시스템 + 레퍼런스) | false |
| `--review-only` | Phase 4만 (기존 코드 리뷰) | false |
| `--no-review` | Phase 4 건너뜀 | false |
| `--stitch` | Stitch MCP 모드로 구현 | false |

---

## 연관 스킬

| 스킬 | 역할 | Phase |
|------|------|-------|
| design-system-starter | 디자인 토큰 생성 | 1 |
| frontend-design | 미학 적용 + DB 매칭 + 구현 (auto_apply) | 2~3 |
| ui-ux-auditor | 8영역 UI/UX 감사 | 4 |
| web-design-guidelines | Web Interface Guidelines 체크 | 4 |
| stitch-loop | Stitch 멀티페이지 생성 (선택) | 3 |
| stitch-react | HTML → React 변환 (선택) | 3 |
| seo-audit | SEO/AEO/GEO 감사 (후행, 선택) | - |
| ui-ux-designer (에이전트) | 디자인 비평/조언 (필요 시) | - |

## Related Files

| 파일 | 역할 |
|------|------|
| `skills/frontend-design/SKILL.md` | 미학 가이드 + 프리셋 + Banned Patterns |
| `skills/frontend-design/references/color-palettes.csv` | 161개 색상 팔레트 |
| `skills/frontend-design/references/font-pairings.csv` | 73개 폰트 페어링 |
| `skills/frontend-design/references/design-styles.csv` | 84개 디자인 스타일 |
| `skills/design-system-starter/SKILL.md` | 디자인 토큰 생성 |
| `skills/ui-ux-auditor/SKILL.md` | UI/UX 8영역 감사 |
| `skills/web-design-guidelines/SKILL.md` | Web Interface Guidelines |
| `agents/ui-ux-designer.md` | 디자인 비평 에이전트 |
