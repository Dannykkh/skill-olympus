---
name: docker-deploy
description: Docker 이미지 기반 배포 환경을 자동으로 구성합니다. /docker-deploy 명령으로 Dockerfile, docker-compose, install.bat 등 배포에 필요한 모든 파일을 생성합니다.
license: MIT
metadata:
  author: user
  version: "2.2.0"
---

# Docker Deploy Skill

Docker 이미지 기반 배포 파일을 자동 생성하는 스킬입니다.

## Skill Description

프로젝트의 Docker 배포 환경을 자동으로 구성합니다.

**Triggers:**
- `/docker-deploy` - 전체 Docker 배포 파일 생성
- `/docker-deploy build` - 이미지 빌드 스크립트만 생성
- `/docker-deploy install` - install.bat만 생성

**생성되는 파일:**
- `backend/Dockerfile` - Backend 멀티스테이지 빌드
- `frontend/Dockerfile` - Frontend 멀티스테이지 빌드
- `docker-build-images.bat` - 이미지 빌드 + tar 저장 스크립트
- `docker-images/docker-compose.yml` - 배포용 (pre-built 이미지)
- `docker-images/install.bat` - 처음 설치
- `docker-images/update.bat` - 이미지만 업데이트 (DB 유지)
- `docker-images/reset.bat` - 완전 초기화 (데이터 삭제)
- `docker-images/.env` - 환경변수 (기본값 포함)
- `docker-images/logs.bat` - 로그 보기
- `docker-images/seed-data.sql` - 초기 데이터 (선택)

---

## Instructions

### 1. 프로젝트 분석

먼저 프로젝트 구조를 분석합니다:
- backend/ 폴더 확인 - Python/FastAPI, Node.js 등
- frontend/ 폴더 확인 - React, Vue 등
- 기존 Dockerfile 확인
- 기존 docker-compose.yml 확인
- 데이터베이스 종류 확인 (MySQL, PostgreSQL 등)

### 2. 사용자에게 설정 질문

AskUserQuestion 도구로 다음을 확인:

#### 2.1 포트 설정
- Frontend 포트 (기본: 8001) - 웹 브라우저 접속용
- Backend 포트 (기본: 9201) - Swagger, API 테스트용
- DB 포트 (기본: 3307) - DB 클라이언트 접속용

#### 2.2 데이터베이스
- MySQL (기본) / PostgreSQL / MariaDB

#### 2.3 테스트 계정
- 초기 테스트 계정 생성 여부
- 계정 정보 (admin/manager/member 등)

---

## 3. Backend Dockerfile (FastAPI/Python)

```dockerfile
FROM python:3.11-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS production
WORKDIR /app
RUN useradd --create-home --shell /bin/bash appuser
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH
COPY --chown=appuser:appuser . .
USER appuser
EXPOSE 9201
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9201", "--workers", "4"]
```

---

## 4. Frontend Dockerfile (React/Vite)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

FROM nginx:alpine AS production
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 5. docker-compose.yml (배포용) - 핵심 설정

**중요: 안정적인 healthcheck 설정**

### MySQL 사용 시:

```yaml
name: ${PROJECT_NAME}

services:
  db:
    image: mysql:8.0
    container_name: ${PROJECT_NAME}-db
    restart: unless-stopped
    ports:
      - "${DB_PORT:-3307}:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD:-password123}
      - MYSQL_DATABASE=${DB_NAME:-app_db}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./seed-data.sql:/docker-entrypoint-initdb.d/01-seed.sql:ro
    networks:
      - app-network
    healthcheck:
      # 단순한 ping 방식 (안정적) - 테이블 쿼리하지 않음!
      test: ["CMD-SHELL", "mysqladmin ping -h localhost -u root -p$$MYSQL_ROOT_PASSWORD"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
    command: >
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --default-authentication-plugin=mysql_native_password

  api:
    image: ${PROJECT_NAME}-api:latest
    container_name: ${PROJECT_NAME}-api
    restart: unless-stopped
    ports:
      - "${API_PORT:-9201}:9201"
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=mysql+aiomysql://${DB_USER:-root}:${DB_PASSWORD:-password123}@db:3306/${DB_NAME:-app_db}
      - SECRET_KEY=${SECRET_KEY:-change-this-secret-key}
      - CORS_ORIGINS=http://localhost:${FRONTEND_PORT:-8001}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9201/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: ${PROJECT_NAME}-frontend:latest
    container_name: ${PROJECT_NAME}-frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-8001}:80"
    depends_on:
      - api
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

networks:
  app-network:
    driver: bridge

volumes:
  mysql_data:
```

### PostgreSQL 사용 시:

```yaml
name: ${PROJECT_NAME}

services:
  db:
    image: postgres:15-alpine
    container_name: ${PROJECT_NAME}-db
    restart: unless-stopped
    ports:
      - "${DB_PORT:-5432}:5432"
    environment:
      POSTGRES_USER: ${DB_USER:-app}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password123}
      POSTGRES_DB: ${DB_NAME:-app_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./seed-data.sql:/docker-entrypoint-initdb.d/01-seed.sql:ro
    networks:
      - app-network
    healthcheck:
      # pg_isready 방식 (안정적)
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-app}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:
```

---

## 6. install.bat (처음 설치)

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo.
echo ============================================
echo   ${PROJECT_NAME} Docker 설치
echo ============================================
echo.

REM Docker 실행 확인
echo [1/5] Docker 실행 상태 확인 중...
docker info >nul 2>&1
if errorlevel 1 (
    echo [오류] Docker가 실행되고 있지 않습니다.
    echo        Docker Desktop을 먼저 실행해주세요.
    pause
    exit /b 1
)
echo       Docker 정상 실행 중

REM .env 파일 확인
echo.
echo [2/5] 환경 설정 파일 확인 중...
if not exist "%SCRIPT_DIR%.env" (
    echo [오류] .env 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)
echo       .env 파일 확인 완료

REM 이미지 로드
echo.
echo [3/5] Docker 이미지 로드 중...
if exist "%SCRIPT_DIR%${PROJECT_NAME}-all.tar" (
    docker load -i "%SCRIPT_DIR%${PROJECT_NAME}-all.tar"
) else if exist "%SCRIPT_DIR%${PROJECT_NAME}-api.tar" (
    docker load -i "%SCRIPT_DIR%${PROJECT_NAME}-api.tar"
    docker load -i "%SCRIPT_DIR%${PROJECT_NAME}-frontend.tar"
) else (
    echo [오류] Docker 이미지 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)
echo       이미지 로드 완료

REM 베이스 이미지 확인
echo.
echo [4/5] 필수 이미지 확인 중...
docker image inspect ${DB_IMAGE} >nul 2>&1 || docker pull ${DB_IMAGE}
echo       완료

REM 서비스 시작
echo.
echo [5/5] 서비스 시작 중...
docker-compose up -d
if errorlevel 1 (
    echo [오류] 서비스 시작 실패
    pause
    exit /b 1
)

echo.
echo 서비스 초기화 대기 중... (약 30초)
timeout /t 30 /nobreak >nul

echo.
echo ============================================
echo   설치 완료!
echo ============================================
echo.
echo   웹:       http://localhost:${FRONTEND_PORT}
echo   API 문서: http://localhost:${API_PORT}/docs
echo   DB:       localhost:${DB_PORT}
echo.
echo   테스트 계정:
echo     Admin:   admin@example.com / admin1234
echo     Manager: manager@example.com / manager1234
echo     Member:  member@example.com / member1234
echo.

endlocal
pause
```

---

## 6-1. update.bat (이미지만 업데이트, DB 유지)

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo.
echo ============================================
echo   ${PROJECT_NAME} Docker 업데이트
echo   (데이터베이스는 유지됩니다)
echo ============================================
echo.

REM Docker 실행 확인
echo [1/4] Docker 실행 상태 확인 중...
docker info >nul 2>&1
if errorlevel 1 (
    echo [오류] Docker가 실행되고 있지 않습니다.
    pause
    exit /b 1
)
echo       Docker 정상 실행 중

REM 기존 서비스 중지 (볼륨 유지)
echo.
echo [2/4] 기존 서비스 중지 중...
docker-compose down
if errorlevel 1 (
    echo [경고] docker-compose down 실패, 강제 중지 시도...
    docker stop ${PROJECT_NAME}-api ${PROJECT_NAME}-frontend ${PROJECT_NAME}-db >nul 2>&1
    docker rm ${PROJECT_NAME}-api ${PROJECT_NAME}-frontend >nul 2>&1
)

REM 컨테이너 중지 확인
for /f %%i in ('docker ps -q --filter "name=${PROJECT_NAME}"') do (
    echo [오류] 컨테이너가 아직 실행 중입니다: %%i
    echo        수동으로 중지해주세요: docker stop %%i
    pause
    exit /b 1
)
echo       서비스 중지 완료

REM 기존 이미지 삭제
docker rmi ${PROJECT_NAME}-api:latest ${PROJECT_NAME}-frontend:latest >nul 2>&1
echo       이미지 삭제 완료

REM 새 이미지 로드
echo.
echo [3/4] 새 Docker 이미지 로드 중...
if exist "%SCRIPT_DIR%${PROJECT_NAME}-all.tar" (
    docker load -i "%SCRIPT_DIR%${PROJECT_NAME}-all.tar"
) else if exist "%SCRIPT_DIR%${PROJECT_NAME}-api.tar" (
    docker load -i "%SCRIPT_DIR%${PROJECT_NAME}-api.tar"
    docker load -i "%SCRIPT_DIR%${PROJECT_NAME}-frontend.tar"
) else (
    echo [오류] Docker 이미지 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)
echo       이미지 로드 완료

REM 서비스 재시작
echo.
echo [4/4] 서비스 시작 중...
docker-compose up -d
if errorlevel 1 (
    echo [오류] 서비스 시작 실패
    pause
    exit /b 1
)

echo.
echo ============================================
echo   업데이트 완료!
echo ============================================
echo.
echo   웹:       http://localhost:${FRONTEND_PORT}
echo   API 문서: http://localhost:${API_PORT}/docs
echo.

endlocal
pause
```

---

## 6-2. reset.bat (완전 초기화)

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo.
echo ============================================
echo   ${PROJECT_NAME} Docker 완전 초기화
echo ============================================
echo.
echo   [경고] 모든 데이터베이스 데이터가 삭제됩니다!
echo.
set /p "CONFIRM=정말 초기화하시겠습니까? (yes/no): "
if /i not "!CONFIRM!"=="yes" (
    echo 취소되었습니다.
    pause
    exit /b 0
)

REM Docker 실행 확인
echo.
echo [1/4] Docker 실행 상태 확인 중...
docker info >nul 2>&1
if errorlevel 1 (
    echo [오류] Docker가 실행되고 있지 않습니다.
    pause
    exit /b 1
)
echo       Docker 정상 실행 중

REM 기존 서비스 및 볼륨 삭제
echo.
echo [2/4] 기존 서비스 및 데이터 삭제 중...
docker-compose down -v
if errorlevel 1 (
    echo [경고] docker-compose down 실패, 강제 중지 시도...
    docker stop ${PROJECT_NAME}-api ${PROJECT_NAME}-frontend ${PROJECT_NAME}-db >nul 2>&1
    docker rm ${PROJECT_NAME}-api ${PROJECT_NAME}-frontend ${PROJECT_NAME}-db >nul 2>&1
    docker volume rm ${PROJECT_NAME}_mysql_data ${PROJECT_NAME}_postgres_data >nul 2>&1
)

REM 컨테이너 중지 확인
for /f %%i in ('docker ps -q --filter "name=${PROJECT_NAME}"') do (
    echo [오류] 컨테이너가 아직 실행 중입니다: %%i
    echo        수동으로 중지해주세요: docker stop %%i
    pause
    exit /b 1
)
echo       서비스 중지 완료

REM 기존 이미지 삭제
docker rmi ${PROJECT_NAME}-api:latest ${PROJECT_NAME}-frontend:latest >nul 2>&1
echo       이미지 삭제 완료

REM 새 이미지 로드
echo.
echo [3/4] Docker 이미지 로드 중...
if exist "%SCRIPT_DIR%${PROJECT_NAME}-all.tar" (
    docker load -i "%SCRIPT_DIR%${PROJECT_NAME}-all.tar"
) else if exist "%SCRIPT_DIR%${PROJECT_NAME}-api.tar" (
    docker load -i "%SCRIPT_DIR%${PROJECT_NAME}-api.tar"
    docker load -i "%SCRIPT_DIR%${PROJECT_NAME}-frontend.tar"
) else (
    echo [오류] Docker 이미지 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)
echo       이미지 로드 완료

REM 베이스 이미지 확인 및 서비스 시작
echo.
echo [4/4] 서비스 시작 중...
docker image inspect ${DB_IMAGE} >nul 2>&1 || docker pull ${DB_IMAGE}
docker-compose up -d
if errorlevel 1 (
    echo [오류] 서비스 시작 실패
    pause
    exit /b 1
)

echo.
echo 서비스 초기화 대기 중... (약 30초)
timeout /t 30 /nobreak >nul

echo.
echo ============================================
echo   초기화 완료!
echo ============================================
echo.
echo   웹:       http://localhost:${FRONTEND_PORT}
echo   API 문서: http://localhost:${API_PORT}/docs
echo   DB:       localhost:${DB_PORT}
echo.
echo   테스트 계정:
echo     Admin:   admin@example.com / admin1234
echo     Manager: manager@example.com / manager1234
echo     Member:  member@example.com / member1234
echo.

endlocal
pause
```

---

## 7. docker-build-images.bat

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   ${PROJECT_NAME} Docker Image Build
echo ============================================
echo.
echo   소스코드 보호: Cython (컴파일)
echo.

REM Docker 실행 확인
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker가 실행되고 있지 않습니다.
    echo         Docker Desktop을 먼저 실행해주세요.
    pause
    exit /b 1
)

REM 출력 폴더 확인
if not exist "docker-images" mkdir docker-images

echo [1/5] Building Backend API image (Cython 컴파일)...
echo       (약 2-3분 소요)
docker build -t ${PROJECT_NAME}-api:latest -f backend/Dockerfile --target production backend/
if errorlevel 1 (
    echo [ERROR] Backend build failed.
    pause
    exit /b 1
)
echo       Backend 빌드 완료

echo.
echo [2/5] Building Frontend image...
docker build -t ${PROJECT_NAME}-frontend:latest -f frontend/Dockerfile --target production --build-arg VITE_API_URL=/api frontend/
if errorlevel 1 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)
echo       Frontend 빌드 완료

echo.
echo [3/5] Saving images to tar file...
echo       (약 1분 소요)
docker save ${PROJECT_NAME}-api:latest ${PROJECT_NAME}-frontend:latest -o docker-images/${PROJECT_NAME}-all.tar
echo       이미지 저장 완료

echo.
echo [4/5] Copying deployment files...
if exist "database\schema.sql" copy /Y database\schema.sql docker-images\schema.sql >nul
if exist "database\seed-data.sql" copy /Y database\seed-data.sql docker-images\seed-data.sql >nul
echo       SQL 파일 복사 완료

echo.
echo [5/5] Verifying output files...
dir docker-images /B
echo.

echo ============================================
echo   Build Complete!
echo ============================================
echo.
echo   Output folder: docker-images\
echo.
echo   배포 ZIP 파일 생성:
echo     powershell Compress-Archive -Path 'docker-images\*' -DestinationPath '${PROJECT_NAME}-docker-deploy.zip' -Force
echo.
echo   배포 절차:
echo     1. ${PROJECT_NAME}-docker-deploy.zip을 배포 PC로 복사
echo     2. 압축 해제
echo     3. install.bat 더블클릭
echo     4. 브라우저에서 http://localhost:${FRONTEND_PORT} 접속
echo.
echo   테스트 계정:
echo     Admin:   admin@example.com / admin1234
echo     Manager: manager@example.com / manager1234
echo     Member:  member@example.com / member1234
echo.

endlocal
pause
```

---

## 8. logs.bat

```batch
@echo off
echo.
echo ${PROJECT_NAME} 로그 보기
echo ========================
echo.
echo [1] 전체 로그
echo [2] API 로그만
echo [3] Frontend 로그만
echo [4] DB 로그만
echo.
set /p "CHOICE=선택: "

if "%CHOICE%"=="1" docker-compose logs -f
if "%CHOICE%"=="2" docker-compose logs -f api
if "%CHOICE%"=="3" docker-compose logs -f frontend
if "%CHOICE%"=="4" docker-compose logs -f db
```

---

## 9. .env (환경변수)

```env
# ${PROJECT_NAME} Docker 환경 설정

# 포트 설정
FRONTEND_PORT=8001
API_PORT=9201
DB_PORT=3307

# 데이터베이스
DB_USER=root
DB_PASSWORD=password123
DB_NAME=app_db

# 보안 (프로덕션에서 반드시 변경)
SECRET_KEY=change-this-secret-key-in-production
```

---

## 핵심 포인트 (안정성)

### 1. Healthcheck는 단순하게
- MySQL: `mysqladmin ping` (테이블 쿼리 X)
- PostgreSQL: `pg_isready`
- **절대 SELECT 쿼리 사용 금지** (초기화 중 실패함)

### 2. depends_on + condition: service_healthy
- DB가 완전히 준비된 후 API 시작
- API 연결 오류 방지

### 3. start_period 설정
- MySQL은 초기화 시간이 길므로 `start_period: 30s` 권장
- healthcheck 실패가 start_period 동안은 무시됨

### 4. 통합/개별 tar 모두 지원
- 단일 파일: `${PROJECT_NAME}-all.tar` (권장)
- 개별 파일: `${PROJECT_NAME}-api.tar` + `${PROJECT_NAME}-frontend.tar`

### 5. 한국어 출력
- `chcp 65001` 로 UTF-8 설정 (배치 파일 첫 줄)

### 6. install/update/reset 분리
- `install.bat`: 처음 설치 (더블클릭)
- `update.bat`: DB 유지하며 이미지만 교체 (더블클릭)
- `reset.bat`: 볼륨까지 완전 삭제 후 재설치 (확인 필요)
