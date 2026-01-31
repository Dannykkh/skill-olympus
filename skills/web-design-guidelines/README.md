# Web Design Guidelines

UI 코드를 Web Interface Guidelines 기준으로 리뷰하는 스킬.

## Features

- 접근성(A11y) 검사
- UI/UX 모범 사례 검증
- 반응형 디자인 확인
- 성능 최적화 제안

## Triggers

- "review my UI"
- "check accessibility"
- "audit design"
- "review UX"
- "check my site against best practices"

## Usage

```bash
/web-design-guidelines src/components/
/web-design-guidelines Button.tsx
```

## How It Works

1. Fetch latest guidelines from source
2. Read specified files
3. Check against all rules
4. Output findings in `file:line` format

## Guidelines Source

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

## Output Format

```
src/Button.tsx:15 - Missing aria-label on interactive element
src/Modal.tsx:42 - Focus trap not implemented
src/Form.tsx:8 - Form lacks proper error handling
```

## Categories

- **Accessibility**: ARIA, keyboard navigation, screen readers
- **Performance**: Loading, animations, bundle size
- **Usability**: Feedback, error states, responsive
- **Consistency**: Design tokens, spacing, typography
