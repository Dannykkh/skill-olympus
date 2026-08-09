# Site Benchmark Guide

좋은 사이트를 색·폰트 샘플이 아니라 재사용 가능한 경험 문법으로 해부하기 위한 아프로디테의
사이트 디자인 벤치마크 규칙입니다. 벤치마크가 제공되면 Phase 1에서 이 가이드를 반드시 적용합니다.

## 목차

1. 벤치마크의 목적
2. 증거 확보
3. 관찰 매트릭스
4. Adopt·Adapt·Avoid 판정
5. Experience Contract 컴파일
6. 통과 게이트
7. 예시

## 1. 벤치마크의 목적

벤치마크는 사이트를 복제하는 절차가 아닙니다. 다음 질문에 답하는 근거 수집입니다.

- 사용자가 무엇을 어떤 순서로 이해하는가?
- 어떤 지점에서 행동하고, 그 전에 어떤 신뢰를 얻는가?
- 화면의 리듬과 위계가 메시지를 어떻게 강화하는가?
- 모바일에서 무엇이 유지·재배치·제거되는가?
- 아름다움이 성능과 접근성을 해치지 않는가?

색·폰트·그림자는 이 분석의 일부일 뿐입니다. 헤더, 핵심 메시지, CTA, 신뢰, 섹션 순서,
상태, 반응형 변화가 먼저입니다.

## 2. 증거 확보

캡처 기술은 [reference-capture-guide.md](reference-capture-guide.md)를 따릅니다.

벤치마크마다 다음 증거를 확보합니다.

1. 데스크톱 첫 화면과 전체 섹션 시퀀스
2. 모바일 첫 화면과 전체 섹션 시퀀스
3. 전역 내비게이션의 열림·닫힘·sticky 상태
4. primary CTA 이전과 이후 화면
5. 폼·검색·필터·결제 등 주 과업의 시작→진행→완료
6. loading·empty·error·success 상태
7. 모션이 있으면 시작·중간·끝과 reduced-motion 폴백
8. 실제 HTML/CSS가 있으면 스크린샷 추정보다 소스 우선

모바일 화면이 없으면 데스크톱만 보고 변화를 추측하지 않습니다. 라이브 URL에서 실제 좁은
뷰포트를 관찰하거나 `mobile evidence unavailable`로 기록합니다.

## 3. 관찰 매트릭스

각 항목을 `관찰 → 작동 이유 → 제품 적용 가능성 → 증거 위치` 순서로 기록합니다.

| 영역 | 반드시 기록할 것 |
|---|---|
| Page goal | 화면의 단일 임무, 사용자·사업 성공 조건 |
| Header | 로고, 현재 위치, 메뉴, 보조 행동, primary CTA 순서 |
| Core message | 약속→설명→증거의 문장 순서와 첫 뷰포트 범위 |
| Section order | 섹션별 사용자 질문과 다음 섹션으로 이어지는 이유 |
| CTA | 문구, 시각 위계, 등장·반복 시점, 목적지, 완료 피드백 |
| Trust | 후기·수치·고객사·보안·환불·출처가 불안 직전에 배치되는 방식 |
| Layout | 그리드, 비율, 빈 공간, 밀도 변화, 강조 이탈, 카드 anatomy |
| Content/media | 카피·이미지·데모가 설명·증명·감정 중 맡는 역할 |
| Visual system | 지배색·액센트 역할, 타입 대비, 표면, 깊이, 리듬 |
| Interaction | hover·press·focus·scroll·transition이 제공하는 피드백 |
| Responsive | desktop 요소별 retain/reorder/compress/collapse/defer/replace/sticky/remove |
| States | loading·empty·error·success·permission·stale와 회복 행동 |
| Performance | 첫 화면 자산, 이미지·폰트·영상·스크립트 비용, 지연 전략 |
| Accessibility | 의미 구조, 키보드, 포커스, 레이블, 대비, 모션 대체 |

벤치마크가 마케팅 사이트면 `메시지→신뢰→전환`, 기능형 제품이면 `입력→처리→상태→결과→복구`
흐름을 우선합니다. 모든 사이트에 Hero→Features→Testimonials 템플릿을 강요하지 않습니다.

## 4. Adopt·Adapt·Avoid 판정

관찰한 항목을 다음 셋 중 하나로 분류합니다.

| 판정 | 의미 | 기록할 근거 |
|---|---|---|
| Adopt | 제품에도 그대로 유효한 원리 | 사용자 과업과 품질에 맞는 이유 |
| Adapt | 원리는 유효하지만 제품·콘텐츠·기술에 맞게 변환 | 원본→변환 결과와 이유 |
| Avoid | 접근성·성능·저작권·제품 맥락 때문에 제외 | 제외하지 않을 때의 위험 |

다음은 자동으로 Avoid 또는 Adapt합니다.

- 소유하지 않은 브랜드 카피, 로고, 사진, 영상, 코드
- 근거 없는 고객 수치·후기·보안 배지
- 키보드·reduced-motion·모바일 폴백이 없는 효과
- 제품 과업보다 장식을 우선하는 구조
- 벤치마크의 색·폰트를 제품 근거 없이 그대로 복제하는 선택

정확 재현은 사용자가 권리와 목적을 명시했을 때만 허용합니다. 그래도 접근성과 성능 기준은
독립적으로 적용합니다.

## 5. Experience Contract 컴파일

관찰 기록을 [experience-contract-guide.md](experience-contract-guide.md)의 필수 제목으로 변환합니다.

```text
관찰 증거
  → Header and Navigation
  → Core Message
  → Section Order
  → CTA Strategy
  → Trust Strategy
  → Desktop Structure
  → Mobile Transformations
  → States
  → Performance Budget
  → Accessibility Contract
  → Adopt / Adapt / Avoid
  → Prompt Contract
```

벤치마크 파일은 증거층이고 Experience Contract는 프로젝트에 적용할 결정층입니다. 두 파일을
합치지 않아도 되지만 Contract의 `Evidence`에는 근거 파일 경로를 남깁니다.

## 6. 통과 게이트

벤치마크가 있는 작업은 다음 게이트를 모두 통과해야 구현으로 넘어갑니다.

### Gate A — Capture completeness

- 데스크톱과 모바일 증거가 있거나 누락 이유가 명시됨
- 모든 가시적 섹션과 주 과업 상태를 기록함
- 캡처일·URL·적용 범위·라이선스 경계를 기록함

### Gate B — Structural understanding

- 헤더, 메시지, 섹션, CTA, 신뢰의 순서를 설명함
- 각 순서가 사용자 질문이나 불안을 어떻게 해결하는지 설명함
- 색·폰트 목록만 있고 구조 근거가 없으면 실패

### Gate C — Responsive transformation

- 요소별 모바일 변환 연산과 이유가 있음
- `mobile: stack` 또는 미디어쿼리 이름만 있으면 실패

### Gate D — Product adaptation

- Adopt·Adapt·Avoid가 모두 작성됨
- 브랜드·카피·에셋을 복제하지 않음
- 프로젝트의 목표·과업·콘텐츠로 번역됨

### Gate E — Implementation fidelity

- 구현 프롬프트가 Experience Contract에서 추적 가능함
- 최종 데스크톱·모바일 렌더가 선택한 Adopt·Adapt 결정과 일치함
- 차이는 결함 또는 의도된 변경으로 분류하고 정본에 역반영함

### Gate F — Independent quality

- 벤치마크가 느리거나 접근성이 낮아도 그대로 재현하지 않음
- 성능·접근성·과업 완료·오류 회복을 독립 검증함
- 시각적 유사성만으로 통과시키지 않음

## 7. 예시

```markdown
### 관찰
- 데스크톱 헤더: 로고→카테고리→검색→로그인→구매 CTA.
- 핵심 메시지 뒤에 사용 수치가 아니라 실제 제품 미리보기가 증거로 등장.
- 모바일: 카테고리는 bottom sheet로 교체되고 구매 CTA는 하단에 고정.

### 판정
- Adopt: 핵심 약속 직후 실제 결과물을 증거로 보여주는 순서.
- Adapt: 구매 CTA 하단 고정 → PDF 앱의 "이어서 읽기" 하단 제어로 변환.
- Avoid: 자동 재생 제품 영상. 느린 네트워크와 reduced-motion에 불리함.

### Prompt fragment
MESSAGE — 한 문장 약속 뒤에 최근 PDF와 진행률을 실제 데이터로 증명한다.
CTA — 최근 문서가 있으면 "이어서 읽기"를 primary로 둔다.
RESPONSIVE — 데스크톱 좌우 분할을 모바일 목록→전체화면 뷰어로 교체하고 제어를 하단 고정한다.
```

이 예시처럼 벤치마크의 표면을 복사하지 않고 순서·신뢰·변환 원리를 제품 경험으로 번역합니다.
