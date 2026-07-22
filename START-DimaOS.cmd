@echo off
setlocal
title DimaOS 11
cd /d "%~dp0"

set "NODE=C:\Users\MaxxPC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "SERVER=%~dp0server.mjs"

if not exist "%NODE%" goto node_missing
if not exist "%SERVER%" goto server_missing

echo.
echo ========================================
echo          Starting DimaOS 11
echo ========================================
echo.
echo Open: http://127.0.0.1:4173
echo Keep this window open while using DimaOS.
echo Press Ctrl+C to stop.
echo.

if "%DIMAOS_NO_BROWSER%"=="1" goto run_server
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:4173'"

:run_server
"%NODE%" "%SERVER%"
goto finished

:node_missing
echo ERROR: Built-in Node.js was not found.
echo Expected file:
echo %NODE%
pause
exit /b 1

:server_missing
echo ERROR: DimaOS server was not found.
echo Expected file:
echo %SERVER%
pause
exit /b 1

:finished
echo.
echo DimaOS server stopped.
pause
endlocal
