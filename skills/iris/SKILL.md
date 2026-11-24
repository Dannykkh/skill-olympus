---
name: iris
description: 이리스(Iris) — REST API와 MCP 서버의 명세 작성, 구현, 점검을 맡는다. api-spec.md·mcp-spec.md를 새로 쓰거나 기존 코드에서 거꾸로 만들고, 그 명세대로 구현한 뒤 규약 대응 검사와 실제 호출로 확인한다. MCP는 도구별 정의와 Code Mode(search+execute) 중 방식을 고른다. /iris, 이리스, REST API 만들어줘, MCP 서버 붙여줘, API 점검, MCP 점검 요청에 사용한다.
---

# Iris (이리스) — 프로그램을 사람·시스템·에이전트와 잇는 계약

> 이리스는 신들의 말을 인간에게 전하는 전령이자 무지개 다리의 여신입니다.
> 이 스킬은 프로그램을 화면·다른 시스템과 잇는 REST API, 에이전트와 잇는 MCP를 맡습니다.

## Quick Start

```
/iris                          # 현재 프로젝트의 API·MCP 상태를 보고 할 일을 정함
/iris 주문 조회 MCP 붙여줘      # 명세 → 구현 → 점검
/iris docs/plan/orders         # 이 폴더의 api-spec.md·mcp-spec.md 기준으로 진행
/iris --check                  # 점검만 (읽기 전용)
```

**공식 호출명:** `/iris` (별칭: `이리스`)

## 다른 스킬과의 경계

| 상황 | 쓰는 스킬 |
|------|-----------|
| 기존·새 프로그램에 REST API나 MCP만 설계·구현·점검 | **/iris** |
| 새 제품 전체 설계 (인터뷰·DB·화면·QA까지) | `/zephermine` — Step 17·17A가 같은 명세를 만든다 |
| API·MCP 밖의 기능(화면·배치 등)까지 함께 구현 | `/daedalus` — 같은 명세 폴더를 규약으로 읽는다 |
| 설계 산출물 전체(spec·QA·도면 포함) 대비 감리 | `/argos` — Phase 3·3A가 같은 명세를 대조한다 |
| 프론트↔백엔드 실제 연동 (CORS·JWT·프록시·업로드) | `api-tester` |

## 규약 정본

명세 형식과 규약은 젭마인의 두 가이드가 정본입니다. 이리스는 규약을 복사하지 않고 직접 읽습니다.

| 파일 | 쓰는 부분 |
|------|-----------|
| `skills/zephermine/references/api-spec-guide.md` | 작성 순서, 템플릿, `## Conventions`, `## 구현 중 API 추가/변경 규칙`, `## 중복 API 방지 체크리스트`, `## 화면↔API 대응 검사` |
| `skills/zephermine/references/mcp-spec-guide.md` | 작성 순서, 템플릿, `## Conventions`(도구 수와 방식·Code Mode 포함), `## 구현 중 도구 추가/변경 규칙`, `## 대응 검사` |

프로젝트의 `skills/zephermine/references/`, 현재 CLI의 활성 스킬 루트(`~/.claude/skills/`, `~/.codex/skills/`, `~/.gemini/antigravity-cli/skills/`), 전역 `SKILLS-CATALOG.md`의 `zephermine` 행 ‘읽을 경로’ 순으로 찾습니다. Grok은 Claude의 경로를 사용합니다. 가이드를 찾지 못하면 누락 경로를 알리고 그 가이드가 필요한 단계는 `NOT RUN`으로 둡니다.

## 흐름

### 1. 대상 파악

- **할 일을 정한다.** 기본은 명세 → 구현 → 점검입니다. “명세만”이면 2단계까지, “점검만”·“확인만”·“수정하지 마”·`--check`는 4단계만 읽기 전용으로 수행하고 파일을 만들거나 고치지 않습니다.
- **명세 폴더를 정한다.** 사용자가 준 경로 → `docs/plan/*/` 중 `api-spec.md`나 `mcp-spec.md`가 있고 대상 기능과 맞는 폴더 → 없으면 `docs/plan/<기능-이름>/`을 새로 씁니다. 젭마인·다이달로스·아르고스가 같은 폴더(planning_dir)를 읽습니다. 후보가 여럿이고 고를 근거가 없을 때만 묻습니다.
- **현재 코드를 읽는다.** `codemap/index.md`가 있으면 먼저 봅니다. 라우터·컨트롤러·핸들러, 인증·권한 미들웨어, 공통 에러 처리, OpenAPI 문서, MCP SDK 의존성과 서버 진입점, DB 스키마·마이그레이션을 찾아 `file:line`으로 적어 둡니다.
- 결과로 REST 유무, MCP 유무, 명세 유무를 정리합니다.

### 2. 명세

- **명세가 있으면** 그것이 정본입니다. 바꿀 일이 생기면 두 가이드의 “구현 중 추가/변경 규칙”대로 명세부터 고칩니다.
- **새로 만드는 API·MCP**는 가이드의 작성 순서와 템플릿대로 씁니다. 가이드가 기대하는 재료(`spec.md`, `interview.md`, 화면 설명, `db-schema.md`)가 없으면 요청 대화와 현재 코드에서 확인한 것만 쓰고 지어내지 않습니다. 비어 있는 것은 미결로 올립니다.
- **이미 있는 API·MCP**는 코드에서 거꾸로 씁니다. 엔드포인트·도구마다 실제 경로, 파라미터, 권한 검사, 에러 응답을 `file:line`으로 확인해 현재 동작을 적습니다. 규약과 다른 점(페이지네이션 없음, 에러 형식이 제각각 등)은 명세에서 미리 고쳐 쓰지 않고 4단계의 발견으로 넘깁니다. 현재 동작을 정확히 적어야 고칠 것과 의도된 차이를 나눌 수 있습니다.
- 가이드가 `integration-notes.md`에 기록하라고 한 내용(역반영한 엔드포인트·인덱스, 미결)은 명세 폴더의 `integration-notes.md`에 씁니다. 파일이 없으면 만듭니다.
- **MCP 방식을 고른다.** `mcp-spec-guide.md` `## Conventions`의 `도구 수와 방식` 기준으로 도구별 정의(기본)와 Code Mode 중 하나를 고르고, `## Server`의 `도구 방식` 행에 이유를 적습니다.
- **구현 전에 확인받는다.** 새로 여는 MCP 도구(이름·구성 대상·`annotations`)와 Code Mode를 골랐을 때의 막는 수단을 요약해 사용자 확인을 받습니다. 가이드가 노출을 켜는 변경을 사용자 확인 대상으로 정했기 때문입니다. REST 엔드포인트 추가는 요청 범위 안이면 확인 없이 진행합니다.

### 3. 구현

- **프로젝트에 있는 것부터 쓴다.** 기존 라우터 등록 방식, 인증 미들웨어, 공통 에러 처리기, 입력 검증 라이브러리, 테스트 도구를 그대로 씁니다. 새 의존성은 MCP SDK처럼 꼭 필요한 것만 추가합니다. SDK·프레임워크 API는 기억이 아니라 현재 공식 문서(Context7 MCP가 있으면 그것)로 확인합니다.
- **REST**는 `api-spec-guide.md`의 `## Conventions`와 `## 구현 중 API 추가/변경 규칙`을 따릅니다. 목록 필터·정렬 컬럼의 인덱스는 마이그레이션으로 넣습니다.
- **MCP**는 `mcp-spec-guide.md`의 `## Conventions`와 `## 구현 중 도구 추가/변경 규칙`을 따릅니다. 도구 스키마는 가능하면 구현된 엔드포인트 스키마나 내부 명령의 타입에서 생성합니다.
- **Code Mode를 골랐다면** Cloudflare Workers에서는 Agents SDK의 `@cloudflare/codemode`(OpenAPI 문서가 있으면 `openApiMcpServer()`, 기존 MCP 서버를 감싸면 `codeMcpServer()`)를 씁니다. Workers가 아니면 외부 네트워크를 막고 시간·메모리 한도를 거는 격리 샌드박스를 따로 정해야 하므로, 그 선택을 막는 수단과 함께 확인받습니다.
- **동작을 확인하는 테스트를 추가한다.** 프로젝트 테스트 도구로 목록 크기 상한과 허용 안 된 정렬의 400, 권한 없는 호출의 거부, 공통 에러 형식을 확인합니다. MCP는 `tools/list` 결과가 명세의 도구와 같은지, 권한 없는 사용자의 도구 호출이 거부되는지, 실행 에러가 `isError: true`와 모델용 문구로 오는지를 확인합니다.
- 화면·배치처럼 API·MCP 밖까지 바꿔야 하면 그 부분은 같은 명세 폴더를 `/daedalus`에 넘깁니다. 다이달로스는 planning_dir의 `api-spec.md`·`mcp-spec.md`를 그 작업의 규약으로 읽습니다.

### 4. 점검

- **명세와 코드를 대조한다.** 엔드포인트·도구마다 일치 / 미구현 / 명세에 없음으로 판정합니다. 코드에만 있는 MCP 도구는 미승인 노출(노출 기본 꺼짐 위반)입니다.
- **가이드의 대응 검사를 코드 기준으로 돌린다.** `api-spec-guide.md`의 `## 중복 API 방지 체크리스트`·`## 화면↔API 대응 검사`, `mcp-spec-guide.md`의 `## 대응 검사`입니다.
- **실제로 호출해 본다.** 서버를 띄울 수 있으면 목록 크기 상한, 허용 안 된 정렬, 권한 없는 요청, 에러 형식을 실제 요청으로 확인합니다. MCP는 SDK 클라이언트나 MCP Inspector로 `tools/list`를 받아 이름·`annotations`를 명세와 비교하고 조회 도구 하나를 호출합니다. 띄울 수 없으면 정적 판단으로 표시하고 이유를 적습니다.
- 점검만 요청했으면 결과를 대화로만 돌려줍니다. 구현까지 맡은 실행이면 발견을 고치고 같은 검사를 다시 돌립니다.

### 5. 보고

- 한 일(명세·구현·점검 중 무엇), 명세 폴더, 바꾼 파일
- 발견마다 판정(일치 / 미구현 / 명세에 없음 / 규약 위반) · 대상(엔드포인트·도구) · 근거 `file:line` · 영향 · 조치
- 실행한 테스트와 호출은 명령과 결과를, 하지 못한 검사는 `NOT RUN`과 이유를 적습니다
- 미결(인증 방식 미정, 에이전트 사용 사례 미확인 등)

## Related Files

| 파일 | 역할 |
|------|------|
| `skills/zephermine/references/api-spec-guide.md` | REST 명세 형식·규약·대응 검사 (정본) |
| `skills/zephermine/references/mcp-spec-guide.md` | MCP 명세 형식·규약·Code Mode 기준·대응 검사 (정본) |
| `skills/zephermine/SKILL.md` | 제품 전체 설계에서 같은 명세를 만드는 Step 17·17A |
| `skills/orchestrator/commands/workpm.md` | API·MCP 밖까지 걸친 구현을 넘길 다이달로스 경로 (Phase 1 API·MCP 규약 고정) |
| `skills/argos/SKILL.md` | 설계 산출물 전체 대비 감리 (Phase 3 API·3A MCP) |
| `skills/api-tester/SKILL.md` | 프론트↔백엔드 실제 연동 테스트 |
