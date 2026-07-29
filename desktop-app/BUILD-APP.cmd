@echo off
setlocal
cd /d "%~dp0"
set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%CSC%" (
  echo C# compiler was not found.
  pause
  exit /b 1
)
"%CSC%" /nologo /target:winexe /optimize+ /platform:anycpu /reference:System.dll /reference:System.Windows.Forms.dll /out:DimaOS11.exe DimaOSLauncher.cs
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
echo DimaOS11.exe was created successfully.
pause
