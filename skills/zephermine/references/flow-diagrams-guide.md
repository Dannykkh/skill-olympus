# Flow Diagrams Guide

Step 18 — 공정 도면 생성 상세 절차.

> **⚠️ 이 단계는 건너뛸 수 없습니다.** 공정 도면이 없으면 다이달로스(workpm)가 기준선 없이 시공하게 됩니다.

## Source-only module precondition

Zephermine 본문의 `Source-only internal module resolution (mandatory)` 우선순위(프로젝트 exact
파일 → 현재 런타임 active root exact 파일 → 전역 `SKILLS-CATALOG.md`의 유일한 행과 정확한
`읽을 경로`)로 `flow-verifier`와 `mermaid-diagrams`를 해석합니다. 두 `SKILL.md`를 모두 읽은 뒤 각각의 부모를
`flow_verifier_root`, `mermaid_diagrams_root`로 둡니다. 모듈 내부의 `references/`나
`scripts/`가 필요하면 해당 루트에서만 해석합니다.

이는 내부 모듈 로드이며 이름 기반 slash command 또는 런타임 스킬 레지스트리
호출이 아닙니다. 행·파일·필수 reference 중 하나라도 없으면 Step 18을
`BLOCKED: source module unavailable`로 기록하고 종료합니다. 빈 `.mmd`나 placeholder
`index.md`를 만들어 다음 게이트를 통과시키지 않습니다.

## 절차

### 1. 핵심 프로세스 식별

Plan에서 독립적인 비즈니스/기술 프로세스 추출:
- 기준: "사용자 또는 시스템이 시작~종료까지 거치는 완결된 흐름" 1개 = 다이어그램 1개
- 프로세스 수: 핵심 3~8개 (너무 많으면 상위 레벨로 통합)
- **단일 프로세스 프로젝트(CLI, 라이브러리)라도 최소 1개의 메인 흐름도를 생성**

### 1-1. 다이어그램 타입 선택

프로세스마다 아래 표로 타입을 정합니다. flowchart가 기본이고, 나머지 둘은 조건을 만족할 때만 **추가로** 만듭니다(flowchart를 대체하지 않습니다).

| 타입 | 생성 조건 | 파일명 |
|------|-----------|--------|
| `flowchart` | 모든 완결 흐름 — 기본 | `{process-name}.mmd` |
| `stateDiagram-v2` | 엔티티에 상태 필드가 있고 전이가 3개 이상일 때 (주문 pending→paid→shipped→refunded) | `{entity}-state.mmd` |
| `sequenceDiagram` | `spec.md` 에코시스템 맵에 외부 시스템이 있고 호출 순서·비동기·타임아웃이 설계에 영향을 줄 때 | `{integration}-sequence.mmd` |

상태 전이도에는 각 전이를 **일으킬 수 있는 역할**과 트리거를 전이 레이블에 적습니다(`pending --> paid : 고객 결제 완료`). 해당 조건이 없으면 만들지 않고 `index.md`에 `NOT APPLICABLE` 사유를 남깁니다.

### 2. 읽기 전용 다이어그램 작업

각 프로세스별 다이어그램을 결과 반환형 작업으로 생성합니다. Claude `Explore`, Codex `explorer`, Antigravity `research`, Grok `explore`에 해당하는 읽기 전용 역할을 사용하며 파일 쓰기는 맡기지 않습니다. 네이티브 위임이 없거나 병렬 이득이 없으면 메인 컨텍스트에서 같은 프롬프트를 순차 실행합니다.

```
Run a read-only analysis job with this prompt:

Main/Lead가 전역 카탈로그의 정확한 경로에서 읽은 다음 계약을 적용하세요:
- `${flow_verifier_root}/SKILL.md`의 plan 모드
- `${mermaid_diagrams_root}/SKILL.md`의 Mermaid 문법

위 모듈은 이미 내부 source module로 선택되었습니다. slash command나 등록 스킬을 호출하지 마세요.

다음 프로세스의 Mermaid {diagram_type}을 작성하세요:
프로세스: {process_name}
컨텍스트: {plan에서 추출한 해당 프로세스 설명}
API 엔드포인트: {관련 API 목록}
관여 역할: {spec.md 시스템 역할 표에서 이 프로세스에 관여하는 역할 ID}

규칙:
- 노드 ID: 영문 camelCase
- 분기(decision): 모든 경로(Yes/No, 에러) 포함
- 정상 경로(happy path) + 에러 경로 + 엣지 케이스
- 노드 20개 이하
- 각 노드에 관련 API 엔드포인트 또는 함수명 주석
- **역할 레인**: 관여 역할이 둘 이상이면 `subgraph {역할명}`으로 레인을 나누고 각 노드를 담당 역할 레인에 배치. 역할이 하나면 레인 없이 작성
- **권한 분기**: 역할에 따라 갈리는 지점은 decision 노드로 만들고, 거부 경로를 종료 노드까지 그림 (숨김 / 비활성 / 읽기전용 / 403 / 404 위장 중 실제 동작 표기)
- 역할명은 `spec.md` Context Map의 시스템 역할 표(Role Inventory) 역할 ID를 그대로 사용. 새 역할명을 만들지 않음

결과만 반환하세요 (파일 작성 금지).
```

### 3. 파일 저장

메인 컨텍스트가 작업 결과를 수집하여 `<planning_dir>/flow-diagrams/`에 저장합니다. 공유 인덱스와 완료 판정도 메인 컨텍스트만 갱신합니다.
- 파일명: `{process-name}.mmd` (kebab-case)
- 인덱스: `<planning_dir>/flow-diagrams/index.md` 생성

## 인덱스 파일 형식

```markdown
# Process Flow Diagrams

| 프로세스 | 파일 | 타입 | 노드 수 | 역할 레인 | 관련 섹션 |
|----------|------|------|---------|-----------|-----------|
| 사용자 인증 | user-auth.mmd | flowchart | 12 | 비로그인, 일반 사용자 | section-02 |
| 주문 처리 | order-process.mmd | flowchart | 15 | 고객, 운영자 | section-03, section-04 |
| 주문 상태 | order-state.mmd | stateDiagram-v2 | 6 | - | section-03 |
| 결제 게이트웨이 연동 | payment-sequence.mmd | sequenceDiagram | 8 | - | section-05 |

## 의존성
user-auth → order-process → payment

## 미생성 타입
- stateDiagram-v2: {생성했으면 생략, 아니면 NOT APPLICABLE 사유}
- sequenceDiagram: {생성했으면 생략, 아니면 NOT APPLICABLE 사유}
```

## workpm 연계

- workpm Phase 2: 이 도면을 읽어서 추가/수정 여부 판단
- workpm Phase 2: 각 Worker에게 담당 다이어그램 노드 배분
- workpm Phase 4: 구현 후 이 도면과 코드를 대조 검증
