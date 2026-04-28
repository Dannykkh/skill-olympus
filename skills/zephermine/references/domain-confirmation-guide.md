# Domain Expert Confirmation Guide

Step 11 — 도메인 전문가 제안 + 도메인사전 변경 + 글로벌 반영 사용자 확인 절차.

## 목적

Step 11은 **세 가지 multiSelect**를 한 번에 진행합니다:

1. **도메인 전문가 추가 제안** (기존)
2. **도메인사전 변경 확정** (신규 — Step 10 자동 병합 시 CONFLICT로 미뤄진 항목 + 핵심 용어 검토)
3. **글로벌 사전 반영 선택** (신규 — 이번 프로젝트 신규/수정 용어 중 글로벌 자산화)

세 질문을 분리하면 사용자 피로도가 높아지므로, 가능하면 한 화면에서 그룹별로 묶어 진행합니다.

## 절차

### 1. 입력 데이터 수집

다음 파일에서 데이터를 추출:
- `team-reviews/domain-process-analysis.md` — 프로세스 전문가 우선순위 테이블 (🔴/🟡/🟢)
- `team-reviews/domain-technical-analysis.md` — 기술 전문가 우선순위 테이블
- 6개 전문가 분석 파일의 `## Dictionary Updates` 섹션 — Step 10 자동 병합 결과 + CONFLICT 항목
- `docs/domain-dictionary.md` (현재 v2) — 비교 기준
- 글로벌 사전 (`~/.claude/memory/domain-dictionaries/{도메인}.md`) — 비교 기준

### 2. multiSelect 1 — 도메인 전문가 제안 (기존)

```
question: "도메인 전문가가 아래 항목을 추가 제안했습니다. 채택할 항목을 선택하세요.
(🔴필수/🟡권장/🟢선택은 AI 판단이며, 최종 결정은 사용자입니다)"
header: "Domain Suggestions"
multiSelect: true
options:
  - label: "🔴 {항목1}: {한줄요약}"
    description: "{근거}"
  ...
```

> 항목이 8개 이상이면 🔴/🟡/🟢 그룹별로 나누어 2~3회 질문.

### 3. multiSelect 2 — 도메인사전 변경 확정 (신규)

Step 10 자동 병합에서 처리하지 못하고 CONFLICT로 미뤄진 항목을 사용자에게 결정 요청. 또한 자동 병합된 핵심 용어 5~10개도 검토 기회 제공.

```
question: "도메인사전 변경 사항을 확정해주세요.
(자동 병합된 항목은 ✅ 표시, 충돌 항목은 ⚠️ 표시. 둘 다 수정 가능)"
header: "Dictionary"
multiSelect: true
options:
  - label: "⚠️ Cart vs Basket: 어느 용어로 통일? (전문가 의견 갈림)"
    description: "Process Expert: cart 권장 (글로벌 표준), Tech Expert: basket 권장 (UI 친화)"
  - label: "✅ Wishlist 신규 추가: 찜 — 구매 의도 없는 관심 상품"
    description: "Domain Researcher가 추가 제안. 자동 병합됨"
  - label: "✅ Order 정의 다듬음: 결제 완료 전후 모두 → '고객의 구매 요청 (결제 완료 시점부터 유효)'"
    description: "Process Expert가 모호성 지적. 자동 다듬어짐"
  ...
```

체크 = 채택. 미체크 = 변경 거부 (자동 병합 항목은 롤백, 충돌은 보류).

### 4. multiSelect 3 — 글로벌 사전 반영 (신규)

이번 프로젝트에서 새로 정의/다듬어진 용어 중 글로벌 사전(`~/.claude/memory/domain-dictionaries/{도메인}.md`)에 추가할 것을 사용자가 선택.

**자동 추정**: 인터뷰의 `[Industry]` 태그 → 글로벌 사전 도메인 결정 (예: ecommerce, healthcare).

```
question: "이번 프로젝트에서 정의된 다음 용어 중 글로벌 [{도메인}] 사전에 반영할 항목을 선택하세요.
글로벌에 추가하면 다음 프로젝트에서도 후보로 제시됩니다."
header: "Global Sync"
multiSelect: true
options:
  - label: "Wishlist (찜) — 구매 의도 없는 관심 상품"
    description: "신규 정의 — 다른 이커머스 프로젝트에서도 자주 등장하는 개념"
  - label: "Bundle (묶음 상품) — 할인 적용 그룹"
    description: "신규 정의 — 보편적 이커머스 개념"
  - label: "FlashSale (시간 한정 할인 이벤트) — 이번 프로젝트 특수"
    description: "이번 프로젝트 특화 가능성. 글로벌화 신중 검토"
```

선택한 항목 → 글로벌 사전에 추가 시 출처 메타데이터 포함:
```markdown
## Wishlist
{정의}
- **출처**: 프로젝트 `<project-name>` (2026-04-28)
- **확신도**: 1 (첫 등장)
```

> 글로벌 사전이 없는 도메인이면 사용자에게 신규 생성 확인:
> "ecommerce 글로벌 사전이 없습니다. 새로 만들까요? (~/.claude/memory/domain-dictionaries/ecommerce.md)"

### 5. 결과 기록

#### `team-review.md`에 추가:

```markdown
## User-Approved Domain Suggestions
- ✅ 채택: {항목명} — {이유}
- ❌ 미채택: {항목명} — 사용자 판단: {이유 또는 "불필요"}

## User-Approved Dictionary Changes
- ✅ Cart 채택, Basket 거부 — 글로벌 표준 우선
- ✅ Wishlist 추가
- ✅ Order 정의 다듬음

## Global Dictionary Sync
- ✅ Wishlist → ecommerce.md 반영
- ✅ Bundle → ecommerce.md 반영
- ❌ FlashSale → 글로벌화 보류 (프로젝트 특수성)
```

#### 사전 v3 최종화:
- `docs/domain-dictionary.md` 갱신
- `<planning_dir>/domain-dictionary-delta.md` 변경 이력 기록
- 글로벌 반영 선택 항목 → `~/.claude/memory/domain-dictionaries/{도메인}.md`에 추가

### 6. Plan 반영 규칙

**미채택 항목은 Plan에 반영하지 않습니다.** Step 12는 다음만 반영:
- 채택된 도메인 전문가 제안
- 확정된 도메인사전 v3 (모든 모듈/컴포넌트명, 변수명, 타입명이 사전을 따름)
