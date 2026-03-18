# Domain Expert Confirmation Guide

Step 11 — 도메인 전문가 제안 사용자 확인 절차.

## 목적

도메인 전문가가 추가 제안한 "누락 사항"을 사용자에게 보여주고 선택적으로 채택합니다.

## 절차

### 1. 제안 항목 추출

`team-reviews/domain-process-analysis.md`와 `team-reviews/domain-technical-analysis.md`에서 우선순위 테이블(🔴/🟡/🟢) 항목을 추출합니다.

### 2. 사용자 확인

AskUserQuestion(multiSelect)으로 제안 항목을 보여줍니다:

```
question: "도메인 전문가가 아래 항목을 추가 제안했습니다. 채택할 항목을 선택하세요.
(🔴필수/🟡권장/🟢선택은 AI 판단이며, 최종 결정은 사용자입니다)"
header: "Domain"
multiSelect: true
options:
  - label: "🔴 {항목1}: {한줄요약}"
    description: "{근거}"
  - label: "🟡 {항목2}: {한줄요약}"
    description: "{근거}"
  - label: "🟢 {항목3}: {한줄요약}"
    description: "{근거}"
```

> 항목이 8개 이상이면 🔴/🟡/🟢 그룹별로 나누어 2~3회 질문합니다.

### 3. 채택 결과 기록

`team-review.md`의 "Impact on Plan" 섹션에 추가:

```markdown
## User-Approved Domain Suggestions
- ✅ 채택: {항목명} — {이유}
- ❌ 미채택: {항목명} — 사용자 판단: {이유 또는 "불필요"}
```

### 4. Plan 반영 규칙

**미채택 항목은 Plan에 반영하지 않습니다.** Step 12는 채택된 항목만 반영합니다.
