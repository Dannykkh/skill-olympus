# Docker Compose Templates

## docker-images/docker-compose.yml (배포용)

```yaml
version: '3.8'

services:
  api:
    image: {project}-api:latest
    container_name: {project}-api
    restart: unless-stopped
    ports:
      - "${API_PORT:-8950}:8950"
    environment:
      - ENVIRONMENT=production
      - DB_HOST=db
      - DB_PORT=3306
      - DB_NAME=${DB_NAME:-{project}_db}
      - DB_USER=${DB_USER:-root}
      - DB_PASSWORD=${DB_PASSWORD:-password}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - SECRET_KEY=${SECRET_KEY:-change-this-secret-key}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - {project}-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8950/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: {project}-frontend:latest
    container_name: {project}-frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-8960}:80"
    depends_on:
      - api
    networks:
      - {project}-network

  db:
    image: mysql:8.0
    container_name: {project}-db
    restart: unless-stopped
    ports:
      - "${DB_PORT:-3310}:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD:-password}
      - MYSQL_DATABASE=${DB_NAME:-{project}_db}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
      - ./migrate.sql:/docker-entrypoint-initdb.d/02-migrate.sql:ro
    networks:
      - {project}-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: >
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci

  redis:
    image: redis:7-alpine
    container_name: {project}-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - {project}-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

networks:
  {project}-network:
    driver: bridge

volumes:
  mysql_data:
  redis_data:
```

## docker-images/.env

```env
# {Project} Docker Configuration

# Port Configuration
FRONTEND_PORT={user_frontend_port}
API_PORT={user_backend_port}
DB_PORT={user_db_port}

# Database Configuration
DB_NAME={project}_db
DB_USER=root
DB_PASSWORD=password123

# Security
SECRET_KEY={project}-default-secret-key
```
