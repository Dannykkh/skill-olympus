# Section Index Creation

Create `<planning_dir>/sections/index.md` to define implementation sections.

## Input Files

- `<planning_dir>/claude-plan.md` - implementation plan
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
