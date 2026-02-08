---
name: react-useeffect-guidelines
description: React useEffect 베스트 프랙티스. useEffect 작성/리뷰 시 자동 적용.
auto_apply:
  - "*.tsx"
  - "*.jsx"
  - "**/hooks/**"
references:
  - skills/react-dev/references/useeffect-anti-patterns.md
  - skills/react-dev/references/useeffect-alternatives.md
---

# React useEffect Guidelines (Passive)

Effect는 React의 **탈출구**입니다. 외부 시스템과 동기화할 때만 사용하세요.

## Decision Tree

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

## Quick Reference

|상황|❌ 하지 말 것|✅ 해야 할 것|
|---|---|---|
|파생 상태|useState + useEffect|렌더링 시 계산|
|비싼 계산|useEffect로 캐시|useMemo|
|prop 변경 시 리셋|useEffect + setState|key prop|
|이벤트 응답|state 감시 useEffect|이벤트 핸들러|
|부모에게 알림|useEffect + onChange|핸들러에서 직접 호출|
|데이터 페칭|cleanup 없는 useEffect|cleanup 있는 Effect 또는 프레임워크|

## Effect가 필요한 경우

- 외부 시스템 동기화 (비-React 위젯, 브라우저 API)
- 외부 스토어 구독 (가능하면 useSyncExternalStore)
- 분석/로깅 (컴포넌트 표시 시)
- 데이터 페칭 (cleanup 필수)

## Effect가 필요 없는 경우

1. **렌더링용 데이터 변환** → 최상위에서 계산
2. **사용자 이벤트 처리** → 이벤트 핸들러
3. **파생 상태** → 그냥 계산: `const fullName = firstName + ' ' + lastName`
4. **연쇄 상태 업데이트** → 이벤트 핸들러에서 모두 계산

## Anti-Patterns

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

## Full Documentation

상세 가이드: `skills/react-dev/SKILL.md` (useEffect 섹션 포함)
