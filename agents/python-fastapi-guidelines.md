---
name: python-fastapi-guidelines
description: FastAPI 백엔드 개발 모범 사례. Python 파일 작성/수정 시 자동 적용.
auto_apply:
  - "*.py"
  - "app/**"
  - "backend/**"
  - "api/**"
references:
  - skills/python-backend-fastapi/SKILL.md
---

# Python FastAPI Guidelines (Passive)

Python/FastAPI 코드 작성 시 항상 적용되는 규칙.

## Critical Limits

|항목|최대|권장|초과 시|
|---|---|---|---|
|파일 크기|500줄|300줄|모듈 분리|
|함수 크기|50줄|20줄|헬퍼 추출|
|클래스 크기|300줄|200줄|분리|

## Required Patterns

### 1. 타입 힌트 필수
```python
# ✅
async def get_user(user_id: str, db: AsyncSession) -> Optional[User]:
    ...

# ❌
async def get_user(user_id, db):
    ...
```

### 2. 비동기 함수 사용
```python
# ✅ async/await
@router.get("/users/{user_id}")
async def read_user(user_id: str, db: AsyncSession = Depends(get_db)):
    user = await user_service.get_user(user_id, db)
    ...

# ❌ 동기 함수
@router.get("/users/{user_id}")
def read_user(user_id: str, db: Session = Depends(get_db)):
    ...
```

### 3. 레이어 분리
```
API (라우터) → Service (비즈니스) → Repository (데이터)
     ↓              ↓                    ↓
  < 300줄       < 400줄              < 250줄
```

### 4. Pydantic 스키마 분리
```python
class UserBase(BaseModel):      # 공통 필드
class UserCreate(UserBase):     # 생성용 (password 포함)
class UserUpdate(BaseModel):    # 수정용 (Optional 필드)
class UserResponse(UserBase):   # 응답용 (from_attributes)
```

## Project Structure

```
app/
├── api/v1/          # 엔드포인트 (< 300줄/파일)
├── core/            # 설정, 보안 (< 200줄/파일)
├── models/          # SQLAlchemy (< 200줄/파일)
├── schemas/         # Pydantic (< 200줄/파일)
├── services/        # 비즈니스 로직 (< 400줄/파일)
├── repositories/    # 데이터 접근 (< 250줄/파일)
└── utils/           # 유틸리티 (< 200줄/파일)
```

## Security Checklist

- [ ] SQL: 파라미터화된 쿼리 사용 (f-string ❌)
- [ ] 비밀번호: get_password_hash() 사용
- [ ] JWT: 환경변수에서 SECRET_KEY
- [ ] 파일 업로드: 확장자/크기 검증

## Full Documentation

상세 예시 및 코드 패턴: `skills/python-backend-fastapi/SKILL.md`
