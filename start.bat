@echo off
title AETHER CONTROL
cd /d "%~dp0"
echo ===================================================
echo             AETHER CONTROL STARTUP
echo ===================================================
call npm run build
call node server/server.js
pause
