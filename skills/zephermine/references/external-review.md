# External Review Protocol

This step sends `claude-plan.md` to external LLMs (Gemini and Codex) for independent review using CLI subagents.

## Overview

Launch TWO parallel Bash commands to get external reviews:
1. **Gemini CLI** - Google's Gemini 3 Pro
2. **Codex CLI** - OpenAI's GPT-5.2

Both reviewers receive the same plan and return their analysis.

## Review Prompt

Use this prompt for both reviewers:

```
You are a senior software architect reviewing an implementation plan.

The plan is self-contained - it includes all background, context, and requirements.

Identify:
- Potential footguns and edge cases
- Missing considerations
- Security vulnerabilities
- Performance issues
- Architectural problems
- Unclear or ambiguous requirements
- Anything else worth adding to the plan

Be specific and actionable. Reference specific sections. Give your honest, unconstrained assessment.

Here is the plan to review:

{PLAN_CONTENT}
```

## Execution

### Step 1: Write Review Prompt File

프롬프트를 파일로 저장 (셸 인자 길이 제한 방지):

```bash
cat > "<planning_dir>/reviews/review-prompt.md" << 'PROMPT_END'
You are a senior software architect reviewing an implementation plan.

The plan is self-contained - it includes all background, context, and requirements.

Identify:
- Potential footguns and edge cases
- Missing considerations
- Security vulnerabilities
- Performance issues
- Architectural problems
- Unclear or ambiguous requirements
- Anything else worth adding to the plan

Be specific and actionable. Reference specific sections. Give your honest, unconstrained assessment.
PROMPT_END
```

### Step 2: Launch Both Reviews in Parallel

Use TWO Bash tool calls in a single message.
**핵심: 파일 경로(@)로 전달하여 대용량 계획서도 안정적으로 처리.**

**Gemini Review:**
```bash
gemini -m gemini-3-pro-preview --approval-mode yolo \
  "$(cat '<planning_dir>/reviews/review-prompt.md')" \
  @<planning_dir>/claude-plan.md
```

**Codex Review:**
```bash
codex exec -m gpt-5.2 --sandbox read-only --skip-git-repo-check --full-auto \
  "$(cat '<planning_dir>/reviews/review-prompt.md') 다음 파일을 리뷰하세요: <planning_dir>/claude-plan.md" \
  2>/dev/null
```

**둘 다 실패 시 폴백 - Claude 자체 리뷰:**
```bash
# Gemini/Codex 모두 실패하면 Claude가 직접 비판적 리뷰 수행
# devil's advocate 관점으로 자체 계획을 공격
```

### Step 3: Write Review Files

Create `<planning_dir>/reviews/` directory and write:
- `gemini-review.md` - Gemini's analysis
- `codex-review.md` - Codex's analysis

Format each file:
```markdown
# {Provider} Review

**Model:** {model_name}
**Generated:** {timestamp}

---

{review_content}
```

## Handling Failures

| Scenario | Action |
|----------|--------|
| Gemini fails, Codex succeeds | Write only codex-review.md, note Gemini failure |
| Codex fails, Gemini succeeds | Write only gemini-review.md, note Codex failure |
| Both fail | **Claude가 devil's advocate 관점으로 자체 리뷰 수행** → claude-self-review.md 작성 |
| CLI not installed | Skip that reviewer, note in output |
| Timeout (2분+) | Kill process, proceed with available results |

## Notes

- **Gemini**: Uses `--approval-mode yolo` for non-interactive execution
- **Codex**: Uses `--full-auto` and `2>/dev/null` to suppress thinking tokens
- Both CLIs must be installed and configured separately by the user
- If a CLI is not available, skip that reviewer and continue with the other
- **폴백 원칙**: 외부 리뷰가 모두 실패해도 계획 수립을 중단하지 않음. Claude 자체 비판적 리뷰로 대체하여 진행
