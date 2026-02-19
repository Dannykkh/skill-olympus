# FastAPI 코드 패턴

## 서비스 레이어 패턴

```python
# services/user_service.py
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate
from app.models.user import User
from app.core.security import get_password_hash

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = UserRepository(db)

    async def create_user(self, user_data: UserCreate) -> User:
        existing = await self.repository.get_by_employee_id(user_data.employee_id)
        if existing:
            raise ValueError("Employee ID already exists")
        hashed_password = get_password_hash(user_data.password)
        user = User(
            employee_id=user_data.employee_id,
            username=user_data.username,
            password_hash=hashed_password,
            full_name=user_data.full_name,
            role=user_data.role
        )
        return await self.repository.create(user)

    async def get_user(self, user_id: str) -> Optional[User]:
        return await self.repository.get_by_id(user_id)

    async def list_users(self, skip: int = 0, limit: int = 100, role: Optional[str] = None) -> List[User]:
        return await self.repository.list(skip, limit, role)
```

## 리포지토리 패턴

```python
# repositories/base.py
from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

ModelType = TypeVar("ModelType")

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: str) -> Optional[ModelType]:
        result = await self.db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def create(self, obj: ModelType) -> ModelType:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj: ModelType) -> ModelType:
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelType) -> None:
        await self.db.delete(obj)
        await self.db.commit()

# repositories/user_repository.py
class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_employee_id(self, employee_id: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.employee_id == employee_id)
        )
        return result.scalar_one_or_none()
```

## 에러 핸들링

```python
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.requests import Request

class UserNotFoundException(Exception):
    pass

@app.exception_handler(UserNotFoundException)
async def user_not_found_handler(request: Request, exc: UserNotFoundException):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": "UserNotFound", "message": str(exc), "path": str(request.url)}
    )
```

## 파일 업로드 처리

```python
from fastapi import UploadFile, File
from pathlib import Path
import aiofiles
from uuid import uuid4

MAX_FILE_SIZE = 100_000_000  # 100MB

async def save_uploaded_file(file: UploadFile, destination_dir: Path, allowed_extensions: List[str]) -> str:
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise ValueError(f"Invalid file extension: {file_ext}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise ValueError("File too large")

    unique_filename = f"{uuid4()}{file_ext}"
    file_path = destination_dir / unique_filename
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(contents)
    return str(file_path)
```

## 의존성 주입

```python
# api/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
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
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return role_checker
```
