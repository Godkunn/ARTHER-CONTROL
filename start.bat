@echo off
cd /d "%~dp0"

title AETHER CONTROL - Ultra-Low Latency Cockpit ^& Remote Orchestrator
cls
color 0B

echo ===============================================================================
echo                AA   EEEEEE TTTTTT HH  HH EEEEEE RRRRR  
echo               AAAA  EE       TT   HH  HH EE     RR  RR 
echo              AA  AA EEEE     TT   HHHHHH EEEE   RRRRR  
echo              AAAAAA EE       TT   HH  HH EE     RR  RR 
echo              AA  AA EEEEEE   TT   HH  HH EEEEEE RR   RR
echo.
echo           A E T H E R   C O N T R O L   --   v 2 . 5 . 0
echo       Ultra-Fast Native C# Engine + Zero-Latency Cockpit
echo ===============================================================================
echo.

echo [*] Terminating lingering background engines...
taskkill /F /IM input_daemon.exe 2>nul
taskkill /F /IM node.exe 2>nul
timeout /t 1 /nobreak >nul

echo [*] Optimizing Network Route (Wi-Fi priority for zero data consumption)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$wifi = Get-NetIPInterface -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like '*Wi-Fi*' -or $_.InterfaceAlias -like '*Wireless*' }; if ($wifi) { Set-NetIPInterface -InterfaceIndex $wifi.InterfaceIndex -InterfaceMetric 15 -ErrorAction SilentlyContinue }; $usb = Get-NetIPInterface -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like '*Ethernet*' -or $_.InterfaceAlias -like '*NDIS*' -or $_.InterfaceAlias -like '*USB*' }; if ($usb) { Set-NetIPInterface -InterfaceIndex $usb.InterfaceIndex -InterfaceMetric 80 -ErrorAction SilentlyContinue }" >nul 2>&1

echo [*] Compiling Native C# Input ^& Fast Screen Capture Daemon...
if exist "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe" (
    "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe" /nologo /optimize /out:server\input_daemon.exe server\input_daemon.cs >nul 2>&1
    if errorlevel 1 (
        echo [!] Notice: Using precompiled daemon engine.
    ) else (
        echo [OK] Native C# Daemon compiled successfully.
    )
) else (
    echo [!] .NET Framework Compiler not in default path, using existing executable.
)

if not exist "dist\index.html" (
    echo [*] Building Production Client Assets...
    call npm run build
)

echo.
echo [*] Launching Aether Server Engine...
echo.
call node server/server.js
pause
