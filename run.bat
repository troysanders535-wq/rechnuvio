@echo off
setlocal enabledelayedexpansion
title Digital ToolPad - Local Server Runner

:: Ensure current working directory is the project directory
cd /d "%~dp0"

echo =====================================================================
echo                DIGITAL TOOLPAD - LOCAL RUNNER
echo =====================================================================
echo.

:: 1. Verify Node.js installation
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

:: 2. Check if dependencies are installed
if not exist "node_modules\" (
    echo [INFO] node_modules directory not found.
    echo Installing dependencies via npm install...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Please check your internet connection.
        pause
        exit /b 1
    )
    echo [INFO] Dependencies installed successfully.
    echo.
)

:: 3. Clear lingering process on port 3100 if any
set "FOUND_PID="
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr /r /c:":3100 .*LISTENING"') do (
    set "FOUND_PID=%%a"
)
if defined FOUND_PID (
    echo [INFO] Clearing previous process on port 3100 [PID !FOUND_PID!]...
    taskkill /PID !FOUND_PID! /F >nul 2>&1
    timeout /t 1 /nobreak >nul
)

echo.
echo Please select run mode:
echo   [1] Development Server [Hot-reload, instant code updates, Port 3100]
echo   [2] Fast Production Server [Start existing build, Port 3100]
echo   [3] Rebuild Production and Start [Full optimization, Port 3100]
echo   [4] Run Multilingual Audit Tests [Verify EN and DE routing]
echo.
echo Press 1, 2, 3, or 4 [Defaults to 1 in 5 seconds]:

choice /c 1234 /n /t 5 /d 1 /m "Your choice [1-4]: "
set "MODE=%errorlevel%"

echo.
echo ---------------------------------------------------------------------
echo Local URLs available once server starts:
echo   - English Website:   http://localhost:3100
echo   - German Website:    http://localhost:3100?locale=de
echo   - English Domain:    http://en.localhost:3100
echo   - German Domain:     http://de.localhost:3100
echo   - 2026 Calendar DE:  http://localhost:3100/tools/2026-calendar?locale=de
echo ---------------------------------------------------------------------
echo.

:: Launch browser in background after short delay
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3100"

if "!MODE!"=="1" (
    echo [INFO] Starting Development Server on port 3100...
    call npm run dev -- -p 3100
)

if "!MODE!"=="2" (
    if not exist ".next\" (
        echo [INFO] Production build not found. Running npm run build first...
        call npm run build
    )
    echo [INFO] Starting Production Server on port 3100...
    call npm run start -- -p 3100
)

if "!MODE!"=="3" (
    echo [INFO] Building production bundle...
    call npm run build
    if !errorlevel! equ 0 (
        echo [INFO] Starting Production Server on port 3100...
        call npm run start -- -p 3100
    ) else (
        echo [ERROR] Build failed.
    )
)

if "!MODE!"=="4" (
    echo [INFO] Running Multilingual Audit Tests...
    node scripts/verify_localization.js
)

echo.
echo Server or test has stopped.
pause
