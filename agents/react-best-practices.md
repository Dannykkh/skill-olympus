---
name: react-best-practices
description: React/Next.js 성능 최적화 가이드라인. React 코드 작성/리뷰/리팩토링 시 자동 적용.
auto_apply:
  - "*.tsx"
  - "*.jsx"
  - "components/**"
  - "pages/**"
  - "app/**"
references:
  - skills/vercel-react-best-practices/SKILL.md
  - skills/vercel-react-best-practices/rules/
---

# React Best Practices (Passive Guidelines)

React/Next.js 코드 작성 시 항상 적용되는 45개 최적화 규칙.

## Priority Rules (Always Check)

### CRITICAL - Eliminating Waterfalls
|Rule|Action|
|---|---|
|async-parallel|독립 작업은 Promise.all() 사용|
|async-defer-await|await는 실제 사용 분기에서만|
|async-suspense-boundaries|Suspense로 콘텐츠 스트리밍|

### CRITICAL - Bundle Size
|Rule|Action|
|---|---|
|bundle-barrel-imports|배럴 파일 피하고 직접 import|
|bundle-dynamic-imports|무거운 컴포넌트는 next/dynamic|
|bundle-defer-third-party|analytics는 hydration 후 로드|

### HIGH - Server Performance
|Rule|Action|
|---|---|
|server-cache-react|React.cache()로 요청 내 중복제거|
|server-serialization|클라이언트 전달 데이터 최소화|
|server-parallel-fetching|fetch 병렬화 위해 컴포넌트 구조 조정|

## Quick Reference

```
데이터 페칭 체크리스트:
├── 독립 fetch들 → Promise.all()
├── 컴포넌트 내 순차 fetch → 병렬화
├── 무거운 import → dynamic import
└── 클라이언트 데이터 → 최소화
```

## Anti-Patterns (Avoid)

```typescript
// ❌ 워터폴
const user = await getUser();
const posts = await getPosts(user.id); // user 없이도 가능하면 병렬로

// ✅ 병렬
const [user, posts] = await Promise.all([getUser(), getPosts()]);

// ❌ 배럴 import
import { Button } from '@/components';

// ✅ 직접 import
import { Button } from '@/components/Button';

// ❌ 무조건 로드
import HeavyChart from '@/components/HeavyChart';

// ✅ 동적 로드
const HeavyChart = dynamic(() => import('@/components/HeavyChart'));
```

## useEffect Rules

|상황|하지 말 것|해야 할 것|
|---|---|---|
|파생 상태|useState + useEffect|렌더링 시 계산|
|비싼 계산|useEffect로 캐시|useMemo|
|prop 변경 시 리셋|useEffect + setState|key prop|
|이벤트 응답|state 감시 useEffect|이벤트 핸들러|

## Full Documentation

상세 규칙 및 코드 예시: `skills/vercel-react-best-practices/`
