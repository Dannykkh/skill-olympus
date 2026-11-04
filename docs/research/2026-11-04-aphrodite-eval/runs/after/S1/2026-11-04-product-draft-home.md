# PRODUCT.md — 플로우보드

> 루트 `PRODUCT.md` 초안. 이번 실행의 쓰기 범위가 `docs/design-refs/`로 제한돼 여기에 둔다. 사용자 승인 뒤 루트로 옮긴다.
> 값은 상류 문서에서만 옮겼다. 상류 어디에도 사람의 확인 기록이 없어 모든 행이 `AI 권장`이다.

## Strategy

| Decision | Value | Source |
|---|---|---|
| 핵심 사람 | 5~20명 소규모 팀의 팀 리더 — 가입 직후 프로젝트 0개 상태에서 팀을 만들고 프로젝트를 여는 사람 | AI 권장 — docs/plan/projectflow/spec.md 이해관계자·Problem Statement P1 |
| 첫 과업 | 가입 당일 첫 프로젝트를 만들고 팀원을 초대해 첫 할 일을 배정 | AI 권장 — spec.md 공유 전제 목표 |
| 성공 기준 | 가입 후 24시간 안에 첫 프로젝트를 만드는 계정 비율 60% 이상(현재 30%) | AI 권장 — spec.md 공유 전제 |
| 원칙 | 첫 경험 완성도가 관리자용 분석 기능보다 먼저 / 가입 5분 안에 첫 보드 완성(차별화 가설) / 차분하고 실무적 | AI 권장 — interview.md Soft Gate 3, docs/athena/projectflow.md 조건 |

## Scope

| Kind | Item | Reason | Reopen When | Source |
|---|---|---|---|---|
| include | 프로젝트 생성 마법사 | 없으면 첫 가치에 도달하지 못함 | - | AI 권장 — athena 추천 MVP 1, Soft Gate 3 |
| include | 팀원 초대 | 혼자 쓰면 협업 도구의 가치가 없음, 초대 경로가 설정 깊숙이 있음(P2) | - | AI 권장 — athena 추천 MVP 2, spec.md P2 |
| include | 할 일 보드 | 핵심 가치 제안 | - | AI 권장 — athena 추천 MVP 3, Soft Gate 3 |
| exclude | 팀 성과 KPI 대시보드 | 프로젝트가 쌓이기 전에는 보여줄 데이터가 없고 초기 사용자 과업과 무관 | 활성 팀 100개 이후 | AI 권장 — athena 삭제 권고, Soft Gate 3 제외 |
| exclude | 시간 추적 | 경쟁 제품 대비 차별화가 아님 | 유료 전환 검증 이후 | AI 권장 — athena 삭제 권고, Soft Gate 3 제외 |
| exclude | 리포트 내보내기 | 첫 경험 vs 관리자용 분석 트레이드오프에서 첫 경험을 선택 | 상류에 조건 기록 없음 — 관리자용 분석 기능을 다시 열 때 함께 검토 | AI 권장 — interview.md Soft Gate 3 |
| exclude | Slack 알림 연동 | 에코시스템 맵에서 제외 | 상류에 조건 기록 없음 — 알림 요구가 생길 때 | AI 권장 — spec.md 에코시스템 맵 |

## Open Decisions

| Decision | Layer | Recommendation | Owner |
|---|---|---|---|
| 홈 요청 "대시보드답게 채워줘"를 팀 성과 KPI 대시보드 복구로 볼지 | scope | 제외 유지 — 신규 계정은 데이터 0건이라 KPI가 0·빈 차트가 되고 상류가 첫 프로젝트 생성률에 집중하기로 함. 뒤집으면 athena 복구 조건 "활성 팀 100개 이후"도 함께 바꿈 | 사용자 |
