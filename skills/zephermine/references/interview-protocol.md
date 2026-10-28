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
- Use a shared default budget of at most 3 design questions for the planning run unless the user requests a deeper interview. Count Step 6, Soft Gates, Step 11, and resumed sessions together in the existing `interview.md`; these are not separate allowances.
- Before asking, check the existing answers and cited research. Investigate public domain/technical facts with the bounded research or expert work items; a company-specific fact cannot be established by model agreement.
- Carry remaining public-domain investigation to the existing Step 10 expert work when it can be resolved there; do not add a second research pass or make the user fill that gap.
- Show a concise proposal: **finding + source → recommendation and reason → material trade-off → remaining user decision**, omitting parts that add no information. A low-impact choice within the authorized scope proceeds with a recorded assumption, without a confirmation question.
- Ask one unresolved question at a time only when a private fact or user-owned choice could materially change the plan. Resolve its prerequisite first; do not ask downstream questions whose relevance depends on that answer.
- Use plain text numbered questions for open-ended interview prompts
- Use a structured question tool only for short bounded choices
- Explain the recommended option and its impact inside a necessary question; keep a required answer/authorization pending rather than treating silence as acceptance
- Don't ask obvious questions already in spec
- Dig deeper only when answers reveal a new critical unknown
- Summarize as `[inferred]` assumptions in `interview.md`; do not require confirmation by default
- Prefer questions from `unknowns.md` over generic interview prompts; highest-impact unknowns come first
- **쉬운 말로 질문하기**: 전문용어를 쓸 때는 반드시 괄호 안에 풀어서 설명을 붙여라. 사용자가 개발자가 아닐 수 있다. 초등학생도 이해할 수 있는 수준으로 질문하되, 전문성은 유지하라.

The budget limits interview burden, not required authorization. At the limit, do not open another question round under a new phase name: record remaining decisions and what depends on them, continue independent planning, and report the specific input needed. A required permission still requires explicit authorization. Revisit an answered decision only when new evidence changes it; explain that change instead of asking again from scratch.

## Structured Tool Compatibility

`Invalid tool parameters` 방지를 위해 인터뷰에서는 다음 규칙을 지킵니다:

| 상황 | 처리 |
|------|------|
| 자유 답변이 필요한 질문 | 구조화 도구를 쓰지 말고 일반 텍스트로 질문 |
| 후보 질문이 4개 이상 | 자료·조사로 먼저 해소하고 같은 실행의 질문 예산 안에서 차단 질문만 선택 |
| 구조화 도구 사용 | 한 번에 최대 3개 question, 각 question은 2-3개 선택지만 사용 |
| 다중 선택이 필요한 선택 | CLI가 명시 지원할 때만 구조화 UI를 사용. 아니면 번호 목록으로 묻고 복수 번호 답변을 받음 |
| `Invalid tool parameters` 1회 발생 | 같은 도구 재시도 금지. 즉시 일반 텍스트 질문으로 전환 |

도구의 호출당 한도는 인터뷰 예산을 늘리지 않습니다. 여러 호출로 나눠 전체 질문 목록을 소진하지 않습니다.

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

**도메인 용어로 번역해서 묻는다 (쉬운 말로 푸는 것과 다름):**

쉬운 말은 초보자용 언어이고, 도메인 용어는 그 업계 실무자가 매일 쓰는 언어입니다. 사용자는 자기 업무의 전문가이므로, 시스템 용어를 일상어로 낮추는 것보다 **그 업계 용어로 되돌려 묻는 쪽**이 정확합니다.

```
❌ "역할별로 공용 화면 권한차등인가요, 별도 화면인가요?"   (시스템 용어)
❌ "화면을 나눠야 하나요?"                                   (쉽지만 업무가 안 보임)
✅ "고객센터 상담원이 마케팅팀과 같은 쿠폰 화면을 보되 발행 버튼만 안 보이면 되나요,
    아니면 상담 전용 조회 화면이 따로 있어야 하나요?"        (도메인 용어 + 실제 업무)

❌ "엔티티의 상태 전이를 정의해 주세요."
✅ "쿠폰이 발행되고 나서 어떤 상태들을 거치나요? (배포 → 사용 → 만료 같은 흐름)"

❌ "테넌트 격리 수준은?"
✅ "입점 업체가 다른 업체의 주문을 볼 수 있어야 하나요, 자기 것만 보나요?"
```

**어휘 출처 우선순위** — 도메인 전문가(Step 10)와 사전 v1(Step 8 끝)은 인터뷰 이후에 생기므로
인터뷰 시점에는 아래 세 가지로 어휘를 확보합니다.

| 순위 | 출처 | 사용법 |
|---|---|---|
| 1 | 사용자가 쓴 원문 (spec, 요청 문장) | 사용자가 쓴 단어를 그대로 되받아 씀. 임의로 표준화하지 않음 |
| 2 | Step 4~5 리서치 (경쟁사·업계 문서) | 업계 표준 명칭을 확인해 질문에 사용 |
| 3 | 글로벌 도메인 사전 (`~/.agent-memory/domain-dictionaries/{도메인}.md`) | **읽기 전용**으로 참고. 인터뷰 단계에서 쓰기 금지 |

Phase C 초반 `[Industry: {산업군}]`을 확정한 직후부터 **이후 모든 질문을 그 산업 용어로 번역**합니다.
번역할 용어가 확보되지 않으면 일반 용어로 묻되, 답변에 나온 업계 표현을 즉시 채택해 다음 질문부터 적용합니다.
확보한 용어는 Step 8 사전 v1의 시드가 됩니다.

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
- Gate에서 남은 차단 결정이 있으면 위 Technique의 권장안 형식으로 그 결정만 다룹니다. 전체 요약의 재승인을 받지 않습니다.
- 막히지 않는 항목은 `[inferred]`로 표시하고 다음 Phase로 진행합니다.

> **젭마인의 CPS = 구현 관점 CPS.**
> 사업성 분석(시장, 수익모델, 경쟁전략)은 헤르메스(/hermes)의 영역.
> 젭마인은 "어떻게 만드는가"에 집중합니다.

### 헤르메스 산출물 임포트

인터뷰 시작 전, `<planning_dir>/` 또는 프로젝트 루트에 헤르메스 산출물이 있는지 확인:
- `biz-strategy.md`, `market-analysis.md`, `business-model-canvas.md` 등

**있으면:** 사업 전제(시장, 타겟, 수익모델)와 원문의 검증 상태·근거·미확인 사항을 함께
Phase C에 가져오고 이미 답한 질문은 반복하지 않습니다. `Unvalidated`, 추정 수치, 관심 표현을
검증된 수요로 올려 적지 않습니다.

**없으면:** Phase C에서 최소한의 사업 전제만 확인합니다 (상세 분석은 하지 않음).
신규 제품의 수요가 설계를 좌우하면 `수요 미검증`과 현재 근거를 적고, 확인할 행동·지표·시점을
`unknowns.md`와 관련 위험 가정에 연결합니다. 실제 사용·지불·작업 시간 기록이 없으면
숫자를 만들지 않습니다. 기존 기능 수정에는 시장조사를 추가하지 않습니다.

---

### Phase C: 구현 컨텍스트 (Implementation Context)

"우리가 같이 깔고 있는 전제가 뭔가?"를 맞춥니다.
구현에 필요한 **공유 전제**를 확립합니다.

질문 방향:
- **궁극적 목표**: "이 기능이 완성되면 사용자(또는 비즈니스)에게 어떤 변화가 일어나길 바라나요?"
- **숨겨진 동기**: "이걸 만들어야겠다고 결심한 계기가 있나요? 어떤 불편이나 기회를 봤나요?"
- **성공의 정의**: "6개월 후 '이건 정말 잘 만들었다'고 느끼려면, 어떤 상태여야 하나요?"
- **적용 산업/분야**: "이 서비스가 어떤 분야(산업)에서 쓰이나요? (예: 의료, 금융, 교육, 물류, 제조, 이커머스, 부동산 등)"
- **핵심 업무 프로세스**: AI가 자료·도메인 조사로 업무 흐름을 먼저 제안하고, 설계를 바꾸는 회사 내부 예외만 확인
- **이해관계자**: "이 서비스를 쓰는 사람, 관리하는 사람, 돈을 내는/결정하는 사람이 각각 누군가요?"
- **에코시스템**: "이 서비스가 동작하려면 연결되어야 하는 다른 시스템/앱이 있나요? (결제, 지도, CRM, 기사앱, 관리자페이지 등)"
- **기존 환경**: AI가 저장소·문서·설정을 먼저 확인하고, 접근할 수 없는 외부 시스템 정보만 필요 시 확인
- **구현 범위**: "아이디어 단계인가요, MVP인가요, 기존 서비스 리뉴얼인가요?"

탐색 기법:
- **산업군 파악**: 사용자의 답변에서 산업군을 식별하고, Step 10 Team Analysis에서
  도메인 전문가 에이전트의 페르소나를 동적으로 구성하는 데 활용.
  인터뷰 트랜스크립트에 `[Industry: {산업군}]` 태그를 명시적으로 기록.
- 이해관계자가 여러 명이면, 각 역할별로 별도 앱/화면이 필요한지 반드시 검토하고 필요 시 Critical 질문으로 승격
- 이해관계자 답변이 나오면 곧바로 아래 **C-R 블록**으로 넘어가 시스템 역할을 확정. 이해관계자 목록 자체는 역할 표가 아님
- 기존 답과 조사 근거가 충돌할 때만 해당 연동의 필요성·권장안·영향을 설명하고 남은 결정을 확인

#### C-R. 시스템 역할과 권한 (Role Inventory)

이해관계자 답변에서 **시스템에 로그인하는 주체만** 골라낸 뒤 아래를 확인합니다. 이 결과가 Step 8 `spec.md`의 시스템 역할 표가 되고, DB·API·도면·운영 시나리오의 역할명 정본이 됩니다. 여기서 비면 이후 RBAC 산출물이 전부 추측이 됩니다.

질문 방향 — **직책·업무 이름으로 묻고, 역할/권한 같은 시스템 용어는 쓰지 않습니다.**

- **역할 목록**: "이 일에 관여하는 분들이 어떻게 나뉘나요? (예: 마케팅팀, 고객센터, 입점 업체, 회원)"
- **역할별 업무**: "{직책}은 하루에 여기서 주로 뭘 하나요? {다른 직책}은 못 하고 {직책}만 해야 하는 일이 있나요?"
- **화면 분리**: "{직책 A}가 {직책 B}와 같은 화면을 보되 {특정 버튼}만 안 보이면 되나요, 아니면 {직책 A} 전용 화면이 따로 있어야 하나요?"
- **금지 행동**: "{직책}이 실수로라도 하면 안 되는 일이 있나요? (예: {도메인 사례 — 금액 수정, 배송 확정 취소, 진료 기록 열람})"

`{직책}`·`{특정 버튼}`·`{도메인 사례}`는 위 어휘 출처 우선순위로 채웁니다. 채우지 못한 채
`{역할}`,`{리소스}` 같은 자리표시자를 그대로 사용자에게 보여주지 않습니다.

**화면 분리는 범위를 바꾸는 설계 결정입니다.** 기존 답·화면·역할별 업무로 판단하고 공용/별도 화면의 권장안과 근거를 제시합니다. 이미 정해진 구성을 재승인받지 않으며, 회사 내부 사용 방식이나 범위 선택이 미정일 때만 Critical 질문으로 남깁니다.

묻지 않고 적용하는 기본값 (`[inferred]`로 표시하고 계속 진행):

| 항목 | 기본값 | 되묻는 조건 |
|---|---|---|
| 슈퍼관리자 | 모든 기능에 접근하는 역할을 항상 1개 둔다 | 사용자가 "슈퍼관리자도 못 보는 영역이 있다"고 말할 때만 예외로 기록 |
| 역할 계층 | 상위 역할은 하위 역할의 권한을 모두 포함한다 | 포함되지 않는 예외가 실제로 있을 때만 질문 |
| 소유권 | 본인이 만든 데이터는 본인이 조회·수정할 수 있다 | 조직·테넌트 단위 공유가 필요하면 질문으로 승격 |
| 비로그인 방문자 | 공개 페이지(랜딩·검색·상세)가 있으면 `guest` 역할을 추가 | 전 페이지 인증이면 생략 |
| 배치·서비스 계정 | 스케줄 작업·웹훅·외부 연동이 있으면 역할로 추가 | 해당 없으면 생략 |

역할이 1개뿐이거나 인증이 없으면 `NOT APPLICABLE: single role`로 기록하고 이 블록 전체를 건너뜁니다.

#### Soft Gate 1: 구현 전제 요약

Phase C 체크가 끝나면, 파악한 내용을 **구조화된 요약**으로 정리하여 `interview.md`에 기록합니다. 사용자 확인은 기본값이 아닙니다.

```
interview.md 기록 예시 (전체 요약의 사용자 승인을 요구하지 않음):
지금까지 파악한 구현 전제:

📌 목표: {궁극적 목표}
📌 산업: {산업/분야} | 구현 범위: {MVP/풀/리뉴얼}
📌 성공 기준: {성공의 정의}

📌 이해관계자:
| 역할 | 설명 |
|------|------|
| {역할1} | {설명} |
| {역할2} | {설명} |

📌 시스템 역할 (로그인하는 주체만):
| 역할 ID | 표시명 | 하는 일 | 화면 |
|---------|--------|---------|------|
| {admin} | {관리자} | {업무} | {공용 화면 권한차등 / 별도 화면} |
| {user} | {일반 회원} | {업무} | {공용 화면 권한차등 / 별도 화면} |
(슈퍼관리자 전권, 상위 역할의 하위 권한 포함은 기본 적용 [inferred])

📌 필요 시스템 (에코시스템 맵):
| 시스템 | 대상 | 연동 방식 |
|--------|------|-----------|
| {시스템1} | {누구를 위해} | {내장/외부API/제외} |
| {시스템2} | {누구를 위해} | {내장/외부API/제외} |

📌 기존 환경: {기술 스택/기존 코드 요약}

미해결 결정: {없음 | 근거로 해결되지 않은 항목과 그에 의존하는 설계}
```

→ 차단 이슈가 아니면 `[inferred]` 표시 후 Phase P로 진행
→ 차단 이슈는 Technique의 공유 예산·권장안 형식으로 해당 결정만 확인. 답이 없으면 그에 의존하는 설계를 보류

---

### Phase P: 구현 난제 (Implementation Problems)

"이걸 만들 때 뭐가 어려운가?"를 정의합니다.
기술적 난제와 제약을 명확히 합니다.

질문 방향:
- **고객 pain point**: "고객(사용자)이 지금 가장 불편해하는 구체적인 상황을 묘사해주세요"
- **비즈니스 pain point**: "이 문제 때문에 비즈니스에서 잃고 있는 것은? (비용, 시간, 기회)"
- **현재 대안의 한계**: "지금 고객이 이 문제를 어떻게 해결하고 있고, 뭐가 부족한가요?"
- **기술적 난제**: AI가 코드·요구사항·조사로 실시간 처리, 복잡한 로직, 대용량 등의 위험과 해결안을 도출
- **연동 리스크**: AI가 기존 시스템의 계약·실행 근거를 확인하고, 공개 자료나 접근 가능한 코드에 없는 내부 제약만 필요 시 확인
- **팀/일정 제약**: "마감이 있나요? 개발 인원이나 기술 역량에 제한이 있나요?"

탐색 기법:
- 원인 분석은 코드·로그·조사와 기존 답으로 먼저 수행. 새 차단 결정이 발견될 때만 그 근거를 설명하고 질문
- 목표가 추상적이면 AI가 구체적 사용 시나리오와 성공 기준을 제안하고, 방향을 바꾸는 미확인 전제만 확인
- 감정 단어에 주목 — "답답한", "느린", "불안한" 등이 나오면 거기가 핵심 pain point
- 기술적 난제와 연동 복잡도는 AI가 조사·분석해 제안에 반영. 사용자에게 일반 기술 지식을 설명하도록 요구하지 않음

#### Soft Gate 2: 핵심 문제 요약

Phase P 체크가 끝나면, 핵심 문제를 **1~3개로 수렴**하여 `interview.md`에 기록합니다. 사용자 확인은 기본값이 아닙니다.

```
interview.md 기록 예시 (전체 요약의 사용자 승인을 요구하지 않음):
자료·조사·기존 답으로 파악한 핵심 문제:

| # | 핵심 문제 | 영향 | 우선순위 |
|---|-----------|------|----------|
| P1 | {문제1} | {영향} | 🔴 필수 |
| P2 | {문제2} | {영향} | 🟠 중요 |
| P3 | {문제3} | {영향} | 🟡 있으면 좋음 |

미해결 결정: {없음 | 사용자 목표 사이의 충돌과 권장 우선순위}
```

→ 차단 이슈가 아니면 `[inferred]` 표시 후 Phase S로 진행
→ 차단 이슈는 Technique의 공유 예산·권장안 형식으로 해당 결정만 확인. 답이 없으면 그에 의존하는 설계를 보류

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
- 사용자가 "잘 모르겠다"거나 선호가 추상적이면 기존 디자인·사용자 과업·벤치마크를 근거로 한 방향을 권장하고 제약을 설명. 선택을 반복 요구하지 않음
- 벤치마킹 사이트가 있으면 URL을 기록해 두고, 이후 spec에 반영

#### S-2. 기술적 구현 (Technical Implementation)
다음 항목은 AI가 조사해 권장안을 만드는 기준입니다. 사용자에게 설계 근거나 일반 기술 해법을 답하게 하지 않습니다.
- 구조(아키텍처)를 왜 이렇게 잡았는지, 다른 방법도 고려했는지
- 사용자가 늘어나도 괜찮을지(확장성), 속도 목표(성능)
- 다른 서비스와 데이터를 주고받을 일(외부 연동)이 있는지, 데이터 양은 얼마나 되는지
- AI 에이전트(Claude 등)에게 말로 시키고 싶은 일과 맡기면 안 되는 일 (MCP 도구로 열 범위 — `mcp-spec.md`의 에이전트 작업 요구 재료)
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
interview.md 기록 예시 (전체 요약의 사용자 승인을 요구하지 않음):
권장 솔루션 방향과 근거:

📌 차별화: {차별화 포인트}
📌 디자인 톤: {디자인 비전 요약}
📌 기술 방향: {주요 기술 선택}
📌 MVP 범위: {포함/제외 기능}
📌 주요 트레이드오프: {선택한 방향 vs 포기한 것}

미해결 결정: {없음 | 권장안의 전제 중 사용자 판단이 필요한 항목}
```

→ 차단 이슈가 아니면 `[inferred]` 표시 후 인터뷰 종료, 다음 스텝으로 진행
→ 차단 이슈는 Technique의 공유 예산·권장안 형식으로 해당 결정만 확인. 답이 없으면 그에 의존하는 설계를 보류

---

## When to Stop

**Critical blocker가 없으면 인터뷰를 시작하지 않고 종료할 수 있습니다.**

자료와 기존 답으로 충분하거나, 질문 예산에 도달했거나, 사용자가 "모르겠다"/"알아서 해줘"라고 하면 일반 인터뷰를 끝냅니다.
- 기술적·되돌리기 쉬운 설계 판단은 근거 있는 권장안으로 진행하고 미확인 가정은 `[inferred]`로 표시합니다.
- 회사 내부의 핵심 정책·필수 입력을 대신 지어내지 않습니다. 해결되지 않은 결정과 그에 의존하는 부분만 보류하고, 독립된 설계는 계속합니다.
- "알아서"는 설계 판단의 위임입니다. 기존 승인 범위를 넘는 외부 실행이나 필수 권한의 승인을 대신하지 않으며, 미응답도 승인으로 세지 않습니다.
- 남은 비차단 항목은 기존 Open Questions에 기록합니다. 새 인터뷰 문서나 별도 승인 장부를 만들지 않습니다.

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

### Role Inventory (C-R)
| 역할 ID | 표시명 | 하는 일 | 금지 행동 | 화면 | 출처 |
|---------|--------|---------|-----------|------|------|
| {admin} | {관리자} | {업무} | {금지} | {공용/별도} | {answered / inferred} |

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

Questions are numbered sequentially across all phases and resume (Q1, Q2, ... Qn). The template's sections are storage slots, not a requirement to ask a question in every phase. Keep `Questions Asked`, existing answers, and unresolved dependent decisions here so Step 11 reuses them.
