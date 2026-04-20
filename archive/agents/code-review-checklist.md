---
name: code-review-checklist
description: 코드 리뷰 체크리스트 (패시브). 코드 작성/수정 시 자동 참조되는 품질 기준.
auto_apply:
  - "*.py"
  - "*.ts"
  - "*.tsx"
  - "*.java"
  - "*.js"
  - "*.jsx"
references:
  - skills/code-reviewer/SKILL.md
---

# Code Review Checklist (Passive)

코드 작성 시 항상 참조되는 품질 기준. 상세 리뷰는 `/review` 명령 사용.

## Critical (필수 통과)

|체크|기준|조치|
|---|---|---|
|파일 크기|≤ 500줄|모듈 분리|
|함수 크기|≤ 50줄|헬퍼 추출|
|SQL Injection|파라미터화 쿼리|f-string 금지|
|XSS|입력 sanitize|dangerouslySetInnerHTML 주의|
|하드코딩 비밀|환경 변수 사용|SECRET_KEY = os.getenv()|

## High (강력 권장)

|체크|기준|예시|
|---|---|---|
|타입 힌트|모든 함수|`def get(id: str) -> Optional[User]`|
|단일 책임|1 클래스 = 1 역할|UserService ≠ EmailService|
|중복 제거|공통 함수 추출|get_or_404() 패턴|
|에러 처리|명시적 catch|except ValueError as e|

## Medium (권장)

|체크|기준|
|---|---|
|Docstring|복잡한 함수에 Args/Returns/Raises|
|변수명|명확하고 검색 가능|
|주석|"왜"를 설명 ("무엇" 아님)|

## Anti-Patterns

```python
# ❌ SQL Injection
query = f"SELECT * FROM users WHERE id = '{user_id}'"

# ✅ Safe
query = select(User).where(User.id == user_id)

# ❌ 중복 코드
@router.get("/users/{id}")
async def get_user(id: str):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(404, "Not found")

@router.get("/items/{id}")
async def get_item(id: str):
    item = db.query(Item).filter(Item.id == id).first()
    if not item:
        raise HTTPException(404, "Not found")

# ✅ 공통 함수
async def get_or_404(model, id, db):
    obj = db.query(model).filter(model.id == id).first()
    if not obj:
        raise HTTPException(404, f"{model.__name__} not found")
    return obj
```

## Severity Levels

|Level|Icon|Action|
|---|---|---|
|Critical|🔴|머지 차단|
|Major|🟠|수정 필요|
|Minor|🟡|권장|
|Nitpick|🟢|선택|

## Full Review

상세 리뷰 실행: `skills/code-reviewer/` 또는 `/review` 명령
