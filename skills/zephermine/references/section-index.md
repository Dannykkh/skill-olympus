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

### 경계 규칙 — 기능 수직 분할이 기본

유지보수는 "기능 하나를 열어서 고치는" 일입니다. 레이어로 나누면 기능 하나가 api-layer와
frontend와 integration에 흩어져 그게 불가능해집니다. 따라서 **섹션은 기능(수직)으로 자릅니다.**

| 분할 방식 | 허용 | 조건 |
|---|---|---|
| 기능 수직 (`section-03-coupon-issue`) | 기본 | 한 섹션이 그 기능의 데이터·API·화면·테스트를 모두 소유 |
| 공유 기반 (`section-01-foundation`) | 예외 | 둘 이상의 기능 섹션이 실제로 공유하는 것만. index.md에 **공유하는 섹션 목록을 사유로 기록** |
| 레이어 (`section-api-layer`) | 금지 | 기능이 흩어짐. 기존 코드베이스가 이미 레이어로 강제돼 있을 때만 사유와 함께 허용 |
| 역할 전용 화면 | 기본 | `spec.md` 시스템 역할 표의 `화면` 열이 '별도 화면'인 역할은 독립 섹션 |

공유 기반 섹션은 최소화합니다. "나중에 쓸 것 같아서" 만든 공통 모듈은 사용처가 하나면 그 기능
섹션 안으로 넣습니다.

### 그 외

- **Focused sections**: One logical unit of work each
- **Parallelization**: Consider which sections can run independently
- **Dependency direction**: Earlier sections should not depend on later sections

## Harness (모듈 조립 지점)

의존성 그래프는 **빌드 순서**이고, 하네스는 **런타임 조립**입니다. 둘은 다릅니다. 모듈을 나눴는데
어디서 어떻게 합쳐지는지 적지 않으면 각 섹션이 서로를 추측하게 됩니다.

index.md에 다음 절을 포함합니다.

```markdown
## Harness

**조립 지점**: {프로젝트의 실제 지점 — 라우터 등록 / DI 컨테이너 / 플러그인 레지스트리 / 이벤트 버스 / 모듈 인덱스}
**파일**: `src/app/routes.ts` (예시 — 실제 경로)

| 모듈 섹션 | 등록 방식 | 계약 |
|---|---|---|
| section-03-coupon-issue | `registerRoute('/admin/coupons', CouponIssueModule)` | `CouponModule` 인터페이스 |
| section-04-coupon-revoke | 같은 레지스트리에 등록 | 같은 인터페이스 |

**계약 검증 위치**: `src/app/__tests__/module-registry.test.ts` — 모든 모듈이 인터페이스를 만족하는지
```

규칙:

- **기존 조립 지점을 먼저 찾습니다.** 프로젝트에 라우터·DI·레지스트리가 이미 있으면 그것을 씁니다.
  하네스를 새로 만드는 것은 기존 조립 지점이 없을 때뿐이고, 그때도 계획에 근거를 남깁니다.
- 모든 기능 섹션은 **정확히 하나의 조립 지점**에 등록됩니다. 두 곳에 등록되면 경계가 잘못된 신호입니다.
- 조립 지점이 없는 프로젝트(단일 스크립트, 라이브러리 1개)는 `NOT APPLICABLE: single composition point`로 기록합니다.

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
section-02-coupon-issue
section-03-coupon-revoke
section-04-coupon-stats
section-05-member-wallet
END_MANIFEST -->

# Implementation Sections Index

## Dependency Graph

| Section | Depends On | Blocks | Parallelizable |
|---------|------------|--------|----------------|
| section-01-foundation | - | all | Yes |
| section-02-coupon-issue | 01 | 03, 04 | Yes |
| section-03-coupon-revoke | 01, 02 | - | Yes |
| section-04-coupon-stats | 01, 02 | - | Yes |
| section-05-member-wallet | 01 | - | Yes |

> 02~05는 각자 데이터·API·화면·테스트를 전부 소유하므로 서로를 건드리지 않고 병렬 구현됩니다.
> 01만 공유 기반이며, 공유 사유는 아래 Shared Foundation Rationale에 기록합니다.

## Harness

**조립 지점**: 모듈 레지스트리 (기존 `src/app/routes.ts`)
**계약 검증 위치**: `src/app/__tests__/module-registry.test.ts`

| 모듈 섹션 | 등록 방식 | 계약 |
|---|---|---|
| section-02-coupon-issue | `registerModule(CouponIssueModule)` | `AdminModule` |
| section-03-coupon-revoke | `registerModule(CouponRevokeModule)` | `AdminModule` |
| section-04-coupon-stats | `registerModule(CouponStatsModule)` | `AdminModule` |
| section-05-member-wallet | `registerModule(MemberWalletModule)` | `CustomerModule` |

## Shared Foundation Rationale

| 공유 기반 섹션 | 공유하는 섹션 | 사유 |
|---|---|---|
| section-01-foundation | 02, 03, 04, 05 | 쿠폰 엔티티·상태 전이·권한 미들웨어를 네 기능이 실제로 공유 |

## Flow Diagram Mapping

| Section | Flow Diagram | Nodes |
|---------|-------------|-------|
| section-01-foundation | coupon-state.mmd | 상태 전이 전체 |
| section-02-coupon-issue | coupon-issue.mmd | PickGrade → SetAmount → RoleCheck → Persist |
| section-03-coupon-revoke | coupon-revoke.mmd | Lookup → RoleCheck → UsedCheck → Audit |
| section-04-coupon-stats | coupon-issue.mmd | StatsUpdate |
| section-05-member-wallet | coupon-issue.mmd | Distribute → Inbox |

## Execution Order

1. section-01-foundation (no dependencies)
2. section-02-coupon-issue (after 01)
3. section-03-coupon-revoke, section-04-coupon-stats, section-05-member-wallet (parallel)

## Section Summaries

### section-01-foundation
쿠폰 엔티티, 상태 전이, 역할 미들웨어. 공유 기반 — 사유는 위 표 참조.

### section-02-coupon-issue
등급별 쿠폰 발행. 발행 API + 발행 화면 + 예산 검증 + 테스트를 모두 소유.

### section-03-coupon-revoke
회수·재발급. 조회 API + 상담 화면 + 감사 로그 + 테스트를 모두 소유.

### section-04-coupon-stats
소진율 집계. 집계 쿼리 + 차트 화면 + 테스트를 모두 소유.

### section-05-member-wallet
회원 쿠폰함 (member 전용 화면). 조회 API + 고객 화면 + 적용 흐름 + 테스트를 모두 소유.
```
