@echo off
setlocal EnableExtensions
title AI Talent Copilot Launcher

set "PROJECT_DIR=%~dp0"
set "APP_URL=http://localhost:3000"
cd /d "%PROJECT_DIR%"

echo.
echo ==================================================
echo          AI Talent Copilot One-click Launcher
echo ==================================================
echo.

if not exist "package.json" (
  echo [ERROR] package.json was not found in this folder.
  goto :FAIL
)

where node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 20 or newer is required.
  echo Download: https://nodejs.org/
  goto :FAIL
)

set "PACKAGE_MANAGER="
where pnpm.cmd >nul 2>nul
if not errorlevel 1 set "PACKAGE_MANAGER=pnpm.cmd"

if not defined PACKAGE_MANAGER (
  where corepack.cmd >nul 2>nul
  if not errorlevel 1 set "PACKAGE_MANAGER=corepack.cmd pnpm"
)

if not defined PACKAGE_MANAGER (
  echo [ERROR] pnpm or Corepack was not found.
  echo Install a current Node.js release and try again.
  goto :FAIL
)

if not exist ".env" (
  echo [SETUP] Creating .env from .env.example...
  copy /Y ".env.example" ".env" >nul
  if errorlevel 1 goto :FAIL
  echo [INFO] Mock Demo mode is active. Edit .env later to enable DeepSeek.
)

if not exist "node_modules" (
  echo [FIRST RUN] Installing dependencies. This may take a few minutes...
  call %PACKAGE_MANAGER% install
  if errorlevel 1 goto :FAIL
)

if exist "prisma\dev.db" (
  echo [SETUP] Verifying the database schema and Prisma client...
) else (
  echo [FIRST RUN] Initializing an empty recruitment database...
)
call %PACKAGE_MANAGER% run db:setup
if errorlevel 1 goto :FAIL

if /I "%~1"=="--check" (
  echo [READY] Startup environment check passed.
  exit /b 0
)

set "LOCAL_PROVIDER=mock"
set "LOCAL_MODEL="
for /f "tokens=1,* delims==" %%A in ('findstr /B /C:"LLM_PROVIDER=" ".env"') do set "LOCAL_PROVIDER=%%~B"
for /f "tokens=1,* delims==" %%A in ('findstr /B /C:"LLM_MODEL=" ".env"') do set "LOCAL_MODEL=%%~B"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-RestMethod -Uri '%APP_URL%/api/settings/provider' -TimeoutSec 2; if ($r.provider -ne '%LOCAL_PROVIDER%') { exit 2 }; if ('%LOCAL_PROVIDER%' -ne 'mock' -and $r.model -ne '%LOCAL_MODEL%') { exit 2 }; exit 0 } catch { exit 1 }" >nul 2>nul
set "SERVER_CHECK=%ERRORLEVEL%"
if "%SERVER_CHECK%"=="0" goto :OPEN_APP
if "%SERVER_CHECK%"=="2" (
  echo [ERROR] Port 3000 is already used by another AI Talent Copilot configuration.
  echo Close the existing server window, then double-click this launcher again.
  goto :FAIL
)

echo [START] Starting AI Talent Copilot...
start "AI Talent Copilot Server - close this window to stop" cmd.exe /k "cd /d ""%PROJECT_DIR%"" && %PACKAGE_MANAGER% dev"

echo [WAIT] Waiting for the application to become ready...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(120); do { try { $r = Invoke-RestMethod -Uri '%APP_URL%/api/health' -TimeoutSec 2; if ($r.ok) { exit 0 } } catch {}; Start-Sleep -Milliseconds 800 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
  echo [ERROR] The server did not become ready within 120 seconds.
  echo Check the AI Talent Copilot Server window for details.
  goto :FAIL
)

:OPEN_APP
echo [READY] Opening AI Talent Copilot in your browser...
start "" "%APP_URL%"
timeout /t 2 /nobreak >nul
exit /b 0

:FAIL
echo.
echo Startup did not complete. Review the message above.
pause
exit /b 1
