# Experience Contract Guide

아프로디테가 화면의 외형뿐 아니라 이해·행동·신뢰·회복 흐름을 구현 단계까지 전달하기 위한 계약입니다.
`DESIGN.md`가 시각 토큰과 미학 원칙의 정본이라면, Experience Contract는 콘텐츠 위계, 과업 흐름,
상태 행동, 반응형 변환의 정본입니다.

## 목차

1. 정본 경계
2. 작성 시점과 파일명
3. 필수 템플릿
4. 모바일 변환 문법
5. 프롬프트 컴파일
6. 구현 인계와 검증
7. 예시

## 1. 정본 경계

| 정본 | 소유하는 결정 |
|---|---|
| `DESIGN.md` | 색, 타이포, 간격, 라운드, 표면, 컴포넌트 외관, 모션 원칙 |
| Experience Contract | 페이지 목표, 사용자 과업, 검증된 사실·콘텐츠 상태·자산 출처, 메시지 순서, CTA, 신뢰, 상태, 모바일 변환 |
| Layout Blueprint | 페이지별 블록 순서, 그리드, 요소 anatomy, 첫 뷰포트 구성 |
| 구현 코드 | 실제 기능과 렌더 결과. 위 계약을 임의로 재해석하지 않음 |

충돌 시 사용자 과업과 접근성이 항상 장식보다 우선합니다. 시각 토큰 충돌은 `DESIGN.md`, 콘텐츠와
행동 충돌은 Experience Contract를 따릅니다. 구현 과정에서 계약을 바꿔야 하면 코드만 고치지 말고
해당 정본에 먼저 역반영합니다.

## 2. 작성 시점과 파일명

Phase 1~2에서 작성하고 Phase 4에서 화면별 구조와 상태를 보강합니다.

```text
docs/design-refs/YYYY-MM-DD-experience-{slug}.md
```

- 벤치마크 사이트가 있으면 `source mode: benchmark`로 작성하고
  [site-benchmark-guide.md](site-benchmark-guide.md)의 관찰 근거와 Adopt/Adapt/Avoid를 포함합니다.
- 벤치마크가 없으면 `source mode: product-derived`로 작성하고 제품·사용자·과업 근거를 남깁니다.
- 구현 전에 다음 검증을 통과해야 합니다.

```bash
python <DESIGN_PLAN_SKILL_DIR>/scripts/validate_experience_contract.py \
  docs/design-refs/YYYY-MM-DD-experience-{slug}.md
```

## 3. 필수 템플릿

아래 제목은 검증 스크립트가 읽는 계약이므로 이름을 바꾸지 않습니다.

````markdown
# Experience Contract: {프로젝트 또는 페이지}

## Source Mode

- Mode: benchmark | product-derived
- Evidence: {benchmark 파일, brief, 사용자 요구, 데이터}

## Product Facts

| Claim | Source | Captured at | Freshness/status | Allowed presentation |
|---|---|---|---|---|
| {사용자에게 보여줄 검증 가능한 사실} | {공식 문서·제품 데이터·사용자 제공 자료} | {YYYY-MM-DD} | current/stale/unverified | {허용 카피 또는 생략 규칙} |

## Benchmark Sources

- {benchmark 모드일 때 URL/스크린샷/캡처일과 적용 범위}

## Page Goal

- 사용자가 이 화면에서 달성할 결과:
- 제품이 얻어야 하는 결과:
- 관찰 가능한 성공 조건:

## Audience and Tasks

- 주요 사용자와 사용 상황:
- 최우선 과업:
- 시작 조건과 완료 조건:
- 주요 불안·마찰·실패 가능성:

## Header and Navigation

- 브랜드·현재 위치·전역 이동·주 행동의 순서:
- 데스크톱 내비게이션:
- 모바일 대체 구조:

## Core Message

- 핵심 약속:
- 설명:
- 증거:
- 사용자가 다음에 이해해야 할 것:

## Content Integrity

| Content item | Classification | Evidence | Presentation rule |
|---|---|---|---|
| {수치·후기·사례·카피} | verified/prototype/placeholder/hypothesis | {출처 또는 없음} | {표시·라벨·생략 규칙} |

## Section Order

1. {섹션}: {사용자 질문에 답하는 역할}
2. {섹션}: {앞 섹션 다음에 와야 하는 이유}

## CTA Strategy

- Primary: {정확한 문구, 목적지, 등장 시점}
- Secondary: {있을 때만}
- 반복 규칙: {언제 다시 보여주는가}
- 완료·실패 피드백:

## Trust Strategy

- 사용자가 불안을 느끼는 지점:
- 그 직전에 제시할 근거:
- 출처·날짜·검증 가능성:
- 근거가 없을 때 생략할 요소:

## Asset Provenance

| Asset | Source | Local path | License/trademark/attribution | Modification allowed | Status/fallback |
|---|---|---|---|---|---|
| {로고·이미지·아이콘·폰트·영상} | {공식 URL·사용자 제공·생성 도구} | {경로} | {근거} | yes/no/limited | verified/replace/remove |

## Desktop Structure

- 기준 뷰포트:
- 첫 뷰포트:
- 그리드·pane·콘텐츠 위계:
- 스크롤 흐름과 밀도 변화:

## Mobile Transformations

| Desktop element | Operation | Mobile result | Reason |
|---|---|---|---|
| {요소} | retain/reorder/compress/collapse/defer/replace/sticky/remove | {결과} | {과업 근거} |

## States

| State | Trigger | User sees | Available action | Recovery |
|---|---|---|---|---|
| loading | | | | |
| empty | | | | |
| error | | | | |
| success | | | | |

## Performance Budget

- 첫 화면 필수 자산:
- 지연 가능한 자산:
- 폰트 weight·이미지·영상·모션 예산:
- 저성능 기기와 느린 네트워크 폴백:

## Accessibility Contract

- 문서·랜드마크·헤딩 읽기 순서:
- 키보드·포커스·Escape 동작:
- 레이블·오류 연결·상태 알림:
- 대비·색 외 신호·터치 타깃:
- reduced-motion과 대체 경험:

## Adopt

- {benchmark 모드에서 근거와 함께 채택할 원리}

## Adapt

- {제품에 맞게 바꿀 원리와 변환 이유}

## Avoid

- {접근성·성능·제품 맥락·저작권 때문에 가져오지 않을 요소}

## Prompt Contract

GOAL —
AUDIENCE —
TASK —
FLOW —
HEADER —
MESSAGE —
FACTS —
CONTENT_INTEGRITY —
SECTION_ORDER —
CTA —
TRUST —
ASSETS —
LAYOUT —
RESPONSIVE —
STATES —
PERFORMANCE —
ACCESSIBILITY —
PRESERVE —
EXCLUDE —
SUCCESS —

## Success Checks

- 첫 5초 안에 핵심 약속과 주 행동을 설명할 수 있는가?
- 화면의 사실·수치·후기·브랜드 자산이 출처와 상태를 가지며, unverified 항목을 사실처럼 보이지 않는가?
- 주요 과업을 막는 상태·정보·행동 누락이 없는가?
- 모바일이 데스크톱 축소판이 아니라 우선순위에 맞게 재구성됐는가?
- 아름다움, 접근성, 성능 중 하나를 다른 하나의 희생으로 얻지 않았는가?
````

벤치마크가 없는 경우에도 `Benchmark Sources`, `Adopt`, `Adapt`, `Avoid` 제목은 남길 수 있지만
`해당 없음 — product-derived`라고 명시합니다. 빈 제목으로 두지 않습니다.

`Product Facts`에 표시할 사실이 없으면 행을 지우고 `해당 없음 — 사용자에게 제시할 사실 주장 없음`을
기록합니다. `Asset Provenance`도 외부·생성 자산을 쓰지 않으면 `해당 없음 — 프로젝트 내부 자산만
사용`이라고 기록합니다. 제목을 비워 두거나 출처 없는 값을 채우는 것보다 명시적 해당 없음이
낫습니다.

`Content Integrity`의 분류 의미는 다음과 같습니다.

| Classification | 의미 | 사용자 노출 규칙 |
|---|---|---|
| `verified` | 출처와 최신성을 확인한 실제 내용 | 사실로 표시 가능 |
| `prototype` | 인터랙션 검증을 위한 샘플 | 프로토타입임을 표시하고 운영 화면에 승격 금지 |
| `placeholder` | 교체 전 임시 내용 | 최종 완료 전에 교체하거나 명시적으로 제거 |
| `hypothesis` | 아직 검증하지 않은 제품·사용자 가정 | 사실처럼 카피하지 않고 검증 과제로 남김 |

## 4. 모바일 변환 문법

모바일은 열을 쌓는 CSS 규칙이 아니라 정보 우선순위 변환입니다.

| Operation | 의미 | 예 |
|---|---|---|
| `retain` | 위치와 역할 유지 | 핵심 메시지와 primary CTA 유지 |
| `reorder` | 과업 순서에 맞게 앞뒤 변경 | 이미지보다 가격·행동을 먼저 노출 |
| `compress` | 의미를 보존하며 밀도 축소 | 긴 메타데이터를 2행 요약으로 |
| `collapse` | 필요할 때 펼치게 접기 | 보조 FAQ·세부 필터 |
| `defer` | 첫 렌더 뒤로 지연 | 무거운 영상·보조 그래프 |
| `replace` | 모바일에 맞는 다른 패턴으로 교체 | 메가메뉴를 bottom sheet로 |
| `sticky` | 손가락 도달 영역에 지속 배치 | 체크아웃 CTA를 하단 고정 |
| `remove` | 과업에 기여하지 않는 장식 제거 | 데스크톱 전용 장식 레이어 |

모든 변환에는 이유가 필요합니다. `mobile: stack` 한 줄은 계약 미완성입니다.

## 5. 프롬프트 컴파일

`Prompt Contract`는 구현 도구가 달라도 동일하게 사용합니다.

- 로컬 구현: 네이티브 구현 작업자가 해석된 `MODULE_SKILL[frontend-design]`의 계약을 직접 읽어
  컴포넌트·CSS·상태 UI로 변환합니다.
- Stitch: 상위 Aphrodite가 해석한 `MODULE_SKILL[stitch]`의 계약을 직접 적용해 같은 계약을
  generate·edit·variants 의도에 맞는 Stitch MCP 입력으로 컴파일합니다. 활성 `/stitch` 등록은
  전제하지 않습니다.
- 후속 수정: `PRESERVE`와 변경할 변수 1~2개를 명시합니다.

색·폰트 값을 프롬프트마다 반복하지 않습니다. 프로젝트 `DESIGN.md`를 참조하고 프롬프트에는 역할과
구조를 적습니다. 벤치마크 카피·브랜드명·에셋 URL을 복제하지 않습니다.

## 6. 구현 인계와 검증

아프로디테는 API나 데이터 처리 로직을 소유하지 않지만, 사용자가 보게 될 상태와 행동 피드백의
설계는 소유합니다. 구현 담당자는 계약의 loading/empty/error/success/permission 상태를 실제 기능과
연결합니다.

완료 전에 다음을 확인합니다.

1. Experience Contract 정적 검증 통과
2. Product Facts·Content Integrity·Asset Provenance와 실제 렌더의 주장·자산 대조
3. 데스크톱·모바일 렌더에서 섹션 순서와 변환 대조
4. primary task를 처음부터 완료·실패·복구까지 실행
5. 키보드·포커스·reduced-motion·스크린리더 순서 확인
6. 실제 자산으로 성능 측정
7. `DESIGN.md`와 구현 토큰 드리프트 확인

## 7. 예시

```markdown
## Core Message
- 핵심 약속: 흩어진 PDF를 읽던 위치 그대로 다시 연다.
- 설명: 최근 문서와 진행률을 책장처럼 보여준다.
- 증거: 실제 파일명, 마지막 열람 시각, 페이지 진행률.

## CTA Strategy
- Primary: "이어서 읽기" — 최근 문서가 있을 때 첫 뷰포트에 1회.
- Secondary: "PDF 추가" — 빈 상태와 라이브러리 헤더에서 제공.

## Mobile Transformations
| Desktop element | Operation | Mobile result | Reason |
|---|---|---|---|
| 좌측 책 목록 + 우측 뷰어 | replace | 목록 화면과 전체화면 뷰어로 분리 | 좁은 폭에서 읽기 집중 유지 |
| 상단 페이지 제어 | sticky | 하단 엄지 영역 제어바 | 한 손 조작 거리 단축 |
| 책 표지 6열 | compress | 2열 + 제목 2줄 제한 | 식별 가능성과 스크롤 밀도 균형 |
```

이 예시는 색이나 폰트가 없어도 구현 방향을 구체화합니다. 시각 값은 `DESIGN.md`가 공급합니다.
