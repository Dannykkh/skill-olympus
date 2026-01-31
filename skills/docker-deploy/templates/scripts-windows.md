# Windows Scripts (.bat)

## docker-build-images.bat

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   {Project} Docker Image Build
echo ============================================
echo.

docker info >nul 2>&1 || (echo [ERROR] Docker is not running. & exit /b 1)

if not exist "docker-images" mkdir docker-images

echo [1/4] Building Backend API image...
docker build -t {project}-api:latest -f backend/Dockerfile --target production backend/
if errorlevel 1 exit /b 1

echo [2/4] Building Frontend image...
docker build -t {project}-frontend:latest -f frontend/Dockerfile --target production frontend/
if errorlevel 1 exit /b 1

echo [3/4] Saving images to tar file...
docker save {project}-api:latest {project}-frontend:latest -o docker-images/{project}-all.tar

echo [4/4] Copying deployment files...
if exist database\schema.sql copy database\schema.sql docker-images\ >nul
if exist database\migrate.sql copy database\migrate.sql docker-images\ >nul

echo.
echo Build Complete! Output: docker-images\
echo.
endlocal
```

## docker-images/install.bat

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"
set "MODE=%~1"
if "%MODE%"=="" set "MODE=install"

echo.
echo ============================================
if "%MODE%"=="update" (echo   {Project} Update) else if "%MODE%"=="reset" (echo   {Project} Reset) else (echo   {Project} Install)
echo ============================================

:: Docker check
docker info >nul 2>&1 || (echo [ERROR] Docker not running. & pause & exit /b 1)

:: Reset mode
if "%MODE%"=="reset" (
    set /p "CONFIRM=Delete all data? (yes/no): "
    if /i not "!CONFIRM!"=="yes" (echo Cancelled. & pause & exit /b 0)
    docker-compose down -v >nul 2>&1
)
if "%MODE%"=="update" docker-compose down >nul 2>&1
docker rmi {project}-api:latest {project}-frontend:latest >nul 2>&1

:: Load images
if exist "%SCRIPT_DIR%{project}-all.tar" (
    echo Loading images...
    docker load -i "%SCRIPT_DIR%{project}-all.tar"
) else (
    echo [ERROR] {project}-all.tar not found. & pause & exit /b 1
)

:: Pull base images
docker image inspect mysql:8.0 >nul 2>&1 || docker pull mysql:8.0
docker image inspect redis:7-alpine >nul 2>&1 || docker pull redis:7-alpine

:: Start services
docker-compose up -d

echo.
echo ============================================
echo   Complete!
echo ============================================
echo   Web: http://localhost:8960
echo   API: http://localhost:8950/docs
echo.
endlocal
pause
```

## docker-images/update.bat

```batch
@echo off
call "%~dp0install.bat" update
```

## docker-images/reset.bat

```batch
@echo off
call "%~dp0install.bat" reset
```

## docker-images/logs.bat

```batch
@echo off
cd /d "%~dp0"
docker-compose logs -f
```

## docker-images/cleanup.bat

```batch
@echo off
chcp 65001 >nul
echo Cleaning Docker resources...
docker container prune -f
docker image prune -f
docker volume prune -f
echo Done!
pause
```
