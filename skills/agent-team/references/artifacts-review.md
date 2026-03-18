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
| `db-schema.md` | 데이터베이스 담당 teammate | description에 경로 + "Read로 읽어서 참조해" |
| `design-system.md` | 프론트엔드 담당 teammate | description에 경로 + "Read로 읽어서 참조해" |
| `operation-scenarios.md` | 통합/E2E 담당 teammate | description에 경로 전달 |
| `qa-scenarios.md` | 테스트 작성 담당 teammate | description에 경로 전달 |

> **전체 내용 임베딩 X** — teammate가 필요할 때 Read로 직접 읽도록 경로만 전달 (컨텍스트 절약)

### 5. Acceptance Criteria 수집

각 section-NN-*.md의 Acceptance Criteria를 하나의 마스터 체크리스트로 통합.
이 체크리스트가 **최종 완료 기준**이 됨.

**마스터 체크리스트 형식:**

```
═══════════════════════════════════════
마스터 체크리스트 (N개 섹션, 총 M개 항목)
═══════════════════════════════════════
section-01-foundation:
  [ ] BaseModule 클래스가 init()과 destroy() 메서드를 가짐
  [ ] AppConfig 인터페이스가 필수 필드를 정의함
  [ ] 단위 테스트가 존재함

section-02-api:
  [ ] POST /api/auth/login 엔드포인트 동작
  [ ] JWT 토큰 발급 및 검증
  ...
═══════════════════════════════════════
```

### 6. 영향도 분석 (Impact Check)

기존 코드가 있는 프로젝트에서만 실행.

**실행 조건:**
- `src/`, `app/`, `lib/` 등 기존 소스가 있는지 확인
- **없으면** (신규 프로젝트) → 건너뜀
- **있으면** → 서브에이전트(`subagent_type="Explore"`)로 영향도 분석 실행

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
orchestrator_log_activity 또는 conversations/ 기록:
type: "milestone"
message: "산출물 검토 완료. 섹션 N개, 체크리스트 M개, 도면 K개 확인"
```
