---
name: naming-conventions
description: 네이밍 컨벤션 가이드 (패시브). 변수, 함수, 클래스 작성 시 자동 참조.
auto_apply:
  - "*.py"
  - "*.ts"
  - "*.tsx"
  - "*.java"
  - "*.js"
  - "*.jsx"
references:
  - skills/naming-analyzer/SKILL.md
---

# Naming Conventions (Passive)

코드 작성 시 항상 참조되는 네이밍 규칙. 상세 분석은 naming-analyzer 스킬 사용.

## Language Conventions

|언어|변수/함수|클래스|상수|Boolean|
|---|---|---|---|---|
|JavaScript/TS|camelCase|PascalCase|UPPER_SNAKE|is/has/can|
|Python|snake_case|PascalCase|UPPER_SNAKE|is_/has_/can_|
|Java|camelCase|PascalCase|UPPER_SNAKE|is/has/can|
|Go|camelCase (내부), PascalCase (외부)|PascalCase|UPPER_SNAKE|-|

## Boolean Prefixes

|Prefix|용도|예시|
|---|---|---|
|is|상태|isActive, isVisible, isLoggedIn|
|has|소유|hasPermission, hasError, hasChildren|
|can|능력|canEdit, canDelete, canSubmit|
|should|결정|shouldRender, shouldValidate|

## Common Issues

### ❌ 모호한 이름
```javascript
// Bad
function process(data) { }
const info = getData();
let temp = x;

// Good
function processPayment(transaction) { }
const userProfile = getUserProfile();
let previousValue = x;
```

### ❌ 오해를 일으키는 이름
```javascript
// Bad - 이름과 동작 불일치 (side effect 있음)
function getUser(id) {
  user.lastLogin = Date.now();  // 변경!
  saveUser(user);               // 저장!
  return user;
}

// Good
function fetchAndUpdateUserLogin(id) { ... }
```

### ❌ 약어 남용
```javascript
// Bad
const usrCfg = loadConfig();
function calcTtl(arr) { }

// Good
const userConfig = loadConfig();
function calculateTotal(amounts) { }

// OK - 널리 알려진 약어
const htmlElement, apiUrl, userId;
```

### ❌ 매직 넘버
```javascript
// Bad
if (age > 18) { }
setTimeout(cb, 3600000);

// Good
const LEGAL_AGE = 18;
const ONE_HOUR_MS = 60 * 60 * 1000;
```

## Decision Tree

```
Boolean? → is/has/can/should prefix
  ↓ No
Function? → verb phrase (action)
  ↓ No
Class? → PascalCase noun
  ↓ No
Constant? → UPPER_SNAKE_CASE
  ↓ No
Variable → descriptive noun (camelCase/snake_case)
```

## Function Verbs

|동사|용도|
|---|---|
|get/fetch|조회|
|create/add|생성|
|update/set|수정|
|delete/remove|삭제|
|validate/check|검증|
|parse/format|변환|
|calculate/compute|계산|

## Best Practices

✅ **DO**:
- 전체 단어 사용 (약어 최소화)
- 구체적이고 명확하게
- 언어 컨벤션 준수
- Boolean은 명확하게
- 상수에 단위 포함 (TIMEOUT_MS)

❌ **DON'T**:
- 단일 문자 (루프 제외: i, j, k)
- 모호한 이름 (data, info, temp)
- 컨벤션 혼용
- 오해의 소지 있는 이름
- 과도한 약어

## Full Analysis

상세 분석: `skills/naming-analyzer/` 스킬 사용
