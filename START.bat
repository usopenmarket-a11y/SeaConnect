@echo off
setlocal enabledelayedexpansion
title SeaConnect Dev Launcher
chcp 65001 >nul 2>&1

cd /d "%~dp0"

call :print_header

:: ── 1. Docker running? ────────────────────────────────────────────────────────
docker info >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Docker Desktop is not running."
    echo  Please start Docker Desktop then run this file again.
    echo.
    pause
    exit /b 1
)
call :print_ok "Docker is running"

:: ── 2. .env.dev present? ──────────────────────────────────────────────────────
if not exist ".env.dev" (
    call :print_warn ".env.dev not found -- creating from defaults..."
    call :create_env_dev
)
call :print_ok ".env.dev present"

:: ── 3. Route command ──────────────────────────────────────────────────────────
set "CMD=%~1"
if /i "%CMD%"==""          goto :do_start
if /i "%CMD%"=="start"     goto :do_start
if /i "%CMD%"=="build"     goto :do_start
if /i "%CMD%"=="rebuild"   goto :do_rebuild
if /i "%CMD%"=="stop"      goto :do_stop
if /i "%CMD%"=="restart"   goto :do_restart
if /i "%CMD%"=="logs"      goto :do_logs
if /i "%CMD%"=="status"    goto :do_status
if /i "%CMD%"=="shell"     goto :do_shell
if /i "%CMD%"=="clean"     goto :do_clean

call :print_error "Unknown command: %CMD%"
call :print_usage
pause
exit /b 1

:: ==============================================================================
:do_start
:: If already running, stop first to avoid port conflicts.
docker compose ps --services --filter "status=running" 2>nul | findstr /r "." >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    call :print_warn "SeaConnect is already running -- stopping first..."
    docker compose down
    call :print_ok "Stopped. Restarting now..."
)

echo.
call :print_step "Building images (cache-aware, skips unchanged layers)..."
docker compose build
if %errorlevel% neq 0 (
    call :print_error "Build failed. See errors above."
    pause
    exit /b 1
)

echo.
call :print_step "Starting all services..."
docker compose up -d
if %errorlevel% neq 0 (
    call :print_error "Failed to start containers. See errors above."
    pause
    exit /b 1
)

goto :wait_and_show

:: ==============================================================================
:do_rebuild
:: Force-rebuild every layer from scratch.
docker compose ps --services --filter "status=running" 2>nul | findstr /r "." >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    call :print_warn "Stopping running stack before rebuild..."
    docker compose down
)

echo.
call :print_step "Force-rebuilding all images from scratch (no cache)..."
docker compose build --no-cache
if %errorlevel% neq 0 (
    call :print_error "Rebuild failed. See errors above."
    pause
    exit /b 1
)

echo.
call :print_step "Starting all services..."
docker compose up -d
if %errorlevel% neq 0 (
    call :print_error "Failed to start containers."
    pause
    exit /b 1
)

goto :wait_and_show

:: ==============================================================================
:do_stop
echo.
call :print_step "Stopping all SeaConnect containers..."
docker compose down
call :print_ok "Stopped."
echo.
pause
exit /b 0

:: ==============================================================================
:do_restart
echo.
call :print_step "Stopping containers..."
docker compose down
echo.
call :print_step "Building and restarting..."
docker compose build
docker compose up -d
goto :wait_and_show

:: ==============================================================================
:do_logs
echo.
call :print_step "Streaming logs -- press Ctrl+C to stop..."
echo.
docker compose logs -f
pause
exit /b 0

:: ==============================================================================
:do_status
echo.
docker compose ps
echo.
pause
exit /b 0

:: ==============================================================================
:do_shell
echo.
call :print_step "Opening bash shell in API container..."
docker compose exec api bash
exit /b 0

:: ==============================================================================
:do_clean
echo.
echo  +----------------------------------------------------------+
echo  ^|  WARNING: This deletes ALL data including the database.  ^|
echo  +----------------------------------------------------------+
echo.
set /p "CONFIRM=Type YES to confirm, anything else cancels: "
if /i not "!CONFIRM!"=="YES" (
    echo  Cancelled.
    pause
    exit /b 0
)
echo.
call :print_step "Removing containers and volumes..."
docker compose down -v --remove-orphans
call :print_ok "Clean done. Run START.bat to start fresh."
echo.
pause
exit /b 0

:: ==============================================================================
:wait_and_show
echo.
call :print_step "Waiting for services to be healthy..."

set /a TRIES=0

:_poll
set /a TRIES+=1
if %TRIES% gtr 45 goto :_poll_timeout

docker compose ps web 2>nul | findstr /i "running\|Up " >nul 2>&1
if %errorlevel% equ 0 goto :_ready

<nul set /p "=."
timeout /t 2 /nobreak >nul
goto :_poll

:_poll_timeout
echo.
call :print_warn "Containers are taking longer than expected."
call :print_warn "Run  START.bat logs  to watch the boot sequence."
goto :_print_table

:_ready
echo.
call :print_ok "All services are up!"

:_print_table
echo.
echo  +================================================================+
echo  ^|            SeaConnect is running                              ^|
echo  +================================================================+
echo  ^|                                                                ^|
echo  ^|   CUSTOMER WEB  --^>  http://localhost:3010/ar                 ^|
echo  ^|   DJANGO API    --^>  http://localhost:8010/api/v1/            ^|
echo  ^|   DJANGO ADMIN  --^>  http://localhost:8010/admin/             ^|
echo  ^|                                                                ^|
echo  ^|   pgAdmin       --^>  http://localhost:5051                    ^|
echo  ^|   MinIO Console --^>  http://localhost:9011                    ^|
echo  ^|   Mailpit       --^>  http://localhost:8026                    ^|
echo  ^|   Ollama        --^>  http://localhost:11435                   ^|
echo  ^|                                                                ^|
echo  +----------------------------------------------------------------+
echo  ^|   Credentials                                                  ^|
echo  ^|   App login   --^>  admin@seaconnect.local / admin123          ^|
echo  ^|   pgAdmin     --^>  admin@local.dev / admin                    ^|
echo  ^|   MinIO       --^>  minioadmin / minioadmin                    ^|
echo  ^|   PostgreSQL  --^>  localhost:5433  sc_user / localpassword    ^|
echo  ^|   Redis       --^>  localhost:6380                             ^|
echo  +----------------------------------------------------------------+
echo  ^|   Commands                                                     ^|
echo  ^|     START.bat           -- smart start (stops if running)     ^|
echo  ^|     START.bat rebuild   -- force rebuild from scratch         ^|
echo  ^|     START.bat stop      -- stop all containers                ^|
echo  ^|     START.bat restart   -- stop + rebuild + start             ^|
echo  ^|     START.bat logs      -- stream all logs                    ^|
echo  ^|     START.bat status    -- show container status              ^|
echo  ^|     START.bat shell     -- bash shell in API container        ^|
echo  ^|     START.bat clean     -- wipe everything (deletes DB)       ^|
echo  +================================================================+
echo.

start "" "http://localhost:3010/ar"

echo  Browser opened. Press any key to stream logs (Ctrl+C to detach)...
pause >nul
docker compose logs -f
exit /b 0

:: ==============================================================================
:: Subroutines
:: ==============================================================================

:print_header
echo.
echo  +----------------------------------------------------------------+
echo  ^|  SeaConnect -- Egypt's Maritime Leisure Platform              ^|
echo  ^|  Local Dev Stack  ^|  docker compose  ^|  WSL2 + Docker Desktop ^|
echo  +----------------------------------------------------------------+
echo.
goto :eof

:print_step
echo  [....] %~1
goto :eof

:print_ok
echo  [ OK ] %~1
goto :eof

:print_warn
echo  [WARN] %~1
goto :eof

:print_error
echo.
echo  [FAIL] %~1
echo.
goto :eof

:print_usage
echo.
echo  Usage:  START.bat [command]
echo.
echo    (no arg)   Smart start -- stops if running, then builds and starts
echo    build      Same as no arg
echo    rebuild    Force rebuild ALL layers from scratch
echo    stop       Stop all containers
echo    restart    Stop, rebuild, start
echo    logs       Stream logs from all containers
echo    status     Show container status table
echo    shell      Open bash inside the API container
echo    clean      Destroy containers + volumes (DELETES DATABASE)
echo.
goto :eof

:create_env_dev
(
echo # SeaConnect Development Environment
echo # Generated by START.bat
echo.
echo DJANGO_ENV=development
echo DJANGO_SETTINGS_MODULE=config.settings.dev
echo DJANGO_SECRET_KEY=dev-secret-key-change-this-in-production
echo DEBUG=True
echo ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,api
echo.
echo DATABASE_URL=postgresql://sc_user:localpassword@db:5432/seaconnect_dev
echo.
echo REDIS_URL=redis://redis:6379/0
echo CELERY_BROKER_URL=redis://redis:6379/0
echo CELERY_RESULT_BACKEND=redis://redis:6379/1
echo.
echo AWS_ACCESS_KEY_ID=minioadmin
echo AWS_SECRET_ACCESS_KEY=minioadmin
echo AWS_STORAGE_BUCKET_NAME=seaconnect-dev
echo AWS_S3_ENDPOINT_URL=http://minio:9000
echo AWS_S3_USE_SSL=False
echo.
echo FAWRY_MERCHANT_CODE=sandbox_merchant
echo FAWRY_SECURITY_KEY=sandbox_key
echo FAWRY_BASE_URL=https://atfawry.fawrystaging.com
echo.
echo EMAIL_HOST=mailpit
echo EMAIL_PORT=1025
echo EMAIL_USE_TLS=False
echo EMAIL_HOST_USER=
echo EMAIL_HOST_PASSWORD=
echo DEFAULT_FROM_EMAIL=noreply@seaconnect.local
echo.
echo JWT_PRIVATE_KEY_PATH=/app/keys/jwt_private.pem
echo JWT_PUBLIC_KEY_PATH=/app/keys/jwt_public.pem
echo JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
echo JWT_REFRESH_TOKEN_LIFETIME_DAYS=30
echo.
echo OLLAMA_BASE_URL=http://ollama:11434
echo OPENAI_API_KEY=
echo.
echo CORS_ALLOWED_ORIGINS=http://localhost:3010,http://localhost:3011
echo NEXT_PUBLIC_API_URL=http://localhost:8010
echo.
echo MIXPANEL_TOKEN=
echo SENTRY_DSN=
) > .env.dev
call :print_ok ".env.dev created"
goto :eof
