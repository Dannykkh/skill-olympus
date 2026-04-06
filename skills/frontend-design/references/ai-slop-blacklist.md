# AI Slop Blacklist — 공유 디자인 안티패턴

> 이 파일은 `frontend-design`, `ui-ux-auditor`, `design-plan(aphrodite)` 등 디자인 관련 스킬이 공유합니다.
> 출처: gstack design methodology + OpenAI "Designing Delightful Frontends" (2026) + 자체 축적

---

## AI Slop 10항목 블랙리스트

"사람 디자이너가 존경받는 스튜디오에서 이걸 출시할까?" — 이 테스트를 통과하지 못하면 AI slop입니다.

| # | 패턴 | 왜 나쁜가 | 대안 |
|---|------|----------|------|
| 1 | **보라/인디고 그라데이션** (blue-to-purple) | AI 생성 기본값의 상징 | 단색 액센트 + 뉴트럴. 그라데이션이 필요하면 브랜드 기반 |
| 2 | **3열 피처 그리드** (아이콘+원형 배경+제목+2줄 설명, 3개 대칭) | 가장 인식하기 쉬운 AI 레이아웃 | 비대칭 그리드, 지그재그, 가로 스크롤, 벤토 그리드 |
| 3 | **원형 배경 아이콘** (colored-circle 안에 아이콘 장식) | SaaS 스타터 템플릿 냄새 | 아이콘만 사용하거나, 의미 있는 일러스트 |
| 4 | **전부 가운데 정렬** (`text-align: center` 남발) | 시선 흐름(F-pattern) 파괴, 좌측 편향(69% 주목) 무시 | 좌측 정렬 기본, 의도적 센터링은 Hero CTA만 |
| 5 | **균일한 둥근 모서리** (모든 요소에 같은 border-radius) | 시각적 위계 없음 | 위계별 radius: 버튼 sm, 카드 md, 모달 lg |
| 6 | **장식용 블롭/웨이브/서클 SVG** | 내용이 부족한 걸 장식으로 숨김 | 빈 섹션은 더 나은 콘텐츠로 채우기 |
| 7 | **이모지를 디자인 요소로 사용** | 아마추어 느낌 | Radix Icons, Phosphor Icons, Lucide, 커스텀 SVG |
| 8 | **카드 좌측 색상 보더** (`border-left: 3px solid accent`) | 대시보드 템플릿의 클리셰 | 서브틀한 배경색 차이 또는 아이콘으로 구분 |
| 9 | **제네릭 히어로 카피** ("Welcome to X", "Unlock the power of...", "Your all-in-one solution") | 아무 말도 안 하는 카피 | 구체적 가치 제안 1문장 |
| 10 | **쿠키커터 섹션 리듬** (Hero→3피처→추천사→가격→CTA, 모든 섹션 같은 높이) | 예측 가능한 구조 = 스크롤 중단 | 섹션별 높이/밀도 변화, 의외의 레이아웃 전환 |

---

## Hard Rejection 7개 (즉시 실패)

디자인 리뷰 시 아래 항목이 발견되면 해당 화면은 **즉시 재작업** 대상:

| # | 패턴 | 분류 |
|---|------|------|
| 1 | 제네릭 SaaS 카드 그리드가 첫 인상 | LANDING / APP |
| 2 | 아름다운 이미지 + 약한 브랜드 (이미지에 기대는 디자인) | LANDING |
| 3 | 강한 헤드라인 + 명확한 액션 없음 | LANDING |
| 4 | 텍스트 뒤에 복잡한 이미지 (가독성 파괴) | LANDING |
| 5 | 같은 무드 문구를 반복하는 섹션들 | LANDING |
| 6 | 내러티브 없는 캐러셀 | LANDING / APP |
| 7 | 레이아웃 대신 카드를 쌓은 앱 UI | APP |

---

## 폰트 블랙리스트

### 절대 사용 금지

Papyrus, Comic Sans, Lobster, Impact, Jokerman, Bleeding Cowboys, Permanent Marker, Bradley Hand, Brush Script, Hobo, Trajan, Courier New (본문용)

### 과사용 — 프라이머리 폰트로 사용 금지

> 보조/폴백으로는 허용하나, 메인 폰트로 쓰면 제네릭해 보임

Inter, Roboto, Arial, Helvetica, Open Sans, Lato, Montserrat, Poppins

### 카테고리별 추천 대안

| 용도 | 추천 폰트 |
|------|----------|
| 코드/데이터 | JetBrains Mono, Space Mono, IBM Plex Mono, Fira Code |
| 에디토리얼/콘텐츠 | Playfair Display, Fraunces, Newsreader, Source Serif |
| 모던 스타트업 | Clash Display, Satoshi, Cabinet Grotesk, Bricolage Grotesque |
| 기술/전문 | IBM Plex family, Space Grotesk, DM Sans |
| 한글 | Pretendard, SUIT, Noto Sans KR (보조), Wanted Sans |
| 럭셔리/프리미엄 | Geist, Outfit, Plus Jakarta Sans |

---

## 적용 가이드

### frontend-design에서

코드 생성 시 위 블랙리스트를 자동 적용. 기존 `Banned Patterns` 섹션과 병행 참조.

### ui-ux-auditor에서

감사 시 "Area 9: AI Slop 탐지" 추가 영역으로 활용:
- 10항목 블랙리스트 grep/시각 확인
- Hard Rejection 7개 확인 → 발견 시 P0 (Critical)

### design-plan (Aphrodite)에서

Phase 4 리뷰 시 이 블랙리스트를 평가 기준에 포함.
