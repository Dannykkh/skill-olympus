# docker-compose.yml 템플릿 (배포용)

**중요: 안정적인 healthcheck 설정**

## MySQL 사용 시

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
    # 인증 플러그인: mysql:8.0+ 기본값 caching_sha2_password 사용(별도 옵션 불필요, 권장).
    # --default-authentication-plugin은 8.0.27 deprecated → 8.4에서 제거(서버 기동 실패)라 삭제함.
    # 레거시 클라이언트로 native_password가 꼭 필요하면 버전별로 추가:
    #   8.0 → --default-authentication-plugin=mysql_native_password
    #   8.4 → --mysql-native-password=ON   (mysql_native_password는 9.0에서 완전 제거)
    command: >
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci

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

## PostgreSQL 사용 시

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
