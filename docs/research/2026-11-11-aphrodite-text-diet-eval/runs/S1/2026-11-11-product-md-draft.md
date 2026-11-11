# PRODUCT.md — 플로우보드

> 초안. 이 실행은 `docs/design-refs/` 밖에 쓸 수 없어 여기에 둠. 확인 뒤 프로젝트 루트 `PRODUCT.md`로 옮긴다.

## Strategy

| Decision | Value | Source |
|---|---|---|
| 핵심 사람 | 5~20명 팀의 팀 리더. 가입 당일, 프로젝트 0개 상태로 처음 들어옴 | AI 권장 — docs/plan/projectflow/spec.md 이해관계자·P1, README.md |
| 첫 과업 | 첫 프로젝트를 만들고, 팀원을 초대해, 첫 할 일을 배정한다 | AI 권장 — docs/plan/projectflow/spec.md 공유 전제 |
| 성공 기준 | 가입 후 24시간 안에 첫 프로젝트를 만드는 계정 60% 이상 (현재 30%) | AI 권장 — docs/plan/projectflow/spec.md 공유 전제 |
| 원칙 | 첫 경험 완성도 > 관리자용 분석 기능. 장식보다 할 일과 다음 행동이 먼저 | AI 권장 — docs/plan/projectflow/interview.md Soft Gate 3, DESIGN.md Overview |

## Scope

| Kind | Item | Reason | Reopen When | Source |
|---|---|---|---|---|
| include | 프로젝트 생성 마법사 | 없으면 첫 가치에 도달하지 못함 | - | AI 권장 — docs/athena/projectflow.md 추천 MVP 1 |
| include | 팀원 초대 | 혼자 쓰면 협업 도구의 가치가 없음 | - | AI 권장 — docs/athena/projectflow.md 추천 MVP 2 |
| include | 할 일 보드 | 핵심 가치 제안 | - | AI 권장 — docs/athena/projectflow.md 추천 MVP 3 |
| exclude | 팀 성과 KPI 대시보드 | 프로젝트가 쌓이기 전에는 보여줄 데이터가 없고 초기 사용자 과업과 무관 | 활성 팀 100개 이후 | AI 권장 — docs/athena/projectflow.md 삭제 권고, interview.md Soft Gate 3 |
| exclude | 시간 추적 | 경쟁 제품 대비 차별화가 아님 | 유료 전환 검증 이후 | AI 권장 — docs/athena/projectflow.md 삭제 권고 |
| exclude | 리포트 내보내기 | MVP 범위 제외 | 상류에 조건 없음 | AI 권장 — docs/plan/projectflow/interview.md Soft Gate 3 |
| exclude | Slack 알림 연동 | 에코시스템 맵에서 제외 | 상류에 조건 없음 | AI 권장 — docs/plan/projectflow/spec.md 에코시스템 맵 |

## Open Decisions

| Decision | Layer | Recommendation | Owner |
|---|---|---|---|
| "대시보드답게"가 팀 성과 KPI 대시보드를 뜻하는가 | scope | 제외 유지. 홈은 다음 한 단계 + 내 할 일·프로젝트 칸으로 채움. 0건 계정에는 보여줄 수치가 없고 복구 조건(활성 팀 100개)도 미충족 | 사용자 |
| 데이터가 생긴 뒤 홈에 둘 구역 | scope | `내 할 일` + `프로젝트` 두 칸. 포함 기능(보드)의 요약이며 새 기능이 아님 | 사용자 |
| 위 Strategy·Scope 값의 사람 확인 | strategy | 상류 문서는 모두 권장안. 그대로 확정 권장 | 사용자 |
