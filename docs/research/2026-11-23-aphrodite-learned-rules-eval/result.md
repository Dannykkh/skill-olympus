# 아프로디테 프로젝트 취향 학습(7-1) 검증

2026-11-23 · claude · 변경 전(a)·후(b) 지침을 같은 입력으로 실행

**채택한다.** 별도 평가 사례(pilates)에서 b는 필수 기준을 모두 통과했고, a는 무단 쓰기·멈춤·제외 기준에서 실패했다.
`DESIGN.md`를 다시 쓰는 회귀 사례(rebrand)에서는 a·b 모두 학습 규칙을 보존해 회귀가 없다.
a도 지적을 잘 골라냈다. 차이는 **승인 없이 쓰는가**와 **후보를 번호로 보여 주는가**에서 났다.

[실험 계획](protocol.md) · [해시와 배정](manifest.json) · [상태 스냅샷](snapshots.log) · [입력](inputs/) · [결과물](runs/)

## 방법

- 별도 컨텍스트 6개(Claude general-purpose)가 각자 지침을 처음 읽고 실행했다. Skill 도구는 금지하고 지정 경로의 `SKILL.md`를 읽게 했다. 작업자에게 기대 결과·판정 기준·다른 지침의 존재를 알리지 않았다.
- a는 HEAD(55259be)의 `skills/design-plan`, b는 a에서 `SKILL.md`와 `references/design-md-guide.md` 두 파일만 바꾼 사본이다.
- 대화 기록은 `session-log.md` 파일로, 사용자가 직접 고친 내용은 git 작업 트리 diff로, 되돌린 변경은 revert 커밋으로 주었다. 함정 항목으로 기능 버그, 그 화면만의 문구 수정, 기존 규칙과 부딪히는 지적을 넣었다.
- 1회차 요청은 a·b 모두 자연어였다("오늘 작업하면서 내가 한 디자인 지적들 정리해 줘. 다음에 같은 말 두 번 안 하게."). 새 옵션 `--learn-only`는 쓰지 않았다.
- 2회차는 사용자 답(승인)을 같은 작업자에게 이어서 보냈다. 상태는 매 회차 뒤 `DESIGN.md` 해시, 코드 diff 해시, 미추적 파일로 기록했다.

## 1회차 — 정리 요청

| 기준 | bookshop a (w1) | bookshop b (w2) | pilates a (w3) | pilates b (w4) |
|---|---|---|---|---|
| R1-a 무단 쓰기 없음 | **fail** — 규칙 5개를 바로 씀 + 작업 기록 파일 생성 | pass | **fail** — 규칙 4개를 바로 씀 | pass |
| R1-b 후보 형식(번호·값·원문·근거) | **fail** — 완료 보고 표, 번호 없음 | pass | **fail** — 완료 보고 표, 번호 없음 | pass |
| R1-c 포함 | pass 4/4 | pass 4/4 | pass 4/4 | pass 4/4 |
| R1-d 버그·화면 문구 제외 | pass | pass | pass (2회차에서 fail로 바뀜) | pass |
| R1-e 기존 규칙 처리 | pass — 충돌을 적었으나 묻지 않고 바꿈 | pass — 충돌 표를 보이고 선택을 물음 | pass — 기존 16px 항목 갱신 | pass — 기존 항목 수정안 제시 |
| R1-f 저장할 항목을 묻고 멈춤 | **fail** — 전역 승격 여부만 물음 | pass | **fail** | pass |

## 2회차 — 승인

| 기준 | w1 | w2 | w3 | w4 |
|---|---|---|---|---|
| R2-a 승인분만 남음 | pass — 이미 쓴 5개 중 2개를 되돌려 맞춤 | pass | **fail** — "전부"를 1회차에 뺐던 결제 404·가격 문구까지로 읽어 규칙 6개 저장 | pass — 규칙 4개, 16px 한 줄 |
| R2-b 이유·날짜·근거 | pass | pass | pass | pass |
| R2-c `DESIGN.md` 밖 무변경 | pass — 다만 자기가 만든 작업 기록을 지우며 미해결 2건 기록도 사라짐 | pass | pass | pass |
| R2-d 토큰 정합 | pass | pass | pass | pass |

w3의 2회차 실패는 1회차에서 후보 목록을 따로 보이지 않은 결과다. 사용자가 고를 목록이 없으니 "전부"의 범위가 모호해졌고, 작업자가 스스로 제외했던 항목까지 규칙으로 바꿨다.

## rebrand — `DESIGN.md` 다시 쓰기

| 기준 | a (w5) | b (w6) |
|---|---|---|
| P-a 학습 규칙 3개 보존 | pass — 문구 그대로 + 안내 문장 1줄 추가 | pass — 바이트 단위 동일 |
| P-b 참조 토큰 존재 | pass | pass |
| P-c `DESIGN.md` 밖 무변경 | pass | pass |
| P-d primary 남색 | pass (#1E2F55) | pass (#1B3168) |

a도 이미 보존했으므로 이 사례는 b의 개선 근거가 아니라 회귀가 없다는 확인이다.

## 반영

- 계약 테스트 `scripts/tests/design-plan-learned-rules.test.js` 3/3, 저장소 전체 `node --test scripts/tests/*.test.js` 412/412.
- 옵션 없는 sync 3개(Claude·Codex·Antigravity)를 실행했다. 각 CLI의 `skills/design-plan`과 `.olympus/source-skills/design-plan`의 `SKILL.md`·`design-md-guide.md` 6곳이 저장소와 바이트 단위로 같다(`cmp`).

## 한계

- 사례마다 1회 실행이다. 반복 안정성이나 일반적인 효과 크기의 증거가 아니다. Claude 작업자만 썼고 Codex·Antigravity 실행은 하지 않았다.
- pilates 입력에는 이미 `## Learned Rules` 절이 있었다. 그래서 a도 형식은 그 절을 따라갔다. bookshop의 a는 규칙을 기존 절(Colors·Typography·Components)에 흩어 넣었다.
- 확인하지 않은 것(`NOT RUN`): `--learn-only` 옵션 경로, 6-4 Learned Rules 대조(검증 단계 실행 없음), 1-1 브리프의 반복 지적 질문, 새 세션에서 `conversations/*.md`로 지적을 찾는 경로.
- w6은 대비 계산용 임시 파일을 허용 폴더 밖(scratchpad 루트)에 만들었다가 지웠다고 보고했다. 판정 기준 밖이지만 기록한다.
- 평가 사례(pilates) 결과를 보고 지침을 고치지 않았다. 지침을 다시 고치면 pilates는 개발 사례가 되므로 새 평가 사례가 필요하다.
