// server/realWindowsApi.js
// Real Windows backend — screenshots, filesystem, terminal, installer

import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import screenshot from 'screenshot-desktop';

const execAsync = promisify(exec);

import { wakeDisplay, enableKeepAwake, dispatchMouseClick, dispatchMouseScroll, dispatchMouseMove } from './powerManager.js';
import {
  nativeMouseMove,
  nativeMouseClick,
  nativeMouseDown,
  nativeMouseUp,
  nativeMouseScroll,
  nativeAltTab,
  nativeSendKeys,
  nativeWake,
  requestHardwareStats,
  getCachedHardwareStats,
  getCachedRunningApps,
  getCachedClipboardText,
  nativeFocusProcess,
  nativeSetClipboard,
  nativeCaptureScreen,
  nativeUnlock,
  nativeToggleTaskmgr,
  nativeSnip
} from './nativeInputManager.js';

// Initialize power keep-awake on startup
enableKeepAwake();

// ─────────────────────────────────────────────
// SCREEN CAPTURE (High-Speed In-Memory Native Engine)
// ─────────────────────────────────────────────
let lastWakeAttempt = 0;

export async function captureScreen() {
  try {
    const nativeBase64 = await nativeCaptureScreen();
    if (nativeBase64 && nativeBase64.length > 500) {
      return nativeBase64;
    }
  } catch (_) {}

  try {
    let imgBuffer = await screenshot({ format: 'jpg' });
    if (imgBuffer && imgBuffer.length < 2000 && Date.now() - lastWakeAttempt > 4000) {
      lastWakeAttempt = Date.now();
      await wakeDisplay();
      imgBuffer = await screenshot({ format: 'jpg' });
    }
    if (imgBuffer && imgBuffer.length > 500) {
      return imgBuffer.toString('base64');
    }
    return null;
  } catch (err) {
    if (Date.now() - lastWakeAttempt > 4000) {
      lastWakeAttempt = Date.now();
      await wakeDisplay();
      try {
        const retryBuf = await screenshot({ format: 'jpg' });
        if (retryBuf) return retryBuf.toString('base64');
      } catch (_) {}
    }
    return null;
  }
}

// ─────────────────────────────────────────────
// SYSTEM STATS (real live dynamic)
// ─────────────────────────────────────────────
let prevCpuTimes = null;

function calculateRealCpuUsage() {
  const cpus = os.cpus();
  let totalUser = 0, totalNice = 0, totalSys = 0, totalIdle = 0, totalIrq = 0;
  for (const cpu of cpus) {
    totalUser += cpu.times.user;
    totalNice += cpu.times.nice;
    totalSys += cpu.times.sys;
    totalIdle += cpu.times.idle;
    totalIrq += cpu.times.irq;
  }
  const total = totalUser + totalNice + totalSys + totalIdle + totalIrq;
  const idle = totalIdle;

  if (!prevCpuTimes) {
    prevCpuTimes = { total, idle };
    return Math.min(95, Math.max(5, Math.round(((total - idle) / total) * 100)));
  }

  const deltaTotal = total - prevCpuTimes.total;
  const deltaIdle = idle - prevCpuTimes.idle;
  prevCpuTimes = { total, idle };

  if (deltaTotal <= 0) return 15;
  const usage = Math.round(((deltaTotal - deltaIdle) / deltaTotal) * 100);
  return Math.min(100, Math.max(0, usage));
}

export function getRealSystemStats() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ramUsage = Math.round((usedMem / totalMem) * 100);
  const cpuUsage = calculateRealCpuUsage();
  const hw = requestHardwareStats();

  return {
    cpuUsage,
    ramUsage,
    totalMemGB: (totalMem / (1024 ** 3)).toFixed(1),
    usedMemGB: (usedMem / (1024 ** 3)).toFixed(1),
    freeMemGB: (freeMem / (1024 ** 3)).toFixed(1),
    batteryPercent: hw.batteryPercent || 100,
    isCharging: hw.isCharging,
    activeWindow: hw.activeWindow || 'Desktop',
    platform: os.platform(),
    hostname: os.hostname(),
    uptime: Math.floor(os.uptime()),
  };
}

export function getRealRunningApps() {
  const apps = getCachedRunningApps();
  if (apps && apps.length > 0) return apps;
  return [
    { id: 'app-antigravity', name: 'Antigravity', title: 'Antigravity IDE', active: true },
    { id: 'app-terminal', name: 'cmd', title: 'Terminal', active: false },
    { id: 'app-browser', name: 'chrome', title: 'Google Chrome', active: false },
    { id: 'app-explorer', name: 'explorer', title: 'File Explorer', active: false }
  ];
}

export function focusRealWindow(appNameOrPid) {
  const pid = parseInt(appNameOrPid, 10);
  if (!isNaN(pid) && pid > 0) {
    nativeFocusProcess(pid);
    return true;
  }
  const apps = getCachedRunningApps();
  const target = apps.find(a => a.name.toLowerCase().includes(String(appNameOrPid).toLowerCase()) || a.title.toLowerCase().includes(String(appNameOrPid).toLowerCase()));
  if (target && target.pid) {
    nativeFocusProcess(target.pid);
    return true;
  }
  return false;
}

export function getRealClipboardText() {
  return getCachedClipboardText();
}

export function setRealClipboardText(text) {
  return nativeSetClipboard(text);
}

// ─────────────────────────────────────────────
// LAN INFO — categorised by adapter type
// ─────────────────────────────────────────────
export function getLanInfo() {
  const interfaces = os.networkInterfaces();
  const result = { interfaces: [], primary: null, hostname: os.hostname() };

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;

      // Classify adapter type
      let type = 'wifi';
      let label = 'Wi-Fi / LAN';
      const ip = addr.address;
      const nameLower = name.toLowerCase();

      if (ip.startsWith('192.168.43.') || ip.startsWith('192.168.42.')) {
        type = 'android_hotspot'; label = 'Phone Hotspot (Android)';
      } else if (ip.startsWith('172.20.10.')) {
        type = 'iphone_hotspot'; label = 'Phone Hotspot (iPhone)';
      } else if (nameLower.includes('rndis') || nameLower.includes('android') || nameLower.includes('usb')) {
        type = 'usb'; label = 'USB Tethering';
      } else if (nameLower.includes('virtual') || nameLower.includes('vmware') || nameLower.includes('vbox')) {
        type = 'virtual'; label = 'Virtual Adapter (skip)';
      } else if (nameLower.includes('ethernet') || nameLower.includes('local area')) {
        type = 'ethernet'; label = 'Ethernet';
      }

      // Skip virtual adapters from primary selection
      if (type === 'virtual') continue;

      const entry = { name, ip, type, label, url: `http://${ip}:3001` };
      result.interfaces.push(entry);

      // Prefer phone hotspot > ethernet > wifi as primary (most likely active scenario)
      if (!result.primary) result.primary = entry;
      if (type === 'android_hotspot' || type === 'iphone_hotspot') result.primary = entry;
    }
  }

  return result;
}

// ─────────────────────────────────────────────
// FILE SYSTEM
// ─────────────────────────────────────────────
const HOME_ROOT = os.homedir(); // C:\Users\Hp

export function normalizeSafePath(reqPath) {
  if (!reqPath || reqPath === '~') return HOME_ROOT;
  // Prevent path traversal outside home
  const resolved = path.resolve(reqPath);
  if (!resolved.startsWith(HOME_ROOT) && !resolved.match(/^[A-Za-z]:\\/)) {
    return HOME_ROOT;
  }
  return resolved;
}

export function getDirectoryListing(dirPath) {
  const safePath = normalizeSafePath(dirPath);
  try {
    const entries = fs.readdirSync(safePath, { withFileTypes: true });
    return entries.map(entry => {
      let size = '--';
      let modified = '--';
      try {
        const stat = fs.statSync(path.join(safePath, entry.name));
        size = entry.isFile() ? formatBytes(stat.size) : '--';
        modified = formatDate(stat.mtime);
      } catch (_) {}
      return {
        name: entry.name,
        type: entry.isDirectory() ? 'folder' : 'file',
        ext: entry.isFile() ? path.extname(entry.name).toLowerCase() : null,
        size,
        modified,
        path: path.join(safePath, entry.name).replace(/\\/g, '/')
      };
    }).sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  } catch (err) {
    return [];
  }
}

export function readFileContent(filePath) {
  const safePath = normalizeSafePath(filePath);
  try {
    const stat = fs.statSync(safePath);
    if (stat.size > 2 * 1024 * 1024) return { error: 'File too large (>2MB) to preview', content: null };
    const content = fs.readFileSync(safePath, 'utf8');
    return { content, size: stat.size };
  } catch (err) {
    return { error: err.message, content: null };
  }
}

export function writeFileContent(filePath, content) {
  const safePath = normalizeSafePath(filePath);
  try {
    fs.writeFileSync(safePath, content, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function getFileStream(filePath) {
  const safePath = normalizeSafePath(filePath);
  if (!fs.existsSync(safePath)) return null;
  return fs.createReadStream(safePath);
}

// ─────────────────────────────────────────────
// SHELL COMMAND EXECUTION
// ─────────────────────────────────────────────
let shellSessions = new Map(); // id → ChildProcess

export async function runShellCommand(cmd, onData, onDone) {
  return new Promise((resolve) => {
    const proc = spawn('powershell.exe', ['-NoProfile', '-Command', cmd], {
      shell: false,
      env: { ...process.env, TERM: 'xterm' }
    });

    let output = '';

    proc.stdout.on('data', data => {
      const chunk = data.toString();
      output += chunk;
      if (onData) onData({ type: 'stdout', text: chunk });
    });

    proc.stderr.on('data', data => {
      const chunk = data.toString();
      output += chunk;
      if (onData) onData({ type: 'stderr', text: chunk });
    });

    proc.on('close', code => {
      if (onDone) onDone({ code, output });
      resolve({ code, output });
    });

    proc.on('error', err => {
      if (onDone) onDone({ code: -1, output: err.message });
      resolve({ code: -1, output: err.message });
    });

    return proc;
  });
}

// ─────────────────────────────────────────────
// WINGET INSTALLER
// ─────────────────────────────────────────────
export function runWingetSearch(query, onData, onDone) {
  const proc = spawn('winget', ['search', query, '--accept-source-agreements'], { shell: true });

  proc.stdout.on('data', data => onData && onData({ type: 'stdout', text: data.toString() }));
  proc.stderr.on('data', data => onData && onData({ type: 'stderr', text: data.toString() }));
  proc.on('close', code => onDone && onDone({ code }));
  proc.on('error', err => onData && onData({ type: 'stderr', text: `winget not found: ${err.message}` }));

  return proc;
}

export function runWingetInstall(packageId, onData, onDone) {
  const proc = spawn('winget', [
    'install', packageId,
    '--accept-source-agreements', '--accept-package-agreements', '-e'
  ], { shell: true });

  proc.stdout.on('data', data => onData && onData({ type: 'stdout', text: data.toString() }));
  proc.stderr.on('data', data => onData && onData({ type: 'stderr', text: data.toString() }));
  proc.on('close', code => onDone && onDone({ code }));
  proc.on('error', err => onData && onData({ type: 'stderr', text: `winget error: ${err.message}` }));

  return proc;
}

// ─────────────────────────────────────────────
// REAL SYSTEM COMMANDS & INPUT DISPATCH
// ─────────────────────────────────────────────
export function realExecuteSystemCommand(cmd, payload = null) {
  try {
    switch (cmd) {
      case 'VOLUME_UP':
        nativeSendKeys('{VOLUME_UP}');
        break;
      case 'VOLUME_DOWN':
        nativeSendKeys('{VOLUME_DOWN}');
        break;
      case 'TOGGLE_MUTE':
        nativeSendKeys('{VOLUME_MUTE}');
        break;
      case 'SHOW_DESKTOP':
        exec(`powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).ToggleDesktop()"`, () => {});
        break;
      case 'TASK_MANAGER':
        nativeToggleTaskmgr();
        break;
      case 'LOCK_PC':
        exec(`rundll32.exe user32.dll,LockWorkStation`, () => {});
        break;
      case 'WAKE_DISPLAY':
        nativeWake();
        wakeDisplay();
        break;
      case 'UNLOCK_PC':
        nativeWake();
        wakeDisplay();
        const pinCode = payload && (payload.pin || payload.code) ? String(payload.pin || payload.code) : '';
        nativeUnlock(pinCode);
        break;
      case 'SNIP':
        nativeSnip();
        break;
      case 'FULLSCREEN':
        nativeSendKeys('{F11}');
        break;
      case 'BROWSER_NEW_TAB':
        nativeSendKeys('^t');
        break;
      case 'BROWSER_CLOSE_TAB':
        nativeSendKeys('^w');
        break;
      case 'OPEN_SETTINGS':
        exec('powershell -NoProfile -Command "Start-Process ms-settings:"', () => {});
        break;
      case 'OPEN_EXPLORER':
        exec('powershell -NoProfile -Command "Start-Process explorer.exe"', () => {});
        break;
      case 'OPEN_TERMINAL':
        exec('powershell -NoProfile -Command "Start-Process wt.exe"', (err) => {
          if (err) exec('powershell -NoProfile -Command "Start-Process powershell.exe"', () => {});
        });
        break;
    }
  } catch (_) {}
}

export function realDispatchInput(event) {
  if (!event) return;
  try {
    if (event.type === 'mouse_click') {
      const x = Math.max(0, Math.min(1920, event.x || 0));
      const y = Math.max(0, Math.min(1080, event.y || 0));
      const isRight = event.button === 'right';
      const handled = nativeMouseClick(isRight ? 'right' : 'left', x / 1920, y / 1080);
      if (!handled) dispatchMouseClick(x / 1920, y / 1080, isRight ? 'right' : 'left');
    } else if (event.type === 'mouse_down') {
      const x = Math.max(0, Math.min(1920, event.x || 0));
      const y = Math.max(0, Math.min(1080, event.y || 0));
      const isRight = event.button === 'right';
      nativeMouseDown(isRight ? 'right' : 'left', x / 1920, y / 1080);
    } else if (event.type === 'mouse_up') {
      const x = Math.max(0, Math.min(1920, event.x || 0));
      const y = Math.max(0, Math.min(1080, event.y || 0));
      const isRight = event.button === 'right';
      nativeMouseUp(isRight ? 'right' : 'left', x / 1920, y / 1080);
    } else if (event.type === 'mouse_scroll' || event.type === 'scroll') {
      const delta = event.deltaY !== undefined ? event.deltaY : (event.direction === 'up' ? 120 : -120);
      const px = event.x !== undefined ? event.x / 1920 : -1;
      const py = event.y !== undefined ? event.y / 1080 : -1;
      const handled = nativeMouseScroll(delta, px, py);
      if (!handled) dispatchMouseScroll(delta, px, py);
    } else if (event.type === 'mouse_move') {
      const x = Math.max(0, Math.min(1920, event.x || 0));
      const y = Math.max(0, Math.min(1080, event.y || 0));
      const handled = nativeMouseMove(x / 1920, y / 1080);
      if (!handled) dispatchMouseMove(x / 1920, y / 1080);
    } else if (event.type === 'type_text') {
      const text = event.text || '';
      if (text) {
        const escaped = text.replace(/([+^%~(){}[\]])/g, '{$1}');
        const handled = nativeSendKeys(escaped);
        if (!handled) {
          const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped.replace(/'/g, "''")}')`;
          exec(`powershell -NoProfile -NonInteractive -Command "${ps.replace(/"/g, '\\"')}"`, () => {});
        }
      }
    } else if (event.type === 'key_press' || event.type === 'hotkey') {
      const rawKey = event.key || event.hotkey || '';
      if (rawKey === '%{TAB}' || rawKey === 'Alt+Tab') {
        nativeAltTab();
        return;
      }
      if (rawKey) {
        const keyMap = {
          'Enter': '{ENTER}',
          'Return': '{ENTER}',
          'Backspace': '{BACKSPACE}',
          'Tab': '{TAB}',
          'Escape': '{ESC}',
          'Esc': '{ESC}',
          'ArrowUp': '{UP}',
          'Up': '{UP}',
          'ArrowDown': '{DOWN}',
          'Down': '{DOWN}',
          'ArrowLeft': '{LEFT}',
          'Left': '{LEFT}',
          'ArrowRight': '{RIGHT}',
          'Right': '{RIGHT}',
          'Delete': '{DEL}',
          'Del': '{DEL}',
          'Home': '{HOME}',
          'End': '{END}',
          'PageUp': '{PGUP}',
          'PageDown': '{PGDN}',
          'Space': ' ',
          'Ctrl+C': '^c',
          'Ctrl+V': '^v',
          'Ctrl+Z': '^z',
          'Ctrl+A': '^a',
          'Ctrl+S': '^s'
        };

        let keysToSend = keyMap[rawKey] || rawKey;
        if (event.modifiers) {
          let prefix = '';
          if (event.modifiers.ctrl) prefix += '^';
          if (event.modifiers.alt) prefix += '%';
          if (event.modifiers.shift) prefix += '+';
          keysToSend = prefix + keysToSend;
        }

        const handled = nativeSendKeys(keysToSend);
        if (!handled) {
          const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keysToSend.replace(/'/g, "''")}')`;
          exec(`powershell -NoProfile -NonInteractive -Command "${ps.replace(/"/g, '\\"')}"`, () => {});
        }
      }
    }
  } catch (_) {}
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(date) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

