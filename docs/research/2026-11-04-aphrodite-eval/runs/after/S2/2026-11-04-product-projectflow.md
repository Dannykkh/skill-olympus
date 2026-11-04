# PRODUCT.md — 플로우보드

> 루트 `PRODUCT.md` 초안(2026-11-04, Aphrodite Phase 1-1). 이 실행은 `docs/design-refs/` 밖에 쓸 수 없어 여기에 둔다. 루트로 옮길 것.
> 상류 문서에 사람의 확인 기록(answered·user-confirmed)이 없어 모든 값은 `AI 권장`이다.

## Strategy

| Decision | Value | Source |
|---|---|---|
| 핵심 사람 | 팀 리더(`owner`) — 5~20명 소규모 팀을 만들고, 가입 직후 프로젝트 0개인 빈 계정에서 첫 프로젝트를 여는 사람 | AI 권장 — docs/plan/projectflow/spec.md 이해관계자·P1, 2026-11-04 brief 사람 카드 |
| 첫 과업 | 가입 당일 첫 프로젝트를 만들고 팀원을 초대해 첫 할 일을 맡긴다 | AI 권장 — spec.md 공유 전제 목표 |
| 성공 기준 | 가입 후 24시간 안에 첫 프로젝트를 만드는 계정 비율 60% 이상(현재 30%) | AI 권장 — spec.md 공유 전제 |
| 원칙 | ① 첫 경험 완성도가 관리자용 분석 기능보다 먼저 ② 장식보다 할 일과 다음 행동이 먼저 보인다 | AI 권장 — interview.md Soft Gate 3 트레이드오프, DESIGN.md Overview |
| 차별화 | 가입 5분 안에 첫 보드 완성(측정 목표이며 화면 카피가 아님) | AI 권장 — interview.md Soft Gate 3 |

## Scope

| Kind | Item | Reason | Reopen When | Source |
|---|---|---|---|---|
| include | 프로젝트 생성 마법사 | 없으면 첫 가치에 도달하지 못함 | - | AI 권장 — docs/athena/projectflow.md 추천 MVP 1, Soft Gate 3 |
| include | 팀원 초대(이메일) | 혼자 쓰면 협업 도구의 가치가 없음, 초대 경로가 설정 깊숙이 있음(P2) | - | AI 권장 — athena 추천 MVP 2, spec.md P2 |
| include | 할 일 보드 | 핵심 가치 제안 | - | AI 권장 — athena 추천 MVP 3, Soft Gate 3 |
| exclude | 팀 성과 KPI 대시보드 | 프로젝트가 쌓이기 전에는 보여줄 데이터가 없고 초기 사용자 과업과 무관 | 활성 팀 100개 이후 | AI 권장 — athena 삭제 권고, Soft Gate 3 제외 |
| exclude | 시간 추적 | 경쟁 제품 대비 차별화가 아님 | 유료 전환 검증 이후 | AI 권장 — athena 삭제 권고, Soft Gate 3 제외 |
| exclude | 리포트 내보내기 | 첫 경험 완성도 vs 관리자용 분석 → 첫 경험 선택 | 상류에 없음 — Open Decisions 참조 | AI 권장 — interview.md Soft Gate 3 제외 |
| exclude | Slack 알림 | MVP 연동은 이메일만 | 상류에 없음 — Open Decisions 참조 | AI 권장 — spec.md 에코시스템 맵 `제외` |

## Open Decisions

| Decision | Layer | Recommendation | Owner |
|---|---|---|---|
| 리포트 내보내기·Slack 알림을 다시 볼 조건 | scope | KPI 대시보드와 같은 "활성 팀 100개 이후"로 묶어 재검토 — 셋 다 관리자·알림 확장이라 같은 신호(활성 팀 수)로 판단하는 편이 단순함 | 사용자(제품 책임자) |
