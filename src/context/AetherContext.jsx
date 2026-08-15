// src/context/AetherContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const AetherContext = createContext();

export const AetherProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [streamMode, setStreamModeState] = useState('desktop');
  const [streamQuality, setStreamQuality] = useState('720p');
  const [dirtyRegionsActive, setDirtyRegionsActive] = useState(false);
  const [trackpadMode, setTrackpadMode] = useState(false);
  const [showKeyboardBar, setShowKeyboardBar] = useState(false);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [screenshareActive, setScreenshareActiveState] = useState(false);
  const [currentScreenJpeg, setCurrentScreenJpeg] = useState(null);
  const [screenFps, setScreenFps] = useState(0);
  const [lanInfo, setLanInfo] = useState(null);
  const [terminalLines, setTerminalLines] = useState([
    { id: 1, type: 'system', text: 'AETHER Terminal ready. Type a command and hit Execute.' }
  ]);

  const audioContextRef = useRef(null);
  const wsRef = useRef(null);
  const lastFrameTimeRef = useRef(Date.now());
  const fpsFrameCountRef = useRef(0);

  const [systemStatus, setSystemStatus] = useState({
    activeWindow: 'Antigravity IDE',
    cpuUsage: 28,
    ramUsage: 64,
    batteryPercent: 88,
    isCharging: true,
    volume: 75,
    isMuted: false,
    brightness: 90,
    isKillSwitchActive: false,
    runningApps: [
      { id: 'app-1', name: 'Antigravity IDE', icon: 'Code2', active: true, pid: 14208 },
      { id: 'app-2', name: 'Codex Terminal', icon: 'Terminal', active: false, pid: 9812 },
      { id: 'app-3', name: 'VS Code', icon: 'FileCode', active: false, pid: 4410 },
      { id: 'app-4', name: 'Google Chrome', icon: 'Globe', active: false, pid: 12044 },
      { id: 'app-5', name: 'File Explorer', icon: 'Folder', active: false, pid: 3102 },
    ],
    clipboard: [
      { id: 'cb-1', text: 'npm run server', time: '15:48', source: 'Laptop' },
      { id: 'cb-2', text: 'https://exceed-marc-investor-constraints.trycloudflare.com', time: '15:42', source: 'Laptop' },
    ],
    telemetry: {
      rssi: -55, latency: 22, bandwidth: 84.5, packetLoss: 0.1,
      jitter: 3, signalQuality: 'Excellent', connectionMode: 'LAN Direct'
    },
    pendingApprovals: [],
    approvalHistory: [],
    fileSystem: { Desktop: [], Downloads: [], Documents: [] }
  });

  const [lastFrame, setLastFrame] = useState({
    timestamp: Date.now(),
    mousePos: { x: 960, y: 540 },
    dirtyRegions: [{ x: 500, y: 300, width: 400, height: 250 }]
  });

  const [logs, setLogs] = useState([
    { id: 1, time: '00:00', category: 'System', text: 'AETHER AGENT initialized. Awaiting connection...' }
  ]);

  const [tunnelInfo, setTunnelInfo] = useState({
    mode: 'Connecting...', url: window.location.origin, status: 'Connecting'
  });

  const addLog = useCallback((category, text) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ id: Date.now() + Math.random(), time, category, text }, ...prev.slice(0, 59)]);
  }, []);

  const addTerminalLine = useCallback((type, text) => {
    setTerminalLines(prev => [...prev, { id: Date.now() + Math.random(), type, text }].slice(-200));
  }, []);

  const playAlertChime = () => {
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch (_) {}
  };

  const getWsUrl = () => {
    const isHttps = window.location.protocol === 'https:';
    const wsProtocol = isHttps ? 'wss:' : 'ws:';
    const isDevPort = window.location.port === '5173' || window.location.port === '5174';
    const wsHost = isDevPort ? `${window.location.hostname}:3001` : window.location.host;
    return `${wsProtocol}//${wsHost}`;
  };

  const getApiBase = () => {
    const isDevPort = window.location.port === '5173' || window.location.port === '5174';
    return isDevPort ? `http://${window.location.hostname}:3001` : '';
  };

  const apiFetch = useCallback(async (endpoint, opts = {}) => {
    const base = getApiBase();
    const headers = { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': '1', ...(opts.headers || {}) };
    return fetch(`${base}${endpoint}`, { ...opts, headers });
  }, []);

  // WebSocket connection with auto-reconnect
  useEffect(() => {
    let socket;
    let reconnectTimer;

    const connect = () => {
      const wsUrl = getWsUrl();
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        addLog('Network', `Connected via ${wsUrl}`);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'init_state':
              setSystemStatus(prev => ({ ...prev, ...data.status }));
              if (data.status.tunnel) setTunnelInfo(data.status.tunnel);
              if (data.status.lan) setLanInfo(data.status.lan);
              break;
            case 'tunnel_update':
              setTunnelInfo(data.tunnel);
              addLog('Tunnel', `${data.tunnel.mode} → ${data.tunnel.url}`);
              break;
            case 'telemetry_update':
              setSystemStatus(prev => ({
                ...prev,
                telemetry: data.telemetry,
                cpuUsage: data.cpu !== undefined ? data.cpu : prev.cpuUsage,
                ramUsage: data.ram !== undefined ? data.ram : prev.ramUsage,
                batteryPercent: data.battery !== undefined ? data.battery : prev.batteryPercent,
                isCharging: data.isCharging !== undefined ? data.isCharging : prev.isCharging,
                isLocked: data.isLocked !== undefined ? data.isLocked : prev.isLocked,
                activeWindow: data.activeWindow || prev.activeWindow,
                runningApps: data.runningApps || prev.runningApps,
                volume: data.volume !== undefined ? data.volume : prev.volume,
                isMuted: data.isMuted !== undefined ? data.isMuted : prev.isMuted,
                memInfo: data.memInfo || prev.memInfo
              }));
              break;
            case 'screen_jpeg':
              setCurrentScreenJpeg(data.data);
              fpsFrameCountRef.current++;
              const now = Date.now();
              const elapsed = (now - lastFrameTimeRef.current) / 1000;
              if (elapsed >= 1) {
                setScreenFps(Math.round(fpsFrameCountRef.current / elapsed));
                fpsFrameCountRef.current = 0;
                lastFrameTimeRef.current = now;
              }
              break;
            case 'screenshare_state':
              setScreenshareActiveState(data.active);
              break;
            case 'terminal_output':
              addTerminalLine(data.outputType || 'stdout', data.output);
              break;
            case 'approval_required':
              setSystemStatus(prev => {
                const existing = prev.pendingApprovals || [];
                if (existing.some(a => a.id === data.approval.id)) return prev;
                return { ...prev, pendingApprovals: [data.approval, ...existing] };
              });
              playAlertChime();
              try { if (navigator.vibrate) navigator.vibrate([150, 100, 250]); } catch (_) {}
              addLog('Approval', `🔔 ${data.approval.app}: ${data.approval.title}`);
              if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                  new Notification(`Approval Required: ${data.approval.app}`, { body: data.approval.title });
                } else if (Notification.permission !== 'denied') {
                  Notification.requestPermission().then(perm => {
                    if (perm === 'granted') new Notification(`Approval Required: ${data.approval.app}`, { body: data.approval.title });
                  });
                }
              }
              break;
            case 'approval_resolved':
              setSystemStatus(prev => ({
                ...prev,
                pendingApprovals: prev.pendingApprovals.filter(a => a.id !== data.approval.id),
                approvalHistory: [data.approval, ...prev.approvalHistory]
              }));
              break;
            case 'kill_switch_changed':
              setSystemStatus(prev => ({ ...prev, isKillSwitchActive: data.active }));
              addLog('Security', data.active ? '🛑 KILL SWITCH ON' : '🟢 Remote control restored');
              break;
            case 'window_changed':
              setSystemStatus(prev => ({
                ...prev,
                activeWindow: data.activeWindow,
                runningApps: prev.runningApps.map(a => ({ ...a, active: a.name === data.activeWindow }))
              }));
              break;
            case 'clipboard_updated':
              setSystemStatus(prev => ({ ...prev, clipboard: [data.item, ...prev.clipboard] }));
              break;
          }
        } catch (_) {}
      };

      socket.onclose = () => {
        setConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };
      socket.onerror = () => setConnected(false);
    };

    connect();
    return () => { if (socket) socket.close(); clearTimeout(reconnectTimer); };
  }, []);

  // ── Actions ──────────────────────────────────────────────
  const sendWs = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendInputEvent = useCallback((inputData) => sendWs({ type: 'input', data: inputData }), [sendWs]);

  const setStreamMode = useCallback((mode) => {
    sendWs({ type: 'set_stream_mode', mode });
    setStreamModeState(mode);
  }, [sendWs]);

  const setScreenshareActive = useCallback((active) => {
    sendWs({ type: 'set_screenshare', active });
    setScreenshareActiveState(active);
  }, [sendWs]);

  const resolveApproval = useCallback(async (approvalId, decision) => {
    const label = typeof decision === 'object' ? decision.label : decision;
    setSystemStatus(prev => {
      const target = prev.pendingApprovals.find(a => a.id === approvalId);
      const resolved = target ? {
        ...target,
        status: label.startsWith('No') ? 'DENIED' : 'APPROVED',
        selectedOption: label,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        resolvedBy: 'Phone UI'
      } : null;
      return {
        ...prev,
        pendingApprovals: prev.pendingApprovals.filter(a => a.id !== approvalId),
        approvalHistory: resolved ? [resolved, ...prev.approvalHistory] : prev.approvalHistory
      };
    });
    try {
      await apiFetch('/api/approve', {
        method: 'POST', body: JSON.stringify({ approvalId, decision })
      });
    } catch (_) {}
  }, [apiFetch]);

  const triggerTestApproval = useCallback(async (appName = 'Antigravity IDE') => {
    try {
      await apiFetch('/api/trigger-approval', { method: 'POST', body: JSON.stringify({ app: appName }) });
    } catch {
      const mock = {
        id: `appr-${Math.floor(Math.random() * 9000 + 1000)}`, app: appName,
        title: 'Permission Requested',
        description: `${appName} requests high-priority action.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'warning',
        actions: [
          { id: 'yes', label: 'Yes', type: 'primary' },
          { id: 'no', label: 'No', type: 'danger' }
        ]
      };
      setSystemStatus(prev => ({ ...prev, pendingApprovals: [mock, ...prev.pendingApprovals] }));
      playAlertChime();
    }
  }, [apiFetch]);

  const toggleKillSwitch = useCallback(async (active) => {
    try {
      await apiFetch('/api/kill-switch', { method: 'POST', body: JSON.stringify({ active }) });
    } catch {
      setSystemStatus(prev => ({ ...prev, isKillSwitchActive: active }));
    }
  }, [apiFetch]);

  const focusWindowAction = useCallback(async (appName) => {
    try {
      await apiFetch('/api/focus-window', { method: 'POST', body: JSON.stringify({ appName }) });
    } catch {
      setSystemStatus(prev => ({
        ...prev, activeWindow: appName,
        runningApps: prev.runningApps.map(a => ({ ...a, active: a.name === appName }))
      }));
    }
    addLog('Apps', `Focused: ${appName}`);
  }, [apiFetch, addLog]);

  const executeCommand = useCallback(async (command, payload = {}) => {
    try {
      await apiFetch('/api/command', { method: 'POST', body: JSON.stringify({ command, payload }) });
    } catch (_) {}
    addLog('Control', `Command: ${command}`);
  }, [apiFetch, addLog]);

  const addClipboard = useCallback(async (text) => {
    try {
      await apiFetch('/api/clipboard', { method: 'POST', body: JSON.stringify({ text, source: 'Phone' }) });
    } catch {
      setSystemStatus(prev => ({
        ...prev, clipboard: [{ id: `cb-${Date.now()}`, text, time: 'Now', source: 'Phone' }, ...prev.clipboard]
      }));
    }
    addLog('Clipboard', 'Synced to laptop');
  }, [apiFetch, addLog]);

  // Terminal execution via SSE
  const executeTerminalCommand = useCallback(async (cmd, cwd) => {
    addTerminalLine('cmd', `PS> ${cmd}`);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': '1' },
        body: JSON.stringify({ cmd, cwd })
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.text) addTerminalLine(d.type, d.text);
            } catch (_) {}
          }
        }
      }
    } catch (err) {
      addTerminalLine('stderr', `Connection error: ${err.message}`);
    }
  }, [addTerminalLine]);

  return (
    <AetherContext.Provider value={{
      connected, systemStatus, setSystemStatus, activeTab, setActiveTab,
      streamMode, setStreamMode, streamQuality, setStreamQuality,
      dirtyRegionsActive, setDirtyRegionsActive,
      trackpadMode, setTrackpadMode,
      showKeyboardBar, setShowKeyboardBar,
      pairingModalOpen, setPairingModalOpen,
      tunnelInfo, lastFrame, logs, lanInfo,
      screenshareActive, setScreenshareActive,
      currentScreenJpeg, screenFps,
      terminalLines, addTerminalLine,
      sendInputEvent, resolveApproval, triggerTestApproval,
      toggleKillSwitch, focusWindow: focusWindowAction,
      executeCommand, addClipboard, addLog,
      executeTerminalCommand, apiFetch,
    }}>
      {children}
    </AetherContext.Provider>
  );
};

export const useAether = () => useContext(AetherContext);
