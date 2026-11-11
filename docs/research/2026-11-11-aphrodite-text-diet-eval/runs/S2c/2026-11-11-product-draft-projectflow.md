# PRODUCT.md — 플로우보드

> 초안. 루트 `PRODUCT.md`로 옮겨야 정본이 된다(이번 실행은 `docs/design-refs/` 밖에 쓸 수 없었음).
> 상류 문서에 사람의 확인 기록이 없어 출처는 모두 `AI 권장`이다.

## Strategy

| Decision | Value | Source |
|---|---|---|
| 핵심 사람 | 5~20명 팀의 리더. 가입 직후, 프로젝트 0개, 데스크톱 | AI 권장 — docs/plan/projectflow/spec.md 이해관계자·Problem Statement P1 |
| 첫 과업 | 가입 당일 첫 프로젝트를 만들고 팀원을 초대해 첫 할 일을 배정한다 | AI 권장 — docs/plan/projectflow/spec.md 공유 전제 |
| 성공 기준 | 가입 후 24시간 안에 첫 프로젝트를 만드는 계정 비율 60% 이상(현재 30%) | AI 권장 — docs/plan/projectflow/spec.md 공유 전제 |
| 원칙 | 첫 경험 완성도가 관리자용 분석 기능보다 먼저다. 톤은 차분하고 실무적 | AI 권장 — docs/plan/projectflow/interview.md Soft Gate 3, docs/athena/projectflow.md 판정 요약 |

## Scope

| Kind | Item | Reason | Reopen When | Source |
|---|---|---|---|---|
| include | 프로젝트 생성 마법사 | 없으면 첫 가치에 도달하지 못함 | - | AI 권장 — docs/athena/projectflow.md 추천 MVP 기능 |
| include | 팀원 초대(이메일) | 혼자 쓰면 협업 도구의 가치가 없음 | - | AI 권장 — docs/athena/projectflow.md, spec.md 에코시스템 맵 |
| include | 할 일 보드 | 핵심 가치 제안 | - | AI 권장 — docs/athena/projectflow.md 추천 MVP 기능 |
| exclude | 팀 성과 KPI 대시보드 | 프로젝트가 쌓이기 전에는 보여줄 데이터가 없고 초기 과업과 무관 | 활성 팀 100개 이후 | AI 권장 — docs/athena/projectflow.md 삭제 권고 |
| exclude | 시간 추적 | 경쟁 제품 대비 차별화가 아님 | 유료 전환 검증 이후 | AI 권장 — docs/athena/projectflow.md 삭제 권고 |
| exclude | 리포트 내보내기 | 첫 경험과 관리자용 분석 중 첫 경험을 선택 | 상류에 없음 | AI 권장 — docs/plan/projectflow/interview.md Soft Gate 3 |
| exclude | Slack 알림 | 에코시스템 맵에서 제외 | 상류에 없음 | AI 권장 — docs/plan/projectflow/spec.md 에코시스템 맵 |

## Open Decisions

| Decision | Layer | Recommendation | Owner |
|---|---|---|---|
| 댓글을 MVP에 넣는가 | scope | 넣되 할 일 상세의 글 댓글만 — spec 역할 표는 member 주요 업무로 적었으나 interview MVP 포함 목록에는 없음 | 사용자 |
