@echo off
setlocal
set "NODE22_RUNTIME=%~dp0..\.tools\node22"
if not exist "%NODE22_RUNTIME%\node.exe" (
  echo Project Node 22 is missing. Run powershell -NoProfile -File scripts\setup-node22.ps1 first.
  exit /b 1
)
set "PATH=%NODE22_RUNTIME%;%PATH%"
if "%~1"=="" (
  "%NODE22_RUNTIME%\node.exe" --version
  exit /b
)
call %*
exit /b %errorlevel%
