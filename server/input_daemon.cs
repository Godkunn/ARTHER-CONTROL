using System;
using System.IO;
using System.Text;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Threading;
using System.Diagnostics;
using System.Collections.Generic;

namespace AetherControl
{
    class InputDaemon
    {
        [DllImport("user32.dll")]
        static extern bool SetProcessDPIAware();

        [DllImport("user32.dll")]
        static extern bool SetCursorPos(int X, int Y);

        [DllImport("user32.dll")]
        static extern void mouse_event(int flags, int dx, int dy, int cButtons, int info);

        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

        [DllImport("user32.dll")]
        static extern uint MapVirtualKey(uint uCode, uint uMapType);

        [DllImport("kernel32.dll", SetLastError = true)]
        static extern int SetThreadExecutionState(int esFlags);

        [DllImport("user32.dll")]
        static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll", SetLastError = true)]
        static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

        [DllImport("user32.dll", SetLastError = true)]
        static extern bool SetThreadDesktop(IntPtr hDesktop);

        [DllImport("user32.dll", SetLastError = true)]
        static extern bool CloseDesktop(IntPtr hDesktop);

        [DllImport("user32.dll")]
        static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

        [DllImport("psapi.dll")]
        static extern int EmptyWorkingSet(IntPtr hwProc);

        [DllImport("kernel32.dll")]
        static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, uint dwProcessId);

        [DllImport("kernel32.dll")]
        static extern bool CloseHandle(IntPtr hObject);

        const uint PROCESS_ALL_ACCESS = 0x1F0FFF;
        const uint PROCESS_SET_QUOTA = 0x0100;
        const uint PROCESS_QUERY_INFORMATION = 0x0400;

        [StructLayout(LayoutKind.Sequential)]
        struct INPUT
        {
            public uint type;
            public InputUnion u;
        }

        [StructLayout(LayoutKind.Explicit)]
        struct InputUnion
        {
            [FieldOffset(0)] public MOUSEINPUT mi;
            [FieldOffset(0)] public KEYBDINPUT ki;
            [FieldOffset(0)] public HARDWAREINPUT hi;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct KEYBDINPUT
        {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
        [StructLayout(LayoutKind.Sequential)]
        struct HARDWAREINPUT { public uint uMsg; public ushort wParamL; public ushort wParamH; }

        [DllImport("user32.dll", SetLastError = true)]
        static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        const uint INPUT_KEYBOARD = 1;
        const uint KEYEVENTF_UNICODE = 0x0004;

        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        [DllImport("user32.dll")]
        static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll", SetLastError = true)]
        static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll")]
        static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);
        const uint GW_OWNER = 4;

        [DllImport("user32.dll")]
        static extern int GetWindowLong(IntPtr hWnd, int nIndex);
        const int GWL_EXSTYLE = -20;
        const int WS_EX_TOOLWINDOW = 0x00000080;
        const int WS_EX_APPWINDOW = 0x00040000;

        const uint WM_SYSCOMMAND = 0x0112;
        const int SC_MONITORPOWER = 0xF170;
        static readonly IntPtr HWND_BROADCAST = new IntPtr(0xffff);

        const int MOUSEEVENTF_MOVE = 0x0001;
        const int MOUSEEVENTF_LEFTDOWN = 0x0002;
        const int MOUSEEVENTF_LEFTUP = 0x0004;
        const int MOUSEEVENTF_RIGHTDOWN = 0x0008;
        const int MOUSEEVENTF_RIGHTUP = 0x0010;
        const int MOUSEEVENTF_WHEEL = 0x0800;

        const byte VK_MENU = 0x12; // ALT
        const byte VK_TAB = 0x09;  // TAB
        const uint KEYEVENTF_KEYUP = 0x0002;

        static ImageCodecInfo _jpegCodec = null;
        static EncoderParameters _jpegParams = null;

        static void InitJpegCodec(long quality)
        {
            foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageEncoders())
            {
                if (codec.MimeType == "image/jpeg")
                {
                    _jpegCodec = codec;
                    break;
                }
            }
            _jpegParams = new EncoderParameters(1);
            _jpegParams.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, quality);
        }

        static void TypeUnicodeString(string text)
        {
            if (string.IsNullOrEmpty(text)) return;
            List<INPUT> inputs = new List<INPUT>();
            foreach (char c in text)
            {
                if (c == '\r') continue;
                if (c == '\n')
                {
                    INPUT down = new INPUT { type = INPUT_KEYBOARD };
                    down.u.ki.wVk = 0x0D; // Enter
                    down.u.ki.wScan = 0x1C;
                    down.u.ki.dwFlags = 0;
                    inputs.Add(down);

                    INPUT up = new INPUT { type = INPUT_KEYBOARD };
                    up.u.ki.wVk = 0x0D;
                    up.u.ki.wScan = 0x1C;
                    up.u.ki.dwFlags = KEYEVENTF_KEYUP;
                    inputs.Add(up);
                    continue;
                }

                INPUT kDown = new INPUT { type = INPUT_KEYBOARD };
                kDown.u.ki.wVk = 0;
                kDown.u.ki.wScan = (ushort)c;
                kDown.u.ki.dwFlags = KEYEVENTF_UNICODE;
                inputs.Add(kDown);

                INPUT kUp = new INPUT { type = INPUT_KEYBOARD };
                kUp.u.ki.wVk = 0;
                kUp.u.ki.wScan = (ushort)c;
                kUp.u.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
                inputs.Add(kUp);
            }

            if (inputs.Count > 0)
            {
                SendInput((uint)inputs.Count, inputs.ToArray(), Marshal.SizeOf(typeof(INPUT)));
            }
        }

        static long ClearSystemRamWorkingSet()
        {
            long freedCount = 0;
            foreach (Process p in Process.GetProcesses())
            {
                try
                {
                    if (p.Id <= 4) continue;
                    IntPtr hProc = OpenProcess(PROCESS_SET_QUOTA | PROCESS_QUERY_INFORMATION, false, (uint)p.Id);
                    if (hProc != IntPtr.Zero)
                    {
                        EmptyWorkingSet(hProc);
                        CloseHandle(hProc);
                        freedCount++;
                    }
                }
                catch {}
            }
            GC.Collect();
            GC.WaitForPendingFinalizers();
            return freedCount;
        }

        static string CaptureScreenBase64(double scale = 0.85)
        {
            try
            {
                Rectangle bounds = Screen.PrimaryScreen.Bounds;
                int targetW = (int)Math.Round(bounds.Width * scale);
                int targetH = (int)Math.Round(bounds.Height * scale);

                using (Bitmap bmp = new Bitmap(bounds.Width, bounds.Height, PixelFormat.Format32bppRgb))
                {
                    using (Graphics g = Graphics.FromImage(bmp))
                    {
                        g.CopyFromScreen(bounds.X, bounds.Y, 0, 0, bounds.Size, CopyPixelOperation.SourceCopy);
                    }

                    using (MemoryStream ms = new MemoryStream(64 * 1024))
                    {
                        if (scale < 0.99)
                        {
                            using (Bitmap resized = new Bitmap(bmp, targetW, targetH))
                            {
                                resized.Save(ms, ImageFormat.Jpeg);
                            }
                        }
                        else
                        {
                            bmp.Save(ms, ImageFormat.Jpeg);
                        }

                        byte[] bytes = ms.ToArray();
                        return Convert.ToBase64String(bytes);
                    }
                }
            }
            catch
            {
                return null;
            }
        }

        static string GetActiveWindowTitle()
        {
            const int nChars = 256;
            StringBuilder Buff = new StringBuilder(nChars);
            IntPtr handle = GetForegroundWindow();
            if (handle != IntPtr.Zero && GetWindowText(handle, Buff, nChars) > 0)
            {
                return Buff.ToString();
            }
            return "Desktop";
        }

        static readonly HashSet<string> IgnoredProcs = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "TextInputHost", "dwm", "conhost", "svchost", "taskhostw",
            "nvspcaps64", "SearchApp", "SearchHost", "StartMenuExperienceHost", "ShellExperienceHost",
            "LockApp", "RuntimeBroker", "WmiPrvSE", "SystemSettings", "cmd"
        };

        static readonly HashSet<string> IgnoredTitles = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Program Manager", "Windows Input Experience", "MSCTFIME UI", "Default IME", "Settings",
            "Desktop", "Windows Shell Experience", "Battery Meter", "Network Flyout", "Notification Area",
            "Taskbar", "DWM Notification Window", "Task Switching", "NVIDIA GeForce Overlay"
        };

        static string GetRunningAppsJson()
        {
            List<string> items = new List<string>();
            HashSet<uint> seenPids = new HashSet<uint>();

            EnumWindows(delegate (IntPtr hWnd, IntPtr lParam)
            {
                if (!IsWindowVisible(hWnd)) return true;

                StringBuilder sb = new StringBuilder(256);
                if (GetWindowText(hWnd, sb, 256) <= 0) return true;
                string title = sb.ToString().Trim();
                if (string.IsNullOrEmpty(title) || IgnoredTitles.Contains(title)) return true;

                int exStyle = GetWindowLong(hWnd, GWL_EXSTYLE);
                if ((exStyle & WS_EX_TOOLWINDOW) != 0) return true;

                IntPtr owner = GetWindow(hWnd, GW_OWNER);
                if (owner != IntPtr.Zero && (exStyle & WS_EX_APPWINDOW) == 0) return true;

                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);

                if (seenPids.Contains(pid)) return true;

                string procName = "App";
                try
                {
                    using (Process p = Process.GetProcessById((int)pid))
                    {
                        procName = p.ProcessName;
                    }
                }
                catch {}

                if (IgnoredProcs.Contains(procName)) return true;
                if (procName.Equals("explorer", StringComparison.OrdinalIgnoreCase) && (title == "explorer" || title == "Desktop")) return true;

                seenPids.Add(pid);

                string friendlyName = procName;
                if (procName.Equals("Code", StringComparison.OrdinalIgnoreCase)) friendlyName = "VS Code / Antigravity";
                else if (procName.Equals("chrome", StringComparison.OrdinalIgnoreCase)) friendlyName = "Google Chrome";
                else if (procName.Equals("msedge", StringComparison.OrdinalIgnoreCase)) friendlyName = "Microsoft Edge";
                else if (procName.Equals("explorer", StringComparison.OrdinalIgnoreCase)) friendlyName = "File Explorer";
                else if (procName.Equals("WindowsTerminal", StringComparison.OrdinalIgnoreCase)) friendlyName = "Terminal";
                else if (procName.Equals("powershell", StringComparison.OrdinalIgnoreCase)) friendlyName = "PowerShell";
                else if (procName.Equals("Spotify", StringComparison.OrdinalIgnoreCase)) friendlyName = "Spotify";
                else if (procName.Equals("Discord", StringComparison.OrdinalIgnoreCase)) friendlyName = "Discord";
                else if (procName.Equals("Notepad", StringComparison.OrdinalIgnoreCase)) friendlyName = "Notepad";

                string cleanTitle = title.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "");
                string cleanProc = friendlyName.Replace("\\", "\\\\").Replace("\"", "\\\"");

                items.Add(string.Format("{{\"id\":\"app-{0}\",\"pid\":{0},\"name\":\"{1}\",\"title\":\"{2}\",\"active\":false}}", pid, cleanProc, cleanTitle));
                return true;
            }, IntPtr.Zero);

            return "[" + string.Join(",", items.ToArray()) + "]";
        }

        [STAThread]
        static void Main(string[] args)
        {
            try { SetProcessDPIAware(); } catch {}
            // Keep display & system awake
            SetThreadExecutionState(unchecked((int)0x80000003));
            InitJpegCodec(65L);

            Console.OutputEncoding = System.Text.Encoding.UTF8;
            Console.WriteLine("AETHER_INPUT_READY");

            string line;
            while ((line = Console.ReadLine()) != null)
            {
                try
                {
                    line = line.Trim();
                    if (string.IsNullOrEmpty(line)) continue;

                    string[] parts = line.Split(' ');
                    string cmd = parts[0].ToLowerInvariant();

                    if (cmd == "move" && parts.Length >= 3)
                    {
                        double px = double.Parse(parts[1], System.Globalization.CultureInfo.InvariantCulture);
                        double py = double.Parse(parts[2], System.Globalization.CultureInfo.InvariantCulture);
                        int screenW = Screen.PrimaryScreen.Bounds.Width;
                        int screenH = Screen.PrimaryScreen.Bounds.Height;
                        int x = (int)Math.Round(screenW * px);
                        int y = (int)Math.Round(screenH * py);
                        SetCursorPos(x, y);
                    }
                    else if (cmd == "click" && parts.Length >= 4)
                    {
                        string btn = parts[1].ToLowerInvariant();
                        double px = double.Parse(parts[2], System.Globalization.CultureInfo.InvariantCulture);
                        double py = double.Parse(parts[3], System.Globalization.CultureInfo.InvariantCulture);
                        int screenW = Screen.PrimaryScreen.Bounds.Width;
                        int screenH = Screen.PrimaryScreen.Bounds.Height;
                        int x = (int)Math.Round(screenW * px);
                        int y = (int)Math.Round(screenH * py);
                        SetCursorPos(x, y);

                        if (btn == "right")
                        {
                            mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
                            Thread.Sleep(5);
                            mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
                        }
                        else
                        {
                            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                            Thread.Sleep(5);
                            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                        }
                    }
                    else if (cmd == "mousedown" && parts.Length >= 4)
                    {
                        string btn = parts[1].ToLowerInvariant();
                        double px = double.Parse(parts[2], System.Globalization.CultureInfo.InvariantCulture);
                        double py = double.Parse(parts[3], System.Globalization.CultureInfo.InvariantCulture);
                        int screenW = Screen.PrimaryScreen.Bounds.Width;
                        int screenH = Screen.PrimaryScreen.Bounds.Height;
                        int x = (int)Math.Round(screenW * px);
                        int y = (int)Math.Round(screenH * py);
                        SetCursorPos(x, y);

                        if (btn == "right")
                        {
                            mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
                        }
                        else
                        {
                            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                        }
                    }
                    else if (cmd == "mouseup" && parts.Length >= 4)
                    {
                        string btn = parts[1].ToLowerInvariant();
                        double px = double.Parse(parts[2], System.Globalization.CultureInfo.InvariantCulture);
                        double py = double.Parse(parts[3], System.Globalization.CultureInfo.InvariantCulture);
                        int screenW = Screen.PrimaryScreen.Bounds.Width;
                        int screenH = Screen.PrimaryScreen.Bounds.Height;
                        int x = (int)Math.Round(screenW * px);
                        int y = (int)Math.Round(screenH * py);
                        SetCursorPos(x, y);

                        if (btn == "right")
                        {
                            mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
                        }
                        else
                        {
                            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                        }
                    }
                    else if (cmd == "scroll" && parts.Length >= 2)
                    {
                        int delta = int.Parse(parts[1]);
                        if (parts.Length >= 4)
                        {
                            double px = double.Parse(parts[2], System.Globalization.CultureInfo.InvariantCulture);
                            double py = double.Parse(parts[3], System.Globalization.CultureInfo.InvariantCulture);
                            if (px >= 0 && py >= 0)
                            {
                                int screenW = Screen.PrimaryScreen.Bounds.Width;
                                int screenH = Screen.PrimaryScreen.Bounds.Height;
                                SetCursorPos((int)Math.Round(screenW * px), (int)Math.Round(screenH * py));
                            }
                        }
                        mouse_event(MOUSEEVENTF_WHEEL, 0, 0, delta, 0);
                    }
                    else if (cmd == "alttab")
                    {
                        keybd_event(VK_MENU, 0, 0, 0);
                        keybd_event(VK_TAB, 0, 0, 0);
                        Thread.Sleep(30);
                        keybd_event(VK_TAB, 0, KEYEVENTF_KEYUP, 0);
                        keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0);
                    }
                    else if (cmd == "keys" && parts.Length >= 2)
                    {
                        string keys = line.Substring(5);
                        SendKeys.SendWait(keys);
                    }
                    else if (cmd == "type_b64" && parts.Length >= 2)
                    {
                        try
                        {
                            string b64 = parts[1];
                            byte[] bytes = Convert.FromBase64String(b64);
                            string txt = Encoding.UTF8.GetString(bytes);
                            TypeUnicodeString(txt);
                        }
                        catch {}
                    }
                    else if (cmd == "vol_up")
                    {
                        keybd_event(0xAF, 0, 0, 0); // VK_VOLUME_UP
                        Thread.Sleep(20);
                        keybd_event(0xAF, 0, KEYEVENTF_KEYUP, 0);
                    }
                    else if (cmd == "vol_down")
                    {
                        keybd_event(0xAE, 0, 0, 0); // VK_VOLUME_DOWN
                        Thread.Sleep(20);
                        keybd_event(0xAE, 0, KEYEVENTF_KEYUP, 0);
                    }
                    else if (cmd == "vol_mute")
                    {
                        keybd_event(0xAD, 0, 0, 0); // VK_VOLUME_MUTE
                        Thread.Sleep(20);
                        keybd_event(0xAD, 0, KEYEVENTF_KEYUP, 0);
                    }
                    else if (cmd == "reopen_tab")
                    {
                        keybd_event(0x11, 0, 0, 0); // Ctrl
                        keybd_event(0x10, 0, 0, 0); // Shift
                        keybd_event(0x54, 0, 0, 0); // T
                        Thread.Sleep(30);
                        keybd_event(0x54, 0, 2, 0);
                        keybd_event(0x10, 0, 2, 0);
                        keybd_event(0x11, 0, 2, 0);
                    }
                    else if (cmd == "wake")
                    {
                        SendMessage(HWND_BROADCAST, WM_SYSCOMMAND, (IntPtr)SC_MONITORPOWER, (IntPtr)(-1));
                        SetThreadExecutionState(unchecked((int)0x80000003));
                        mouse_event(MOUSEEVENTF_MOVE, 20, 20, 0, 0);
                        mouse_event(MOUSEEVENTF_MOVE, -20, -20, 0, 0);
                        keybd_event(0x11, 0, 0, 0); // Control
                        Thread.Sleep(20);
                        keybd_event(0x11, 0, KEYEVENTF_KEYUP, 0);
                    }
                    else if (cmd == "switch_pin")
                    {
                        // Dismiss lock screen wallpaper & switch to PIN credential provider
                        SendMessage(HWND_BROADCAST, WM_SYSCOMMAND, (IntPtr)SC_MONITORPOWER, (IntPtr)(-1));
                        SetThreadExecutionState(unchecked((int)0x80000003));

                        IntPtr hInputDesk = OpenInputDesktop(0, false, 0x01FF);
                        if (hInputDesk != IntPtr.Zero)
                        {
                            try { SetThreadDesktop(hInputDesk); } catch {}
                        }

                        // Space + Esc + Space to dismiss lock wallpaper
                        keybd_event(0x20, 0x39, 0, 0);
                        Thread.Sleep(30);
                        keybd_event(0x20, 0x39, KEYEVENTF_KEYUP, 0);
                        Thread.Sleep(150);

                        keybd_event(0x1B, 0x01, 0, 0);
                        Thread.Sleep(30);
                        keybd_event(0x1B, 0x01, KEYEVENTF_KEYUP, 0);
                        Thread.Sleep(150);

                        keybd_event(0x20, 0x39, 0, 0);
                        Thread.Sleep(30);
                        keybd_event(0x20, 0x39, KEYEVENTF_KEYUP, 0);
                        Thread.Sleep(800);

                        // Tab to focus Sign-in options / credential list
                        keybd_event(0x09, 0x0F, 0, 0); // Tab
                        Thread.Sleep(30);
                        keybd_event(0x09, 0x0F, KEYEVENTF_KEYUP, 0);
                        Thread.Sleep(150);

                        // Space to open options
                        keybd_event(0x20, 0x39, 0, 0); // Space
                        Thread.Sleep(30);
                        keybd_event(0x20, 0x39, KEYEVENTF_KEYUP, 0);
                        Thread.Sleep(200);

                        // Right Arrow to select PIN icon
                        keybd_event(0x27, 0x4D, 0, 0); // Right
                        Thread.Sleep(30);
                        keybd_event(0x27, 0x4D, KEYEVENTF_KEYUP, 0);
                        Thread.Sleep(150);

                        // Enter to activate PIN
                        keybd_event(0x0D, 0x1C, 0, 0); // Enter
                        Thread.Sleep(30);
                        keybd_event(0x0D, 0x1C, KEYEVENTF_KEYUP, 0);

                        if (hInputDesk != IntPtr.Zero)
                        {
                            try { CloseDesktop(hInputDesk); } catch {}
                        }
                    }
                    else if (cmd == "unlock")
                    {
                        // [DISABLED FOR SAFETY]
                        // Remote lock screen PIN injection relies on Windows LogonUI manipulation
                        // which carries a risk of breaking the Windows Authentication flow.
                        // Removed per developer/user request for maximum system safety.
                        Console.WriteLine("UNLOCK DISABLED: Safety policy active.");
                    }
                    else if (cmd == "toggle_taskmgr")
                    {
                        bool found = false;
                        foreach (Process p in Process.GetProcessesByName("Taskmgr"))
                        {
                            try { p.Kill(); found = true; } catch {}
                        }
                        if (!found)
                        {
                            try { Process.Start("taskmgr.exe"); } catch {}
                        }
                    }
                    else if (cmd == "clear_ram")
                    {
                        long count = ClearSystemRamWorkingSet();
                        Console.WriteLine("RAM_FREED:" + count);
                    }
                    else if (cmd == "snip")
                    {
                        keybd_event(0x12, 0, 0, 0); // ALT
                        keybd_event(0x2C, 0, 0, 0); // PRTSCN
                        Thread.Sleep(50);
                        keybd_event(0x2C, 0, KEYEVENTF_KEYUP, 0);
                        keybd_event(0x12, 0, KEYEVENTF_KEYUP, 0);
                    }
                    else if (cmd == "cap")
                    {
                        string b64 = CaptureScreenBase64(0.85);
                        if (!string.IsNullOrEmpty(b64))
                        {
                            Console.WriteLine("FRAME:" + b64);
                        }
                    }
                    else if (cmd == "focus" && parts.Length >= 2)
                    {
                        int pid;
                        if (int.TryParse(parts[1], out pid))
                        {
                            try
                            {
                                Process p = Process.GetProcessById(pid);
                                if (p.MainWindowHandle != IntPtr.Zero)
                                {
                                    ShowWindow(p.MainWindowHandle, 9); // SW_RESTORE
                                    SetForegroundWindow(p.MainWindowHandle);
                                }
                            }
                            catch {}
                        }
                    }
                    else if (cmd == "get_stats")
                    {
                        PowerStatus power = SystemInformation.PowerStatus;
                        int batteryPercent = (int)Math.Round(power.BatteryLifePercent * 100);
                        bool isCharging = power.PowerLineStatus == PowerLineStatus.Online;
                        string activeTitle = GetActiveWindowTitle();
                        bool isLocked = Process.GetProcessesByName("LogonUI").Length > 0;

                        Console.WriteLine(string.Format("STAT:{0}|{1}|{2}|{3}", batteryPercent, isCharging ? 1 : 0, isLocked ? 1 : 0, activeTitle));
                    }
                    else if (cmd == "get_apps")
                    {
                        string appsJson = GetRunningAppsJson();
                        Console.WriteLine("APPS:" + appsJson);
                    }
                    else if (cmd == "get_clip")
                    {
                        try
                        {
                            for (int retry = 0; retry < 3; retry++)
                            {
                                try
                                {
                                    if (Clipboard.ContainsText())
                                    {
                                        string txt = Clipboard.GetText();
                                        if (!string.IsNullOrEmpty(txt))
                                        {
                                            string b64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(txt));
                                            Console.WriteLine("CLIP:" + b64);
                                        }
                                        break;
                                    }
                                    else if (Clipboard.ContainsImage())
                                    {
                                        Image img = Clipboard.GetImage();
                                        if (img != null)
                                        {
                                            using (MemoryStream ms = new MemoryStream())
                                            {
                                                img.Save(ms, ImageFormat.Jpeg);
                                                string b64 = Convert.ToBase64String(ms.ToArray());
                                                Console.WriteLine("CLIP_IMG:" + b64);
                                            }
                                        }
                                        break;
                                    }
                                    else
                                    {
                                        break;
                                    }
                                }
                                catch
                                {
                                    Thread.Sleep(25);
                                }
                            }
                        }
                        catch {}
                    }
                    else if (cmd == "set_clip" && parts.Length >= 2)
                    {
                        try
                        {
                            string b64 = parts[1];
                            byte[] bytes = Convert.FromBase64String(b64);
                            string txt = Encoding.UTF8.GetString(bytes);
                            for (int retry = 0; retry < 5; retry++)
                            {
                                try
                                {
                                    Clipboard.SetText(txt);
                                    break;
                                }
                                catch
                                {
                                    Thread.Sleep(30);
                                }
                            }
                        }
                        catch {}
                    }
                }
                catch
                {
                    // Ignore errors safely
                }
            }
        }
    }
}
