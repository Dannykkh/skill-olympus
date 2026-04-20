---
name: reducing-entropy
description: Manual-only skill for minimizing total codebase size. Only activate when explicitly requested by user. Measures success by final code amount, not effort. Bias toward deletion.
---

# Reducing Entropy

More code begets more code. Entropy accumulates. This skill biases toward the smallest possible codebase.

**Core question:** "What does the codebase look like *after*?"

## Before You Begin

**Load at least one mindset from `references/`**

1. List the files in the reference directory
2. Read frontmatter descriptions to pick which applies
3. Load at least one
4. State which you loaded and its core principle

**Do not proceed until you've done this.**

## The Goal

The goal is **less total code in the final codebase** - not less code to write right now.

- Writing 50 lines that delete 200 lines = net win
- Keeping 14 functions to avoid writing 2 = net loss
- "No churn" is not a goal. Less code is the goal.

**Measure the end state, not the effort.**

## Step 0: 현재 상태 측정 (Before)

변경 전 반드시 측정합니다. 측정 없는 감소는 감이지 사실이 아닙니다.

```bash
# 총 LOC (Lines of Code) — 프로덕션 코드만
find src/ app/ lib/ -name "*.ts" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" -o -name "*.cs" \
  | xargs wc -l 2>/dev/null | tail -1
# 예: 12,847 total

# 파일 수
find src/ app/ lib/ -name "*.ts" -o -name "*.tsx" -o -name "*.py" | wc -l
# 예: 94 files

# 500줄 이상 파일 (비대 후보)
find src/ -type f \( -name "*.ts" -o -name "*.py" \) -exec awk 'END{if(NR>500)print NR,FILENAME}' {} \;

# 사용되지 않는 export (ts-prune, depcheck)
npx ts-prune 2>/dev/null | grep -v "used in module" | wc -l
npx depcheck 2>/dev/null | head -20
```

**기록:** `Before: {N} LOC, {M} files`

## Three Questions

### 1. What's the smallest codebase that solves this?

Not "what's the smallest change" - what's the smallest *result*.

- Could this be 2 functions instead of 14?
- Could this be 0 functions (delete the feature)?
- What would we delete if we did this?

### 2. Does the proposed change result in less total code?

Count lines before and after. If after > before, reject it.

- "Better organized" but more code = more entropy
- "More flexible" but more code = more entropy
- "Cleaner separation" but more code = more entropy

### 3. What can we delete?

Every change is an opportunity to delete. Ask:

- What does this make obsolete?
- What was only needed because of what we're replacing?
- What's the maximum we could remove?

## 삭제 대상 체크리스트

| 카테고리 | 찾는 방법 | 삭제 가능? |
|---------|----------|-----------|
| 미사용 export | `npx ts-prune` | 호출처 0이면 삭제 |
| 미사용 의존성 | `npx depcheck` | import 없으면 제거 |
| 미사용 파일 | `npx unimported` | import 체인에 없으면 삭제 |
| 죽은 코드 | `// TODO: remove`, `@deprecated` | 기한 지났으면 삭제 |
| 중복 코드 | 같은 로직 2곳 이상 | 공통 함수 추출 후 원본 삭제 |
| 호환성 코드 | `// backwards compat`, 레거시 shim | 사용자 없으면 삭제 |
| 빈 파일/폴더 | `find . -empty` | 삭제 |

## Step Final: After 측정 + 비교

```bash
# 변경 후 동일 명령 재실행
find src/ app/ lib/ -name "*.ts" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" -o -name "*.cs" \
  | xargs wc -l 2>/dev/null | tail -1
```

```
Entropy Report:
  Before: {N} LOC, {M} files
  After:  {N'} LOC, {M'} files
  Delta:  {차이} LOC ({퍼센트}%), {파일 차이} files
  Verdict: {REDUCED / INCREASED / NEUTRAL}
```

**INCREASED면 다시 검토.** 코드가 늘었는데 기능이 같다면 엔트로피가 증가한 것입니다.

## Red Flags

- **"Keep what exists"** - Status quo bias. The question is total code, not churn.
- **"This adds flexibility"** - Flexibility for what? YAGNI.
- **"Better separation of concerns"** - More files/functions = more code. Separation isn't free.
- **"Type safety"** - Worth how many lines? Sometimes runtime checks in less code wins.
- **"Easier to understand"** - 14 things are not easier than 2 things.

## When This Doesn't Apply

- The codebase is already minimal for what it does
- You're in a framework with strong conventions (don't fight it)
- Regulatory/compliance requirements mandate certain structures

## Reference Mindsets

See `references/` for philosophical grounding.

To add new mindsets, see `adding-reference-mindsets.md`.

---

**Bias toward deletion. Measure the end state.**
