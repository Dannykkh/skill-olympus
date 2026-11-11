# PRODUCT.md — 플로우보드

> 초안. 이번 실행은 `docs/design-refs/` 밖에 쓸 수 없어 여기에 두었다. 확인 뒤 프로젝트 루트 `PRODUCT.md`로 옮긴다.
> 상류 문서에 사람이 확인했다는 기록이 없어 모든 행의 출처가 `AI 권장`이다.

## Strategy

| Decision | Value | Source |
|---|---|---|
| 핵심 사람 | 가입 당일의 팀 리더. 5~20명 팀을 이끌고, 프로젝트가 0개인 계정으로 처음 들어온 사람 | AI 권장 — docs/plan/projectflow/spec.md 이해관계자·P1, README.md |
| 첫 과업 | 첫 프로젝트를 만들고 팀원을 초대해 첫 할 일을 배정한다 | AI 권장 — spec.md 공유 전제 목표 |
| 성공 기준 | 가입 후 24시간 안에 첫 프로젝트를 만드는 계정 60% 이상 (현재 30%) | AI 권장 — spec.md 공유 전제 성공 기준 |
| 원칙 | 첫 경험 완성도가 관리자용 분석보다 먼저다. 장식보다 할 일과 다음 행동이 먼저 보인다 | AI 권장 — interview.md Soft Gate 3 트레이드오프, DESIGN.md Overview |

## Scope

| Kind | Item | Reason | Reopen When | Source |
|---|---|---|---|---|
| include | 프로젝트 생성 마법사 | 없으면 첫 가치에 도달하지 못함 | - | AI 권장 — docs/athena/projectflow.md 추천 MVP 1, interview.md Soft Gate 3 |
| include | 팀원 초대 | 혼자 쓰면 협업 도구의 가치가 없음 | - | AI 권장 — athena 추천 MVP 2, spec.md P2 |
| include | 할 일 보드 | 핵심 가치 제안 | - | AI 권장 — athena 추천 MVP 3 |
| exclude | 팀 성과 KPI 대시보드 | 프로젝트가 쌓이기 전에는 보여 줄 데이터가 없고 초기 과업과 무관 | 활성 팀 100개 이후 | AI 권장 — athena 삭제 권고, interview.md Soft Gate 3 |
| exclude | 시간 추적 | 경쟁 제품 대비 차별화가 아님 | 유료 전환 검증 이후 | AI 권장 — athena 삭제 권고 |
| exclude | 리포트 내보내기 | 첫 경험 완성도를 택한 트레이드오프 | 상류에 복구 시점 없음. KPI 대시보드를 다시 볼 때 함께 보기를 권장 | AI 권장 — interview.md Soft Gate 3 |
| exclude | Slack 알림 연동 | 에코시스템 맵에서 제외 | 상류에 복구 시점 없음. 팀원 초대 수락률이 낮게 나오면 다시 보기를 권장 | AI 권장 — spec.md 에코시스템 맵 |

## Open Decisions

| Decision | Layer | Recommendation | Owner |
|---|---|---|---|
| 프로젝트 이름 고치기·프로젝트 지우기를 MVP에 넣는가 | scope | 이름 고치기만 넣고 지우기·보관은 뺀다. 첫 프로젝트 이름의 오타를 고칠 길이 없으면 첫 경험이 깨진다 | 사용자 |
