# server/win32_helper.ps1
# Windows API Helper for AETHER CONTROL — Power, Screen Wake, Input, Process Listing

param (
    [string]$Action = "wake",
    [int]$X = 0,
    [int]$Y = 0,
    [double]$Px = -1.0,
    [double]$Py = -1.0,
    [string]$Button = "left"
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace AetherControl
{
    public class Win32Helper
    {
        [DllImport("user32.dll")]
        public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll")]
        public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int info);

        [DllImport("user32.dll")]
        public static extern bool SetCursorPos(int x, int y);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        public static extern int SetThreadExecutionState(int esFlags);

        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        public static extern IntPtr GetDesktopWindow();
    }
}
"@ -ErrorAction SilentlyContinue

switch ($Action) {
    "wake" {
        # Keep awake (ES_CONTINUOUS 0x80000000 | ES_DISPLAY_REQUIRED 2 | ES_SYSTEM_REQUIRED 1 = 0x80000003)
        [AetherControl.Win32Helper]::SetThreadExecutionState(-2147483645) | Out-Null
        # Jiggle cursor to trigger Windows display wake
        [AetherControl.Win32Helper]::mouse_event(0x0001, 1, 1, 0, 0)
        [AetherControl.Win32Helper]::mouse_event(0x0001, -1, -1, 0, 0)
        Write-Output "WAKE_OK"
    }
    "click" {
        Add-Type -AssemblyName System.Windows.Forms
        if ($Px -ge 0 -and $Py -ge 0) {
            $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
            $X = [math]::Round($bounds.Width * $Px)
            $Y = [math]::Round($bounds.Height * $Py)
        }
        [AetherControl.Win32Helper]::SetCursorPos($X, $Y) | Out-Null
        if ($Button -eq "right") {
            [AetherControl.Win32Helper]::mouse_event(0x0008, 0, 0, 0, 0) # Right Down
            [AetherControl.Win32Helper]::mouse_event(0x0010, 0, 0, 0, 0) # Right Up
        } else {
            [AetherControl.Win32Helper]::mouse_event(0x0002, 0, 0, 0, 0) # Left Down
            [AetherControl.Win32Helper]::mouse_event(0x0004, 0, 0, 0, 0) # Left Up
        }
        Write-Output "CLICK_OK"
    }
    "scroll" {
        if ($Px -ge 0 -and $Py -ge 0) {
            Add-Type -AssemblyName System.Windows.Forms
            $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
            $targetX = [math]::Round($bounds.Width * $Px)
            $targetY = [math]::Round($bounds.Height * $Py)
            [AetherControl.Win32Helper]::SetCursorPos($targetX, $targetY) | Out-Null
        }
        # $Y is scroll delta (positive = up, negative = down)
        [AetherControl.Win32Helper]::mouse_event(0x0800, 0, 0, $Y, 0)
        Write-Output "SCROLL_OK"
    }
    "move" {
        Add-Type -AssemblyName System.Windows.Forms
        if ($Px -ge 0 -and $Py -ge 0) {
            $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
            $X = [math]::Round($bounds.Width * $Px)
            $Y = [math]::Round($bounds.Height * $Py)
        }
        [AetherControl.Win32Helper]::SetCursorPos($X, $Y) | Out-Null
        Write-Output "MOVE_OK"
    }
    "keepawake" {
        [AetherControl.Win32Helper]::SetThreadExecutionState(-2147483645) | Out-Null
        Write-Output "KEEPAWAKE_OK"
    }
}
