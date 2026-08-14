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

        static string GetRunningAppsJson()
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("[");
            bool first = true;
            foreach (Process p in Process.GetProcesses())
            {
                try
                {
                    if (!string.IsNullOrEmpty(p.MainWindowTitle) && p.MainWindowHandle != IntPtr.Zero)
                    {
                        if (!first) sb.Append(",");
                        first = false;
                        string cleanTitle = p.MainWindowTitle.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "");
                        string cleanProc = p.ProcessName.Replace("\\", "\\\\").Replace("\"", "\\\"");
                        sb.Append(string.Format("{{\"id\":\"app-{0}\",\"pid\":{0},\"name\":\"{1}\",\"title\":\"{2}\",\"active\":false}}", p.Id, cleanProc, cleanTitle));
                    }
                }
                catch {}
            }
            sb.Append("]");
            return sb.ToString();
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
                        SetThreadExecutionState(unchecked((int)0x80000003));
                        mouse_event(MOUSEEVENTF_MOVE, 20, 20, 0, 0);
                        mouse_event(MOUSEEVENTF_MOVE, -20, -20, 0, 0);
                        keybd_event(0x11, 0, 0, 0); // Control
                        Thread.Sleep(20);
                        keybd_event(0x11, 0, KEYEVENTF_KEYUP, 0);
                    }
                    else if (cmd == "unlock")
                    {
                        IntPtr hInputDesk = OpenInputDesktop(0, false, 0x01FF);
                        if (hInputDesk != IntPtr.Zero)
                        {
                            try { SetThreadDesktop(hInputDesk); } catch {}
                        }

                        // 1. Wake hardware display and thread
                        SetThreadExecutionState(unchecked((int)0x80000003));
                        mouse_event(MOUSEEVENTF_MOVE, 30, 30, 0, 0);
                        mouse_event(MOUSEEVENTF_MOVE, -30, -30, 0, 0);
                        Thread.Sleep(80);

                        // 2. Click screen center to focus Logon UI
                        int midX = Screen.PrimaryScreen.Bounds.Width / 2;
                        int midY = Screen.PrimaryScreen.Bounds.Height / 2;
                        SetCursorPos(midX, midY);
                        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                        Thread.Sleep(30);
                        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                        Thread.Sleep(100);

                        // 3. Dismiss Lock Screen Wallpaper (Hardware Space + Enter)
                        keybd_event(0x20, 0x39, 0, 0); // Space
                        Thread.Sleep(40);
                        keybd_event(0x20, 0x39, KEYEVENTF_KEYUP, 0);
                        Thread.Sleep(150);

                        keybd_event(0x0D, 0x1C, 0, 0); // Enter
                        Thread.Sleep(40);
                        keybd_event(0x0D, 0x1C, KEYEVENTF_KEYUP, 0);
                        Thread.Sleep(350);

                        // 4. Inject PIN if provided via Hardware Scan Codes
                        if (parts.Length >= 2)
                        {
                            string pin = parts[1];
                            foreach (char c in pin)
                            {
                                byte vk = 0;
                                if (c >= '0' && c <= '9') vk = (byte)(0x30 + (c - '0'));
                                else if (c >= 'a' && c <= 'z') vk = (byte)(0x41 + (c - 'a'));
                                else if (c >= 'A' && c <= 'Z') vk = (byte)(0x41 + (c - 'A'));

                                if (vk > 0)
                                {
                                    byte scan = (byte)MapVirtualKey(vk, 0);
                                    keybd_event(vk, scan, 0, 0);
                                    Thread.Sleep(30);
                                    keybd_event(vk, scan, KEYEVENTF_KEYUP, 0);
                                    Thread.Sleep(40);
                                }
                            }

                            // 5. Press Enter to submit PIN
                            Thread.Sleep(120);
                            keybd_event(0x0D, 0x1C, 0, 0);
                            Thread.Sleep(40);
                            keybd_event(0x0D, 0x1C, KEYEVENTF_KEYUP, 0);
                        }

                        if (hInputDesk != IntPtr.Zero)
                        {
                            try { CloseDesktop(hInputDesk); } catch {}
                        }
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
                    else if (cmd == "snip")
                    {
                        keybd_event(0x5B, 0, 0, 0); // LWIN
                        keybd_event(0x10, 0, 0, 0); // SHIFT
                        keybd_event(0x53, 0, 0, 0); // S
                        Thread.Sleep(50);
                        keybd_event(0x53, 0, KEYEVENTF_KEYUP, 0);
                        keybd_event(0x10, 0, KEYEVENTF_KEYUP, 0);
                        keybd_event(0x5B, 0, KEYEVENTF_KEYUP, 0);
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

                        Console.WriteLine(string.Format("STAT:{0}|{1}|{2}", batteryPercent, isCharging ? 1 : 0, activeTitle));
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
                            if (Clipboard.ContainsText())
                            {
                                string txt = Clipboard.GetText();
                                string b64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(txt));
                                Console.WriteLine("CLIP:" + b64);
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
                            Clipboard.SetText(txt);
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
