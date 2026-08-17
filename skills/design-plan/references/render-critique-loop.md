# Render and Critique Loop

텍스트 방향 카드와 ASCII 청사진만으로 아름다움을 확정하지 않기 위한 아프로디테의 렌더 기반
선택·수정 규율입니다.

## 1. 언제 실제 후보 렌더가 필수인가

다음 중 하나라도 해당하면 Phase 3에서 실제 화면 후보 3개를 만듭니다.

- 브랜드 가이드·DESIGN.md·명확한 레퍼런스가 없음
- 사용자가 "봐야 안다", "뻔하다", "구리다", "항상 비슷하다"고 말함
- 벤치마크 원리를 새 제품에 크게 변환해야 함
- 신규 제품의 대표 화면이나 브랜드 첫 화면을 설계함
- 기존 디자인의 핵심 구도·메시지·모바일 구조를 바꿈

작은 컴포넌트 수정, 이미 승인된 방향의 국소 변경, 명확한 exact recreation은 후보 렌더를 생략할
수 있습니다. 생략 이유를 구현 로그에 남깁니다.

## 2. 후보 생성 규칙

후보는 같은 카드 그리드의 색상 변형이 아니어야 합니다.

1. 동일한 실제 카피·데이터·상태를 사용합니다.
2. 구성, 정보 위계, 베이스 명도, 타이포 대비, 재질, 모션 중 최소 4개 축을 다르게 합니다.
3. 기능형 화면은 효과가 아니라 과업 흐름·pane 우선순위·밀도를 다르게 합니다.
4. 각 후보에 데스크톱 대표 화면과 모바일 핵심 화면을 포함합니다.
5. 외부 API·백엔드 없이 정적 HTML/React 프로토타입으로 빠르게 렌더할 수 있습니다.
6. 후보 파일은 확정 전 throwaway이며 실제 구현에 그대로 복사하지 않습니다.

## 3. 출력만 보고 비평하기

의도 설명을 먼저 읽으면 결과를 관대하게 해석하게 됩니다. 먼저 스크린샷만 보고 다음을 평가한 뒤
방향 카드와 계약을 대조합니다.

| 축 | 질문 |
|---|---|
| 이해 | 5초 안에 무엇을 위한 화면인지, 다음 행동이 무엇인지 알 수 있는가? |
| 위계 | 핵심 메시지·주 행동·증거가 경쟁하지 않고 순서대로 읽히는가? |
| 구도 | 비율·빈 공간·밀도·강조가 하나의 시각 논지를 만드는가? |
| 리듬 | 섹션과 반복 요소가 전부 같은 크기·높이·카드로 굳지 않았는가? |
| 제품성 | 제품명만 바꿔 다른 서비스에 붙일 수 없는 고유한 선택이 있는가? |
| 신뢰 | 사용자의 불안 직전에 검증 가능한 근거가 나타나는가? |
| 모바일 | 축소판이 아니라 과업 우선순위에 맞게 재구성됐는가? |
| 상태 | loading·empty·error·success가 흐름 안에서 자연스럽게 이어지는가? |
| 절제 | signature 장면 외의 요소가 주 행동을 방해하지 않는가? |

사용자가 대화에 있으면 실제 후보를 보여주고 좋은 점·싫은 점을 받습니다. 자동 실행이면 위 기준을
근거와 함께 비교하고 가장 약한 후보를 제거합니다. 숫자 총점만으로 취향을 위장하지 않습니다.

## 4. Baseline-worthiness gate

첫 결과에서 바로 레이아웃·위계·카피를 고정하지 않습니다. 다음을 먼저 판정합니다.

```text
구조와 메시지가 좋다
  → 보존 영역 선언
  → 한 번에 변수 1~2개만 바꾸는 variants

구조나 메시지가 나쁘다
  → 레이아웃·섹션 순서·카피·CTA·신뢰 위치까지 수정
  → 다시 렌더하고 gate 재실행
```

다음 중 하나라도 실패하면 구조 수정이 허용됩니다.

- Page Goal과 primary task가 첫 화면에서 드러남
- Core Message→Evidence→CTA 순서가 자연스러움
- 데스크톱과 모바일 모두 핵심 과업을 완료할 수 있음
- 반복 구조가 의도된 리듬을 가지며 제네릭 템플릿이 아님
- 접근성이나 성능을 희생해야만 유지되는 장면이 없음

## 5. 수정 라운드

- 자동 수정은 최대 2라운드입니다.
- 라운드마다 가장 큰 문제 1~2개만 바꿉니다.
- 구조 문제를 색·그림자 수정으로 덮지 않습니다.
- 2라운드 후 남은 문제는 숨기지 말고 잔여 이슈로 보고합니다.
- 승인된 기반이 생긴 뒤에만 `PRESERVE`를 강하게 적용합니다.

## 6. 산출물

```text
docs/design-refs/YYYY-MM-DD-direction-{slug}.md
docs/design-refs/YYYY-MM-DD-critique-{slug}.md
```

Direction 파일에는 다음을 남깁니다.

- 선택된 후보 ID와 MODE, COMPOSITION, MESSAGE, CTA, TRUST, RESPONSIVE, STATE, VISUAL SYSTEM,
  MOTION, NEGATIVE, SUCCESS
- 후보 source artifact, 데스크톱·모바일 screenshot의 실제 경로
- 각 screenshot의 viewport, theme, capture 시각
- 사용자가 선택했으면 선택 문구를 그대로 기록한 `Selection Quote`
- 자동 실행이면 quote를 꾸며내지 않고 `AUTO_SELECTION`과 관찰 근거
- 서로 다른 후보의 요소를 혼합했다면 가져온 부분과 계약 충돌 해소 방식
- 실제 후보 렌더를 생략했으면 exemption 조건과 영향 범위

Critique 파일에는 후보별 screenshot 관찰, 탈락 이유, 구조 수정 내역, 보존 영역, 남은 검증 범위를
남깁니다. 파일이 존재한다는 사실만으로 후보를 봤다고 간주하지 않습니다.

선택 결과를 `DESIGN.md`와 Experience Contract에 반영한 뒤 구현으로 넘어갑니다.

## 7. Adapter Comparison Contract

사용자가 Product Design 유무 비교를 요청했거나 새 adapter의 첫 도입으로 기준선이 없으면, 디자인
취향 비교가 아니라 같은 계약을 두 실행 엔진이 얼마나 충실하게 구현하는지 대조합니다.

### 입력 고정

두 경로에 다음을 동일하게 제공합니다.

- brief, Experience Contract, `DESIGN.md`, Layout Blueprint
- 실제 카피·데이터·loading/empty/error/success 상태
- source asset과 font, viewport, theme, locale
- 허용 dependency와 시간·성능 예산
- 비교에서 바꾸지 않을 `PRESERVE` 항목

한 경로에만 추가 레퍼런스나 더 자세한 프롬프트를 주지 않습니다. 재현 가능한 seed가 있으면 같은
seed를 사용하고, 없으면 비결정성을 기록합니다.

### 관찰 축

| 축 | 증거 |
|---|---|
| 과업 완수 | 시작→완료, 실패→복구 실행 결과 |
| 계약 충실도 | 섹션 순서, CTA, trust, 상태, 모바일 변환 대조 |
| 방향 차별성 | direction fingerprint와 실제 screenshot |
| 접근성 | keyboard, focus, label, reduced-motion |
| 성능 | 동일 환경의 측정값과 자산·bundle 차이 |
| 코드 적합성 | 기존 component/token 재사용, 수정 범위, cleanup |
| 수정 가능성 | 변수 1~2개 variant가 보존 영역을 깨지 않는지 |
| 사용자 선택 | 두 결과를 출처 라벨 없이 본 뒤의 실제 선택 문구 |

숫자 미학 점수 하나로 승자를 정하지 않습니다. Product Design 결과도 Phase 5-4와 Phase 6의 동일한
게이트를 통과해야 합니다.

### 불완전 비교

- Product Design이 `READY`가 아니면 가상 결과를 만들지 않고 `NOT RUN`으로 기록합니다.
- 한 경로만 렌더됐으면 비교가 아니라 baseline 단독 결과입니다.
- dependency·viewport·copy가 달랐으면 confound를 기록하고 우열 결론을 내리지 않습니다.

산출물:

```text
docs/design-refs/YYYY-MM-DD-adapter-comparison-{slug}.md
```
