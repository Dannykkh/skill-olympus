# Python Backend FastAPI

Python FastAPI 백엔드 개발 모범 사례 가이드.

## Features

- 비동기 프로그래밍 패턴
- Pydantic 스키마 설계
- 500줄 파일 제한
- 모듈화 원칙

## When to Apply

- Python 파일 생성/수정
- FastAPI 엔드포인트 작성
- Pydantic 스키마 정의
- 데이터베이스 모델 설계
- 비동기 함수 작성

## Core Principles

### File Size Limits
- **Max**: 500 lines (including comments)
- **Recommended**: 300 lines or less
- Split into modules when exceeded

### Function Size Limits
- **Max**: 50 lines
- **Recommended**: 20 lines or less

## Project Structure

```
app/
├── main.py              # FastAPI app entry
├── api/
│   ├── v1/
│   │   ├── endpoints/   # Route handlers
│   │   └── deps.py      # Dependencies
├── core/
│   ├── config.py        # Settings
│   └── security.py      # Auth
├── models/              # SQLAlchemy models
├── schemas/             # Pydantic schemas
├── services/            # Business logic
└── repositories/        # Data access
```

## Best Practices

- Use `async/await` for I/O operations
- Validate with Pydantic schemas
- Dependency injection for services
- Repository pattern for data access
