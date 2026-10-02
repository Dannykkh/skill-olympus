# Section File Writing

Write individual section files from the plan using bounded **general-write jobs** when parallelism is useful.

This step assumes `sections/index.md` already exists.

## Input Files

- `<planning_dir>/plan.md` - implementation details
- `<planning_dir>/sections/index.md` - section definitions and dependencies
- `<planning_dir>/flow-diagrams/*.mmd` - process flow diagrams (있는 경우)

## Output

```
<planning_dir>/sections/
├── index.md (already exists)
├── section-01-<name>.md
├── section-02-<name>.md
└── ...
```

## Batched Execution Strategy

Write sections in dependency-aware batches. Do not launch every missing section at once.

```
┌─────────────────────────────────────────────────────┐
│  BATCHED GENERAL-WRITE APPROACH                     │
│                                                     │
│  1. Parse index.md to get SECTION_MANIFEST list     │
│  2. Check which sections already exist              │
│  3. Group missing sections by dependency layer      │
│  4. Launch at most 3 section jobs per batch:        │
│                                                     │
│     job: Write section-01-...                       │
│     job: Write section-02-...                       │
│     job: Write section-03-...                       │
│                                                     │
│  5. Wait for the batch, then launch next batch      │
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

### Launch Batched Section Jobs

For each dependency layer, include at most 3 section jobs in one batch. Map general-write to Claude `general-purpose`, Codex `worker`, Antigravity main or a custom subagent with explicit write tools, or Grok `general-purpose`. Assign exactly one section file to each job. Main/Lead alone owns `sections/index.md`, the batch ledger, and completion judgment. If native delegation is unavailable or parallelism has no benefit, Main writes the sections sequentially.

```text
Job prompt:
Write section file: section-01-foundation

Inputs:
- <planning_dir>/plan.md
- <planning_dir>/sections/index.md
- <planning_dir>/flow-diagrams/index.md (있으면 참조 — 이 섹션의 담당 노드 확인)

Output: <planning_dir>/sections/section-01-foundation.md

Requirements: [see Section File Template below]

Job prompt:
Write section file: section-02-config ...

# ... next batch after this batch completes
```

**Why batched?** Sections can be independent, but all tasks read the same large source files. Launching every section at once can trigger API overload or context pressure. A batch size of 3 keeps throughput while preserving reliability.

If a batch hits `Overloaded`, timeout, or context-limit symptoms:
1. Retry failed sections one at a time.
2. Reduce each prompt to only the specific section manifest entry plus relevant files.
3. Preserve any completed section files and continue from missing sections.

### Resume Handling

If some sections already exist:
1. Only run jobs for MISSING sections
2. Skip sections that have corresponding `section-*.md` files

## Section File Requirements

**CRITICAL: Each section file must be completely self-contained.**

The implementer reading a section file should NOT need to reference `plan.md` or any other document. They should be able to:
1. Read the single section file
2. Create a TODO list
3. Start implementing immediately

Include all necessary background, requirements, and implementation details within each section.

**Acceptance Criteria**: 섹션 번호를 `NN`으로 쓰는 `AC-NN-k` ID, 관찰 가능한 동작, 근거(P·화면·엔드포인트·역할), 검증(테스트 이름·QA ID·명령)을 갖춥니다. 이 섹션 목록이 정본이며 형식은 [acceptance-checklist-guide.md](acceptance-checklist-guide.md)를 따릅니다. 빌드·회귀 같은 공통 조건은 AC로 세지 않고 Quality Gate에 둡니다.

**API가 있는 프로젝트**: `api-spec.md`의 해당 엔드포인트를 섹션에 포함.
구현 중 새 API를 추가하면 반드시 `api-spec.md`에도 등록 (규칙을 섹션 파일에 명시).
섹션은 자립형이므로 `api-spec.md` Conventions 중 이 섹션에 해당하는 규약(목록 페이지네이션 방식·크기 상한·정렬 허용 컬럼, 공통 에러 형식)과 목록 엔드포인트의 Index 줄도 함께 옮깁니다. 구현자가 이 규약을 모르면 페이지네이션 없는 목록과 N+1 쿼리가 나옵니다.

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

> 위는 **빌드 순서**입니다. 런타임 조립은 아래 Module Contract가 소유합니다.

## Module Contract

이 섹션이 독립 모듈로서 무엇을 약속하는지. 옆 모듈은 여기 적힌 것만 믿고 붙습니다.
내부 구현 세부는 적지 않습니다 — 바뀌어도 계약이 유지되면 옆 모듈은 영향받지 않아야 합니다.

- **Provides**: {이 모듈이 외부에 공개하는 것 — 인터페이스·타입·이벤트·라우트}
  - `{이름}` — {시그니처 또는 페이로드}
- **Consumes**: {이 모듈이 다른 모듈에서 가져다 쓰는 것. 출처 섹션을 함께 표기}
  - `{이름}` — from section-NN
- **Owns**: {이 모듈만 쓰는 파일·테이블·상태. 다른 섹션이 여기 쓰기 금지}
- **Composition Point**: {index.md Harness의 조립 지점 + 이 모듈의 등록 코드 한 줄}
  - 예: `src/app/routes.ts` — `registerModule(CouponIssueModule)`

규칙:

- Provides가 비어 있으면 이 섹션은 모듈이 아니라 다른 모듈의 내부 작업입니다. 해당 모듈로 합칩니다.
- Consumes에 적히지 않은 것을 구현 중에 가져다 쓰면 **경계 위반**입니다. 계약을 먼저 고칩니다.
- Owns가 다른 섹션의 Owns와 겹치면 병렬 구현에서 충돌합니다. 겹치면 공유 기반 섹션으로 올립니다.
- 조립 지점이 없는 프로젝트는 `NOT APPLICABLE: single composition point`로 기록합니다.

## Flow Diagram Nodes

> 이 섹션이 구현하는 프로세스 다이어그램 노드. workpm이 공정 점검 시 이 매핑을 기준으로 검증합니다.
> flow-diagrams/가 없는 프로젝트는 이 섹션 생략.

- **Diagram**: `flow-diagrams/{process-name}.mmd`
- **Nodes**: {이 섹션이 담당하는 노드 ID 목록}
  - `{NodeId}` — {노드 설명}
  - `{NodeId}` — {노드 설명}
- **Branches**: {이 섹션이 구현하는 분기}
  - `{DecisionNodeId}` — Yes: {경로}, No: {경로}

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
| 에러 - 필수값 누락 | {missing required} | 400, `VALIDATION_ERROR` |
| 에러 - 중복 | {duplicate data} | 409, `{CONFLICT_CODE}` |
| 엣지 - 빈 값 | {} | 400, `VALIDATION_ERROR` |
| 엣지 - 최대값 초과 | {max+1 length} | 400, `VALIDATION_ERROR` |
| 목록 - size 상한 초과 (목록 API) | `?size=1000` | 200, 상한(예: 100)건 이하 |
| 목록 - 허용 안 된 정렬 (목록 API) | `?sort={unknown},asc` | 400, `INVALID_SORT` |

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
- [ ] 새로 추가한 API가 `api-spec.md`에 등록됨 (해당 시)
- [ ] 목록 API는 페이지네이션·크기 상한·정렬 허용 컬럼을 지킴 — 전체 행을 한 번에 반환하는 목록 없음 (해당 시)
- [ ] 반복문 안에서 쿼리·API 호출 없음 (N+1) — 연관 데이터는 조인·일괄 조회 (해당 시)
- [ ] 목록의 필터·정렬·검색 컬럼에 인덱스가 있음 — 마이그레이션에 포함 (해당 시)
- [ ] 에러 응답이 공통 에러 형식(`error` 코드 + `message` + `details`)을 따름 (해당 시)
- [ ] Flow Diagram Nodes의 모든 노드에 대응하는 코드가 존재함 (해당 시)

## Risk & Rollback

| 위험 요소 | 영향도 | 완화 전략 | 롤백 방법 |
|-----------|--------|-----------|-----------|
| {risk 1} | High/Medium/Low | {mitigation} | {rollback steps} |

> 구현 중 예상치 못한 위험 발견 시 이 테이블에 추가하고, 다음 섹션 진행 전 대응.

## Acceptance Criteria

> 이 목록이 완료 기준의 정본입니다. Step 22A가 `checklist.md`로 모으고, 구현 하네스가 `checklist-status.md`에 이행을 기록합니다.
> 형식은 젭마인 `references/acceptance-checklist-guide.md` — ID `AC-NN-k`, 관찰 가능한 동작, 근거 1개 이상, 검증 1개 이상.

- [ ] AC-NN-1 {관찰 가능한 동작: ~하면 ~된다} — 근거: {P#, 엔드포인트·화면·역할} — 검증: {Test Scenarios의 테스트 이름 또는 QA ID}
- [ ] AC-NN-2 {관찰 가능한 동작} — 근거: {…} — 검증: {…}
- [ ] AC-NN-3 {관찰 가능한 동작} — 근거: {…} — 검증: {…}

섹션 완료 조건 (AC 아님, ID 없음):
- [ ] 위 Test Scenarios의 정상/에러/엣지 케이스가 모두 통과
- [ ] Quality Gate 전 항목 통과

## Files to Create/Modify

- `path/to/file1.ts` - {description}
- `path/to/file2.ts` - {description}
```

## Completion

All sections are complete when every section in the SECTION_MANIFEST has a corresponding `section-NN-name.md` file.

After all parallel Tasks complete, update the main TODO list to mark section writing as done.
