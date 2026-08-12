# Teammate Context Template

teammate에게 전달하는 컨텍스트 구성 규칙.

## 왜 필요한가?

teammate는 Lead의 대화 히스토리를 상속하지 않습니다.
따라서 teammate가 독립적으로 작업하려면 필요한 모든 정보를 명시적으로 전달해야 합니다.

## 필수 전달 항목

### 0. Implementation Context (구현 계약)

See [expert-matching.md](expert-matching.md)

섹션의 파일 패턴에서 필요한 프로젝트 근거와 검증 계약을 teammate에게 전달:

```
"너는 포세이돈(Poseidon)의 **백엔드 구현 작업자**야.
빌드 manifest, 프로젝트 지침, 인접 모듈, API 계약과 테스트를 먼저 읽어.
현재 계층·트랜잭션·DTO·오류 처리 관례를 보존하고 새 병렬 구조를 만들지 마.
완료 후 프로젝트의 빌드·관련 테스트를 실행해."
```

**전달 규칙:**
- 프로젝트 근거 파일 + 작업 경계 + 검증 명령만 전달
- 프레임워크·라이브러리 버전은 manifest/lockfile에서 확인
- 매칭 안 되면 별도 역할 문서 없이 네이티브 범용 teammate 사용

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
## Implementation Context
너는 포세이돈의 **백엔드 구현 작업자**야.
프로젝트 지침, manifest, 인접 코드와 테스트를 먼저 읽고 현재 구조를 보존해.

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

### 3. Process Flow Diagram (프로세스 도면)

섹션에 담당 flow-diagram이 있으면 반드시 전달:

```
📐 프로세스 도면: <planning_dir>/flow-diagrams/user-auth.mmd
담당 노드: Validate → FindUser → CheckPwd → GenJWT

- 해당 .mmd 파일을 Read로 읽고, 담당 노드의 로직을 구현해.
- 분기(decision) 노드는 모든 경로(Yes/No/에러)를 빠짐없이 구현해.
- 노드 간 화살표 순서가 코드 실행 순서와 일치해야 해.
```

**전달 규칙:**
- section-parser에서 추출한 `diagram`과 `diagramNodes` 사용
- `diagram`이 null이면 이 항목 생략
- 도면 파일 경로는 planning_dir 기준 상대 경로
- teammate가 Read로 `.mmd` 파일을 직접 읽어 참조하도록 지시

### 4. Reference Documents (보조 문서)

섹션 성격에 맞는 젭마인 보조 문서 경로를 전달합니다.
teammate가 필요할 때 Read로 직접 읽도록 **경로만 전달** (전체 임베딩 X).

```
📎 참조 문서 (필요 시 Read로 확인):
- API 계약서: <planning_dir>/api-spec.md
- DB 스키마: <planning_dir>/db-schema.md
- 도메인사전: docs/domain-dictionary.md (확정 v3 — 모든 식별자/UI 라벨이 이 사전을 따름)
```

**매핑 규칙 (Step 0에서 존재 확인된 문서만):**

| 섹션 성격 | 전달할 보조 문서 |
|----------|----------------|
| **모든 섹션 공통** | **`docs/domain-dictionary.md`** (있으면 무조건 전달) |
| API/백엔드 | `api-spec.md` |
| 데이터베이스 | `db-schema.md` |
| 프론트엔드/UI | `design-system.md` |
| 통합/E2E | `operation-scenarios.md` |
| 테스트 | `qa-scenarios.md` |

> 보조 문서가 없으면 (젭마인에서 건너뛴 경우) 이 항목 생략.

**도메인사전 강제 사용 지침** (사전이 있을 때만 추가):

```
⚠️ 도메인사전 준수 (필수)
- 모든 클래스/함수/변수/타입명은 docs/domain-dictionary.md의 영문 식별자를 정확히 사용
- UI 라벨/메시지는 사전의 한글 표기를 정확히 사용
- 사전의 "금지 표현"은 절대 사용 금지 (예: cart 사전이면 basket/bag 금지)
- 사전에 없는 신규 도메인 용어가 필요하면 Lead에게 보고 (사전 추가 후 진행)
- 기술 인프라 용어(cache, queue, worker 등)는 사전 외 자유롭게 사용
```

### 5. File Ownership (명시적 목록)

각 섹션의 "Files to Create/Modify"에서 추출한 파일 목록:

```
이 파일들만 생성/수정 가능:
- src/api/routes.ts
- src/api/middleware.ts
- src/api/handlers/user.ts

⚠️ 다른 파일은 절대 수정하지 마세요.
```

### 6. Dependencies Context (선행 결과)

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

### 7. Task Reference

```
Job ID: {job_id}
완료 시 변경 파일, 검증 결과, 계획 이탈, 남은 위험을 반환하세요.
전역 task 상태와 Wave ledger 갱신은 Lead가 담당합니다.
```

### 8. Boundaries (경계 규칙)

```
⚠️ 규칙:
1. File Ownership의 파일만 생성/수정
2. 다른 teammate의 파일 수정 금지
3. 새 파일이 필요하면 담당 디렉토리 내에서만 생성
4. 외부 패키지 설치가 필요하면 Lead에게 먼저 보고
5. 구현 중 문제 발견 시 Lead에게 메시지로 보고
6. 계획 이탈이 필요하면 보수적 선택을 하고 사유/대안/영향 파일을 완료 보고의 Deviations에 포함한 뒤 계속 진행. 공유 implementation-notes.md는 Lead만 갱신
```

**⚠️ CRITICAL RETURN RULE:**
- 구현 결과는 담당 파일에 쓰고, Lead에게는 변경 파일·검증 결과·Deviations·남은 위험만 간결하게 반환
- 전체 분석이나 긴 명령 출력을 반복하지 않음
- 예: `section-04-api 완료. changed=5, tests=pass, deviations=0, risks=0.`
- 이유: return text가 Lead 컨텍스트에 합산되어 컨텍스트 폭발 방지

**메시지 규칙:**
- 런타임이 별도 summary 필드를 요구하면 짧은 summary와 상세 message를 함께 전달
- 중간 메시지는 blocker, 파일 충돌, 권한 요청에만 사용

### 9. Activity Logging (Lead 전용)

작업자는 공유 로그를 직접 수정하지 않습니다. Lead가 각 작업자의 구조화된 완료 보고를 받은 뒤 `conversations/`와 `implementation-notes.md`에 직렬로 반영합니다.

**대상 파일:** `conversations/{YYYY-MM-DD}-team-poseidon.md`

**Lead 기록 시점 5가지:**

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

**Lead 규칙:**
- 각 기록 **3줄 이내** (간결하게)
- 파일이 없으면 frontmatter와 함께 생성:
  ```markdown
  ---
  date: YYYY-MM-DD
  team: poseidon-team
  type: activity-log
  ---
  # Team Activity Log — YYYY-MM-DD
  ```
- 기존 파일이 있으면 Lead가 **Edit 도구로 끝에 추가**
- Lead가 전역 카탈로그에서 `orchestrator_root`와
  `${orchestrator_root}/commands/workpm-mcp.md`를 성공적으로 로드하고 실제 MCP 폴백을 시작한
  경우에만 `orchestrator_log_activity`도 병행 호출. 모듈 로드 실패 시 `MCP: NOT RUN`으로 기록

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
