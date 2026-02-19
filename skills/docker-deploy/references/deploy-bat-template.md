# deploy.bat (Git Deploy Monitor 연동)

Git Deploy Monitor가 git push 감지 시 자동으로 실행하는 스크립트입니다.
이 파일은 **배포 폴더** (예: `D:\deploy\{프로젝트명}\`)에 위치해야 합니다.

## 배포 흐름
```
Git push → DeployMonitor 감지 → deploy.bat auto 실행
  0. Self-Reload (git pull 후 새 deploy.bat 재실행)
  1. .deploy-mode 확인 (reset/update)
  2. Docker 이미지 빌드
  3. 컨테이너 재시작 (DB 유지)
  4. DB 상태 확인 (users 테이블)
  5. DB 초기화 또는 마이그레이션
  6. 헬스체크
```

## Self-Reload 패턴 (v3.0)

**문제**: Windows 배치 파일은 실행 시작 시점에 전체 로드됨.
`git pull`로 deploy.bat 파일이 업데이트되어도, 메모리에 로드된 **구버전**이 계속 실행됨.

**해결**: Self-Reload - git pull 후 자기 자신을 다시 호출

```
1. DeployMonitor → deploy.bat auto (구버전 메모리 로드)
2. git pull → deploy.bat 파일 업데이트
3. call "%~f0" %1 --reloaded → 새 deploy.bat 실행
4. --reloaded 플래그로 git pull 스킵 → 실제 로직 실행
```

## deploy.bat 템플릿 (v3.0)

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM === deploy.bat v3.0 - Self-Reload Pattern ===
if "%~2"=="--reloaded" goto MAIN_START

echo [0/6] Self-Reload: git pull 후 재실행...
git pull
call "%~f0" %1 --reloaded
exit /b %errorlevel%

:MAIN_START

REM === 설정 (프로젝트별로 수정) ===
set "PROJECT_NAME={프로젝트명}"
set "API_PORT=9201"
set "FRONTEND_PORT=8001"
set "DB_PORT=3307"
set "DB_USER=root"
set "DB_PASSWORD=password123"
set "DB_NAME=app_db"

set "MODE=%~1"

echo ============================================
echo   [%PROJECT_NAME%] 자동 배포 시작 (v3.0)
echo   모드: %MODE%
echo ============================================

REM [1/6] .deploy-mode 확인
set "DEPLOY_MODE=update"
if exist ".deploy-mode" (
    set /p DEPLOY_MODE=<.deploy-mode
    del .deploy-mode >nul 2>&1
)

REM [2/6] Docker 이미지 빌드
docker build -t %PROJECT_NAME%-api:latest -f backend/Dockerfile --target production backend/
docker build -t %PROJECT_NAME%-frontend:latest -f frontend/Dockerfile --target production --build-arg "VITE_API_URL=" frontend/

REM [3/6] 컨테이너 재시작
cd /d "%SCRIPT_DIR%docker-images"
if /i "!DEPLOY_MODE!"=="reset" (
    docker compose down -v
    docker compose up -d
) else (
    for /f %%i in ('docker ps -q --filter "name=%PROJECT_NAME%-db" 2^>nul') do set "DB_EXISTS=1"
    if not defined DB_EXISTS (
        docker compose up -d
    ) else (
        docker compose stop api frontend
        docker compose rm -f api frontend
        docker compose up -d api frontend
    )
)
cd /d "%SCRIPT_DIR%"

REM [4/6] DB 준비 대기
set "DB_RETRIES=0"
:WAIT_DB
if %DB_RETRIES% GEQ 30 goto DB_TIMEOUT
docker exec %PROJECT_NAME%-db mysqladmin ping -h localhost -u %DB_USER% -p%DB_PASSWORD% >nul 2>&1
if not errorlevel 1 goto DB_READY
set /a DB_RETRIES+=1
timeout /t 2 /nobreak >nul
goto WAIT_DB

:DB_TIMEOUT
echo [경고] DB 준비 타임아웃
goto SKIP_DB

:DB_READY
REM [5/6] DB 초기화 / 마이그레이션
set "USER_COUNT="
for /f "usebackq" %%c in (`docker exec %PROJECT_NAME%-db mysql --silent --skip-column-names -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% -e "SELECT COUNT(*) FROM users" 2^>nul`) do set "USER_COUNT=%%c"

if "!USER_COUNT!"=="" goto DB_INIT
if "!USER_COUNT!"=="0" goto DB_SEED_ONLY
goto DB_MIGRATE

:DB_INIT
docker exec -i %PROJECT_NAME%-db mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < "database\schema.sql"
goto DB_SEED_ONLY

:DB_SEED_ONLY
if exist "database\seed-data.sql" (
    docker exec -i %PROJECT_NAME%-db mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < "database\seed-data.sql"
)
goto SKIP_DB

:DB_MIGRATE
docker exec %PROJECT_NAME%-db mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% -e "CREATE TABLE IF NOT EXISTS _migrations (filename VARCHAR(255) PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)" >nul 2>&1
if exist "database\migrations" (
    for %%f in (database\migrations\*.sql) do (
        set "APPLIED="
        for /f %%r in ('docker exec %PROJECT_NAME%-db mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% -N -e "SELECT COUNT(*) FROM _migrations WHERE filename='%%~nxf'" 2^>nul') do set "APPLIED=%%r"
        if "!APPLIED!"=="0" (
            docker exec -i %PROJECT_NAME%-db mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < "%%f" 2>nul
            if not errorlevel 1 docker exec %PROJECT_NAME%-db mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% -e "INSERT INTO _migrations (filename) VALUES ('%%~nxf')" >nul 2>&1
        )
    )
)

:SKIP_DB

REM [6/6] 헬스체크
timeout /t 10 /nobreak >nul
set "RETRIES=0"
:HEALTH_CHECK
if %RETRIES% GEQ 15 goto HEALTH_FAIL
curl -sf http://localhost:%API_PORT%/health >nul 2>&1
if not errorlevel 1 goto HEALTH_OK
set /a RETRIES+=1
timeout /t 2 /nobreak >nul
goto HEALTH_CHECK

:HEALTH_OK
echo [%PROJECT_NAME%] 배포 완료! 웹: http://localhost:%FRONTEND_PORT%
if not "%MODE%"=="auto" pause
exit /b 0

:HEALTH_FAIL
echo [경고] API 헬스체크 실패
if not "%MODE%"=="auto" pause
exit /b 5
```

## DB 처리 전략

| 상황 | 판단 기준 | 동작 |
|------|-----------|------|
| **RESET 모드** | .deploy-mode = reset | docker compose down -v → 전체 재설치 |
| **users 쿼리 실패** | USER_COUNT = "" | DB_INIT: schema.sql + seed-data.sql |
| **users = 0** | 스키마만 있음 | DB_SEED_ONLY: seed-data.sql만 |
| **users > 0** | 운영 중인 DB | DB_MIGRATE: migrations/*.sql만 |

**중요**: `TABLE_COUNT`(테이블 개수)가 아닌 `USER_COUNT`(users 테이블 데이터)로 판단.

## 마이그레이션 파일 규칙

```
database/
├── schema.sql                    ← 전체 스키마 (CREATE TABLE)
├── seed-data.sql                 ← 초기 데이터 (선택)
└── migrations/                   ← 변경분 (순서대로 적용)
    ├── 001_add_timezone.sql
    ├── 002_add_task_requests.sql
    └── 003_add_report_schedule.sql
```

- 파일명은 `숫자_설명.sql` 형식 (순서 보장)
- `_migrations` 테이블이 적용 이력을 추적 → 중복 적용 방지
- 마이그레이션 SQL은 **멱등성** 권장 (`IF NOT EXISTS`, `IF EXISTS` 사용)

## DeployMonitor 연동 설정

```
D:\deploy\bizmanagement\           ← 배포 폴더
├── deploy.bat                     ← 자동 배포 스크립트
├── backend/
├── frontend/
├── database/
│   ├── schema.sql
│   ├── seed-data.sql
│   └── migrations/
├── docker-images/
│   ├── docker-compose.yml
│   └── .env
└── ...
```
