---
name: docker-deploy
description: Docker 이미지 기반 배포 환경을 자동으로 구성합니다. /docker-deploy 명령으로 Dockerfile, docker-compose, install.bat 등 배포에 필요한 모든 파일을 생성합니다.
license: MIT
metadata:
  author: user
  version: "2.0.0"
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
- `frontend/nginx.conf` - Nginx 설정
- `docker-build-images.bat` - 이미지 빌드 + ZIP 생성
- `deploy/docker-compose.yml` - 배포용 (pre-built 이미지)
- `deploy/.env` - 환경변수 (기본값 포함)
- `deploy/install.bat` - 처음 설치
- `deploy/start.bat` - 서비스 시작
- `deploy/stop.bat` - 서비스 중지
- `deploy/logs.bat` - 로그 보기
- `deploy/init-db.sql` - DB 초기화 스크립트

---

## Instructions

### 1. 프로젝트 분석

먼저 프로젝트 구조를 분석합니다:

```
- backend/ 폴더 확인 → Python/FastAPI, Node.js 등
- frontend/ 폴더 확인 → React, Vue 등
- 기존 Dockerfile 확인
- 기존 docker-compose.yml 확인
- package.json, requirements.txt 등 의존성 파일 확인
```

### 2. 프로젝트명 결정

프로젝트명은 다음 순서로 결정:
1. 사용자가 지정한 이름
2. package.json의 name
3. 폴더명

프로젝트명은 소문자, 하이픈 사용 (예: `milqa`, `my-project`)

### 3. 설정 질문 (AskUserQuestion 사용)

#### 3.1 OS 선택

```
| Option | Description |
|--------|-------------|
| Windows (Recommended) | .bat scripts only |
| Linux/Mac | .sh scripts only |
| Both | .bat + .sh |
```

#### 3.2 데이터베이스 선택

```
| Option | Description |
|--------|-------------|
| PostgreSQL (Recommended) | PostgreSQL 15, asyncpg driver |
| MySQL | MySQL 8.0, pymysql driver |
```

#### 3.3 포트 설정

**먼저 프로젝트의 실제 사용 포트를 확인합니다:**
- Backend: `backend/app/main.py` 또는 `uvicorn` 설정에서 포트 확인
- Frontend: `vite.config.ts` 또는 `package.json` scripts에서 포트 확인

**각 서비스별로 개별 질문:**

**Frontend 포트:**
```
| Option | Description |
|--------|-------------|
| Web deploy (80) | Standard web port (Recommended for production) |
| Keep dev port ({detected_port}) | Use current development port as-is |
```

**Backend 포트:**
```
| Option | Description |
|--------|-------------|
| Keep dev port ({detected_port}) (Recommended) | Use current development port as-is |
| Custom port | Specify different port |
```

**Database 포트:**
```
| Option | Description |
|--------|-------------|
| Default ({default_db_port}) (Recommended) | PostgreSQL: 5432, MySQL: 3306 mapped to 5440/3310 |
| Custom port | Specify different external port |
```

### 4. 포트 규칙

**기본값: 프로젝트에서 실제 사용하는 포트를 그대로 사용**

| Service | Container Port | Host Port | Description |
|---------|---------------|-----------|-------------|
| Frontend | 80 | {frontend_port} | 80 for web deploy, or dev port |
| Backend | {backend_port} | {backend_port} | Same as development |
| PostgreSQL | 5432 | {db_port} | External access port |
| MySQL | 3306 | {db_port} | External access port |
| Redis | 6379 | - | Internal only |

**포트 감지 방법:**
- Backend FastAPI: `uvicorn` 명령어에서 `--port` 옵션 확인, 없으면 8000
- Frontend Vite: `vite.config.ts`의 `server.port`, 없으면 5173
- Frontend CRA: `package.json`의 `PORT` 환경변수, 없으면 3000

### 5. 파일 생성 규칙

#### Backend Dockerfile (FastAPI/Python)

```dockerfile
# ============================================
# Build stage
# ============================================
FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# ============================================
# Production stage
# ============================================
FROM python:3.11-slim as production

WORKDIR /app

RUN useradd --create-home --shell /bin/bash appuser

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY --chown=appuser:appuser . .

USER appuser
EXPOSE {backend_port}

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:{backend_port}/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "{backend_port}", "--workers", "4"]
```

#### Frontend Dockerfile (React/Vite)

```dockerfile
# ============================================
# Build stage
# ============================================
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ============================================
# Production stage
# ============================================
FROM nginx:alpine as production

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Frontend nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://api:{backend_port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### deploy/docker-compose.yml (PostgreSQL)

```yaml
version: '3.8'

# {Project} Docker Compose
# Install: Run install.bat

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: {project}-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-{project}}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-{project}_password}
      POSTGRES_DB: ${POSTGRES_DB:-{project}_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "${DB_PORT:-{db_port}}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-{project}}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - {project}-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: {project}-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD:-redis_password}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-redis_password}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - {project}-network

  # Backend API
  api:
    image: {project}-api:latest
    container_name: {project}-api
    restart: unless-stopped
    ports:
      - "${API_PORT:-{backend_port}}:{backend_port}"
    environment:
      ENVIRONMENT: production
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER:-{project}}:${POSTGRES_PASSWORD:-{project}_password}@postgres:5432/${POSTGRES_DB:-{project}_db}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis_password}@redis:6379/0
      SECRET_KEY: ${SECRET_KEY:-{project}-secret-key-change-this}
      ALGORITHM: HS256
      ACCESS_TOKEN_EXPIRE_MINUTES: 30
      BACKEND_CORS_ORIGINS: '["http://localhost","http://localhost:${FRONTEND_PORT:-{frontend_port}}","http://localhost:80"]'
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - uploads_data:/app/uploads
    networks:
      - {project}-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:{backend_port}/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend
  frontend:
    image: {project}-frontend:latest
    container_name: {project}-frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-{frontend_port}}:80"
    depends_on:
      - api
    networks:
      - {project}-network

volumes:
  postgres_data:
  redis_data:
  uploads_data:

networks:
  {project}-network:
    driver: bridge
```

#### deploy/docker-compose.yml (MySQL)

```yaml
version: '3.8'

services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: {project}-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:-{project}_password}
      MYSQL_DATABASE: ${DB_NAME:-{project}_db}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "${DB_PORT:-{db_port}}:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: >
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
    networks:
      - {project}-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: {project}-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD:-redis_password}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-redis_password}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - {project}-network

  # Backend API
  api:
    image: {project}-api:latest
    container_name: {project}-api
    restart: unless-stopped
    ports:
      - "${API_PORT:-{backend_port}}:{backend_port}"
    environment:
      ENVIRONMENT: production
      DATABASE_URL: mysql+pymysql://root:${DB_PASSWORD:-{project}_password}@mysql:3306/${DB_NAME:-{project}_db}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis_password}@redis:6379/0
      SECRET_KEY: ${SECRET_KEY:-{project}-secret-key-change-this}
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - uploads_data:/app/uploads
    networks:
      - {project}-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:{backend_port}/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend
  frontend:
    image: {project}-frontend:latest
    container_name: {project}-frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-{frontend_port}}:80"
    depends_on:
      - api
    networks:
      - {project}-network

volumes:
  mysql_data:
  redis_data:
  uploads_data:

networks:
  {project}-network:
    driver: bridge
```

#### docker-build-images.bat

**IMPORTANT: Use English only, no Korean characters (encoding issues)**

```batch
@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   {Project} Docker Image Build
echo ============================================
echo.

REM Check Docker
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running.
    echo         Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Create output folder
if not exist "deploy" mkdir deploy

echo [1/5] Building Backend API image...
echo       (This may take a while...)
docker build -t {project}-api:latest -f backend/Dockerfile --target production backend/
if errorlevel 1 (
    echo.
    echo [ERROR] Backend build failed.
    echo.
    pause
    exit /b 1
)
echo       Backend build complete

echo.
echo [2/5] Building Frontend image...
echo       (This may take a while...)
docker build -t {project}-frontend:latest -f frontend/Dockerfile --target production --build-arg VITE_API_URL=/api frontend/
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend build failed.
    echo.
    pause
    exit /b 1
)
echo       Frontend build complete

echo.
echo [3/5] Saving images to tar file...
echo       (This may take a while depending on image size...)
docker save {project}-api:latest {project}-frontend:latest -o deploy/{project}-all.tar
if errorlevel 1 (
    echo.
    echo [ERROR] Image save failed.
    echo.
    pause
    exit /b 1
)
echo       Image save complete

echo.
echo [4/5] Copying deployment files...
copy deploy\docker-compose.yml deploy\docker-compose.yml >nul 2>&1
copy deploy\.env deploy\.env >nul 2>&1
if exist deploy\init-db.sql copy deploy\init-db.sql deploy\init-db.sql >nul
echo       Deployment files copied

echo.
echo [5/5] Creating deployment ZIP...
if exist {project}-docker-deploy.zip del {project}-docker-deploy.zip
powershell -Command "Compress-Archive -Path 'deploy\*' -DestinationPath '{project}-docker-deploy.zip' -Force"
if errorlevel 1 (
    echo.
    echo [WARNING] ZIP creation failed. You can create it manually.
) else (
    echo       ZIP file created: {project}-docker-deploy.zip
)

echo.
echo ============================================
echo   Build Complete!
echo ============================================
echo.
echo Output files:
echo   - deploy\              (folder)
echo   - {project}-docker-deploy.zip (deployment package)
echo.
for %%A in ({project}-docker-deploy.zip) do echo ZIP file size: %%~zA bytes
echo.
echo ============================================
echo   Deployment Instructions
echo ============================================
echo.
echo 1. Copy {project}-docker-deploy.zip to deployment PC
echo 2. Extract the ZIP file
echo 3. Run install.bat
echo.
echo Access after installation:
echo   - Web: http://localhost:{frontend_port}
echo   - API: http://localhost:{backend_port}/docs
echo.

endlocal
pause
```

#### deploy/install.bat

**Simple and clean install script (English only)**

```batch
@echo off
setlocal enabledelayedexpansion

:: Change to script directory (fixes path issues)
cd /d "%~dp0"

echo ================================================
echo    {Project} - Docker Install
echo ================================================
echo.

:: Check Docker
docker --version > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed.
    echo Please install Docker Desktop first.
    pause
    exit /b 1
)

echo [INFO] Docker version:
docker --version
echo.

:: Load images
if exist "{project}-all.tar" (
    echo [INFO] Loading Docker images...
    docker load -i {project}-all.tar
    echo [INFO] Images loaded
    echo.
) else (
    echo [WARN] {project}-all.tar not found.
    echo        Images may already be loaded or build is required.
    echo.
)

:: Pull base images (PostgreSQL version)
echo [INFO] Checking base images...
docker image inspect postgres:15-alpine > nul 2>&1 || docker pull postgres:15-alpine
docker image inspect redis:7-alpine > nul 2>&1 || docker pull redis:7-alpine
echo.

:: Start services
echo [INFO] Starting services...
docker compose up -d

echo.
echo ================================================
echo    Install Complete!
echo ================================================
echo.
echo Service status:
docker compose ps
echo.
echo Access:
echo   - Web: http://localhost:{frontend_port}
echo   - API Docs: http://localhost:{backend_port}/docs
echo   - DB: localhost:{db_port}
echo.
echo Commands:
echo   - Logs: logs.bat
echo   - Stop: stop.bat
echo   - Start: start.bat
echo.
pause
```

#### deploy/start.bat

```batch
@echo off
cd /d "%~dp0"
echo Starting services...
docker compose up -d
echo.
docker compose ps
pause
```

#### deploy/stop.bat

```batch
@echo off
cd /d "%~dp0"
echo Stopping services...
docker compose down
echo.
echo Services stopped.
pause
```

#### deploy/logs.bat

```batch
@echo off
cd /d "%~dp0"
docker compose logs -f
```

#### deploy/.env

```env
# {Project} Docker Configuration

# Port Configuration
FRONTEND_PORT={frontend_port}
API_PORT={backend_port}
DB_PORT={db_port}

# Database Configuration (PostgreSQL)
POSTGRES_USER={project}
POSTGRES_PASSWORD={project}_password
POSTGRES_DB={project}_db

# Redis Configuration
REDIS_PASSWORD=redis_password

# Security (Change in production!)
SECRET_KEY={project}-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### deploy/init-db.sql

```sql
-- {Project} Database Initialization
-- Add initial data here if needed
```

---

### Linux/Mac Scripts (sh)

#### docker-build-images.sh

```bash
#!/bin/bash
set -e

echo ""
echo "============================================"
echo "  {Project} Docker Image Build"
echo "============================================"
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker is not running."
    exit 1
fi

mkdir -p deploy

echo "[1/5] Building Backend API image..."
docker build -t {project}-api:latest -f backend/Dockerfile --target production backend/

echo "[2/5] Building Frontend image..."
docker build -t {project}-frontend:latest -f frontend/Dockerfile --target production --build-arg VITE_API_URL=/api frontend/

echo "[3/5] Saving images to tar file..."
docker save {project}-api:latest {project}-frontend:latest -o deploy/{project}-all.tar

echo "[4/5] Copying deployment files..."

echo "[5/5] Creating deployment ZIP..."
zip -r {project}-docker-deploy.zip deploy/

echo ""
echo "============================================"
echo "  Build Complete!"
echo "============================================"
echo ""
echo "Output: {project}-docker-deploy.zip"
echo ""
```

#### deploy/install.sh

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================"
echo "   {Project} - Docker Install"
echo "================================================"
echo ""

# Check Docker
if ! docker --version > /dev/null 2>&1; then
    echo "[ERROR] Docker is not installed."
    exit 1
fi

echo "[INFO] Docker version:"
docker --version
echo ""

# Load images
if [ -f "{project}-all.tar" ]; then
    echo "[INFO] Loading Docker images..."
    docker load -i {project}-all.tar
    echo "[INFO] Images loaded"
    echo ""
else
    echo "[WARN] {project}-all.tar not found."
    echo ""
fi

# Pull base images
echo "[INFO] Checking base images..."
docker image inspect postgres:15-alpine > /dev/null 2>&1 || docker pull postgres:15-alpine
docker image inspect redis:7-alpine > /dev/null 2>&1 || docker pull redis:7-alpine
echo ""

# Start services
echo "[INFO] Starting services..."
docker compose up -d

echo ""
echo "================================================"
echo "   Install Complete!"
echo "================================================"
echo ""
echo "Service status:"
docker compose ps
echo ""
echo "Access:"
echo "  - Web: http://localhost:{frontend_port}"
echo "  - API Docs: http://localhost:{backend_port}/docs"
echo "  - DB: localhost:{db_port}"
echo ""
```

#### deploy/start.sh

```bash
#!/bin/bash
cd "$(dirname "$0")"
echo "Starting services..."
docker compose up -d
docker compose ps
```

#### deploy/stop.sh

```bash
#!/bin/bash
cd "$(dirname "$0")"
echo "Stopping services..."
docker compose down
echo "Services stopped."
```

#### deploy/logs.sh

```bash
#!/bin/bash
cd "$(dirname "$0")"
docker compose logs -f
```

---

### 6. .gitignore

```gitignore
# Docker deployment
deploy/*.tar
{project}-docker-deploy.zip
```

### 7. Completion Message

```
Docker deployment environment configured.

Generated files:
- backend/Dockerfile
- frontend/Dockerfile
- frontend/nginx.conf
- docker-build-images.bat
- deploy/
  - docker-compose.yml
  - .env
  - init-db.sql
  - install.bat
  - start.bat
  - stop.bat
  - logs.bat

Port settings:
- Frontend: {frontend_port}
- Backend: {backend_port}
- Database: {db_port}

Next steps:
1. Run docker-build-images.bat to build images
2. Copy {project}-docker-deploy.zip to deployment PC
3. Extract and run install.bat

Access:
- Web: http://localhost:{frontend_port}
- API Docs: http://localhost:{backend_port}/docs
- DB: localhost:{db_port}
```

---

## Notes

- `{project}` = project name (lowercase, hyphen)
- `{Project}` = project name (capitalized)
- `{frontend_port}` = 80 (web deploy) or detected dev port (e.g., 5173, 3000)
- `{backend_port}` = detected from project (e.g., 8000, 8150, 3000)
- `{db_port}` = 5440 (PostgreSQL) or 3310 (MySQL) for external access
- **Default ports come from project's actual configuration**
- All batch scripts use English only to avoid encoding issues
- Use `docker compose` (v2) instead of `docker-compose` (v1)
