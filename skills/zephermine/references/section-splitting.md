# Section File Writing

Write individual section files from the plan using **parallel subagents** for efficiency.

This step assumes `sections/index.md` already exists.

## Input Files

- `<planning_dir>/claude-plan.md` - implementation details
- `<planning_dir>/sections/index.md` - section definitions and dependencies

## Output

```
<planning_dir>/sections/
├── index.md (already exists)
├── section-01-<name>.md
├── section-02-<name>.md
└── ...
```

## Parallel Execution Strategy

**Launch one subagent per section in a single message** for maximum parallelization:

```
┌─────────────────────────────────────────────────────┐
│  PARALLEL SUBAGENT APPROACH                         │
│                                                     │
│  1. Parse index.md to get SECTION_MANIFEST list     │
│  2. Check which sections already exist              │
│  3. Launch ALL missing sections as parallel Tasks:  │
│                                                     │
│     Task(prompt="Write section-01-...")             │
│     Task(prompt="Write section-02-...")             │
│     Task(prompt="Write section-03-...")             │
│     ... (all in ONE message)                        │
│                                                     │
│  4. Wait for all subagents to complete              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Parse SECTION_MANIFEST

Extract section list from index.md:

```markdown
<!-- SECTION_MANIFEST
section-01-foundation
section-02-config
section-03-api
END_MANIFEST -->
```

### Launch Parallel Tasks

For each section in the manifest, include a Task in a single message:

```python
Task(
  subagent_type="general-purpose",
  prompt="""
  Write section file: section-01-foundation

  Inputs:
  - <planning_dir>/claude-plan.md
  - <planning_dir>/sections/index.md

  Output: <planning_dir>/sections/section-01-foundation.md

  Requirements: [see Section File Template below]
  """
)

Task(
  subagent_type="general-purpose",
  prompt="Write section file: section-02-config ..."
)

# ... one Task per section
```

**Why parallel?** Each section is independent - they all read from the same source files (`claude-plan.md`, `index.md`) but write to different output files.

### Resume Handling

If some sections already exist:
1. Only launch Tasks for MISSING sections
2. Skip sections that have corresponding `section-*.md` files

## Section File Requirements

**CRITICAL: Each section file must be completely self-contained.**

The implementer reading a section file should NOT need to reference `claude-plan.md` or any other document. They should be able to:
1. Read the single section file
2. Create a TODO list
3. Start implementing immediately

Include all necessary background, requirements, and implementation details within each section.

**API가 있는 프로젝트**: `claude-api-spec.md`의 해당 엔드포인트를 섹션에 포함.
구현 중 새 API를 추가하면 반드시 `claude-api-spec.md`에도 등록 (규칙을 섹션 파일에 명시).

### Section File Template

```markdown
# Section NN: {Section Name}

## Background

{Why this section exists, what problem it solves}

## Requirements

{What must be true when this section is complete}

## Dependencies

- Requires: {list of prior sections that must be complete}
- Blocks: {list of sections that depend on this one}

## Reference Libraries

구현에 사용하는 주요 라이브러리. **코딩 전 Context7 MCP로 공식 문서를 확인**하여 최신 API에 맞춰 구현.

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| {library} | {version} | {purpose} |

## Implementation Details

{Detailed implementation guidance}

### {Subsection 1}

{Details}

### {Subsection 2}

{Details}

## Test Scenarios

이 섹션의 기능에 대한 입출력 기대값. 구현자가 테스트 코드 작성 시 참고.

### {기능/API 1}

| 케이스 | 입력 | 기대 결과 |
|--------|------|-----------|
| 정상 | {valid input} | {expected output} |
| 에러 - 필수값 누락 | {missing required} | 400, "{error message}" |
| 에러 - 중복 | {duplicate data} | 409, "{conflict message}" |
| 엣지 - 빈 값 | {} | 400, "{validation error}" |
| 엣지 - 최대값 초과 | {max+1 length} | 400, "{limit message}" |

### {기능/API 2}

| 케이스 | 입력 | 기대 결과 |
|--------|------|-----------|
| ... | ... | ... |

## Implementation Strategy

구현자가 따를 TDD 기반 접근 방식. 각 Phase를 순서대로 진행.

### Phase 1: Red (테스트 먼저)
- Test Scenarios 기반으로 테스트 파일 작성
- 모든 테스트가 실패(Red)하는 것을 확인

### Phase 2: Green (최소 구현)
- 테스트를 통과시키는 최소한의 코드 작성
- 동작하는 코드 먼저, 최적화는 나중에

### Phase 3: Refactor (개선)
- 중복 제거, 네이밍 개선, 구조 정리
- 테스트가 여전히 통과하는지 확인

## Quality Gate

이 섹션을 "완료"로 표시하기 전 반드시 확인할 체크리스트:

- [ ] 모든 Test Scenarios에 대응하는 테스트 코드 존재
- [ ] 빌드 에러 없음 (`npm run build` / `mvn compile` 등)
- [ ] 기존 테스트가 깨지지 않음 (회귀 없음)
- [ ] Dependencies의 선행 섹션이 모두 완료됨
- [ ] 새로 추가한 API가 `claude-api-spec.md`에 등록됨 (해당 시)

## Risk & Rollback

| 위험 요소 | 영향도 | 완화 전략 | 롤백 방법 |
|-----------|--------|-----------|-----------|
| {risk 1} | High/Medium/Low | {mitigation} | {rollback steps} |

> 구현 중 예상치 못한 위험 발견 시 이 테이블에 추가하고, 다음 섹션 진행 전 대응.

## Acceptance Criteria

- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}
- [ ] 위 Test Scenarios의 정상/에러/엣지 케이스가 모두 통과
- [ ] Quality Gate 전 항목 통과

## Files to Create/Modify

- `path/to/file1.ts` - {description}
- `path/to/file2.ts` - {description}
```

## Completion

All sections are complete when every section in the SECTION_MANIFEST has a corresponding `section-NN-name.md` file.

After all parallel Tasks complete, update the main TODO list to mark section writing as done.
