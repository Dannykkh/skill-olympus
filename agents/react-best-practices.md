---
name: react-best-practices
description: React/Next.js 성능 최적화 + useEffect 가이드라인 통합. React 코드 작성/리뷰/리팩토링 시 자동 적용.
auto_apply:
  - "*.tsx"
  - "*.jsx"
  - "components/**"
  - "pages/**"
  - "app/**"
  - "**/hooks/**"
references:
  - skills/vercel-react-best-practices/SKILL.md
  - skills/vercel-react-best-practices/rules/
  - skills/react-dev/references/useeffect-anti-patterns.md
  - skills/react-dev/references/useeffect-alternatives.md
---

# React Best Practices (Passive Guidelines)

React/Next.js 코드 작성 시 항상 적용되는 45개 최적화 규칙 + useEffect 가이드라인.

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

---

## useEffect Guidelines

Effect는 React의 **탈출구**. 외부 시스템과 동기화할 때만 사용.

### Decision Tree

```
무언가에 반응해야 하나?
├── 사용자 상호작용 (클릭, 제출)?
│   └── → 이벤트 핸들러 사용
├── 컴포넌트가 화면에 나타남?
│   └── → Effect 사용 (외부 동기화, 분석)
├── props/state 변경으로 파생값 필요?
│   └── → 렌더링 중 계산
│       └── 비싸면? useMemo
└── prop 변경 시 state 리셋 필요?
    └── → key prop 사용
```

### useEffect Quick Reference

|상황|❌ 하지 말 것|✅ 해야 할 것|
|---|---|---|
|파생 상태|useState + useEffect|렌더링 시 계산|
|비싼 계산|useEffect로 캐시|useMemo|
|prop 변경 시 리셋|useEffect + setState|key prop|
|이벤트 응답|state 감시 useEffect|이벤트 핸들러|
|부모에게 알림|useEffect + onChange|핸들러에서 직접 호출|
|데이터 페칭|cleanup 없는 useEffect|cleanup 있는 Effect 또는 프레임워크|

### useEffect Anti-Patterns

```typescript
// ❌ 파생 상태에 Effect
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(firstName + ' ' + lastName);
}, [firstName, lastName]);

// ✅ 렌더링 시 계산
const fullName = firstName + ' ' + lastName;

// ❌ prop 변경 시 리셋에 Effect
useEffect(() => {
  setComment('');
}, [userId]);

// ✅ key prop으로 리셋
<Profile userId={userId} key={userId} />

// ❌ 이벤트에 Effect
useEffect(() => {
  if (submitted) {
    post('/api/data');
  }
}, [submitted]);

// ✅ 이벤트 핸들러에서 직접
function handleSubmit() {
  post('/api/data');
}
```

### Effect가 필요한 경우

- 외부 시스템 동기화 (비-React 위젯, 브라우저 API)
- 외부 스토어 구독 (가능하면 useSyncExternalStore)
- 분석/로깅 (컴포넌트 표시 시)
- 데이터 페칭 (cleanup 필수)

---

## Full Documentation

상세 규칙 및 코드 예시: `skills/vercel-react-best-practices/`
useEffect 상세 가이드: `skills/react-dev/SKILL.md`
