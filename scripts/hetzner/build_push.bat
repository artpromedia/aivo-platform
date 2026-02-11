@echo off
setlocal enabledelayedexpansion

set SERVICES=consent-svc profile-svc content-svc assessment-svc personalization-svc life-skills-svc ai-orchestrator analytics-svc notify-svc messaging-svc goal-svc focus-svc billing-svc payments-svc parent-svc baseline-svc

set /a COUNT=0
set /a TOTAL=16
set SUCCEEDED=
set FAILED=

echo ============================================================
echo   Building ^& pushing 16 remaining services to GHCR
echo   (auth-svc, session-svc already pushed)
echo ============================================================

for %%s in (%SERVICES%) do (
    set /a COUNT+=1
    set IMG=ghcr.io/artpromedia/aivo-%%s:latest
    echo.
    echo [!COUNT!/%TOTAL%] Building %%s...
    
    docker build --file docker\Dockerfile.service --build-arg SERVICE_NAME=%%s --tag !IMG! --platform linux/amd64 --progress=plain . >nul 2>&1
    
    REM Check if image exists regardless of exit code
    for /f %%i in ('docker images -q !IMG!') do (
        echo   Built. Pushing...
        docker push !IMG! >nul 2>&1
        if !errorlevel! equ 0 (
            echo   Done %%s
            set SUCCEEDED=!SUCCEEDED! %%s
        ) else (
            echo   PUSH FAILED %%s
            set FAILED=!FAILED! %%s
        )
    )
)

echo.
echo ============================================================
echo   COMPLETE
echo   Succeeded: %SUCCEEDED%
echo   Failed: %FAILED%
echo ============================================================
