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
import loudness from 'loudness';
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
  getRealClipboardImage,
  setRealClipboardText
} from './realWindowsApi.js';
import {
  getSystemStatus,
  setKillSwitch,
  focusWindow,
  handleInputEvent,
  resolveApproval,
  triggerSimulatedApproval,
  addClipboardItem,
  addClipboardImageItem
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

// Start tunnels (DISABLED FOR SAFETY - Public internet exposure is dangerous without authentication)
// initializeTunnels(PORT, (tunnelInfo) => {
//   broadcast({ type: 'tunnel_update', tunnel: tunnelInfo });
// });

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
let lastKnownClipImg = '';

setInterval(async () => {
  const real = getRealSystemStats();
  const apps = getRealRunningApps();
  const clip = getRealClipboardText();
  const clipImg = getRealClipboardImage();
  const status = getSystemStatus();

  // Try to get real volume
  try {
    const vol = await loudness.getVolume();
    const muted = await loudness.getMuted();
    status.volume = vol;
    status.isMuted = muted;
  } catch (e) {}

  // Merge real stats into system status
  status.cpuUsage = real.cpuUsage;
  status.ramUsage = real.ramUsage;
  status.batteryPercent = real.batteryPercent;
  status.isCharging = real.isCharging;
  status.isLocked = real.isLocked;
  status.activeWindow = real.activeWindow;
  status.runningApps = apps;
  status.telemetry.latency = 2; // Direct Wi-Fi LAN ping is usually 1-3ms
  status.telemetry.rssi = -40; // Excellent local signal

  broadcast({
    type: 'telemetry_update',
    telemetry: status.telemetry,
    cpu: real.cpuUsage,
    ram: real.ramUsage,
    battery: real.batteryPercent,
    isCharging: real.isCharging,
    isLocked: real.isLocked,
    activeWindow: real.activeWindow,
    runningApps: apps,
    volume: status.volume,
    isMuted: status.isMuted,
    memInfo: { total: real.totalMemGB, used: real.usedMemGB, free: real.freeMemGB }
  });

  if (clip && clip !== lastKnownClip) {
    lastKnownClip = clip;
    lastKnownClipImg = '';
    const item = addClipboardItem(clip, 'Laptop');
    broadcast({ type: 'clipboard_updated', item });
  } else if (clipImg && clipImg !== lastKnownClipImg) {
    lastKnownClipImg = clipImg;
    lastKnownClip = '';
    const item = addClipboardImageItem(clipImg, 'Laptop');
    broadcast({ type: 'clipboard_updated', item });
  }
}, 500);

// ─────────────────────────────────────────────
// ANTIGRAVITY BRAIN & SYSTEM DIALOG/APPROVAL DETECTOR
// ─────────────────────────────────────────────
let activeSystemDialogId = null;
const brainPath = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');

function checkAntigravityApproval() {
  try {
    if (!fs.existsSync(brainPath)) return null;
    const entries = fs.readdirSync(brainPath, { withFileTypes: true });
    const convDirs = entries.filter(e => e.isDirectory() && e.name !== 'temp' && e.name !== 'cache');
    
    // Sort by most recently modified
    convDirs.sort((a, b) => {
      try {
        const statA = fs.statSync(path.join(brainPath, a.name));
        const statB = fs.statSync(path.join(brainPath, b.name));
        return statB.mtimeMs - statA.mtimeMs;
      } catch (_) { return 0; }
    });

    if (convDirs.length === 0) return null;
    const latestConv = convDirs[0].name;
    const transcriptFile = path.join(brainPath, latestConv, '.system_generated', 'logs', 'transcript.jsonl');
    
    if (!fs.existsSync(transcriptFile)) return null;
    
    // Read up to 128KB from the end to ensure we never truncate large JSON lines
    const stat = fs.statSync(transcriptFile);
    if (stat.size === 0) return null;
    const readSize = Math.min(stat.size, 131072);
    const buf = Buffer.alloc(readSize);
    const fd = fs.openSync(transcriptFile, 'r');
    fs.readSync(fd, buf, 0, readSize, stat.size - readSize);
    fs.closeSync(fd);

    const chunk = buf.toString('utf8');
    const rawLines = chunk.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (rawLines.length === 0) return null;

    // Parse the most recent valid JSON line from the end
    let lastObj = null;
    for (let i = rawLines.length - 1; i >= 0; i--) {
      try {
        lastObj = JSON.parse(rawLines[i]);
        if (lastObj && typeof lastObj === 'object') break;
      } catch (_) {
        // Partial line due to buffer cut, continue checking previous line
      }
    }

    if (!lastObj) return null;

    // If last step was from the USER, then any previous question/approval was already answered!
    if (lastObj.source === 'USER_EXPLICIT' || lastObj.type === 'USER_INPUT') {
      return null;
    }

    // If last action is from MODEL or SYSTEM and waiting for feedback / plan approval / questions / command execution
    if (lastObj.source === 'MODEL' || lastObj.source === 'SYSTEM' || lastObj.type === 'PLANNER_RESPONSE') {
      const rawText = JSON.stringify(lastObj);
      const hasToolCalls = Array.isArray(lastObj.tool_calls) && lastObj.tool_calls.length > 0;
      const runCommandTool = hasToolCalls ? lastObj.tool_calls.find(t => t && t.name === 'run_command') : null;
      const isPlanFeedback = rawText.includes('"RequestFeedback":true') || rawText.includes('implementation_plan.md');
      const isAskQuestion = rawText.includes('"name":"ask_question"');
      const isPrompting = rawText.includes('Approval Required') || rawText.includes('Proceed') || rawText.includes('user review');

      if (runCommandTool) {
        const cmd = (runCommandTool.args && runCommandTool.args.CommandLine) ? runCommandTool.args.CommandLine : 'Terminal Command';
        return {
          id: `antigravity-cmd-${lastObj.step_index ?? Date.now()}`,
          app: 'Antigravity Terminal',
          title: `Allow Command: ${cmd.substring(0, 32)}${cmd.length > 32 ? '...' : ''}`,
          description: `Antigravity is requesting permission to execute: "${cmd}". Tap an option below:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          severity: 'danger',
          isSystemDialog: true,
          actions: [
            { id: '1', label: '1. Allow this time', type: 'primary' },
            { id: '2', label: '2. Always in convo', type: 'secondary' },
            { id: '3', label: '3. Always in project', type: 'secondary' },
            { id: '4', label: '4. Always allow', type: 'secondary' },
            { id: '5', label: '5. No / Deny', type: 'danger' }
          ]
        };
      }

      if (isPlanFeedback || isAskQuestion || isPrompting) {
        let extractedTitle = isPlanFeedback ? 'Plan Review & Proceed Approval' : (isAskQuestion ? 'Question / Choice Needed' : 'Action Required');
        let extractedDesc = isPlanFeedback
          ? 'Antigravity has created/updated the implementation plan and is waiting for your review. Tap Proceed on phone to execute.'
          : 'Antigravity is waiting for input or tool execution confirmation.';
        let extractedActions = [
          { id: '1', label: '1. Proceed / Allow', type: 'primary' },
          { id: '2', label: '2. Deny / Cancel', type: 'danger' }
        ];

        // If ask_question tool was called, extract the real question and options!
        try {
          if (hasToolCalls) {
            const qTool = lastObj.tool_calls.find(t => t && t.name === 'ask_question');
            if (qTool && qTool.args && qTool.args.questions && qTool.args.questions.length > 0) {
              const q = qTool.args.questions[0];
              extractedTitle = q.question || extractedTitle;
              extractedDesc = `Question: "${q.question}". Select your choice below:`;
              if (Array.isArray(q.options) && q.options.length > 0) {
                extractedActions = q.options.map((opt, idx) => ({
                  id: String(idx + 1),
                  label: `${idx + 1}. ${opt}`,
                  type: idx === 0 ? 'primary' : 'secondary'
                }));
              }
            }
          }
        } catch (_) {}

        return {
          id: `antigravity-step-${lastObj.step_index ?? Date.now()}`,
          app: 'Antigravity AI',
          title: extractedTitle,
          description: extractedDesc,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          severity: 'danger',
          isSystemDialog: true,
          actions: extractedActions
        };
      }
    }
  } catch (_) {}
  return null;
}

setInterval(() => {
  try {
    if (clients.size === 0) return;
    const status = getSystemStatus();
    const rawTitle = status.activeWindow;
    const activeTitle = typeof rawTitle === 'string' ? rawTitle : (rawTitle && typeof rawTitle === 'object' ? (rawTitle.title || rawTitle.name || '') : '');

    // Check Antigravity engine first
    const agApproval = checkAntigravityApproval();

    // Check Windows system dialogs
    const apps = getRealRunningApps();
    const isDialogActive = /User Account Control|consent\.exe|Credential UI|Windows Security|Administrator|SmartScreen|Windows Defender|Confirm|Permission|Elevat/i.test(activeTitle) ||
      apps.some(a => /Approval Required|Antigravity Confirm|Confirm Command/i.test(a.title));

    if (agApproval) {
      if (activeSystemDialogId !== agApproval.id) {
        activeSystemDialogId = agApproval.id;
        status.pendingApprovals = (status.pendingApprovals || []).filter(a => !a.isSystemDialog);
        status.pendingApprovals.unshift(agApproval);
        broadcast({ type: 'approval_required', approval: agApproval });
      }
    } else if (isDialogActive) {
      const displayTitle = activeTitle.length > 5 ? activeTitle : 'System / Agent Prompt';
      const dialogId = `dlg-${displayTitle.substring(0, 24).replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (activeSystemDialogId !== dialogId) {
        activeSystemDialogId = dialogId;
        const approval = {
          id: dialogId,
          app: activeTitle.includes('Antigravity') ? 'Antigravity AI' : 'Windows System',
          title: displayTitle,
          description: `Active prompt detected on laptop: "${displayTitle}". Tap Allow on phone to confirm.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          severity: 'danger',
          isSystemDialog: true,
          actions: [
            { id: 'yes', label: '1. Allow / Confirm', type: 'primary' },
            { id: 'no', label: '2. Dismiss / Deny', type: 'danger' }
          ]
        };
        status.pendingApprovals = (status.pendingApprovals || []).filter(a => !a.isSystemDialog);
        status.pendingApprovals.unshift(approval);
        broadcast({ type: 'approval_required', approval });
      }
    } else if (activeSystemDialogId) {
      // Prompt has closed or was approved on laptop!
      const closedId = activeSystemDialogId;
      activeSystemDialogId = null;
      const existingIndex = (status.pendingApprovals || []).findIndex(a => a.id === closedId);
      if (existingIndex !== -1) {
        const removed = status.pendingApprovals.splice(existingIndex, 1)[0];
        const resolved = {
          ...removed,
          status: 'DISMISSED_ON_LAPTOP',
          selectedOption: 'Resolved on Laptop',
          resolvedBy: 'Laptop Screen',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        if (!status.approvalHistory) status.approvalHistory = [];
        status.approvalHistory.unshift(resolved);
        broadcast({ type: 'approval_resolved', approval: resolved });
      }
    }
  } catch (_) {}
}, 500);


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

  // Also dispatch the key/click on the laptop to actually dismiss any real dialog or CLI prompt
  const label = String(typeof decision === 'object' ? decision.label : (decision || '')).trim();
  
  if (/^[1-5]$/.test(label)) {
    // Numeric choice for CLI / Antigravity prompt (1, 2, 3, 4, 5)
    import('./realWindowsApi.js').then(m => {
      m.realDispatchInput({ type: 'type_text', text: label + '\n' });
    }).catch(() => {});
  } else {
    const isYes = !label.toLowerCase().startsWith('no') && !label.toLowerCase().includes('deny');
    if (isYes) {
      // Click "Yes" / "Allow" / "OK" / "Proceed" by typing 'y\n' + pressing Enter + Alt+Y
      import('./realWindowsApi.js').then(m => {
        m.realDispatchInput({ type: 'key_press', key: 'Enter' });
        setTimeout(() => {
          m.realDispatchInput({ type: 'type_text', text: 'y\n' });
        }, 150);
      }).catch(() => {});
    } else {
      // Deny — press Escape or 'n\n'
      import('./realWindowsApi.js').then(m => {
        m.realDispatchInput({ type: 'key_press', key: 'Escape' });
        setTimeout(() => {
          m.realDispatchInput({ type: 'type_text', text: 'n\n' });
        }, 150);
      }).catch(() => {});
    }
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

// Clipboard (Real 2-Way Sync)
app.post('/api/clipboard', (req, res) => {
  const { text, source } = req.body;
  if (text) {
    setRealClipboardText(text); // Writes directly to Windows Clipboard on laptop!
    lastKnownClip = text;
  }
  const item = addClipboardItem(text, source || 'Phone');
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
    case 'TOGGLE_MUTE':
    case 'VOLUME_MUTE': status.isMuted = !status.isMuted; break;
    case 'SHOW_DESKTOP': focusWindow('Desktop'); break;
    case 'TASK_MANAGER': focusWindow('Task Manager'); break;
    case 'LOCK_PC': msg = 'PC Locked'; break;
    case 'UNLOCK_PC': msg = 'Wake Signal Sent (PIN typing disabled for safety)'; break;
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
  const primaryUrl = lan.primary?.url || (lan.interfaces[0]?.url || `http://localhost:${PORT}`);
  
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║                  AETHER CONTROL v2.5.0                       ║`);
  console.log(`║      Ultra-Low Latency Cockpit & Remote Orchestrator         ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║                                                              ║`);
  console.log(`║  📱 RECOMMENDED PHONE LINK:                                  ║`);
  console.log(`║  👉  ${primaryUrl}`.padEnd(63) + `║`);
  console.log(`║                                                              ║`);
  console.log(`╠──────────────────────────────────────────────────────────────╣`);
  console.log(`║  📶 ACTIVE NETWORK INTERFACES:                               ║`);
  lan.interfaces.forEach((i) => {
    const label = `• ${i.label}:`.padEnd(16);
    console.log(`║  ${label} http://${i.ip}:${PORT}`.padEnd(63) + `║`);
  });
  console.log(`║  • mDNS Domain:   http://aether-control.local:${PORT}`.padEnd(63) + `║`);
  console.log(`║  • Laptop Local:  http://localhost:${PORT}`.padEnd(63) + `║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
  console.log(`[AETHER] Engine online & ready. Keep this terminal window open.\n`);
});
