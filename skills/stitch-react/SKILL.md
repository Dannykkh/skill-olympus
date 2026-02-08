---
name: stitch-react
description: Stitch HTML 스크린을 React/TypeScript 컴포넌트로 변환. 디자인 토큰 추출, 컴포넌트 분해, 타입 안전성 보장. "React 변환", "HTML to React" 요청 시 사용.
---

# Stitch to React

Stitch에서 생성된 정적 HTML 스크린을 프로덕션 React/TypeScript 컴포넌트로 변환합니다.

## 워크플로우

```
1. Stitch 스크린 가져오기 (get_screen_html)
2. 디자인 토큰 추출 (색상, 타이포, 간격)
3. 컴포넌트 분해 (시맨틱 구조 분석)
4. React 컴포넌트 생성 (TypeScript)
5. 검증 (타입 체크 + 린트)
```

## 디자인 토큰 추출

Tailwind 클래스와 인라인 스타일에서 토큰을 추출하여 CSS 변수로 변환:

```css
/* tokens/colors.css */
:root {
  --color-primary: #4F46E5;
  --color-primary-hover: #4338CA;
  --color-surface: #FFFFFF;
  --color-background: #F9FAFB;
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;
  --color-border: #E5E7EB;
  --color-error: #EF4444;
  --color-success: #10B981;
}

/* tokens/typography.css */
:root {
  --font-family: 'Inter', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 2rem;
}

/* tokens/spacing.css */
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
}
```

## 컴포넌트 분해 원칙

|계층|예시|기준|
|---|---|---|
|`primitives/`|Button, Input, Badge|단일 역할, 최소 단위|
|`patterns/`|Card, FormField, Avatar|primitives 조합|
|`blocks/`|Header, Hero, Footer|섹션 단위|
|`layouts/`|PageLayout, SidebarLayout|페이지 구조|

### 분해 규칙

- **단일 책임**: 1 컴포넌트 = 1 역할
- **재사용성**: props로 변형 가능하게
- **합성 가능**: children, slots 패턴 활용
- **시맨틱 HTML**: `<nav>`, `<main>`, `<section>` 우선

## React 컴포넌트 생성

### TypeScript 컴포넌트 구조

```typescript
// components/primitives/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      className={`btn btn--${variant} btn--${size}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

### 스타일링 방식

디자인 토큰 CSS 변수를 활용:
```css
.btn--primary {
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: var(--font-family);
}

.btn--primary:hover {
  background-color: var(--color-primary-hover);
}
```

## 출력 디렉토리 구조

```
src/
├── tokens/
│   ├── colors.css
│   ├── typography.css
│   └── spacing.css
├── components/
│   ├── primitives/
│   │   ├── Button.tsx
│   │   └── Input.tsx
│   ├── patterns/
│   │   ├── Card.tsx
│   │   └── FormField.tsx
│   ├── blocks/
│   │   ├── Header.tsx
│   │   └── Hero.tsx
│   └── layouts/
│       └── PageLayout.tsx
└── pages/
    └── Home.tsx
```

## 검증 체크리스트

|항목|방법|
|---|---|
|TypeScript 타입 에러 없음|`tsc --noEmit`|
|린트 통과|`eslint src/components/`|
|시각적 일치|원본 스크린샷과 비교|
|반응형 동작|모바일/태블릿/데스크톱 확인|
|접근성|키보드 탐색, alt 속성, ARIA|
|DESIGN.md 일관성|토큰이 문서와 일치|

## DESIGN.md 연동

DESIGN.md가 존재하면:
- 토큰 추출 시 문서의 색상/타이포 이름 사용
- 시맨틱 색상명 유지 (예: `--color-ocean-blue` vs `--color-blue`)
- 신규 토큰 발견 시 DESIGN.md 업데이트 제안

## 사용법

```
/stitch-react
# 또는
"이 Stitch 스크린을 React 컴포넌트로 변환해줘"
"HTML을 TypeScript React로 바꿔줘"
```
