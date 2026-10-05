# Artifacts Review Protocol

Step 0 산출물 검토 — PM 게이트 상세 절차.

## 필수 확인 항목

`planning_dir` 기준으로 아래 순서대로 확인:

### 1. plan.md 읽기

전체 구현 방향 파악. Lead가 직접 읽어야 함.

### 2. sections/index.md 확인

SECTION_MANIFEST + 의존성 그래프 확인.

### 3. flow-diagrams/ 존재 여부

- ✅ 있으면 → `flow-diagrams/index.md` 읽어서 섹션↔도면 매핑 확인
- ❌ 없으면 → 사용자에게 경고:
  ```
  "젭마인 Step 16에서 도면이 생성되지 않았습니다. 도면 없이 진행하시겠습니까?"
  ```

### 4. 보조 문서 존재 확인

있으면 teammate에게 전달할 레퍼런스로 등록:

| 보조 문서 | 전달 대상 | 전달 방법 |
|----------|----------|----------|
| `api-spec.md` | API/백엔드 담당 teammate | description에 경로 + "Read로 읽어서 참조해" |
| `mcp-spec.md` | MCP 서버·도구 담당 teammate | description에 경로 + "Read로 읽어서 참조해" |
| `db-schema.md` | 데이터베이스 담당 teammate | description에 경로 + "Read로 읽어서 참조해" |
| `design-system.md` | 프론트엔드 담당 teammate | description에 경로 + "Read로 읽어서 참조해" |
| `operation-scenarios.md` | 통합/E2E 담당 teammate | description에 경로 전달 |
| `qa-scenarios.md` | 테스트 작성 담당 teammate | description에 경로 전달 |

> **전체 내용 임베딩 X** — teammate가 필요할 때 Read로 직접 읽도록 경로만 전달 (컨텍스트 절약)

### 5. 완료 기준 계약 확인 + 이행 장부 준비

형식·ID·상태·증거 규칙의 정본은 젭마인 `references/acceptance-checklist-guide.md`입니다. 여기서는 순서만 다룹니다.

1. `<planning_dir>/checklist.md`를 읽습니다. 이 파일(정본은 섹션 AC)이 **최종 완료 기준**입니다.
2. 없으면(구버전 산출물) 섹션 파일의 Acceptance Criteria에서 기계적으로 만들고 activity log에 남깁니다. 기준 문장은 고치지 않습니다.
3. `<planning_dir>/checklist-status.md`가 있으면 이어서 쓰고(재개), 없으면 모든 행을 `missing`으로 만듭니다.
4. 섹션별 AC ID 목록을 Step 3·4의 작업자 지시에 넣습니다.

사용자에게는 표 전체가 아니라 요약만 출력합니다:

```
═══════════════════════════════════════
완료 기준: checklist.md — N개 섹션, M개 AC
장부: checklist-status.md — proved P / weak W / missing X / contradicted C
═══════════════════════════════════════
```

### 6. 영향도 분석 (Impact Check)

기존 코드가 있는 프로젝트에서만 실행.

**실행 조건:**
- `src/`, `app/`, `lib/` 등 기존 소스가 있는지 확인
- **없으면** (신규 프로젝트) → 건너뜀
- **있으면** → 현재 CLI의 읽기 전용 탐색 역할(Claude `Explore`, Codex `explorer`, Antigravity `research`, Grok `explore`)로 영향도 분석. 위임이 없으면 Lead가 같은 검사를 순차 실행

**분석 내용:**
- 각 섹션이 수정할 파일 목록 추출 (섹션 스펙에서 파일 경로 파싱)
- 해당 파일을 import/호출하는 **의존 파일** 탐색 (Grep으로 import/require 검색)
- 의존 파일이 다른 섹션 범위에 있으면 **교차 영향** 경고

**출력 형식:**

```
⚠️ 영향도 경고:
  section-02-api: auth.service.ts 수정 예정
    → user.controller.ts에서 import (section-03 범위)
    → middleware/auth.ts에서 import (section-01 범위)
    → 기존 로그인 흐름 유지 필수

  section-03-user: user.model.ts 수정 예정
    → 영향 파일 없음 ✅
```

**teammate 프롬프트에 추가:**

```
⚠️ 영향도 주의: 이 파일을 수정할 때 아래 파일의 기존 동작이 깨지지 않도록 확인하세요:
- {의존 파일 1}: {어떤 함수/import를 사용 중}
- {의존 파일 2}: {어떤 함수/import를 사용 중}
수정 후 해당 파일도 확인하고, 필요하면 함께 수정하세요.
```

## Activity Log 기록

```
기본 네이티브/순차 경로는 conversations/ 기록:
type: "milestone"
message: "산출물 검토 완료. 섹션 N개, 체크리스트 M개, 도면 K개 확인"
```

`orchestrator_log_activity`는 Lead가 MCP 분기를 선택한 뒤 전역 `SKILLS-CATALOG.md`의
`orchestrator` 행에서 정확한 `읽을 경로`를 읽고, `orchestrator_root` 기준
`${orchestrator_root}/commands/workpm-mcp.md` 계약을 성공적으로 로드한 경우에만 병행합니다.
그 전에는 MCP 도구를 호출하거나 등록된 스킬로 추정하지 않습니다.
