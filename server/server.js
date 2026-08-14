// server/server.js
// AETHER CONTROL — Node.js WebSocket & REST Agent Daemon (Real Backend)

import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { exec as execChild } from 'child_process';
import { fileURLToPath } from 'url';
import { initializeTunnels, getTunnelInfo } from './tunnelManager.js';
import {
  startMdns, getMdnsHost,
  getHotspotInfo, enableHotspot, disableHotspot,
  getUsbTetheringInfo
} from './nearbyManager.js';
import {
  captureScreen,
  getRealSystemStats,
  getLanInfo,
  getDirectoryListing,
  readFileContent,
  writeFileContent,
  getFileStream,
  runShellCommand,
  runWingetSearch,
  runWingetInstall,
  normalizeSafePath,
  realDispatchInput,
  realExecuteSystemCommand,
  getRealRunningApps,
  focusRealWindow,
  getRealClipboardText,
  setRealClipboardText
} from './realWindowsApi.js';
import {
  getSystemStatus,
  setKillSwitch,
  focusWindow,
  handleInputEvent,
  resolveApproval,
  triggerSimulatedApproval,
  addClipboardItem
} from './mockWindowsApi.js';
import {
  getDownloadedInstallers,
  downloadInstallerToLaptop,
  runInstallerExecutable
} from './installerManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

const PORT = 3001;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set();

// Start tunnels
initializeTunnels(PORT, (tunnelInfo) => {
  broadcast({ type: 'tunnel_update', tunnel: tunnelInfo });
});

// Start mDNS (zero-internet local discovery)
const mdnsHost = startMdns(PORT);

// Nearby info helper
function getNearbyInfo() {
  const usb = getUsbTetheringInfo(PORT);
  const interfaces = os.networkInterfaces();
  const lanIps = [];
  for (const addrs of Object.values(interfaces)) {
    for (const addr of (addrs || [])) {
      if (addr.family === 'IPv4' && !addr.internal) lanIps.push(addr.address);
    }
  }
  return {
    mdns: { host: mdnsHost, url: mdnsHost ? `http://${mdnsHost}:${PORT}` : null },
    lan: { ips: lanIps, urls: lanIps.map(ip => `http://${ip}:${PORT}`) },
    usb,
  };
}

// ─────────────────────────────────────────────
// SCREENSHOT STREAMING LOOP
// ─────────────────────────────────────────────
let screenshareActive = true; // Always stream by default
let screenshareInterval = null;
let currentScreenshareMs = 600; // adaptive — faster on LAN

let activeStreamMode = 'desktop';

function getAdaptiveScreenshareMs() {
  if (activeStreamMode === 'datasaver') return 2000; // 0.5 FPS for data saver
  if (activeStreamMode === 'smartview') return 800; // ~1.2 FPS
  // 'desktop' mode (default)
  const status = getSystemStatus();
  const latency = status.telemetry?.latency || 50;
  if (latency < 20) return 200;  // LAN direct — 5fps
  if (latency < 50) return 400;  // Same Wi-Fi — 2.5fps
  return 700;                    // Tunnel — 1.4fps, save bandwidth
}

function startScreenshare() {
  if (screenshareInterval) return;
  const tick = async () => {
    if (!screenshareActive || clients.size === 0) {
      screenshareInterval = setTimeout(tick, 500);
      return;
    }
    const status = getSystemStatus();
    if (status.isKillSwitchActive) {
      screenshareInterval = setTimeout(tick, 500);
      return;
    }
    try {
      const base64 = await captureScreen();
      if (base64) {
        const ms = getAdaptiveScreenshareMs();
        broadcast({ type: 'screen_jpeg', data: base64, ts: Date.now(), interval: ms });
        screenshareInterval = setTimeout(tick, ms);
      } else {
        screenshareInterval = setTimeout(tick, 1000);
      }
    } catch (_) {
      screenshareInterval = setTimeout(tick, 1000);
    }
  };
  screenshareInterval = setTimeout(tick, 200);
}
startScreenshare();

// ─────────────────────────────────────────────
// SYSTEM TELEMETRY LOOP
// ─────────────────────────────────────────────
// SYSTEM TELEMETRY LOOP (Real live hardware stats)
// ─────────────────────────────────────────────
let lastKnownClip = '';

setInterval(() => {
  const real = getRealSystemStats();
  const apps = getRealRunningApps();
  const clip = getRealClipboardText();
  const status = getSystemStatus();

  // Merge real stats into system status
  status.cpuUsage = real.cpuUsage;
  status.ramUsage = real.ramUsage;
  status.batteryPercent = real.batteryPercent;
  status.isCharging = real.isCharging;
  status.activeWindow = real.activeWindow;
  status.runningApps = apps;
  status.telemetry.latency = Math.max(4, Math.min(60, (status.telemetry.latency || 12) + (Math.floor(Math.random() * 3) - 1)));
  status.telemetry.rssi = Math.max(-80, Math.min(-35, (status.telemetry.rssi || -50) + (Math.floor(Math.random() * 3) - 1)));

  broadcast({
    type: 'telemetry_update',
    telemetry: status.telemetry,
    cpu: real.cpuUsage,
    ram: real.ramUsage,
    battery: real.batteryPercent,
    isCharging: real.isCharging,
    activeWindow: real.activeWindow,
    runningApps: apps,
    memInfo: { total: real.totalMemGB, used: real.usedMemGB, free: real.freeMemGB }
  });

  if (clip && clip !== lastKnownClip) {
    lastKnownClip = clip;
    const item = addClipboardItem(clip, 'Laptop');
    broadcast({ type: 'clipboard_updated', item });
  }
}, 2000);

// ─────────────────────────────────────────────
// ZERO-CPU REAL WINDOWS DIALOG/APPROVAL DETECTOR
// ─────────────────────────────────────────────
const detectedDialogIds = new Set();

setInterval(() => {
  if (clients.size === 0) return;
  const status = getSystemStatus();
  const activeTitle = status.activeWindow || '';
  if (activeTitle.match(/User Account Control|Administrator|Allow|Confirm|Permission|consent|elevation|Antigravity/i)) {
    const dialogId = `dlg-${activeTitle.substring(0, 20)}`;
    if (!detectedDialogIds.has(dialogId)) {
      detectedDialogIds.add(dialogId);
      const approval = {
        id: dialogId,
        app: 'Windows System',
        title: activeTitle,
        description: `Active prompt requires action: "${activeTitle}". Tap Allow on phone to confirm.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'danger',
        isSystemDialog: true,
        actions: [
          { id: 'yes', label: '1. Allow / Confirm', type: 'primary' },
          { id: 'no', label: '2. Dismiss / Deny', type: 'danger' }
        ]
      };
      status.pendingApprovals.unshift(approval);
      broadcast({ type: 'approval_required', approval });
      setTimeout(() => detectedDialogIds.delete(dialogId), 15000);
    }
  }
}, 1500);


// ─────────────────────────────────────────────
// WEBSOCKET
// ─────────────────────────────────────────────
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === 1) client.send(message);
  });
}

wss.on('connection', (ws) => {
  clients.add(ws);
  screenshareActive = true;
  const real = getRealSystemStats();
  const apps = getRealRunningApps();
  const lan = getLanInfo();
  const status = getSystemStatus();
  status.cpuUsage = real.cpuUsage;
  status.ramUsage = real.ramUsage;
  status.batteryPercent = real.batteryPercent;
  status.isCharging = real.isCharging;
  status.activeWindow = real.activeWindow;
  status.runningApps = apps;

  ws.send(JSON.stringify({
    type: 'init_state',
    status: { ...status, runningApps: apps, tunnel: getTunnelInfo(), lan }
  }));
  ws.send(JSON.stringify({ type: 'screenshare_state', active: true }));

  ws.on('message', (raw) => {
    try {
      const event = JSON.parse(raw.toString());
      const status = getSystemStatus();
      if (status.isKillSwitchActive && event.type !== 'ping') return;

      if (event.type === 'input') {
        handleInputEvent(event.data);
        realDispatchInput(event.data);
      } else if (event.type === 'set_screenshare') {
        screenshareActive = event.active;
        broadcast({ type: 'screenshare_state', active: screenshareActive });
      } else if (event.type === 'set_stream_mode') {
        activeStreamMode = event.mode || 'desktop';
      } else if (event.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
      }
    } catch (_) {}
  });

  ws.on('close', () => clients.delete(ws));
});

// ─────────────────────────────────────────────
// REST API
// ─────────────────────────────────────────────

// Status
app.get('/api/status', (req, res) => {
  const real = getRealSystemStats();
  res.json({ ...getSystemStatus(), tunnel: getTunnelInfo(), lan: getLanInfo(), nearby: getNearbyInfo(), real });
});

// ── Nearby / Zero-Internet Endpoints ───────────────────────────────────────
app.get('/api/nearby', async (req, res) => {
  const hotspot = await getHotspotInfo();
  res.json({ ...getNearbyInfo(), hotspot });
});

app.post('/api/nearby/hotspot', async (req, res) => {
  const { enable } = req.body;
  const result = enable ? await enableHotspot() : await disableHotspot();
  res.json(result);
});

// LAN info
app.get('/api/lan', (req, res) => res.json(getLanInfo()));

// Tunnel info
app.get('/api/tunnel', (req, res) => res.json(getTunnelInfo()));

// Kill switch
app.post('/api/kill-switch', (req, res) => {
  const { active } = req.body;
  const state = setKillSwitch(active);
  broadcast({ type: 'kill_switch_changed', active: state });
  res.json({ success: true, isKillSwitchActive: state });
});

// App focus
app.post('/api/focus-window', (req, res) => {
  const { appName } = req.body;
  const focused = focusWindow(appName);
  broadcast({ type: 'window_changed', activeWindow: focused });
  res.json({ success: true, activeWindow: focused });
});

// Approvals
app.get('/api/approvals', (req, res) => {
  const s = getSystemStatus();
  res.json({ pending: s.pendingApprovals, history: s.approvalHistory });
});
app.post('/api/approve', (req, res) => {
  const { approvalId, decision } = req.body;
  const result = resolveApproval(approvalId, decision);

  // Also dispatch the key/click on the laptop to actually dismiss any real dialog
  const label = typeof decision === 'object' ? decision.label : (decision || '');
  const isYes = !label.toLowerCase().startsWith('no') && !label.toLowerCase().includes('deny');

  if (isYes) {
    // Click "Yes" / "Allow" / "OK" button on any active UAC or dialog by pressing Enter
    // Also try clicking the UAC Yes button at approximate screen position
    import('./realWindowsApi.js').then(m => {
      m.realDispatchInput({ type: 'key_press', key: '~' }); // Enter key (SendKeys ~ = Enter)
      // Also press Alt+Y for UAC dialogs that use Alt+Y shortcut
      setTimeout(() => {
        m.realDispatchInput({ type: 'key_press', key: '%{Y}' }); // Alt+Y
      }, 300);
    }).catch(() => {});
  } else {
    // Deny — press Escape or Tab+Enter to No
    import('./realWindowsApi.js').then(m => {
      m.realDispatchInput({ type: 'key_press', key: '{ESC}' });
    }).catch(() => {});
  }

  if (result) {
    broadcast({ type: 'approval_resolved', approval: result });
    res.json({ success: true, resolved: result });
  } else {
    // Even if not in our queue (OS-level dialog), still dispatch keys
    res.json({ success: true, dispatched: true, note: 'Key dispatched to active window' });
  }
});
app.post('/api/trigger-approval', (req, res) => {
  const { app: appName } = req.body;
  const a = triggerSimulatedApproval(appName);
  broadcast({ type: 'approval_required', approval: a });
  res.json({ success: true, approval: a });
});

// Clipboard
app.post('/api/clipboard', (req, res) => {
  const { text, source } = req.body;
  const item = addClipboardItem(text, source);
  broadcast({ type: 'clipboard_updated', item });
  res.json({ success: true, item });
});

app.post('/api/command', (req, res) => {
  const { command, payload } = req.body;
  const status = getSystemStatus();
  if (status.isKillSwitchActive) return res.status(403).json({ success: false, reason: 'Kill Switch Active' });
  let msg = `Command '${command}' executed`;
  switch (command) {
    case 'VOLUME_UP': status.volume = Math.min(100, status.volume + 10); break;
    case 'VOLUME_DOWN': status.volume = Math.max(0, status.volume - 10); break;
    case 'TOGGLE_MUTE': status.isMuted = !status.isMuted; break;
    case 'SHOW_DESKTOP': focusWindow('Desktop'); break;
    case 'TASK_MANAGER': focusWindow('Task Manager'); break;
    case 'LOCK_PC': msg = 'PC Locked'; break;
    case 'UNLOCK_PC': msg = 'PC Unlock Signal Sent'; break;
    case 'SCREENSHOT': screenshareActive = true; break;
  }
  realExecuteSystemCommand(command, payload);
  broadcast({ type: 'system_command', command, status: { volume: status.volume, isMuted: status.isMuted } });
  res.json({ success: true, message: msg });
});

// ─────────────────────────────────────────────
// REAL FILE SYSTEM
// ─────────────────────────────────────────────
app.get('/api/files', (req, res) => {
  const reqPath = req.query.path || os.homedir();
  const listing = getDirectoryListing(reqPath);
  const safePath = normalizeSafePath(reqPath);
  // Build breadcrumb parts
  const parts = safePath.replace(/\\/g, '/').split('/').filter(Boolean);
  res.json({ path: safePath.replace(/\\/g, '/'), entries: listing, parts });
});

app.get('/api/files/read', (req, res) => {
  const { path: filePath } = req.query;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  const result = readFileContent(filePath);
  res.json(result);
});

app.post('/api/files/write', (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  const result = writeFileContent(filePath, content);
  res.json(result);
});

app.get('/api/files/download', (req, res) => {
  const { path: filePath } = req.query;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  const stream = getFileStream(filePath);
  if (!stream) return res.status(404).json({ error: 'File not found' });
  const filename = path.basename(filePath);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  stream.pipe(res);
});

// ─────────────────────────────────────────────
// REAL TERMINAL (streaming via SSE)
// ─────────────────────────────────────────────
app.post('/api/terminal', (req, res) => {
  const { cmd } = req.body;
  const status = getSystemStatus();
  if (status.isKillSwitchActive) return res.status(403).json({ error: 'Kill Switch Active' });
  if (!cmd) return res.status(400).json({ error: 'cmd required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendLine = (type, text) => {
    res.write(`data: ${JSON.stringify({ type, text })}\n\n`);
    // Also broadcast to all websocket clients so phone sees it live
    broadcast({ type: 'terminal_output', output: text, outputType: type });
  };

  runShellCommand(
    cmd,
    ({ type, text }) => sendLine(type, text),
    ({ code }) => {
      sendLine('exit', `\n[Process exited with code ${code}]`);
      res.end();
    }
  );
});

// ─────────────────────────────────────────────
// WINGET INSTALLER
// ─────────────────────────────────────────────
app.post('/api/winget/search', (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  runWingetSearch(
    query,
    ({ type, text }) => res.write(`data: ${JSON.stringify({ type, text })}\n\n`),
    ({ code }) => { res.write(`data: ${JSON.stringify({ type: 'exit', code })}\n\n`); res.end(); }
  );
});

app.post('/api/winget/install', (req, res) => {
  const { packageId } = req.body;
  const status = getSystemStatus();
  if (status.isKillSwitchActive) return res.status(403).json({ error: 'Kill Switch Active' });
  if (!packageId) return res.status(400).json({ error: 'packageId required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  broadcast({ type: 'install_started', packageId });
  runWingetInstall(
    packageId,
    ({ type, text }) => {
      res.write(`data: ${JSON.stringify({ type, text })}\n\n`);
      broadcast({ type: 'install_output', text, packageId });
    },
    ({ code }) => {
      res.write(`data: ${JSON.stringify({ type: 'exit', code })}\n\n`);
      broadcast({ type: 'install_done', code, packageId });
      res.end();
    }
  );
});

// ─────────────────────────────────────────────
// DOWNLOADED INSTALLERS & SETUP RUNNER
// ─────────────────────────────────────────────
app.get('/api/installers', (req, res) => {
  const list = getDownloadedInstallers();
  res.json({ installers: list });
});

app.post('/api/installers/download', async (req, res) => {
  const { url, filename } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const result = await downloadInstallerToLaptop(url, filename);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/installers/run', async (req, res) => {
  const { path: filePath, admin } = req.body;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  const result = await runInstallerExecutable(filePath, admin !== false);
  res.json(result);
});

// ─────────────────────────────────────────────
// SCREENSHOT ON DEMAND
// ─────────────────────────────────────────────
app.get('/api/screenshot', async (req, res) => {
  try {
    const base64 = await captureScreen();
    if (!base64) return res.status(503).json({ error: 'Screenshot failed' });
    res.json({ data: base64, ts: Date.now() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA Fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  next();
});

server.listen(PORT, '0.0.0.0', () => {
  const lan = getLanInfo();
  const usbInfo = getUsbTetheringInfo(PORT);
  const primaryIp = lan.interfaces[0]?.ip || '127.0.0.1';
  
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║                  AETHER CONTROL v2.5.0                       ║`);
  console.log(`║      Ultra-Low Latency Cockpit & Remote Orchestrator         ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║                                                              ║`);
  console.log(`║  📱 OPEN ON YOUR PHONE BROWSER (TAP & GO):                   ║`);
  console.log(`║  👉  http://${primaryIp}:${PORT}`.padEnd(63) + `║`);
  console.log(`║                                                              ║`);
  console.log(`╠──────────────────────────────────────────────────────────────╣`);
  console.log(`║  📶 ACTIVE NETWORK INTERFACES:                               ║`);
  lan.interfaces.forEach((i, idx) => {
    const label = idx === 0 ? '• Hotspot/LAN:' : '• Alt IP:     ';
    console.log(`║  ${label} http://${i.ip}:${PORT}`.padEnd(63) + `║`);
  });
  const usbStr = usbInfo.serverUrl || `http://192.168.42.x:${PORT} (Plug USB & Enable Tethering)`;
  console.log(`║  • USB Cable:   ${usbStr}`.padEnd(63) + `║`);
  console.log(`║  • Laptop Local: http://localhost:${PORT}`.padEnd(63) + `║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
  console.log(`[AETHER] Ready for connections. Keep this terminal open.\n`);
});
