@echo off
REM Backward-compatible alias for the supported uninstall mode.
call "%~dp0install.bat" --uninstall %*
exit /b %ERRORLEVEL%
