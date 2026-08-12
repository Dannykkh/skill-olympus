@echo off
REM Backward-compatible alias for the default copy-based installation.
call "%~dp0install.bat" %*
exit /b %ERRORLEVEL%
