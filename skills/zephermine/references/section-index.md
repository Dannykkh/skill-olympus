# Section Index Creation

Create `<planning_dir>/sections/index.md` to define implementation sections.

## Input Files

- `<planning_dir>/plan.md` - implementation plan
- `<planning_dir>/flow-diagrams/index.md` - process flow diagrams (있는 경우)

## Output

```
<planning_dir>/sections/
└── index.md
```

## SECTION_MANIFEST Block

**index.md MUST start with a SECTION_MANIFEST block:**

```markdown
<!-- SECTION_MANIFEST
section-01-foundation
section-02-config
section-03-parser
section-04-api
END_MANIFEST -->

# Implementation Sections Index

... rest of human-readable content ...
```

### SECTION_MANIFEST Rules

- Must be at the TOP of index.md (before any other content)
- One section per line, format: `section-NN-name` (e.g., `section-01-foundation`)
- Section numbers must be two digits with leading zero (01, 02, ... 12)
- Section names use lowercase with hyphens (no spaces or underscores)
- Numbers should be sequential (01, 02, 03...)
- This block is parsed to track progress - the rest of index.md is for humans

## Human-Readable Content

After the manifest block, include:

### Dependency Graph

Table showing what blocks what:

```markdown
| Section | Depends On | Blocks | Parallelizable |
|---------|------------|--------|----------------|
| section-01-foundation | - | section-02, section-03 | Yes |
| section-02-config | section-01 | section-04 | No |
| section-03-parser | section-01 | section-04 | Yes |
| section-04-api | section-02, section-03 | - | No |
```

### Execution Order

Which sections can run in parallel:

```markdown
1. section-01-foundation (no dependencies)
2. section-02-config, section-03-parser (parallel after section-01)
3. section-04-api (requires section-02 AND section-03)
```

### Flow Diagram Mapping

`flow-diagrams/`가 존재하면, 각 섹션이 어떤 프로세스 다이어그램의 노드를 구현하는지 매핑:

```markdown
| Section | Flow Diagram | Nodes |
|---------|-------------|-------|
| section-01-foundation | - | (인프라, 다이어그램 해당 없음) |
| section-02-auth | user-auth.mmd | Start → Validate → FindUser → CheckPwd |
| section-03-auth-token | user-auth.mmd | GenJWT → GenRefresh → SaveToken → Response |
| section-04-order | order-process.mmd | CreateOrder → ValidateStock → CalcPrice |
```

> 이 매핑은 workpm이 태스크별로 도면 노드를 배분하고 공정 점검하는 데 사용됩니다.

### Section Summaries

Brief description of each section:

```markdown
### section-01-foundation
Initial project setup and configuration.

### section-02-config
Configuration loading and validation.
```

## Guidelines

- **Natural boundaries**: Split by component, layer, feature, or phase
- **Focused sections**: One logical unit of work each
- **Parallelization**: Consider which sections can run independently
- **Dependency direction**: Earlier sections should not depend on later sections

## Ecosystem Coverage Check

spec.md에 `## Context Map` 섹션이 있는 경우, SECTION_MANIFEST 생성 후 에코시스템 커버리지를 반드시 확인합니다.
spec.md에 Context Map이 없으면 (레거시 계획) 이 단계를 건너뜁니다.

### 확인 절차

1. spec.md에서 `## Context Map` → `### 에코시스템 맵` 테이블 파싱
2. 각 시스템에 대해 SECTION_MANIFEST에서 대응 섹션 존재 여부 확인
3. 결과를 아래 테이블로 정리하여 `sections/index.md` 하단에 추가:

```markdown
## Ecosystem Coverage

| 시스템 | 커버 섹션 | 상태 |
|--------|-----------|------|
| 고객 앱 | section-03-customer | ✅ 커버됨 |
| 기사 앱 | section-04-driver | ✅ 커버됨 |
| 결제 시스템 | - | ⏭️ 제외 (외부 PG 사용, 연동만) |
| 관리자 웹 | - | ❌ 누락 → 섹션 추가 필요 |
```

### 상태 정의

- ✅ 커버됨: 해당 시스템을 구현하는 섹션이 MANIFEST에 있음
- ⏭️ 제외: 외부 서비스/향후 구현 등 명시적 사유로 제외 (사유 기록 필수)
- ❌ 누락: 커버되지 않음 → 섹션 추가 또는 제외 사유 문서화

### 누락 시 조치

- 섹션 추가가 필요하면 SECTION_MANIFEST에 섹션 추가
- 제외가 적절하면 사유를 기록하고 ⏭️로 변경
- **❌ 상태가 남아있으면 Step 20(섹션 파일 작성)으로 진행하지 않음**

### Backfill

커버리지 확인 후:
1. spec.md의 에코시스템 맵 '관련 섹션' 열을 실제 섹션명으로 업데이트
2. spec.md의 Problem Statement '해결 섹션' 열을 해당 문제를 해결하는 섹션명으로 업데이트

## Example index.md

```markdown
<!-- SECTION_MANIFEST
section-01-foundation
section-02-core-libs
section-03-api-layer
section-04-frontend
section-05-integration
END_MANIFEST -->

# Implementation Sections Index

## Dependency Graph

| Section | Depends On | Blocks | Parallelizable |
|---------|------------|--------|----------------|
| section-01-foundation | - | all | Yes |
| section-02-core-libs | 01 | 03, 04 | No |
| section-03-api-layer | 02 | 05 | Yes |
| section-04-frontend | 02 | 05 | Yes |
| section-05-integration | 03, 04 | - | No |

## Flow Diagram Mapping

| Section | Flow Diagram | Nodes |
|---------|-------------|-------|
| section-01-foundation | - | (인프라) |
| section-02-core-libs | - | (공통 라이브러리) |
| section-03-api-layer | user-auth.mmd | Validate → FindUser → CheckPwd → GenJWT |
| section-04-frontend | user-auth.mmd | LoginForm → SubmitLogin → HandleResponse |
| section-05-integration | order-process.mmd | CreateOrder → ProcessPayment → Confirm |

## Execution Order

1. section-01-foundation (no dependencies)
2. section-02-core-libs (after 01)
3. section-03-api-layer, section-04-frontend (parallel after 02)
4. section-05-integration (final)

## Section Summaries

### section-01-foundation
Directory structure, config files, base setup.

### section-02-core-libs
Shared utilities and core libraries.

### section-03-api-layer
REST API endpoints and middleware.

### section-04-frontend
UI components and pages.

### section-05-integration
End-to-end integration and final wiring.
```
