# 배치 스크립트 템플릿

## install.bat (처음 설치)

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

## update.bat (이미지만 업데이트, DB 유지)

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

## reset.bat (완전 초기화)

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

echo [1/4] Docker 실행 상태 확인 중...
docker info >nul 2>&1
if errorlevel 1 (
    echo [오류] Docker가 실행되고 있지 않습니다.
    pause
    exit /b 1
)

echo [2/4] 기존 서비스 및 데이터 삭제 중...
docker-compose down -v

echo [3/4] Docker 이미지 로드 중...
if exist "!PROJECT_NAME!-all.tar" (
    docker load -i "!PROJECT_NAME!-all.tar"
) else if exist "!PROJECT_NAME!-api.tar" (
    docker load -i "!PROJECT_NAME!-api.tar"
    docker load -i "!PROJECT_NAME!-frontend.tar"
)

echo [4/4] 서비스 시작 중...
docker pull mysql:8.0 >nul 2>&1
docker-compose up -d

echo.
echo 서비스 초기화 대기 중... (약 30초)
timeout /t 30 /nobreak >nul

echo.
echo ============================================
echo   초기화 완료!
echo ============================================

endlocal
pause
```

## docker-build-images.bat

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM 프로젝트명 설정
for %%I in (.) do set "PROJECT_NAME=%%~nxI"
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        if "%%a"=="PROJECT_NAME" set "PROJECT_NAME=%%b"
    )
)

echo ============================================
echo   !PROJECT_NAME! Docker Image Build
echo ============================================

docker info >nul 2>&1 || (echo [ERROR] Docker 미실행 & pause & exit /b 1)

if not exist "docker-images" mkdir docker-images

echo [1/7] Building Backend API image...
docker build -t !PROJECT_NAME!-api:latest -f backend/Dockerfile --target production backend/
if errorlevel 1 (echo [ERROR] Backend build failed. & pause & exit /b 1)

echo [2/7] Building Frontend image...
docker build -t !PROJECT_NAME!-frontend:latest -f frontend/Dockerfile --target production --build-arg "VITE_API_URL=" frontend/
if errorlevel 1 (echo [ERROR] Frontend build failed. & pause & exit /b 1)

echo [3/7] Saving images to tar file...
docker save !PROJECT_NAME!-api:latest !PROJECT_NAME!-frontend:latest -o docker-images/!PROJECT_NAME!-all.tar

echo [4/7] Copying deployment files...
if exist "database\schema.sql" copy /Y database\schema.sql docker-images\schema.sql >nul
if exist "database\seed-data.sql" copy /Y database\seed-data.sql docker-images\seed-data.sql >nul

echo [5/7] DB 덤프 추출 중 (full-dump.sql)...
for /f %%i in ('docker ps --filter "name=!PROJECT_NAME!-db" --filter "status=running" -q 2^>nul') do set "DB_RUNNING=%%i"
if defined DB_RUNNING (
    docker exec !PROJECT_NAME!-db sh -c "mysqldump -u root -p\$MYSQL_ROOT_PASSWORD --routines --triggers --events --single-transaction \$MYSQL_DATABASE" > docker-images/full-dump.sql 2>nul
)

echo [6/7] Verifying output files...
for %%f in (docker-images\*) do echo     %%~nxf  (%%~zf bytes)

echo [7/7] ZIP 배포 파일 생성 중...
powershell -Command "Compress-Archive -Path 'docker-images\*' -DestinationPath '!PROJECT_NAME!-docker-deploy.zip' -Force"

echo ============================================
echo   Build Complete!
echo ============================================

endlocal
pause
```

## logs.bat

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (set "%%a=%%b")
)

echo !PROJECT_NAME! 로그 보기
echo [1] 전체  [2] API  [3] Frontend  [4] DB
set /p "CHOICE=선택: "

if "%CHOICE%"=="1" docker-compose logs -f
if "%CHOICE%"=="2" docker-compose logs -f api
if "%CHOICE%"=="3" docker-compose logs -f frontend
if "%CHOICE%"=="4" docker-compose logs -f db
```
