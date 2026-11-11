# PRODUCT.md — 플로우보드

> 초안. 루트 `PRODUCT.md`로 옮기기 전 사본이다. 상류 문서에 사람이 확인했다는 기록이 없어 모든 출처가 `AI 권장`이다.

## Strategy

| Decision | Value | Source |
|---|---|---|
| 핵심 사람 | 팀 리더 — 5~20명 팀을 이끌고, 방금 가입해 프로젝트가 0개인 계정으로 처음 들어온 사람 | AI 권장 — docs/plan/projectflow/spec.md 이해관계자·Problem Statement P1 |
| 첫 과업 | 가입 당일 첫 프로젝트를 만들고 팀원을 초대해 첫 할 일을 배정한다 | AI 권장 — docs/plan/projectflow/spec.md 공유 전제 |
| 성공 기준 | 가입 후 24시간 안에 첫 프로젝트를 만드는 계정 비율 60% 이상 (현재 30%) | AI 권장 — docs/plan/projectflow/spec.md 공유 전제 |
| 원칙 | ① 첫 경험 완성도가 관리자용 분석보다 먼저 ② 가입 5분 안에 첫 보드 ③ 차분하고 실무적인 톤 | AI 권장 — docs/plan/projectflow/interview.md Soft Gate 3 |

## Scope

| Kind | Item | Reason | Reopen When | Source |
|---|---|---|---|---|
| include | 프로젝트 생성 마법사 | 없으면 첫 가치에 도달하지 못함 | - | AI 권장 — docs/athena/projectflow.md 추천 MVP 기능 |
| include | 팀원 초대 | 혼자 쓰면 협업 도구의 가치가 없음 | - | AI 권장 — docs/athena/projectflow.md 추천 MVP 기능 |
| include | 할 일 보드 | 핵심 가치 제안 | - | AI 권장 — docs/athena/projectflow.md 추천 MVP 기능 |
| exclude | 팀 성과 KPI 대시보드 | 프로젝트가 쌓이기 전에는 보여 줄 데이터가 없고 초기 사용자 과업과 무관 | 활성 팀 100개 이후 | AI 권장 — docs/athena/projectflow.md 삭제 권고 |
| exclude | 시간 추적 | 경쟁 제품 대비 차별화가 아님 | 유료 전환 검증 이후 | AI 권장 — docs/athena/projectflow.md 삭제 권고 |
| exclude | 리포트 내보내기 | 첫 경험 완성도를 관리자용 분석보다 먼저 둠 | 상류에 복구 조건 없음 | AI 권장 — docs/plan/projectflow/interview.md Soft Gate 3 |
| exclude | Slack 알림 | 에코시스템 맵에서 제외 | 상류에 복구 조건 없음 | AI 권장 — docs/plan/projectflow/spec.md 에코시스템 맵 |

## Open Decisions

| Decision | Layer | Recommendation | Owner |
|---|---|---|---|
| 댓글을 MVP에 넣는가 | scope | 넣는다 — spec 역할 표가 member 주요 업무로 적었다. 할 일 상세 안의 입력 한 칸으로 가볍게 | 사용자 |
