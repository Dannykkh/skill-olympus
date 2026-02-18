# Teammate Context Template

teammate에게 전달하는 컨텍스트 구성 규칙.

## 왜 필요한가?

teammate는 Lead의 대화 히스토리를 상속하지 않습니다.
따라서 teammate가 독립적으로 작업하려면 필요한 모든 정보를 명시적으로 전달해야 합니다.

## 필수 전달 항목

### 0. Expert Role (전문가 역할)

See [expert-matching.md](expert-matching.md)

섹션의 파일 패턴에서 매칭된 전문가 역할을 teammate에게 부여:

```
"너는 대니즈팀(Dannys Team)의 **백엔드 전문가**야.
agents/backend-spring.md의 규칙을 참조해서 작업해.
특히 다음을 준수해:
- Controller → Flow → Service → Repository 4계층 구조
- @Transactional은 Flow에서만
- DTO ↔ Entity 변환은 Service 계층에서"
```

**전달 규칙:**
- 에이전트 파일 경로 + 핵심 규칙 3~5개만 전달 (전체 임베딩 X)
- teammate가 필요하면 Read로 에이전트 파일을 직접 읽을 수 있음
- 매칭 안 되면 `fullstack-coding-standards.md` (범용)

### 1. Mission (한 줄)

```
"section-04-api 구현을 담당합니다."
```

### 2. Section Content (전체 임베딩)

Task의 `description`에 해당 section-NN.md 파일 전체 내용을 임베딩합니다.
이것이 teammate의 유일한 구현 지침서입니다.

**TaskCreate 시:**
```
TaskCreate({
  subject: "Section 04: API Layer",
  description: `
## Expert Role
너는 대니즈팀의 **백엔드 전문가**야.
agents/backend-spring.md의 규칙을 참조해서 작업해.

## Mission
section-04-api 구현 담당

## Section Content
[section-04-api.md 파일 전체 내용을 여기에 붙여넣기]

## File Ownership
이 파일들만 생성/수정 가능:
- src/api/routes.ts
- src/api/middleware.ts
- src/api/handlers/user.ts

## Dependencies Context
선행 섹션 완료 결과:
- section-01: src/core/foundation.ts (BaseModule class)
- section-03: src/types/index.ts (RequestDTO, ResponseDTO)

## Task Reference
Task #4를 확인하세요. 구현 완료 시:
TaskUpdate({ taskId: "4", status: "completed" })

## Boundaries
- 위 File Ownership의 파일만 수정
- 다른 teammate의 파일 수정 금지
- 필요 시 Lead에게 메시지로 보고
  `,
  activeForm: "Section 04 구현 중"
})
```

### 3. File Ownership (명시적 목록)

각 섹션의 "Files to Create/Modify"에서 추출한 파일 목록:

```
이 파일들만 생성/수정 가능:
- src/api/routes.ts
- src/api/middleware.ts
- src/api/handlers/user.ts

⚠️ 다른 파일은 절대 수정하지 마세요.
```

### 4. Dependencies Context (선행 결과)

Wave 2+ 섹션에만 해당. 선행 섹션에서 생성된 파일과 주요 인터페이스 요약:

```
선행 섹션 완료 결과:

### section-01-foundation (완료)
- src/core/foundation.ts — export class BaseModule { init(), destroy() }
- src/core/types.ts — export interface AppConfig { port, dbUrl, logLevel }

### section-03-types (완료)
- src/types/index.ts — export interface RequestDTO, ResponseDTO
- src/types/errors.ts — export class AppError extends Error
```

**주의:** 전체 파일 내용이 아닌 **경로 + 주요 export 시그니처**만 전달.
teammate가 필요하면 Read 도구로 직접 파일을 읽을 수 있습니다.

### 5. Task Reference

```
Task #4를 확인하세요.
구현 완료 시 반드시: TaskUpdate({ taskId: "4", status: "completed" })
```

### 6. Boundaries (경계 규칙)

```
⚠️ 규칙:
1. File Ownership의 파일만 생성/수정
2. 다른 teammate의 파일 수정 금지
3. 새 파일이 필요하면 담당 디렉토리 내에서만 생성
4. 외부 패키지 설치가 필요하면 Lead에게 먼저 보고
5. 구현 중 문제 발견 시 Lead에게 메시지로 보고
```

**⚠️ CRITICAL RETURN RULE:**
- 작업 결과는 **파일에만** 쓸 것
- Lead에게 보내는 return/메시지는 **1줄 요약만** (전체 분석 텍스트 X)
- 예: `✅ section-04-api 완료. 파일 5개 생성, 에러 0건.`
- 이유: return text가 Lead 컨텍스트에 합산되어 컨텍스트 폭발 방지

### 7. Activity Logging (활동 기록)

작업 과정을 `conversations/` 디렉토리에 기록합니다.
teammate의 의사결정/에러/진행이 세션 종료 후에도 검색 가능하도록 보존합니다.

**대상 파일:** `conversations/{YYYY-MM-DD}-team-dannys.md`

**기록 시점 5가지:**

| 시점 | type | 예시 |
|------|------|------|
| 작업 시작 | START | 섹션 구현 시작, 파일 목록 확인 |
| 주요 결정 | DECISION | "Zustand 대신 Context API 선택 — 외부 의존성 최소화" |
| 에러 발생 | ERROR | "빌드 실패: tsconfig에 paths 누락" |
| 파일 생성/수정 | FILE | "src/api/routes.ts 생성 (12개 엔드포인트)" |
| 작업 완료 | DONE | 섹션 완료 요약 |

**형식:**
```markdown
## [HH:mm:ss] {teammate-name} ({section-name})
**{TYPE}**: {message}
`#tags: keyword1, keyword2`
```

**규칙:**
- 각 기록 **3줄 이내** (간결하게)
- 파일이 없으면 frontmatter와 함께 생성:
  ```markdown
  ---
  date: YYYY-MM-DD
  team: dannys-team
  type: activity-log
  ---
  # Team Activity Log — YYYY-MM-DD
  ```
- 기존 파일이 있으면 **Edit 도구로 끝에 추가**
- Orchestrator MCP 사용 시 `orchestrator_log_activity`도 병행 호출

## 컨텍스트 크기 관리

| 항목 | 크기 관리 |
|------|-----------|
| Section Content | 전체 임베딩 (필수 — 유일한 지침서) |
| File Ownership | 파일 목록만 (간결) |
| Dependencies | export 시그니처만 (전체 파일 X) |
| Boundaries | 규칙 5줄 (고정) |

**총 description 크기 목표:** 섹션 파일 크기 + ~500자 오버헤드

## Plan Approval 활용

teammate에게 Plan Approval을 요구할 수 있습니다:

```
"구현 시작 전에 계획을 제출해. 내가 승인한 후 코드를 작성해."
```

이렇게 하면 teammate가 잘못된 방향으로 진행하는 것을 방지할 수 있습니다.
다만, 단순한 섹션이면 Plan Approval 없이 바로 실행하는 것이 효율적입니다.

**권장 기준:**
- 파일 3개 이하: Plan Approval 생략
- 파일 4개 이상 또는 복잡한 로직: Plan Approval 요구
