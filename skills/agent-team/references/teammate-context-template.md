# Teammate Context Template

teammate에게 전달하는 컨텍스트 구성 규칙.

## 왜 필요한가?

teammate는 Lead의 대화 히스토리를 상속하지 않습니다.
따라서 teammate가 독립적으로 작업하려면 필요한 모든 정보를 명시적으로 전달해야 합니다.

## 필수 전달 항목

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
