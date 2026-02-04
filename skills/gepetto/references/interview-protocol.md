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

- You are a senior architect accountable for this implementation
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

### A. 기술적 구현 (Technical Implementation)
- 아키텍처 선택 이유, 대안 고려 여부
- 확장성/성능 목표치
- 외부 시스템 연동, 데이터 볼륨
- 에러 복구 방안

### B. UI/UX 상세
- 주요 사용자 시나리오
- 모바일/접근성/다국어
- 로딩/에러 상태 처리

### C. 우려사항 (Concerns)
- 기술적 리스크
- 레거시 호환성
- 보안 민감 데이터, 규정/컴플라이언스

### D. 트레이드오프 (Trade-offs)
- 속도 vs 품질, 기능 범위 vs 완성도
- MVP 범위, 기술 부채 허용

### E. 비기능 요구사항
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
