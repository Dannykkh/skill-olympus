@echo off
setlocal
set "OLYMPUS_PORTABLE_RUNTIME=openclaw"
call "%~dp0install-portable-host.bat" %*
exit /b %ERRORLEVEL%
