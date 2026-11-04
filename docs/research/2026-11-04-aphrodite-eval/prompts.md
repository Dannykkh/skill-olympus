# 아프로디테 평가 프롬프트 (고정)

기준선(0단계)과 재평가(6단계)는 아래 문장을 바이트 그대로 재사용한다. 바꾸면 비교가 무효다.

## 시나리오

| ID | 사용자 요청 |
|---|---|
| S1 | `/aphrodite --plan-only 첫 화면이 너무 휑해. 대시보드답게 좀 채워줘.` |
| S2 | `/aphrodite docs/plan/projectflow --plan-only` |
| S3 | `/aphrodite --plan-only 관리자 웹의 설정 화면 옆에 '팀 성과' 탭을 추가해서 KPI 카드랑 추세 그래프로 디자인해줘.` |

## 작업자 지시문 (블라인드)

`{RUN_DIR}`은 `fixture/projectflow`를 실행마다 새로 복사한 폴더, `{REQUEST}`는 위 표의 요청이다.
작업자에게 평가 기준과 기대 결과를 알려 주지 않는다(learned 033).

```text
당신은 {RUN_DIR} 프로젝트에서 일하는 디자인 에이전트입니다.
사용자 요청: «{REQUEST}»

D:\git\claude-code-agent-customizations\skills\design-plan\SKILL.md 를 처음부터 읽고 그 절차를 그대로 따르세요.
내부 모듈(frontend-design, mermaid-diagrams 등)은 D:\git\claude-code-agent-customizations\skills\<이름>\SKILL.md 를 사용하세요.

범위: Phase 2(저충실도 와이어프레임 판단 게이트 포함)까지 진행하고 멈춥니다. Phase 3 이후의 렌더 방향 탐색과 구현은 하지 않습니다.
산출물은 {RUN_DIR}\docs\design-refs\ 아래에만 쓰고, 그 밖의 파일은 수정하지 않습니다.
이 실행에서는 사용자에게 질문할 수 없습니다. 질문이 필요하면 반환 보고에 적고, 스스로 판단해 계속하세요.

반환 형식(이 외의 내용은 쓰지 마세요):
1. 읽은 파일 절대경로 목록(읽은 순서대로)
2. 작성한 산출물 절대경로 목록
3. 요청받은 화면이 무엇이 되었는지 3문장
4. 문서가 모호하거나 따를 수 없던 곳(원문 인용, 최대 5개)
5. 사용자에게 묻고 싶었던 질문
```

## 채점 기준 (평가자 전용 — 작업자에게 보여 주지 않음)

산출물과 반환 보고로만 판정한다. 각 항목은 예/아니오이며, 애매하면 점수 대신 비고에 적는다.

| ID | 판정 질문 |
|---|---|
| R1a | `docs/plan/projectflow/spec.md`를 읽었는가 |
| R1b | `docs/athena/projectflow.md`를 읽었는가 |
| R1c | `docs/plan/projectflow/interview.md`를 읽었는가 |
| R2 | "팀 성과 KPI 대시보드"가 산출물에 제외 항목으로, 출처와 함께 적혔는가 |
| R3 | 화면 목적·대상 같은 전략·범위 결정에 "누가 정했나"(사용자/상류 문서/AI 추정/미정) 표시가 있는가 |
| R4 | (S1) 프로젝트 0개인 신규 사용자의 첫 화면이 KPI 카드형 대시보드가 아닌가 |
| R5 | (S3) 요청 기능이 정해진 범위와 충돌한다고 짚었는가 |
| R6 | 요청이 어떤 종류의 결정(목적·범위·구조·배치·표현)을 건드리는지 밝혔는가 |
| R7 | 읽은 파일 수와 그 줄 수 합(낮을수록 좋음 — R1~R6을 유지한다는 전제) |
| R8 | 작성한 Experience Contract의 `validate_experience_contract.py` 결과 (Phase 2 초안이므로 실패 절 목록을 기록) |
