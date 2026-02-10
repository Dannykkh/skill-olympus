---
name: docker-deploy
description: Docker 이미지 기반 배포 환경을 자동으로 구성합니다. /docker-deploy 명령으로 Dockerfile, docker-compose, install.bat 등 배포에 필요한 모든 파일을 생성합니다.
license: MIT
metadata:
  author: user
  version: "2.8.0"
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
- `deploy.bat` - Git Deploy Monitor 연동용 자동 배포 스크립트

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

#### 2.4 DB 덤프 자동 추출
- 빌드 시 실행 중인 DB 컨테이너에서 full-dump.sql을 자동 추출할지 여부
- DB 컨테이너명 확인 (기본: `${PROJECT_NAME}-db`)
- 추출 시 docker exec으로 mysqldump/pg_dump 실행

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
      # bind mount 사용 금지! 설치 폴더 삭제 시 컨테이너 재시작 실패
      # install.bat에서 docker exec으로 SQL 주입
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
      # bind mount 사용 금지! install.bat에서 docker exec으로 SQL 주입
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

**중요: bind mount 대신 docker exec으로 SQL 주입**
- `docker-compose.yml`에서 `./seed-data.sql:/docker-entrypoint-initdb.d/...` bind mount 사용 금지
- 이유: 설치 폴더 삭제 시 파일이 사라져 컨테이너 재시작 실패
- 대신: install.bat에서 MySQL ready 후 `docker exec`으로 SQL 직접 주입

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM .env 파일 로드
if not exist ".env" (
    echo [오류] .env 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    set "%%a=%%b"
)

echo.
echo ============================================
echo   !PROJECT_NAME! Docker 설치
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

REM 이미지 로드
echo.
echo [2/5] Docker 이미지 로드 중...
if exist "!PROJECT_NAME!-all.tar" (
    docker load -i "!PROJECT_NAME!-all.tar"
) else if exist "!PROJECT_NAME!-api.tar" (
    docker load -i "!PROJECT_NAME!-api.tar"
    docker load -i "!PROJECT_NAME!-frontend.tar"
) else (
    echo [오류] Docker 이미지 파일을 찾을 수 없습니다.
    echo        !PROJECT_NAME!-all.tar 또는 개별 tar 파일이 필요합니다.
    pause
    exit /b 1
)
echo       이미지 로드 완료

REM 베이스 이미지 확인
echo.
echo [3/5] 필수 이미지 확인 중...
docker image inspect mysql:8.0 >nul 2>&1 || docker pull mysql:8.0
echo       완료

REM 서비스 시작
echo.
echo [4/5] 서비스 시작 중...
docker compose up -d
if errorlevel 1 (
    echo [오류] 서비스 시작 실패
    pause
    exit /b 1
)

REM DB 초기화 (seed-data.sql이 있는 경우 docker exec으로 주입)
REM 주의: for /L 루프 안의 !errorlevel!은 불안정함 → goto 기반 루프 사용
echo.
echo [5/5] 데이터베이스 초기화 중...
if not exist "seed-data.sql" (
    echo       seed-data.sql 파일 없음 ^(스킵^)
    goto SKIP_DB_INIT
)

echo       DB 준비 대기 중...
set "RETRIES=0"

:WAIT_DB
if %RETRIES% GEQ 30 goto DB_NOT_READY
docker exec %PROJECT_NAME%-db mysqladmin ping -h localhost -u root -p%DB_PASSWORD% >nul 2>&1
if not errorlevel 1 goto DB_IS_READY
set /a RETRIES+=1
echo       대기 중... (%RETRIES%/30)
timeout /t 2 /nobreak >nul
goto WAIT_DB

:DB_IS_READY
echo       DB 준비 완료, 초기 데이터 로드 중...
docker exec -i %PROJECT_NAME%-db mysql -u root -p%DB_PASSWORD% %DB_NAME% < seed-data.sql
if errorlevel 1 (
    echo [경고] 초기 데이터 로드 실패 ^(이미 데이터가 있을 수 있습니다^)
) else (
    echo       초기 데이터 로드 완료
)
goto SKIP_DB_INIT

:DB_NOT_READY
echo [경고] DB가 준비되지 않았습니다. 수동으로 seed-data.sql을 로드해주세요.
echo        명령어: docker exec -i %PROJECT_NAME%-db mysql -u root -p%DB_PASSWORD% %DB_NAME% ^< seed-data.sql

:SKIP_DB_INIT

echo.
echo ============================================
echo   설치 완료!
echo ============================================
echo.
echo   웹:       http://localhost:!FRONTEND_PORT!
echo   API 문서: http://localhost:!API_PORT!/docs
echo   DB:       localhost:!DB_PORT!
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

REM .env 파일 로드
if not exist ".env" (
    echo [오류] .env 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    set "%%a=%%b"
)

echo.
echo ============================================
echo   !PROJECT_NAME! Docker 업데이트
echo   (데이터베이스는 유지됩니다)
echo ============================================
echo.

REM Docker 실행 확인
echo [1/5] Docker 실행 상태 확인 중...
docker info >nul 2>&1
if errorlevel 1 (
    echo [오류] Docker가 실행되고 있지 않습니다.
    pause
    exit /b 1
)
echo       Docker 정상 실행 중

REM 기존 서비스 중지 (볼륨 유지)
echo.
echo [2/5] 기존 서비스 중지 중...
docker-compose down
if errorlevel 1 (
    echo [경고] docker-compose down 실패, 강제 중지 시도...
    docker stop !PROJECT_NAME!-api !PROJECT_NAME!-frontend !PROJECT_NAME!-db >nul 2>&1
    docker rm !PROJECT_NAME!-api !PROJECT_NAME!-frontend >nul 2>&1
)

REM 컨테이너 중지 확인
for /f %%i in ('docker ps -q --filter "name=!PROJECT_NAME!"') do (
    echo [오류] 컨테이너가 아직 실행 중입니다: %%i
    echo        수동으로 중지해주세요: docker stop %%i
    pause
    exit /b 1
)
echo       서비스 중지 완료

REM 기존 이미지 삭제
docker rmi !PROJECT_NAME!-api:latest !PROJECT_NAME!-frontend:latest >nul 2>&1
echo       이미지 삭제 완료

REM 새 이미지 로드
echo.
echo [3/5] 새 Docker 이미지 로드 중...
if exist "!PROJECT_NAME!-all.tar" (
    docker load -i "!PROJECT_NAME!-all.tar"
) else if exist "!PROJECT_NAME!-api.tar" (
    docker load -i "!PROJECT_NAME!-api.tar"
    docker load -i "!PROJECT_NAME!-frontend.tar"
) else (
    echo [오류] Docker 이미지 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)
echo       이미지 로드 완료

REM 서비스 재시작
echo.
echo [4/5] 서비스 시작 중...
docker-compose up -d
if errorlevel 1 (
    echo [오류] 서비스 시작 실패
    pause
    exit /b 1
)

REM DB 마이그레이션 (migrations 폴더가 있는 경우)
echo.
echo [5/5] DB 스키마 마이그레이션 실행 중...
if exist "%SCRIPT_DIR%migrations" (
    echo       DB 준비 대기 중...
    timeout /t 15 /nobreak >nul
    for %%f in ("%SCRIPT_DIR%migrations\*.sql") do (
        echo       %%~nxf 적용 중...
        docker exec -i !PROJECT_NAME!-db sh -c "mysql -u root -p\$MYSQL_ROOT_PASSWORD \$MYSQL_DATABASE" < "%%f" 2>nul
        if not errorlevel 1 (
            echo       %%~nxf 적용 완료
        ) else (
            echo       %%~nxf 스킵 ^(이미 적용됨^)
        )
    )
) else (
    echo       마이그레이션 파일 없음 ^(스킵^)
)

echo.
echo ============================================
echo   업데이트 완료!
echo ============================================
echo.
echo   웹:       http://localhost:!FRONTEND_PORT!
echo   API 문서: http://localhost:!API_PORT!/docs
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

REM .env 파일 로드
if not exist ".env" (
    echo [오류] .env 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    set "%%a=%%b"
)

echo.
echo ============================================
echo   !PROJECT_NAME! Docker 완전 초기화
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
    docker stop !PROJECT_NAME!-api !PROJECT_NAME!-frontend !PROJECT_NAME!-db >nul 2>&1
    docker rm !PROJECT_NAME!-api !PROJECT_NAME!-frontend !PROJECT_NAME!-db >nul 2>&1
    docker volume rm !PROJECT_NAME!_mysql_data !PROJECT_NAME!_postgres_data >nul 2>&1
)

REM 컨테이너 중지 확인
for /f %%i in ('docker ps -q --filter "name=!PROJECT_NAME!"') do (
    echo [오류] 컨테이너가 아직 실행 중입니다: %%i
    echo        수동으로 중지해주세요: docker stop %%i
    pause
    exit /b 1
)
echo       서비스 중지 완료

REM 기존 이미지 삭제
docker rmi !PROJECT_NAME!-api:latest !PROJECT_NAME!-frontend:latest >nul 2>&1
echo       이미지 삭제 완료

REM 새 이미지 로드
echo.
echo [3/4] Docker 이미지 로드 중...
if exist "!PROJECT_NAME!-all.tar" (
    docker load -i "!PROJECT_NAME!-all.tar"
) else if exist "!PROJECT_NAME!-api.tar" (
    docker load -i "!PROJECT_NAME!-api.tar"
    docker load -i "!PROJECT_NAME!-frontend.tar"
) else (
    echo [오류] Docker 이미지 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)
echo       이미지 로드 완료

REM 베이스 이미지 확인 및 서비스 시작
echo.
echo [4/4] 서비스 시작 중...
docker pull mysql:8.0 >nul 2>&1
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
echo   웹:       http://localhost:!FRONTEND_PORT!
echo   API 문서: http://localhost:!API_PORT!/docs
echo   DB:       localhost:!DB_PORT!
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

REM 프로젝트명 설정 (폴더명 또는 .env에서)
for %%I in (.) do set "PROJECT_NAME=%%~nxI"
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        if "%%a"=="PROJECT_NAME" set "PROJECT_NAME=%%b"
    )
)

echo.
echo ============================================
echo   !PROJECT_NAME! Docker Image Build
echo ============================================
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

echo [1/7] Building Backend API image...
docker build -t !PROJECT_NAME!-api:latest -f backend/Dockerfile --target production backend/
if errorlevel 1 (
    echo [ERROR] Backend build failed.
    pause
    exit /b 1
)
echo       Backend 빌드 완료

echo.
echo [2/7] Building Frontend image...
REM VITE_API_URL 설정 주의:
REM - 엔드포인트가 이미 /api를 포함하면 빈 문자열 사용 (예: VITE_API_URL=)
REM - 그렇지 않으면 /api 사용 (예: VITE_API_URL=/api)
REM - Git Bash에서 /api가 C:/Program Files/Git/api로 변환될 수 있음!
docker build -t !PROJECT_NAME!-frontend:latest -f frontend/Dockerfile --target production --build-arg "VITE_API_URL=" frontend/
if errorlevel 1 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)
echo       Frontend 빌드 완료

echo.
echo [3/7] Saving images to tar file...
docker save !PROJECT_NAME!-api:latest !PROJECT_NAME!-frontend:latest -o docker-images/!PROJECT_NAME!-all.tar
echo       이미지 저장 완료

echo.
echo [4/7] Copying deployment files...
if exist "database\schema.sql" copy /Y database\schema.sql docker-images\schema.sql >nul
if exist "database\seed-data.sql" copy /Y database\seed-data.sql docker-images\seed-data.sql >nul
if not exist "docker-images\migrations" mkdir docker-images\migrations
echo       SQL 파일 복사 완료

echo.
echo [5/7] DB 덤프 추출 중 (full-dump.sql)...
docker ps --filter "name=!PROJECT_NAME!-db" --filter "status=running" -q >nul 2>&1
for /f %%i in ('docker ps --filter "name=!PROJECT_NAME!-db" --filter "status=running" -q 2^>nul') do set "DB_RUNNING=%%i"
if defined DB_RUNNING (
    docker exec !PROJECT_NAME!-db sh -c "mysqldump -u root -p\$MYSQL_ROOT_PASSWORD --routines --triggers --events --single-transaction \$MYSQL_DATABASE" > docker-images/full-dump.sql 2>nul
    if not errorlevel 1 (
        echo       full-dump.sql 추출 완료
    ) else (
        echo [경고] DB 덤프 추출 실패 - 기존 full-dump.sql을 유지합니다.
    )
) else (
    echo [경고] DB 컨테이너^(!PROJECT_NAME!-db^)가 실행 중이 아닙니다.
    echo        기존 full-dump.sql을 유지합니다.
    if not exist "docker-images\full-dump.sql" (
        echo [ERROR] full-dump.sql이 없습니다! DB 컨테이너를 먼저 실행하세요.
        pause
        exit /b 1
    )
)

echo.
echo [6/7] Verifying output files...
echo.
echo   docker-images 폴더 내용:
echo   ─────────────────────────
for %%f in (docker-images\*) do echo     %%~nxf  (%%~zf bytes)
if exist "docker-images\migrations\*.sql" (
    echo     migrations\
    for %%f in (docker-images\migrations\*.sql) do echo       %%~nxf
)
echo.

echo.
echo [7/7] ZIP 배포 파일 생성 중...
REM 이전 개별 tar 파일 정리 (통합 tar만 유지)
if exist "docker-images\!PROJECT_NAME!-api.tar" del /Q "docker-images\!PROJECT_NAME!-api.tar"
if exist "docker-images\!PROJECT_NAME!-frontend.tar" del /Q "docker-images\!PROJECT_NAME!-frontend.tar"
REM test-results 제거
if exist "docker-images\test-results" rmdir /S /Q "docker-images\test-results"
powershell -Command "Compress-Archive -Path 'docker-images\*' -DestinationPath '!PROJECT_NAME!-docker-deploy.zip' -Force"
if errorlevel 1 (
    echo [ERROR] ZIP 생성 실패
    pause
    exit /b 1
)
for %%f in (!PROJECT_NAME!-docker-deploy.zip) do echo       !PROJECT_NAME!-docker-deploy.zip (%%~zf bytes)
echo       ZIP 생성 완료

echo.
echo ============================================
echo   Build Complete!
echo ============================================
echo.
echo   Output:
echo     docker-images\              배포 폴더
echo     !PROJECT_NAME!-docker-deploy.zip   배포 ZIP
echo.
echo   배포 절차:
echo     1. !PROJECT_NAME!-docker-deploy.zip을 배포 PC로 복사
echo     2. 압축 해제
echo     3. install.bat 더블클릭 (신규 설치)
echo        또는 update.bat 더블클릭 (업데이트)
echo.

endlocal
pause
```

---

## 8. logs.bat

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM .env 파일 로드
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        set "%%a=%%b"
    )
)

echo.
echo !PROJECT_NAME! 로그 보기
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
# 프로젝트명 (폴더명과 무관하게 동작)
PROJECT_NAME=myapp

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

### 7. Git Bash 경로 변환 주의 (Windows)
- Git Bash에서 `/api`가 `C:/Program Files/Git/api`로 변환됨
- 해결책: 환경변수를 따옴표로 감싸기 (`"VITE_API_URL="`)
- 또는 `MSYS_NO_PATHCONV=1` 설정 (일부 경우에만 동작)

### 8. mysqldump 경고 제외
- mysqldump 실행 시 경고가 SQL 파일에 포함될 수 있음
- `2>/dev/null`로 stderr 제외: `mysqldump ... 2>/dev/null > dump.sql`
- `2>&1` 사용 금지 (경고가 SQL에 섞임)

### 9. VITE_API_URL 설정
- 프론트엔드 API 호출 시 baseURL 설정
- 엔드포인트가 이미 `/api`를 포함하면 빈 문자열 사용
  - 예: `axios.get('/api/users')` → `VITE_API_URL=` (빈 문자열)
- 엔드포인트가 `/api` 없이 시작하면 `/api` 사용
  - 예: `axios.get('/users')` → `VITE_API_URL=/api`
- 이중 경로 주의: `/api/api/users` 발생 가능

### 10. SQL bind mount 사용 금지
- `./seed-data.sql:/docker-entrypoint-initdb.d/...` bind mount 사용 **금지**
- 문제: 설치 폴더 삭제 → 파일 사라짐 → 컴퓨터 재시작 시 컨테이너 시작 실패
- 해결: `install.bat`에서 MySQL ready 후 `docker exec -i <컨테이너> mysql ... < seed-data.sql`로 주입
- DB 데이터는 Docker named volume에 보존되므로, 설치 폴더 삭제해도 DB는 유지됨

### 11. 프론트엔드 API 경로와 nginx 일치 필수
- nginx의 `/api/` location으로 프록시하는 경우, 프론트엔드 모든 API 호출에 `/api` prefix 필요
- 개발 환경(Vite 프록시)에서는 개별 경로 프록시로 동작하지만, 배포 환경(nginx)에서는 실패
- 반드시 nginx location과 프론트엔드 API 경로를 일치시킬 것

### 12. install.bat DB 대기 루프는 goto 사용
- `for /L` 루프 안에서 `!errorlevel!`은 불안정 (Windows 배치 스크립트 알려진 버그)
- MySQL 준비 대기 시 `goto` 기반 루프 사용 필수
- 잘못된 예: `for /L %%i in (1,1,30) do ( if !errorlevel!==0 ... )`
- 올바른 예: `:WAIT_DB` → `docker exec ping` → `if not errorlevel 1 goto DB_IS_READY` → `goto WAIT_DB`

---

## 13. deploy.bat (Git Deploy Monitor 연동)

Git Deploy Monitor가 git push 감지 시 자동으로 실행하는 스크립트입니다.
이 파일은 **배포 폴더** (예: `D:\deploy\{프로젝트명}\`)에 위치해야 합니다.

### 배포 흐름
```
Git push → DeployMonitor 감지 → deploy.bat auto 실행
  1. git pull (bare repo에서 최신 코드)
  2. Docker 이미지 빌드
  3. 기존 컨테이너 중지 (DB 유지)
  4. 새 이미지로 컨테이너 시작
```

### deploy.bat 생성 위치

사용자에게 **배포 폴더 경로**를 확인합니다:
- 기본: `D:\deploy\{프로젝트명}\`
- 이 폴더에 프로젝트 소스 코드가 git clone 되어 있어야 함
- deploy.bat을 이 폴더 루트에 생성

### deploy.bat 템플릿

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM === 설정 ===
set "PROJECT_NAME={프로젝트명}"
set "API_PORT=9201"
set "FRONTEND_PORT=8001"
set "DB_PORT=3307"

REM 모드 확인 (auto = DeployMonitor 자동 실행)
set "MODE=%~1"

echo ============================================
echo   [%PROJECT_NAME%] 자동 배포 시작
echo   모드: %MODE%
echo   시각: %date% %time%
echo ============================================

REM [1] 최신 코드 가져오기
echo.
echo [1/4] git pull 실행 중...
git pull
if errorlevel 1 (
    echo [오류] git pull 실패
    if not "%MODE%"=="auto" pause
    exit /b 1
)
echo       git pull 완료

REM [2] Docker 이미지 빌드
echo.
echo [2/4] Docker 이미지 빌드 중...
docker build -t %PROJECT_NAME%-api:latest -f backend/Dockerfile --target production backend/
if errorlevel 1 (
    echo [오류] Backend 빌드 실패
    if not "%MODE%"=="auto" pause
    exit /b 2
)
echo       Backend 빌드 완료

docker build -t %PROJECT_NAME%-frontend:latest -f frontend/Dockerfile --target production --build-arg "VITE_API_URL=" frontend/
if errorlevel 1 (
    echo [오류] Frontend 빌드 실패
    if not "%MODE%"=="auto" pause
    exit /b 3
)
echo       Frontend 빌드 완료

REM [3] 컨테이너 재시작 (DB 유지)
echo.
echo [3/4] 컨테이너 재시작 중...
cd /d "%SCRIPT_DIR%docker-images"
docker compose stop api frontend
docker compose rm -f api frontend
docker compose up -d api frontend
if errorlevel 1 (
    echo [오류] 컨테이너 시작 실패
    cd /d "%SCRIPT_DIR%"
    if not "%MODE%"=="auto" pause
    exit /b 4
)
cd /d "%SCRIPT_DIR%"
echo       컨테이너 재시작 완료

REM [4] 헬스체크 대기
echo.
echo [4/4] 서비스 상태 확인 중...
timeout /t 10 /nobreak >nul

set "RETRIES=0"
:HEALTH_CHECK
if %RETRIES% GEQ 15 goto HEALTH_FAIL
curl -sf http://localhost:%API_PORT%/health >nul 2>&1
if not errorlevel 1 goto HEALTH_OK
set /a RETRIES+=1
echo       대기 중... (%RETRIES%/15)
timeout /t 2 /nobreak >nul
goto HEALTH_CHECK

:HEALTH_OK
echo       API 헬스체크 통과

echo.
echo ============================================
echo   [%PROJECT_NAME%] 배포 완료!
echo   웹: http://localhost:%FRONTEND_PORT%
echo   API: http://localhost:%API_PORT%/docs
echo ============================================

if not "%MODE%"=="auto" pause
exit /b 0

:HEALTH_FAIL
echo [경고] API 헬스체크 실패 (컨테이너는 실행 중)
echo        수동 확인 필요: docker logs %PROJECT_NAME%-api
if not "%MODE%"=="auto" pause
exit /b 5
```

### deploy.bat 커스터마이즈 포인트

| 항목 | 설명 |
|------|------|
| `PROJECT_NAME` | 프로젝트명 (docker-compose name과 일치) |
| `API_PORT` 등 | docker-compose.yml의 포트와 일치 |
| `VITE_API_URL` | 프론트엔드 API 경로 (프로젝트에 맞게 조정) |
| git pull 방식 | bare repo clone이면 remote 설정 필요 |
| 헬스체크 URL | `/health` 엔드포인트 경로 |

### DeployMonitor 연동 설정

배포 폴더 구조 예시:
```
D:\deploy\bizmanagement\           ← 배포 폴더 (DeployMonitor 설정)
├── deploy.bat                     ← 이 파일 (자동 배포 스크립트)
├── backend/
├── frontend/
├── docker-images/
│   ├── docker-compose.yml
│   └── .env
└── ...
```

DeployMonitor 설정:
- 저장소 폴더: `C:\Bonobo.Git.Server\App_Data\Repositories` (bare repo)
- 배포 폴더: `D:\deploy` (각 프로젝트 하위에 deploy.bat 존재)
- 감시 브랜치: `master`

---

## 다음 단계 안내

배포 환경 생성이 완료되면 사용자에게 다음 단계를 안내합니다:

```
✅ Docker 배포 환경 생성 완료!

📦 산출물: Dockerfile, docker-compose.yml, install.bat/sh

👉 다음 단계 (선택):
  ./install.bat        → 로컬에서 Docker 빌드 & 실행
  /write-api-docs      → API 문서 생성
  /commit              → 변경사항 커밋
  /wrap-up             → 세션 요약 + MEMORY.md 업데이트

📎 참고: docs/workflow-guide.md
```
