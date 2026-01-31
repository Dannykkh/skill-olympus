---
name: python-backend
description: Python FastAPI 백엔드 개발 모범 사례. 비동기 프로그래밍, Pydantic 스키마, 500줄 제한, 모듈화 원칙을 포함.
license: MIT
metadata:
  version: "1.0.0"
---

# Python Backend Development Guide (FastAPI)

Python FastAPI 백엔드 개발을 위한 종합 가이드.

## 적용 시점

다음 작업 시 이 가이드를 참조:
- Python 파일 생성/수정
- FastAPI 엔드포인트 작성
- Pydantic 스키마 정의
- 데이터베이스 모델 설계
- 비동기 함수 작성

---

## 핵심 원칙

### 1. 파일 크기 제한 ⚠️ CRITICAL
- **최대 500줄** (빈 줄, 주석 포함)
- **권장 300줄 이하**
- 초과 시 모듈 분리 필수

### 2. 함수 크기 제한
- **최대 50줄**
- **권장 20줄 이하**
- 하나의 함수는 하나의 작업만

### 3. 모듈화 & 재사용성
- 공통 로직은 `utils/` 또는 `core/`로 분리
- 비즈니스 로직은 서비스 레이어에
- 데이터 접근은 리포지토리 패턴

---

## 프로젝트 구조

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 앱 초기화 (< 100줄)
│   │
│   ├── api/                    # API 엔드포인트
│   │   ├── __init__.py
│   │   ├── deps.py            # 의존성 주입
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── auth.py        # 인증 API (< 300줄)
│   │       ├── users.py       # 사용자 API (< 300줄)
│   │       ├── forms.py       # 폼 빌더 API (< 400줄)
│   │       └── tests.py       # 시험 데이터 API (< 500줄)
│   │
│   ├── core/                   # 핵심 설정 및 보안
│   │   ├── __init__.py
│   │   ├── config.py          # 환경 설정 (< 200줄)
│   │   ├── security.py        # JWT, 암호화 (< 300줄)
│   │   └── database.py        # DB 연결 (< 100줄)
│   │
│   ├── models/                 # SQLAlchemy 모델
│   │   ├── __init__.py
│   │   ├── user.py            # User 모델만 (< 150줄)
│   │   ├── form.py            # Form 모델만 (< 200줄)
│   │   └── test_data.py       # TestData 모델만 (< 250줄)
│   │
│   ├── schemas/                # Pydantic 스키마
│   │   ├── __init__.py
│   │   ├── user.py            # User 스키마 (< 150줄)
│   │   ├── form.py            # Form 스키마 (< 200줄)
│   │   └── test_data.py       # TestData 스키마 (< 200줄)
│   │
│   ├── services/               # 비즈니스 로직
│   │   ├── __init__.py
│   │   ├── auth_service.py    # 인증 로직 (< 300줄)
│   │   ├── user_service.py    # 사용자 관리 (< 400줄)
│   │   └── form_service.py    # 폼 관리 (< 500줄)
│   │
│   ├── repositories/           # 데이터 접근 레이어
│   │   ├── __init__.py
│   │   ├── base.py            # BaseRepository (< 200줄)
│   │   └── user_repository.py # User CRUD (< 250줄)
│   │
│   └── utils/                  # 유틸리티
│       ├── __init__.py
│       ├── validators.py      # 검증 함수 (< 200줄)
│       ├── formatters.py      # 포맷 변환 (< 150줄)
│       └── file_handler.py    # 파일 처리 (< 300줄)
│
├── tests/                      # 테스트 코드
│   ├── conftest.py
│   ├── test_auth.py
│   └── test_users.py
│
├── alembic/                    # DB 마이그레이션
├── requirements.txt
└── .env.example
```

---

## 코딩 규칙

### 1. 타입 힌트 필수

✅ **올바른 예:**
```python
from typing import Optional, List
from pydantic import BaseModel

async def get_user_by_id(
    user_id: str,
    db: AsyncSession
) -> Optional[User]:
    """사용자 ID로 사용자 조회"""
    result = await db.execute(
        select(User).where(User.user_id == user_id)
    )
    return result.scalar_one_or_none()
```

❌ **잘못된 예:**
```python
# 타입 힌트 없음
async def get_user_by_id(user_id, db):
    result = await db.execute(
        select(User).where(User.user_id == user_id)
    )
    return result.scalar_one_or_none()
```

---

### 2. 비동기 함수 사용

✅ **올바른 예:**
```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.get("/users/{user_id}")
async def read_user(
    user_id: str,
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """사용자 조회"""
    user = await user_service.get_user(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.from_orm(user)
```

❌ **잘못된 예:**
```python
# 동기 함수 사용
@router.get("/users/{user_id}")
def read_user(user_id: str, db: Session = Depends(get_db)):
    user = user_service.get_user(user_id, db)
    return user
```

---

### 3. Pydantic 스키마 분리

✅ **올바른 예:**
```python
# schemas/user.py
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    """사용자 기본 스키마"""
    employee_id: str = Field(..., min_length=3, max_length=50)
    username: str = Field(..., min_length=3, max_length=100)
    full_name: str = Field(..., max_length=100)
    role: str = Field(..., regex="^(SystemAdmin|QAManager|Tester|Viewer)$")

class UserCreate(UserBase):
    """사용자 생성 스키마"""
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    """사용자 수정 스키마 (모든 필드 선택)"""
    full_name: Optional[str] = Field(None, max_length=100)
    role: Optional[str] = None

class UserResponse(UserBase):
    """사용자 응답 스키마"""
    user_id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True  # SQLAlchemy 모델 변환
```

---

### 4. 서비스 레이어 패턴

✅ **올바른 예:**
```python
# services/user_service.py
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate
from app.models.user import User
from app.core.security import get_password_hash

class UserService:
    """사용자 관리 서비스"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = UserRepository(db)

    async def create_user(self, user_data: UserCreate) -> User:
        """
        새로운 사용자를 생성합니다.

        Args:
            user_data: 사용자 생성 데이터

        Returns:
            생성된 사용자 객체

        Raises:
            ValueError: 이미 존재하는 사번/사용자명
        """
        # 중복 체크
        existing = await self.repository.get_by_employee_id(
            user_data.employee_id
        )
        if existing:
            raise ValueError("Employee ID already exists")

        # 비밀번호 해싱
        hashed_password = get_password_hash(user_data.password)

        # 생성
        user = User(
            employee_id=user_data.employee_id,
            username=user_data.username,
            password_hash=hashed_password,
            full_name=user_data.full_name,
            role=user_data.role
        )

        return await self.repository.create(user)

    async def get_user(self, user_id: str) -> Optional[User]:
        """사용자 ID로 조회"""
        return await self.repository.get_by_id(user_id)

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 100,
        role: Optional[str] = None
    ) -> List[User]:
        """사용자 목록 조회"""
        return await self.repository.list(skip, limit, role)
```

---

### 5. 리포지토리 패턴

✅ **올바른 예:**
```python
# repositories/base.py
from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

ModelType = TypeVar("ModelType")

class BaseRepository(Generic[ModelType]):
    """기본 리포지토리 (재사용)"""

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: str) -> Optional[ModelType]:
        """ID로 단일 조회"""
        result = await self.db.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def create(self, obj: ModelType) -> ModelType:
        """생성"""
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj: ModelType) -> ModelType:
        """수정"""
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelType) -> None:
        """삭제"""
        await self.db.delete(obj)
        await self.db.commit()

# repositories/user_repository.py
from app.models.user import User
from app.repositories.base import BaseRepository

class UserRepository(BaseRepository[User]):
    """사용자 리포지토리"""

    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_employee_id(self, employee_id: str) -> Optional[User]:
        """사번으로 조회"""
        result = await self.db.execute(
            select(User).where(User.employee_id == employee_id)
        )
        return result.scalar_one_or_none()
```

---

### 6. 에러 핸들링

✅ **올바른 예:**
```python
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.requests import Request

# 커스텀 예외
class UserNotFoundException(Exception):
    """사용자를 찾을 수 없음"""
    pass

# 전역 예외 핸들러
@app.exception_handler(UserNotFoundException)
async def user_not_found_handler(
    request: Request,
    exc: UserNotFoundException
):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": "UserNotFound",
            "message": str(exc),
            "path": str(request.url)
        }
    )

# API에서 사용
@router.get("/users/{user_id}")
async def read_user(user_id: str, db: AsyncSession = Depends(get_db)):
    user = await user_service.get_user(user_id, db)
    if not user:
        raise UserNotFoundException(f"User {user_id} not found")
    return UserResponse.from_orm(user)
```

---

### 7. 파일 업로드 처리

✅ **올바른 예:**
```python
from fastapi import UploadFile, File
from pathlib import Path
import aiofiles
from uuid import uuid4

MAX_FILE_SIZE = 100_000_000  # 100MB

async def save_uploaded_file(
    file: UploadFile,
    destination_dir: Path,
    allowed_extensions: List[str]
) -> str:
    """
    업로드된 파일을 저장합니다.

    Args:
        file: 업로드 파일
        destination_dir: 저장 디렉토리
        allowed_extensions: 허용 확장자 ['.csv', '.jpg', '.pdf']

    Returns:
        저장된 파일 경로

    Raises:
        ValueError: 유효하지 않은 파일
    """
    # 확장자 검증
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise ValueError(f"Invalid file extension: {file_ext}")

    # 파일 크기 검증
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise ValueError("File too large")

    # 고유 파일명 생성
    unique_filename = f"{uuid4()}{file_ext}"
    file_path = destination_dir / unique_filename

    # 비동기 저장
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(contents)

    return str(file_path)
```

---

### 8. 의존성 주입

✅ **올바른 예:**
```python
# api/deps.py
from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """현재 인증된 사용자 조회"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await user_service.get_user(user_id, db)
    if user is None:
        raise credentials_exception

    return user

async def require_role(required_role: str):
    """역할 검증 의존성"""
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

# 사용 예
@router.post("/forms")
async def create_form(
    form_data: FormCreate,
    current_user: User = Depends(require_role("QAManager")),
    db: AsyncSession = Depends(get_db)
):
    """폼 생성 (QA Manager만 가능)"""
    return await form_service.create_form(form_data, current_user.user_id, db)
```

---

## 체크리스트

### 코드 작성 전
- [ ] 파일이 500줄을 넘지 않는지 확인
- [ ] 함수가 50줄을 넘지 않는지 확인
- [ ] 재사용 가능한 로직인지 확인 → utils 분리

### 코드 작성 중
- [ ] 모든 함수/변수에 타입 힌트 추가
- [ ] Docstring 작성 (Args, Returns, Raises)
- [ ] 비동기 함수 사용 (`async`/`await`)
- [ ] Pydantic 스키마 분리
- [ ] 서비스 레이어 패턴 적용

### 코드 작성 후
- [ ] 에러 핸들링 확인
- [ ] 로깅 추가 (중요 작업)
- [ ] 단위 테스트 작성
- [ ] 자동 코드 리뷰 실행

---

## 추가 참고 자료

- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [Pydantic 문서](https://docs.pydantic.dev/)
- [SQLAlchemy 2.0 문서](https://docs.sqlalchemy.org/)
- [Python Type Hints](https://docs.python.org/3/library/typing.html)

---

**버전:** 1.0.0
**최종 업데이트:** 2026-01-16
