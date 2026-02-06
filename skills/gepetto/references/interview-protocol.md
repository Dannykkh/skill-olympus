# Interview Protocol

The interview runs directly in this skill (not subagent) because `AskUserQuestion` only works in main conversation context.

## Context

The interview should be informed by:
- **Initial spec** (always available)
- **Research findings** (if step 5 produced `claude-research.md`)

If research was done, use it to:
- Skip questions already answered by research
- Ask clarifying questions about trade-offs or patterns discovered
- Dig deeper into areas where research revealed complexity

## Philosophy

- You are a senior architect **and product strategist** accountable for this implementation
- 표면적 요구사항 뒤에 있는 **진짜 목표와 욕망**을 파악하라
- 사용자가 "무엇"을 말하면, "왜"를 물어라
- 디자인은 기능의 부산물이 아니라 **의도적 선택** — 획일적 디자인을 경계하라
- Surface everything the user knows but hasn't mentioned
- Assume the initial spec is incomplete
- Extract context from user's head

## Technique

- Use AskUserQuestion with focused questions (2-4 per round)
- Ask open-ended questions, not yes/no
- Don't ask obvious questions already in spec
- Dig deeper when answers reveal complexity
- Summarize periodically to confirm understanding

## Example Questions

**Good questions:**
- "What happens when X fails? Should we retry, log, or surface to user?"
- "Are there existing patterns in the codebase for Y that we should follow?"
- "What's the expected scale - dozens, thousands, or millions of Z?"

**Bad questions (too vague):**
- "Anything else?"
- "Is that all?"
- "Do you have any other requirements?"

## Question Categories

인터뷰 시 다음 카테고리를 순서대로 커버합니다. 각 카테고리에서 2-4개 질문.
**A, B는 반드시 먼저 진행** — "왜"와 "어떤 느낌"을 먼저 잡고, 그 뒤에 구체적 구현으로 들어갑니다.

### A. 심층 목표 탐색 (Deep Goal Discovery)

사용자의 표면적 요구 뒤에 있는 **진짜 목표와 욕망**을 파악합니다.
스펙에 적힌 "무엇을 만든다"가 아니라, "왜 만드는가"를 탐색합니다.

질문 방향:
- **궁극적 목표**: "이 기능이 완성되면 사용자(또는 비즈니스)에게 어떤 변화가 일어나길 바라나요?"
- **숨겨진 동기**: "이걸 만들어야겠다고 결심한 계기가 있나요? 어떤 불편이나 기회를 봤나요?"
- **성공의 정의**: "6개월 후 '이건 정말 잘 만들었다'고 느끼려면, 어떤 상태여야 하나요?"
- **차별화**: "비슷한 서비스/기능이 이미 있다면, 우리 것은 뭐가 달라야 하나요?"

탐색 기법:
- **5 Whys**: 첫 답변에서 "왜 그게 중요한가요?"를 2-3번 더 파고들기
- 사용자가 "그냥 필요해서"라고 답하면, 구체적 시나리오로 유도: "어떤 상황에서 가장 절실하게 필요한가요?"
- 감정 단어에 주목 — "답답한", "느린", "불안한" 등이 나오면 거기가 핵심 pain point

### B. 디자인 비전 (Design Vision & Aesthetics)

획일적 디자인을 피하기 위해 사용자의 **심미적 취향과 디자인 방향성**을 탐색합니다.
코드로 구현하기 전에 "어떤 느낌이어야 하는가"를 명확히 합니다.

질문 방향:
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

### C. 기술적 구현 (Technical Implementation)
- 아키텍처 선택 이유, 대안 고려 여부
- 확장성/성능 목표치
- 외부 시스템 연동, 데이터 볼륨
- 에러 복구 방안

### D. UI/UX 상세
- 주요 사용자 시나리오
- 모바일/접근성/다국어
- 로딩/에러 상태 처리
- **B에서 파악한 디자인 비전을 구체적 UI 요소에 매핑**

### E. 우려사항 (Concerns)
- 기술적 리스크
- 레거시 호환성
- 보안 민감 데이터, 규정/컴플라이언스

### F. 트레이드오프 (Trade-offs)
- 속도 vs 품질, 기능 범위 vs 완성도
- MVP 범위, 기술 부채 허용

### G. 비기능 요구사항
- 가용성, 백업/복구
- 모니터링/알람, 로깅, 감사(Audit)

## When to Stop

Stop interviewing when you are confident you can:
1. Write a detailed implementation plan
2. Make no assumptions about requirements
3. Handle all edge cases the user cares about

If uncertain, ask one more round. Better to over-clarify than make wrong assumptions.

If the user predominantly answers with "I don't know" or "Up to you" to most questions, stop and move on.

## Saving the Transcript

After the interview, save the full Q&A to `<planning_dir>/claude-interview.md`:
- Format each question as a markdown heading
- Include the user's full answer below
- Number questions for reference (Q1, Q2, etc.)
