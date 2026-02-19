# Design System Guide

인터뷰 Category B(디자인 비전)에서 수집한 답변을 **구현자용 디자인 규칙 문서**로 변환합니다.

## 생성 조건

- UI/프론트엔드가 포함된 프로젝트에서만 생성
- 인터뷰 Category B 답변이 존재해야 함
- CLI, 라이브러리, 백엔드 API 전용 프로젝트는 건너뜀

## 입력

- `claude-interview.md` — Category B 답변 (톤/무드, 벤치마킹, 색상, 레이아웃, 아트 디렉션, 안티 패턴)
- `claude-spec.md` — 기능 요구사항 (UI 컴포넌트 도출용)
- `claude-research.md` — 벤치마킹 사이트 분석 결과 (있는 경우)

## 출력

`<planning_dir>/claude-design-system.md`

## Template

```markdown
# Design System

> 이 문서는 젭마인 인터뷰에서 수집한 디자인 비전을 기반으로 생성되었습니다.
> 구현 시 이 문서를 참조하여 일관된 디자인을 유지하세요.

## Design Vision

{인터뷰에서 수집한 전체 톤/무드 요약. 1-2문장.}

### Benchmarks

| 참고 사이트/앱 | 참고 포인트 |
|---------------|------------|
| {URL 또는 이름} | {마음에 드는 부분} |

### Anti-Patterns

- {절대 하지 말아야 할 디자인 패턴}

## Design Tokens

### Colors

| 토큰명 | 값 | 용도 |
|--------|-----|------|
| `--color-primary` | {hex} | 주요 액션, 브랜드 |
| `--color-secondary` | {hex} | 보조 요소 |
| `--color-background` | {hex} | 배경 |
| `--color-surface` | {hex} | 카드, 패널 |
| `--color-text` | {hex} | 본문 텍스트 |
| `--color-text-secondary` | {hex} | 보조 텍스트 |
| `--color-error` | {hex} | 에러 상태 |
| `--color-success` | {hex} | 성공 상태 |

> 사용자가 구체적 색상을 언급하지 않은 경우, 톤/무드에 맞는 팔레트를 제안하되 "제안입니다" 표기.

### Typography

| 요소 | 폰트 | 사이즈 | Weight |
|------|------|--------|--------|
| Heading 1 | {font} | {size} | Bold |
| Heading 2 | {font} | {size} | Semi-bold |
| Body | {font} | {size} | Regular |
| Caption | {font} | {size} | Regular |

### Spacing

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--space-xs` | 4px | 아이콘-텍스트 간격 |
| `--space-sm` | 8px | 요소 내부 패딩 |
| `--space-md` | 16px | 섹션 간격 |
| `--space-lg` | 24px | 카드 패딩 |
| `--space-xl` | 32px | 페이지 여백 |

### Border & Shadow

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--radius-sm` | {px} | 버튼, 인풋 |
| `--radius-md` | {px} | 카드 |
| `--radius-lg` | {px} | 모달, 다이얼로그 |
| `--shadow-sm` | {value} | 호버 상태 |
| `--shadow-md` | {value} | 카드 기본 |

## Layout

### 레이아웃 스타일

{대시보드형/매거진형/하이브리드 등 인터뷰 답변 기반}

### Grid System

| 속성 | 값 |
|------|-----|
| Columns | {12 등} |
| Gutter | {px} |
| Breakpoints | mobile: {px}, tablet: {px}, desktop: {px} |

### 주요 레이아웃 패턴

- **페이지 구조**: {사이드바+컨텐츠 / 풀와이드 / 센터 컨테이너 등}
- **내비게이션**: {상단바 / 사이드바 / 바텀탭 등}
- **카드 배치**: {그리드 / 리스트 / 매서너리 등}

## Component Guidelines

### 공통 규칙

- {인터랙션 패턴: 호버/포커스/액티브 상태}
- {애니메이션: 트랜지션 속도, 이징}
- {아이콘 스타일: 라인/솔리드/듀오톤}

### 핵심 컴포넌트

| 컴포넌트 | 스타일 방향 | 참고 |
|----------|------------|------|
| Button | {rounded/square, 그림자 유무} | {벤치마킹 참조} |
| Card | {보더/그림자, 패딩} | |
| Input | {언더라인/아웃라인/필드} | |
| Modal | {센터/바텀시트} | |

## Responsive Strategy

| 뷰포트 | 접근 방식 |
|---------|-----------|
| Mobile (<768px) | {모바일 퍼스트 여부, 레이아웃 변경} |
| Tablet (768-1024px) | {그리드 조정} |
| Desktop (>1024px) | {최대 너비, 사이드바} |

## Implementation Notes

- 이 문서의 토큰 값은 CSS Custom Properties 또는 프로젝트의 테마 시스템에 매핑
- 구현 중 디자인 결정이 필요하면 이 문서의 Design Vision과 Anti-Patterns을 기준으로 판단
- 새 컴포넌트 추가 시 Component Guidelines의 공통 규칙을 따름
```

## 작성 규칙

1. **인터뷰 답변 우선**: 사용자가 명시한 선호를 그대로 반영
2. **미언급 항목은 제안**: 톤/무드에서 추론하되, `(제안)` 표기로 구분
3. **구체적 값 포함**: "밝은 색" → `#F5F7FA` 등 실제 구현 가능한 값
4. **벤치마킹 활용**: 참고 사이트를 언급했으면 해당 사이트의 디자인 패턴 분석 반영
5. **간결하게**: 100줄 이내 권장. 구현자가 빠르게 참조할 수 있도록

## 섹션 파일 연동

`claude-design-system.md`가 생성되면:
- Section File Template의 **Implementation Details**에서 이 문서를 참조하도록 안내
- UI 관련 섹션의 **Requirements**에 "claude-design-system.md의 디자인 토큰 사용" 명시
- 각 섹션의 **Reference Libraries**에 UI 프레임워크(MUI, Tailwind 등) 포함
