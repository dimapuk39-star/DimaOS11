@echo off
setlocal
title Dima AI Setup
echo.
echo ========================================
echo          Dima AI - OpenAI Setup
echo ========================================
echo.
echo Your API key will be stored in your Windows user environment.
echo It will never be included in the DimaOS browser code.
echo.
set /p "DIMA_KEY=Paste your OpenAI API key: "
if "%DIMA_KEY%"=="" goto missing
setx OPENAI_API_KEY "%DIMA_KEY%" >nul
echo.
echo OpenAI API key saved.
echo Close all DimaOS windows and start DimaOS again.
pause
exit /b 0

:missing
echo.
echo No key was entered. Nothing was changed.
pause
exit /b 1
