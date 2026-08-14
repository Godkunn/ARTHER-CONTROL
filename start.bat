@echo off
title AETHER CONTROL v2.5.0
cd /d "%~dp0"
cls
echo =================================================================
echo                    AETHER CONTROL v2.5.0
echo       Ultra-Low Latency Cockpit ^& Remote Orchestrator
echo =================================================================
echo.
echo [*] Starting Native Aether Engine...
call node server/server.js
pause
