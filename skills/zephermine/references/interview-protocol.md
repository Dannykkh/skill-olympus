# Interview Protocol

The interview runs directly in this skill (not subagent) because user-facing questions must stay in the main conversation context.

## Context

The interview should be informed by:
- **Initial spec** (always available)
- **Research findings** (if step 5 produced `research.md`)
- **Unknowns map** (if step 5A produced `unknowns.md`)

If research was done, use it to:
- Skip questions already answered by research
- Ask clarifying questions about trade-offs or patterns discovered
- Dig deeper into areas where research revealed complexity

## Philosophy

- You are a senior architect **and product strategist** accountable for this implementation
- 표면적 요구사항 뒤에 있는 **진짜 목표와 욕망**을 파악하되, 작업을 멈춰가며 전부 묻지 않는다
- 사용자가 "무엇"을 말했을 때 "왜"가 아키텍처/데이터/보안/UX/배포를 바꿀 때만 질문한다
- 디자인은 기능의 부산물이 아니라 **의도적 선택** — 획일적 디자인을 경계하라
- **쉬운 말로 질문하라** — 전문용어에는 반드시 괄호로 풀어쓰기를 붙여라
- Surface everything the user knows but hasn't mentioned as assumptions first; ask only about blockers
- Assume the initial spec is incomplete
- Extract context from user's head only where inference would be risky

## Technique

- Default to no live interview when the spec, research, and `unknowns.md` are enough to form a conservative plan
- Ask at most 3 blocking questions total before proceeding, unless the user explicitly asks for a deeper interview
- Ask one question at a time when the answer could change architecture, data models, security boundaries, UX flow, or rollout strategy
- Use plain text numbered questions for open-ended interview prompts
- Use a structured question tool only for short bounded choices
- Prefer a recommended default inside the question: "I will assume X unless you say Y"
- Don't ask obvious questions already in spec
- Dig deeper only when answers reveal a new critical unknown
- Summarize as `[inferred]` assumptions in `interview.md`; do not require confirmation by default
- Prefer questions from `unknowns.md` over generic interview prompts; highest-impact unknowns come first
- **쉬운 말로 질문하기**: 전문용어를 쓸 때는 반드시 괄호 안에 풀어서 설명을 붙여라. 사용자가 개발자가 아닐 수 있다. 초등학생도 이해할 수 있는 수준으로 질문하되, 전문성은 유지하라.

## Structured Tool Compatibility

`Invalid tool parameters` 방지를 위해 인터뷰에서는 다음 규칙을 지킵니다:

| 상황 | 처리 |
|------|------|
| 자유 답변이 필요한 질문 | 구조화 도구를 쓰지 말고 일반 텍스트로 질문 |
| 질문이 4개 이상 | 2-3개씩 나누어 순차 질문 |
| 구조화 도구 사용 | 한 번에 최대 3개 question, 각 question은 2-3개 선택지만 사용 |
| 다중 선택이 필요한 선택 | CLI가 명시 지원할 때만 구조화 UI를 사용. 아니면 번호 목록으로 묻고 복수 번호 답변을 받음 |
| `Invalid tool parameters` 1회 발생 | 같은 도구 재시도 금지. 즉시 일반 텍스트 질문으로 전환 |

예: "핵심 4가지를 묻습니다"는 구조화 도구 한 번으로 호출하지 않습니다. `1-2번`을 먼저 묻고 답변 후 `3-4번`을 묻거나, 일반 텍스트 번호 목록으로 한 번에 제시합니다.

## 질문 작성 규칙

**전문용어에는 반드시 쉬운 설명을 붙인다:**
```
❌ "확장성 목표치가 어떻게 되나요?"
✅ "확장성(사용자가 늘어나도 느려지지 않는 것) 목표가 어떻게 되나요?"

❌ "API 연동이 필요한 외부 시스템이 있나요?"
✅ "다른 서비스와 데이터를 주고받아야(API 연동) 하는 게 있나요?"

❌ "레이턴시 허용 범위는?"
✅ "버튼을 눌렀을 때 결과가 나오기까지 몇 초 정도면 괜찮을까요?"
```

**원칙:**
- 전문용어를 먼저 쓰고 괄호 안에 일상 언어로 풀어쓰기
- 또는 일상 언어로 먼저 쓰고 괄호 안에 전문용어 표기
- 비유/예시를 적극 활용: "마치 ~처럼", "예를 들어 ~같은"
- 한 질문에 개념 2개 이상 섞지 않기

## Example Questions

**Good questions (쉬운 말 + 전문용어 병기):**
- "X가 실패하면(예: 서버가 갑자기 멈추면) 어떻게 할까요? 자동으로 다시 시도? 기록만 남기기? 사용자에게 알려주기?"
- "이미 프로젝트에 비슷한 방식으로 만들어진 부분이 있나요? 있으면 그 방식을 따르는 게 좋을까요?"
- "사용자가 얼마나 될 것 같나요? 수십 명? 수천 명? 아니면 수백만 명 수준?"

**Bad questions (전문용어만, 풀어쓰기 없음):**
- "컴포넌트 레이지 로딩 전략은?"
- "CQRS 패턴 적용할 건가요?"
- "CI/CD 파이프라인 요구사항은?"

## CPS Interview Framework

인터뷰는 **3 Phase + 3 Soft Gate** 구조로 정리하지만, 기본 실행은 "질문 세션"이 아니라 "추론 + 필요한 질문만"입니다.

- Phase C/P/S 질문 목록은 체크리스트입니다. 전부 묻지 않습니다.
- `unknowns.md`의 Architecture-changing questions 중 Critical 항목만 우선합니다.
- 각 Gate는 사용자 승인 절차가 아니라 `interview.md`에 남기는 요약 섹션입니다.
- Gate에서 막는 경우는 그 결정을 틀리면 이후 설계가 크게 바뀌는 경우뿐입니다.
- 막히지 않는 항목은 `[inferred]`로 표시하고 다음 Phase로 진행합니다.

> **젭마인의 CPS = 구현 관점 CPS.**
> 사업성 분석(시장, 수익모델, 경쟁전략)은 헤르메스(/hermes)의 영역.
> 젭마인은 "어떻게 만드는가"에 집중합니다.

### 헤르메스 산출물 임포트

인터뷰 시작 전, `<planning_dir>/` 또는 프로젝트 루트에 헤르메스 산출물이 있는지 확인:
- `biz-strategy.md`, `market-analysis.md`, `business-model-canvas.md` 등

**있으면:** 사업 전제(시장, 타겟, 수익모델)를 Phase C의 기정 사실(given context)로 깔고,
사업 관련 질문은 건너뜁니다. "헤르메스 분석에서 {요약}으로 파악되었는데, 이 전제로 진행합니다."

**없으면:** Phase C에서 최소한의 사업 전제만 확인합니다 (상세 분석은 하지 않음).

---

### Phase C: 구현 컨텍스트 (Implementation Context)

"우리가 같이 깔고 있는 전제가 뭔가?"를 맞춥니다.
구현에 필요한 **공유 전제**를 확립합니다.

질문 방향:
- **궁극적 목표**: "이 기능이 완성되면 사용자(또는 비즈니스)에게 어떤 변화가 일어나길 바라나요?"
- **숨겨진 동기**: "이걸 만들어야겠다고 결심한 계기가 있나요? 어떤 불편이나 기회를 봤나요?"
- **성공의 정의**: "6개월 후 '이건 정말 잘 만들었다'고 느끼려면, 어떤 상태여야 하나요?"
- **적용 산업/분야**: "이 서비스가 어떤 분야(산업)에서 쓰이나요? (예: 의료, 금융, 교육, 물류, 제조, 이커머스, 부동산 등)"
- **핵심 업무 프로세스**: "그 분야에서 가장 중요한 업무 흐름(프로세스)이 뭔가요? 이 서비스가 그 중 어디에 해당하나요?"
- **이해관계자**: "이 서비스를 쓰는 사람, 관리하는 사람, 돈을 내는/결정하는 사람이 각각 누군가요?"
- **에코시스템**: "이 서비스가 동작하려면 연결되어야 하는 다른 시스템/앱이 있나요? (결제, 지도, CRM, 기사앱, 관리자페이지 등)"
- **기존 환경**: "이미 만들어진 코드나 시스템이 있나요? 기술 스택은 정해져 있나요?"
- **구현 범위**: "아이디어 단계인가요, MVP인가요, 기존 서비스 리뉴얼인가요?"

탐색 기법:
- **산업군 파악**: 사용자의 답변에서 산업군을 식별하고, Step 10 Team Analysis에서
  도메인 전문가 에이전트의 페르소나를 동적으로 구성하는 데 활용.
  인터뷰 트랜스크립트에 `[Industry: {산업군}]` 태그를 명시적으로 기록.
- 이해관계자가 여러 명이면, 각 역할별로 별도 앱/화면이 필요한지 반드시 검토하고 필요 시 Critical 질문으로 승격
- 에코시스템 질문에서 "없다"는 답이 나와도, 업무 흐름상 필요한 연동을 되물어 확인

#### Soft Gate 1: 구현 전제 요약

Phase C 체크가 끝나면, 파악한 내용을 **구조화된 요약**으로 정리하여 `interview.md`에 기록합니다. 사용자 확인은 기본값이 아닙니다.

```
Plain confirmation question only when the premise is blocking:
"지금까지 파악한 구현 전제를 정리했습니다:

📌 목표: {궁극적 목표}
📌 산업: {산업/분야} | 구현 범위: {MVP/풀/리뉴얼}
📌 성공 기준: {성공의 정의}

📌 이해관계자:
| 역할 | 설명 |
|------|------|
| {역할1} | {설명} |
| {역할2} | {설명} |

📌 필요 시스템 (에코시스템 맵):
| 시스템 | 대상 | 연동 방식 |
|--------|------|-----------|
| {시스템1} | {누구를 위해} | {내장/외부API/제외} |
| {시스템2} | {누구를 위해} | {내장/외부API/제외} |

📌 기존 환경: {기술 스택/기존 코드 요약}

이 전제가 맞나요? 빠진 게 있으면 알려주세요.
(수정할 부분이 있으면 말씀해주세요 / 맞으면 '확인')"
```

→ 차단 이슈가 아니면 `[inferred]` 표시 후 Phase P로 진행
→ 차단 이슈라면 한 질문만 묻고, 답을 받은 뒤 진행

---

### Phase P: 구현 난제 (Implementation Problems)

"이걸 만들 때 뭐가 어려운가?"를 정의합니다.
기술적 난제와 제약을 명확히 합니다.

질문 방향:
- **고객 pain point**: "고객(사용자)이 지금 가장 불편해하는 구체적인 상황을 묘사해주세요"
- **비즈니스 pain point**: "이 문제 때문에 비즈니스에서 잃고 있는 것은? (비용, 시간, 기회)"
- **현재 대안의 한계**: "지금 고객이 이 문제를 어떻게 해결하고 있고, 뭐가 부족한가요?"
- **기술적 난제**: "만들면서 가장 어려울 것 같은 부분이 있나요? (실시간 처리, 복잡한 로직, 대용량 등)"
- **연동 리스크**: "기존에 만들어둔 시스템과 잘 맞물리는지(호환성) 걱정되는 부분이 있나요?"
- **팀/일정 제약**: "마감이 있나요? 개발 인원이나 기술 역량에 제한이 있나요?"

탐색 기법:
- **5 Whys**: 첫 답변에서 "왜 그게 중요한가요?"를 2~3번 더 파고들기
- 사용자가 "그냥 필요해서"라고 답하면, 구체적 시나리오로 유도: "어떤 상황에서 가장 절실하게 필요한가요?"
- 감정 단어에 주목 — "답답한", "느린", "불안한" 등이 나오면 거기가 핵심 pain point
- 기술적 난제가 "없다"는 답이 나와도, Phase C의 에코시스템을 보며 연동 복잡도를 되물어 확인

#### Soft Gate 2: 핵심 문제 요약

Phase P 체크가 끝나면, 핵심 문제를 **1~3개로 수렴**하여 `interview.md`에 기록합니다. 사용자 확인은 기본값이 아닙니다.

```
Plain confirmation question only when the problem priority is blocking:
"인터뷰를 통해 파악한 핵심 문제입니다:

| # | 핵심 문제 | 영향 | 우선순위 |
|---|-----------|------|----------|
| P1 | {문제1} | {영향} | 🔴 필수 |
| P2 | {문제2} | {영향} | 🟠 중요 |
| P3 | {문제3} | {영향} | 🟡 있으면 좋음 |

이 문제 정의와 우선순위가 맞나요?
(수정/추가/삭제할 문제가 있으면 말씀해주세요 / 맞으면 '확인')"
```

→ 차단 이슈가 아니면 `[inferred]` 표시 후 Phase S로 진행
→ 차단 이슈라면 한 질문만 묻고, 답을 받은 뒤 진행

---

### Phase S: 구현 해법 (Implementation Solution)

"그러면 어떻게 만들까?"를 설계합니다.
Phase C의 전제 위에서, Phase P의 문제를 해결하는 방향을 잡습니다.

Phase S는 프로젝트 특성에 따라 해당하는 카테고리만 선택적으로 진행합니다.

#### S-1. 차별화 + 디자인 비전

- **차별화**: "비슷한 서비스/기능이 이미 있다면, 우리 것은 뭐가 달라야 하나요?"
- **전체 톤/무드**: "이 화면을 봤을 때 어떤 느낌(분위기)을 받고 싶으신가요? (예: 미니멀/클린, 대담/임팩트, 따뜻/친근, 전문적/신뢰감)"
- **벤치마킹**: "참고하고 싶은 사이트나 앱이 있나요? 거기서 특히 어떤 부분이 마음에 드나요?"
- **색상 선호**: "선호하는 색상 조합이나, 절대 피하고 싶은 색상이 있나요?"
- **레이아웃 스타일**: "정보가 밀집된 대시보드형 vs 여백이 넉넉한 매거진형, 어느 쪽에 가까운가요?"
- **아트 디렉션**: "일러스트/아이콘 스타일, 폰트 느낌, 사진 사용 여부 등 구체적 선호가 있나요?"
- **안티 패턴**: "절대 이런 디자인은 싫다, 하는 예시가 있나요?"

탐색 기법:
- 사용자가 "잘 모르겠다"면, 2-3개 대비되는 사이트/스타일을 제시하고 선택하게 유도
- "예쁜 것"이라는 답변이 나오면, "어떤 종류의 예쁨인가요? Apple처럼 미니멀한 예쁨? 혹은 Dribbble에서 볼 수 있는 화려한 예쁨?"으로 구체화
- 벤치마킹 사이트가 있으면 URL을 기록해 두고, 이후 spec에 반영

#### S-2. 기술적 구현 (Technical Implementation)
- 구조(아키텍처)를 왜 이렇게 잡았는지, 다른 방법도 고려했는지
- 사용자가 늘어나도 괜찮을지(확장성), 속도 목표(성능)
- 다른 서비스와 데이터를 주고받을 일(외부 연동)이 있는지, 데이터 양은 얼마나 되는지
- 문제가 생겼을 때 어떻게 복구할지(에러 처리)

#### S-3. UI/UX 상세
- 사용자가 실제로 이 화면을 어떤 순서로 쓰게 되는지(사용 시나리오)
- 핸드폰에서도 잘 보여야 하는지(모바일), 장애가 있는 분도 쓸 수 있어야 하는지(접근성)
- 데이터를 불러오는 중이거나 오류가 났을 때 화면에 뭘 보여줄지
- **S-1에서 파악한 디자인 비전을 구체적 UI 요소에 매핑**

#### S-4. 제약사항 (Constraints)
- 개인정보나 민감한 데이터가 있는지, 법적으로 지켜야 할 규정이 있는지
- 보안 요구사항 (인증, 암호화, 감사 로그)

#### S-5. 트레이드오프 (Trade-offs)
- 빠르게 만들기 vs 완벽하게 만들기, 기능을 많이 넣기 vs 핵심만 잘 만들기
- 첫 출시(MVP)에 꼭 들어가야 할 것과 나중에 해도 될 것
- 지금 빠르게 만들되 나중에 고쳐야 할 부분(기술 부채)을 얼마나 허용할지

#### S-6. 비기능 요구사항
- 24시간 멈추면 안 되는지(가용성), 데이터 백업/복구 방법
- 문제가 생기면 자동으로 알림이 오게 할지(모니터링), 누가 뭘 했는지 기록(감사 로그)

#### Soft Gate 3: 솔루션 방향 요약

Phase S 체크가 끝나면, 솔루션 방향을 **요약**하여 `interview.md`에 기록합니다. 사용자 확인은 기본값이 아닙니다.

```
Plain confirmation question only when the solution direction is blocking:
"솔루션 방향을 정리했습니다:

📌 차별화: {차별화 포인트}
📌 디자인 톤: {디자인 비전 요약}
📌 기술 방향: {주요 기술 선택}
📌 MVP 범위: {포함/제외 기능}
📌 주요 트레이드오프: {선택한 방향 vs 포기한 것}

이 방향으로 설계를 진행할까요?
(수정할 부분이 있으면 말씀해주세요 / 맞으면 '확인')"
```

→ 차단 이슈가 아니면 `[inferred]` 표시 후 인터뷰 종료, 다음 스텝으로 진행
→ 차단 이슈라면 한 질문만 묻고, 답을 받은 뒤 진행

---

## When to Stop

**Critical blocker가 없으면 인터뷰를 시작하지 않고 종료할 수 있습니다.**

인터뷰를 종료하고 다음 단계로 진행하는 조건:
1. `unknowns.md`에 Critical architecture-changing question이 없음
2. Critical 질문을 최대 3개까지 물었고 답을 받음
3. 사용자가 "모르겠다", "알아서 해줘", "추천대로"라고 답함
4. 남은 질문이 Plan의 Open Questions에 남겨도 되는 비차단 항목임

사용자가 대부분의 질문에 "모르겠다" 또는 "알아서 해줘"로 답하면:
- 보수적 기본값을 선택하고 `[inferred]`로 표시
- 사용자가 직접 확인을 요청하지 않는 한 멈추지 않음

## Saving the Transcript

After the interview, save the full Q&A plus inferred assumptions to `<planning_dir>/interview.md`. If no live questions were needed, write an inferred transcript with `Questions Asked: 0`.

CPS Phase 구분과 Soft Gate 결과를 포함하여 저장:

```markdown
# Interview Transcript

## Phase C: Implementation Context
### Q1: {질문}
{답변}

### Q2: {질문}
{답변}

### Soft Gate 1 Result: Inferred or Confirmed
**구현 전제 요약:**
- 목표: {목표}
- 산업: {산업} | 범위: {범위}
- 이해관계자: {목록}
- 에코시스템: {시스템 목록}
- 기존 환경: {기술 스택}

---

## Phase P: Implementation Problems
### Q3: {질문}
{답변}

### Soft Gate 2 Result: Inferred or Confirmed
**핵심 문제:**
| # | 문제 | 영향 | 우선순위 |
|---|------|------|----------|
| P1 | {문제} | {영향} | 🔴 필수 |

---

## Phase S: Implementation Solution
### Q4: {질문}
{답변}

### Soft Gate 3 Result: Inferred or Confirmed
**솔루션 방향:**
- 차별화: {포인트}
- 디자인: {톤}
- 기술: {스택}
- MVP: {범위}
```

Questions are numbered sequentially across all phases (Q1, Q2, ... Qn).
