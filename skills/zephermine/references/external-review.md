# External Review Protocol

`plan.md`를 외부 LLM에게 독립적 리뷰를 받는 단계.

## Native Role Contract

| Semantic role | Claude | Codex | Antigravity | Grok | Boundary |
|---------------|--------|-------|--------|------|----------|
| `read-only-analysis` | `Explore` | `explorer` | `research` | `explore` | Return-only review; no file writes |
| `artifact-writer` | `general-purpose` | `worker` | 메인 또는 쓰기 도구를 명시한 사용자 정의 서브에이전트 | `general-purpose` | Write one uniquely assigned review file only |

- External CLI processes and native writers each own one unique review file. An external process may also write its provider-specific run log; it never writes a shared log. No reviewer edits `plan.md` or another review.
- Main/Lead owns `integration-notes.md`, all changes to `plan.md`, and every merge or shared-state decision.
- If external review and native delegation are unavailable, Main/Lead performs the same review sequentially in the main context.
- Use each runtime's configured default model; do not hardcode a model name.

## 실행 순서

### Step 0: CLI 존재 확인

```bash
which agy 2>/dev/null && echo "antigravity: OK" || echo "antigravity: NOT FOUND"
which codex 2>/dev/null && echo "codex: OK" || echo "codex: NOT FOUND"
```

설치 안 된 CLI는 건너뛰고, 둘 다 없으면 바로 Step 3(폴백)으로.

### Step 1: 리뷰 프롬프트 파일 생성

`<planning_dir>/reviews/` 디렉토리 생성 후 프롬프트 저장:

```bash
mkdir -p "<planning_dir>/reviews"
cat > "<planning_dir>/reviews/review-prompt.txt" << 'EOF'
You are a senior software architect reviewing an implementation plan.
Read the file at: <planning_dir>/plan.md

Identify:
- Potential footguns and edge cases
- Missing considerations
- Security vulnerabilities
- Performance issues
- Architectural problems
- Unclear or ambiguous requirements

Be specific and actionable. Reference specific sections.
Return the review only. Do not create or modify files; the caller captures your response in its uniquely assigned review file.
EOF
```

### Step 2: 병렬 리뷰 실행

Run up to two independent external CLI processes in parallel. Default timeout is 10 minutes per provider. Use longer timeouts only when the user explicitly asks for deep external review.

**Antigravity** — 기본 10분 안에 응답이 없으면 실패로 기록하고 확보된 리뷰와 native fallback으로 진행:
```bash
ANTIGRAVITY_TIMEOUT_SECONDS="${ANTIGRAVITY_TIMEOUT_SECONDS:-600}"
timeout "$ANTIGRAVITY_TIMEOUT_SECONDS" agy \
  -p "$(cat '<planning_dir>/reviews/review-prompt.txt')" \
  --output-format text \
  > "<planning_dir>/reviews/antigravity-review.md" 2>> "<planning_dir>/reviews/antigravity-review.log"
ANTIGRAVITY_EXIT=$?
if [ $ANTIGRAVITY_EXIT -eq 124 ]; then
  echo "[WARN] Antigravity review timeout (${ANTIGRAVITY_TIMEOUT_SECONDS}s 초과)" >> "<planning_dir>/reviews/antigravity-review.log"
elif [ $ANTIGRAVITY_EXIT -ne 0 ]; then
  echo "[WARN] Antigravity review 종료코드: $ANTIGRAVITY_EXIT" >> "<planning_dir>/reviews/antigravity-review.log"
fi
```

**Codex** — stdin으로 프롬프트 전달 + 파일 읽기는 Codex가 직접:
```bash
CODEX_REVIEW_TIMEOUT_SECONDS="${CODEX_REVIEW_TIMEOUT_SECONDS:-600}"
timeout "$CODEX_REVIEW_TIMEOUT_SECONDS" bash -c '
echo "$(cat "<planning_dir>/reviews/review-prompt.txt")" \
  | codex -a never exec \
    --sandbox workspace-write \
    --skip-git-repo-check \
    --output-last-message "<planning_dir>/reviews/codex-review.md" \
    >> "<planning_dir>/reviews/codex-review.log" 2>&1
'
CODEX_EXIT=$?
if [ $CODEX_EXIT -eq 124 ]; then
  echo "[WARN] Codex review timeout (${CODEX_REVIEW_TIMEOUT_SECONDS}s 초과)" >> "<planning_dir>/reviews/codex-review.log"
elif [ $CODEX_EXIT -ne 0 ]; then
  echo "[WARN] Codex review 종료코드: $CODEX_EXIT" >> "<planning_dir>/reviews/codex-review.log"
fi
```

> **Codex 주의사항:**
> - 프롬프트는 반드시 **stdin(echo | codex -a never exec)** 으로 전달 (인자 X)
> - `-a never`는 비대화형 실행에서 승인 대기로 멈추지 않게 하는 top-level 옵션입니다.
> - `--sandbox workspace-write`는 현재 Codex CLI에서 deprecated `--full-auto`의 실질 대체입니다. Codex가 파일을 만들거나 명령을 실행해도 중간 승인으로 멈추지 않습니다.
> - `--output-last-message`로 최종 응답만 리뷰 파일에 저장하고, 실행 로그는 provider별 고유 `*-review.log`에 남깁니다.
> - `--json`은 최종 응답 포맷이 아니라 이벤트 스트림(JSONL) 출력용이므로 리뷰 파일 저장에는 사용하지 않습니다.
> - 프롬프트가 지정한 workspace 파일을 Codex가 직접 읽습니다.

> **Antigravity 주의사항:**
> - headless 실행은 `agy -p`와 `--output-format text`를 사용합니다.
> - 리뷰는 읽기 전용이므로 `--dangerously-skip-permissions`를 사용하지 않습니다. 조직 또는 개인 permission policy가 읽기를 허용하지 않으면 실패로 기록하고 폴백합니다.
> - 모델을 고정하지 않습니다. 모델 지정이 필요하면 먼저 `agy models`의 현재 목록에서 선택합니다.

### Step 3: 결과 저장

각 리뷰 결과를 파일로 저장:
- `<planning_dir>/reviews/antigravity-review.md`
- `<planning_dir>/reviews/codex-review.md`

```markdown
# {Provider} Review
**Generated:** {timestamp}
---
{review_content}
```

## 실패 처리

| 상황 | 조치 |
|------|------|
| Antigravity만 성공 | codex-review.md 없이 진행 |
| Codex만 성공 | antigravity-review.md 없이 진행 |
| **둘 다 실패 / 둘 다 미설치** | 현재 CLI의 `artifact-writer`가 devil's advocate 리뷰 → `runtime-self-review.md`; 위임 불가 시 Main/Lead가 순차 작성 |
| Timeout | configured timeout이 자동 kill, 확보된 결과만 사용 |

### 폴백: Native Runtime Review

외부 리뷰를 모두 받지 못한 경우, 현재 CLI의 `artifact-writer`가 비판적 리뷰를 수행합니다. writer는 `runtime-self-review.md`만 작성하고, 위임할 수 없으면 Main/Lead가 같은 검토를 메인 컨텍스트에서 순차 수행합니다.

```
관점: devil's advocate (악마의 변호인)
- 모든 가정에 의문 제기
- "쉬워 보이는 것"의 숨겨진 복잡성 지적
- 빠진 엣지 케이스, 보안 취약점, 성능 병목
- Red Team 전문가와 유사하지만 전체 계획 수준에서 공격
```

결과를 `<planning_dir>/reviews/runtime-self-review.md`에 저장. Main/Lead만 이 결과를 `plan.md`와 `integration-notes.md`에 통합합니다.

**원칙: 외부 리뷰 실패로 계획 수립을 중단하지 않음.**
