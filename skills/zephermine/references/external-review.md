# External Review Protocol

`claude-plan.md`를 외부 LLM에게 독립적 리뷰를 받는 단계.

## 실행 순서

### Step 0: CLI 존재 확인

```bash
which gemini 2>/dev/null && echo "gemini: OK" || echo "gemini: NOT FOUND"
which codex 2>/dev/null && echo "codex: OK" || echo "codex: NOT FOUND"
```

설치 안 된 CLI는 건너뛰고, 둘 다 없으면 바로 Step 3(폴백)으로.

### Step 1: 리뷰 프롬프트 파일 생성

`<planning_dir>/reviews/` 디렉토리 생성 후 프롬프트 저장:

```bash
mkdir -p "<planning_dir>/reviews"
cat > "<planning_dir>/reviews/review-prompt.txt" << 'EOF'
You are a senior software architect reviewing an implementation plan.
Read the file at: <planning_dir>/claude-plan.md

Identify:
- Potential footguns and edge cases
- Missing considerations
- Security vulnerabilities
- Performance issues
- Architectural problems
- Unclear or ambiguous requirements

Be specific and actionable. Reference specific sections.
EOF
```

### Step 2: 병렬 리뷰 실행

TWO Bash tool calls in a single message. **timeout 3분 설정.**

**Gemini** — `@file` 경로 참조 지원:
```bash
gemini -m gemini-3-pro-preview --approval-mode yolo \
  "$(cat '<planning_dir>/reviews/review-prompt.txt')" \
  @<planning_dir>/claude-plan.md
```

**Codex** — stdin으로 프롬프트 전달 + 파일 읽기는 Codex가 직접:
```bash
echo "$(cat '<planning_dir>/reviews/review-prompt.txt')" \
  | codex exec -m gpt-5.2 \
    --sandbox read-only \
    --skip-git-repo-check \
    --full-auto \
    2>/dev/null
```

> **Codex 주의사항:**
> - 프롬프트는 반드시 **stdin(echo | codex exec)** 으로 전달 (인자 X)
> - `--sandbox read-only`이므로 파일 읽기 가능 → 프롬프트에 경로만 명시
> - `2>/dev/null`로 thinking 토큰 숨김
> - `@file` 문법 미지원 (Gemini만 지원)

### Step 3: 결과 저장

각 리뷰 결과를 파일로 저장:
- `<planning_dir>/reviews/gemini-review.md`
- `<planning_dir>/reviews/codex-review.md`

```markdown
# {Provider} Review
**Model:** {model_name}
**Generated:** {timestamp}
---
{review_content}
```

## 실패 처리

| 상황 | 조치 |
|------|------|
| Gemini만 성공 | codex-review.md 없이 진행 |
| Codex만 성공 | gemini-review.md 없이 진행 |
| **둘 다 실패 / 둘 다 미설치** | **Claude가 devil's advocate 관점으로 자체 리뷰** → `claude-self-review.md` 작성 |
| Timeout (3분+) | 프로세스 kill, 확보된 결과만 사용 |

### 폴백: Claude 자체 리뷰

외부 리뷰를 모두 받지 못한 경우, Claude가 직접 비판적 리뷰를 수행:

```
관점: devil's advocate (악마의 변호인)
- 모든 가정에 의문 제기
- "쉬워 보이는 것"의 숨겨진 복잡성 지적
- 빠진 엣지 케이스, 보안 취약점, 성능 병목
- Red Team 에이전트와 유사하지만 전체 계획 수준에서 공격
```

결과를 `<planning_dir>/reviews/claude-self-review.md`에 저장.

**원칙: 외부 리뷰 실패로 계획 수립을 중단하지 않음.**
