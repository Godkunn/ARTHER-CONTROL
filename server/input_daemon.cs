using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Threading;

namespace AetherControl
{
    class InputDaemon
    {
        [DllImport("user32.dll")]
        static extern bool SetCursorPos(int X, int Y);

        [DllImport("user32.dll")]
        static extern void mouse_event(int flags, int dx, int dy, int cButtons, int info);

        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

        [DllImport("kernel32.dll", SetLastError = true)]
        static extern int SetThreadExecutionState(int esFlags);

        const int MOUSEEVENTF_MOVE = 0x0001;
        const int MOUSEEVENTF_LEFTDOWN = 0x0002;
        const int MOUSEEVENTF_LEFTUP = 0x0004;
        const int MOUSEEVENTF_RIGHTDOWN = 0x0008;
        const int MOUSEEVENTF_RIGHTUP = 0x0010;
        const int MOUSEEVENTF_WHEEL = 0x0800;

        const byte VK_MENU = 0x12; // ALT
        const byte VK_TAB = 0x09;  // TAB
        const uint KEYEVENTF_KEYUP = 0x0002;

        static void Main(string[] args)
        {
            // Keep display & system awake
            SetThreadExecutionState(unchecked((int)0x80000003));

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
                    else if (cmd == "wake")
                    {
                        SetThreadExecutionState(unchecked((int)0x80000003));
                        mouse_event(MOUSEEVENTF_MOVE, 1, 1, 0, 0);
                        mouse_event(MOUSEEVENTF_MOVE, -1, -1, 0, 0);
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
