# Athena Output Template

산출물 형식과 완료 안내 템플릿.

---

## 산출물 경로

- 독립 실행: `docs/athena/{project-name}.md`
- 젭마인 시너지: `<planning_dir>/strategic-review.md`

---

## 산출물 형식

```markdown
# Strategic Review: {프로젝트명}

> Athena(아테나) CEO 코칭 결과

## Summary

| 영역 | 판정 | 근거 |
|------|------|------|
| 수요 검증 | Strong/Moderate/Weak/Unvalidated | {한 줄} |
| 경쟁 우위 | Defensible/Temporary/None | {한 줄} |
| 스코프 | Current/Reduce/Expand/Pivot/Kill | {한 줄} |
| ROI | Positive/Marginal/Negative/Unknown | {한 줄} |
| Kill Test | GO/CONDITIONAL GO/NO-GO | {한 줄} |

## 최종 판정: {GO / CONDITIONAL GO / NO-GO}

{판정 이유 2~3문장}

## Phase 1: 수요 검증
{상세 분석 — 질문과 답변, 근거, 약점}

## Phase 2: 경쟁 우위
{상세 분석 — 경쟁사 비교, 해자, 방어 가능성}

## Phase 3: 스코프 권고
{상세 분석 — 구체적 삭제/추가/유지 기능 목록}

### 추천 MVP 기능 (Reduce 결과)
| # | 기능 | 이유 |
|---|------|------|
| 1 | {핵심 기능} | {없으면 제품 가치 없음} |
| 2 | {핵심 기능} | {핵심 가치 제안} |
| 3 | {핵심 기능} | {차별화 포인트} |

### 삭제 권고 기능
| 기능 | 삭제 이유 | 복구 시점 |
|------|-----------|-----------|
| {기능} | {v1에 불필요} | {사용자 N명 이후} |

## Phase 4: ROI 현실 점검
{상세 분석 — 숫자, 보정 공식 적용 결과}

### ROI 요약
| 항목 | 낙관적 | 현실 보정 |
|------|--------|-----------|
| 개발 기간 | {N개월} | {N x 2개월} |
| 첫 해 매출 | {금액} | {금액 x 0.3} |
| 월 유지비용 | {금액} | {금액 x 1.5} |
| BEP | {N개월} | {보정된 N개월} |

## Phase 5: Kill Test
{상세 분석 — 만들지 말아야 할 이유 vs 만들어야 할 이유}

## Next Steps

| 판정 | 권고 |
|------|------|
| GO | /zephermine → 기술 설계 진행 |
| CONDITIONAL GO | 조건 충족 후 /zephermine |
| NO-GO | /athena --mode pivot → 방향 전환 검토, 또는 다른 아이디어 |
```

---

## 완료 안내 템플릿

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Athena(아테나) CEO 코칭 완료

판정: {GO / CONDITIONAL GO / NO-GO}
산출물: docs/athena/{project-name}.md

{판정별 다음 단계}
  GO:
    /zephermine         → 기술 설계 시작
    /agent-team         → 바로 구현 (소규모)
  CONDITIONAL GO:
    {조건 목록}
    조건 충족 후 → /zephermine
  NO-GO:
    /athena --mode pivot → 방향 전환 검토
    /hermes "다른 아이디어" → 새 사업 분석
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
