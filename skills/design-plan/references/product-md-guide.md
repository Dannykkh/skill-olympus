# PRODUCT.md Guide — 화면보다 먼저 읽는 제품 결정 요약

`DESIGN.md`가 표현(surface)의 정본이라면 루트 `PRODUCT.md`는 그보다 근본인 결정, 곧 누구의 어떤 변화를
만드는지(strategy)와 무엇을 넣고 뺄지(scope)의 요약입니다. UI 작업은 이 두 파일을 함께 먼저 읽습니다.
상세 근거는 상류 문서에 두고 여기에는 결정과 출처만 적습니다. **60줄을 넘기지 않습니다.**

## 언제 만들고 고치나

- 0-1에서 strategy·scope로 판정했는데 `PRODUCT.md`가 없으면 Phase 1-1에서 만듭니다.
- 상류 문서(`<planning_dir>/spec.md` `공유 전제`·`Problem Statement`, `interview.md` Soft Gate 3,
  `docs/athena/*.md`, `docs/hermes/*.md`)에서 값을 옮기고 출처를 답니다. 없는 값은 지어내지 않습니다.
- 사용자가 결정을 바꾸거나 뒤집으면 해당 행만 고치고 출처를 그 대화로 바꿉니다.

## 출처 라벨 — 세 가지만 씁니다

| 라벨 | 뜻 | 상류 어휘에서 옮길 때 |
|---|---|---|
| `사용자` | 사람이 정했다는 기록이 있음 | 젭마인 `answered`·`user-confirmed`, 사용자 정정, 이 대화에서 사용자가 답함 |
| `AI 권장` | AI가 근거를 들어 고른 값이며 사람의 확인 기록은 없음 | 젭마인 `[inferred]`·`accepted-by-default`·Soft Gate 권장안, `[ZEUS-AUTO:taste]`, 트립와이어 `가정:`, 헤르메스 `추정`, 아테나 권고 |
| `미결` | 아직 아무도 정하지 않음. 권장안과 함께 `## Open Decisions`에 올림 | 테미스 `[빈칸]`·`[확인 필요]`, `TBD`, 상류에 없음 |

상류 문서에 적혀 있다는 사실만으로 `사용자`가 되지 않습니다. 그 문서가 사람의 확인을 기록했을 때만
`사용자`이고, 나머지는 `AI 권장`입니다. 라벨 뒤에는 ` — <경로 또는 대화 날짜>`로 근거를 붙입니다.

## 템플릿

```markdown
# PRODUCT.md — {제품명}

## Strategy

| Decision | Value | Source |
|---|---|---|
| 핵심 사람 | {누가·어떤 상황·어느 단계에서 쓰나} | {사용자 / AI 권장} — {근거} |
| 첫 과업 | {그 사람이 가장 먼저 끝내야 하는 일} | |
| 성공 기준 | {관찰 가능한 수치나 상태} | |
| 원칙 | {충돌 때 무엇을 우선하나, 1~3개} | |

## Scope

| Kind | Item | Reason | Reopen When | Source |
|---|---|---|---|---|
| include | {넣는 것} | {이유} | - | |
| exclude | {만들지 않을 것} | {이유} | {다시 볼 조건} | |

## Open Decisions

| Decision | Layer | Recommendation | Owner |
|---|---|---|---|
| {미결 결정} | strategy/scope | {권장안과 근거 한 줄} | {정할 사람} |
```

`exclude` 행이 하나도 없으면 `Scope`에 `해당 없음 — <이유>`를 적습니다. 제외 목록이 비어 있다는 것은
"만들지 않을 것"을 아무도 정하지 않았다는 뜻이므로 가능한 한 상류에서 찾아 채웁니다.

## 검증

```bash
python <DESIGN_PLAN_SKILL_DIR>/scripts/validate_experience_contract.py --product PRODUCT.md
```

검증기는 `Strategy`·`Scope` 표의 열과 출처 라벨, `exclude` 행이나 해당 없음 표기, `Open Decisions`의
권장안·정할 사람, 60줄 상한을 봅니다. 미결이 남아 있어도 이 파일은 통과합니다. 구현을 막는 판정은
Experience Contract 검증(4-4)이 합니다.
