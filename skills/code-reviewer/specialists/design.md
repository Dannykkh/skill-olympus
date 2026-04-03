# Design Specialist 체크리스트

Scope: 프론트엔드 파일 변경 시
Output: JSON (한 줄에 하나). 발견 없으면 `NO FINDINGS`만 출력.

```json
{"severity":"INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"design","summary":"...","fix":"...","specialist":"design"}
```

DESIGN.md 또는 design-system.md가 있으면 먼저 읽고, 명시적 패턴은 플래그하지 않음.

---

## Confidence 등급

- **[HIGH]** — grep/패턴 매치로 확실히 감지. 확정 발견.
- **[MEDIUM]** — 패턴 집계/휴리스틱. 발견으로 플래그하되 노이즈 가능.
- **[LOW]** — 시각적 의도 이해 필요. "가능: [설명]. /design-review로 확인."

---

## 분류

**AUTO-FIX** (기계적 CSS만 — HIGH confidence):
- `outline: none` → `&:focus-visible { outline: 2px solid currentColor; }` 추가
- 새 CSS의 `!important` → 제거하고 명시도 수정
- body 텍스트 `font-size` < 16px → 16px로 조정

**ASK** (나머지 — 디자인 판단 필요):
- AI slop, 타이포그래피, 간격, 인터랙션 상태, DESIGN.md 위반

---

## 카테고리

### 1. AI Slop 감지 (최우선)
- **[MEDIUM]** 보라/인디고 그라디언트 배경 (`#6366f1`~`#8b5cf6` 범위)
- **[LOW]** 3-column feature grid: 색상 원 안 아이콘 + 볼드 제목 + 2줄 설명 × 3
- **[LOW]** 장식용 색상 원 안 아이콘 (`border-radius: 50%` + 배경색)
- **[HIGH]** 모든 것 중앙 정렬: `text-align: center`가 60% 이상이면 플래그
- **[MEDIUM]** 균일한 버블 border-radius: 80% 이상이 동일 값(≥16px)이면 플래그
- **[MEDIUM]** 제네릭 히어로 카피: "Welcome to", "Unlock the power of", "Revolutionize"

### 2. 타이포그래피
- **[HIGH]** body 텍스트 `font-size` < 16px
- **[HIGH]** diff에 3개 이상 font-family 도입
- **[HIGH]** 헤딩 계층 건너뛰기 (h1 → h3, h2 없음)
- **[HIGH]** 블랙리스트 폰트: Papyrus, Comic Sans, Lobster, Impact, Jokerman

### 3. 간격 & 레이아웃
- **[MEDIUM]** DESIGN.md 스케일에 맞지 않는 임의 간격값 (4px/8px 미준수)
- **[MEDIUM]** 반응형 처리 없는 고정 width (`width: NNNpx`, max-width/@media 없음)
- **[MEDIUM]** 텍스트 컨테이너에 `max-width` 없음 (75자 이상 줄)
- **[HIGH]** 새 CSS에 `!important`

### 4. 인터랙션 상태
- **[MEDIUM]** 인터랙티브 요소에 hover/focus 상태 누락
- **[HIGH]** 대체 포커스 표시 없이 `outline: none` (키보드 접근성 제거)
- **[LOW]** 터치 타겟 < 44px

### 5. DESIGN.md 위반 (해당 파일 존재 시만)
- **[MEDIUM]** 팔레트에 없는 색상 사용
- **[MEDIUM]** 지정되지 않은 폰트 사용
- **[MEDIUM]** 스케일 밖 간격값 사용

---

## 억제
- DESIGN.md에 의도적으로 명시된 패턴
- 서드파티/벤더 CSS (node_modules, vendor)
- CSS 리셋/normalize
- 테스트 픽스처, 생성/축소 CSS
