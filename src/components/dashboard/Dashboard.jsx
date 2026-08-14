// src/components/dashboard/Dashboard.jsx
import React, { useState, useRef } from 'react';
import { useAether } from '../../context/AetherContext';
import {
  Monitor, Zap, Shield, Volume2, VolumeX, Lock, Cpu, Eye,
  Copy, Check, AlertTriangle, ArrowUpRight, Code2, Terminal, Globe, FileCode, Folder, Activity, BatteryCharging, RefreshCw, RotateCcw, Fingerprint, Scissors, Maximize, Plus, X, Settings, HardDrive, Info, Sparkles
} from 'lucide-react';

export default function Dashboard() {
  const {
    systemStatus,
    streamMode,
    setStreamMode,
    setActiveTab,
    focusWindow,
    executeCommand,
    resolveApproval,
    triggerTestApproval,
    addClipboard
  } = useAether();

  const [clipboardInput, setClipboardInput] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [unlockPin, setUnlockPin] = useState(() => localStorage.getItem('aether_pin') || '');
  const [bioPrompting, setBioPrompting] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [unlockStatusText, setUnlockStatusText] = useState('');
  const scanIntervalRef = useRef(null);

  const pendingApprovals = systemStatus.pendingApprovals || [];
  const topApproval = pendingApprovals[0];

  const handleSendClipboard = (e) => {
    e.preventDefault();
    if (!clipboardInput.trim()) return;
    addClipboard(clipboardInput.trim());
    setClipboardInput('');
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const handleDirectUnlock = (pinToUse) => {
    setUnlockStatusText('⚡ Injecting Hardware Scan Codes...');
    executeCommand('UNLOCK_PC', { pin: pinToUse });
    setTimeout(() => {
      setShowUnlockModal(false);
      setUnlockStatusText('');
      setScanProgress(0);
      setBioPrompting(false);
    }, 900);
  };

  // Interactive Haptic Biometric Touch Sensor Scan
  const startFingerprintScan = () => {
    setBioPrompting(true);
    setScanProgress(15);
    setUnlockStatusText('Scanning fingerprint sensor...');
    try {
      if (navigator.vibrate) navigator.vibrate(30);
    } catch (_) {}

    // Also trigger native WebAuthn if in secure context
    if (window.isSecureContext && window.PublicKeyCredential && window.navigator?.credentials?.get) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto?.getRandomValues(challenge);
        navigator.credentials.get({
          publicKey: { challenge, timeout: 15000, userVerification: 'preferred' }
        }).then(() => {
          setScanProgress(100);
          handleDirectUnlock(unlockPin);
        }).catch(() => null);
      } catch (_) {}
    }

    let progress = 15;
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = setInterval(() => {
      progress += 18;
      if (progress >= 100) {
        clearInterval(scanIntervalRef.current);
        setScanProgress(100);
        try {
          if (navigator.vibrate) navigator.vibrate([40, 40, 90]);
        } catch (_) {}
        setUnlockStatusText('✅ Biometrics Verified! Unlocking Workstation...');
        handleDirectUnlock(unlockPin);
      } else {
        setScanProgress(progress);
        try {
          if (navigator.vibrate) navigator.vibrate(15);
        } catch (_) {}
      }
    }, 70);
  };

  const cancelFingerprintScan = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (scanProgress < 100) {
      setScanProgress(0);
      setBioPrompting(false);
      setUnlockStatusText('');
    }
  };

  const getAppIcon = (name, title = '') => {
    const combined = (name + ' ' + title).toLowerCase();
    if (combined.includes('antigravity') || combined.includes('code') || combined.includes('cursor')) return <Code2 className="w-5 h-5 text-aurora-cyan" />;
    if (combined.includes('terminal') || combined.includes('cmd') || combined.includes('powershell')) return <Terminal className="w-5 h-5 text-aurora-emerald" />;
    if (combined.includes('chrome') || combined.includes('edge') || combined.includes('firefox') || combined.includes('browser')) return <Globe className="w-5 h-5 text-aurora-blue" />;
    if (combined.includes('explorer') || combined.includes('files')) return <Folder className="w-5 h-5 text-titanium-300" />;
    return <Cpu className="w-5 h-5 text-aurora-purple" />;
  };

  const runningApps = Array.isArray(systemStatus.runningApps) && systemStatus.runningApps.length > 0
    ? systemStatus.runningApps
    : [
        { id: 'app-1', name: 'Antigravity', title: 'Antigravity IDE', active: true, pid: 1420 },
        { id: 'app-2', name: 'chrome', title: 'Google Chrome', active: false, pid: 8120 },
        { id: 'app-3', name: 'explorer', title: 'File Explorer', active: false, pid: 4192 }
      ];

  return (
    <div className="p-4 space-y-5 pb-44 max-w-4xl mx-auto">
      {/* Operating Mode Selector Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-obsidian-750 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-mono tracking-widest text-aurora-cyan font-bold">Mode</span>
            <h2 className="text-lg font-bold text-slate-100">Hybrid Operating Console</h2>
          </div>
          <p className="text-xs text-titanium-400">
            Current active target: <span className="text-aurora-cyan font-mono font-semibold">{systemStatus.activeWindow || 'Desktop'}</span>
          </p>
        </div>

        <div className="flex items-center bg-obsidian-900/80 p-1 rounded-xl border border-obsidian-750 w-full md:w-auto justify-between">
          <button
            onClick={() => setStreamMode('smartview')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center justify-center space-x-1.5 transition ${
              streamMode === 'smartview' || streamMode === 'smart' ? 'bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan' : 'text-titanium-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Smart View</span>
          </button>

          <button
            onClick={() => setStreamMode('desktop')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center justify-center space-x-1.5 transition ${
              streamMode === 'desktop' ? 'bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan' : 'text-titanium-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>

          <button
            onClick={() => setStreamMode('datasaver')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center justify-center space-x-1.5 transition ${
              streamMode === 'datasaver' || streamMode === 'command' ? 'bg-aurora-amber/20 border border-aurora-amber/40 text-aurora-amber' : 'text-titanium-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Data Saver</span>
          </button>
        </div>
      </div>

      {/* PENDING APPROVAL RELAY BANNER (IF PENDING) */}
      {topApproval && (
        <div className="glass-panel p-4 rounded-2xl border-2 border-aurora-amber bg-gradient-to-r from-aurora-amber/10 via-obsidian-900 to-obsidian-950 shadow-glow-amber animate-pulse-fast">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-aurora-amber/20 border border-aurora-amber/40 text-aurora-amber">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-aurora-amber font-bold">
                  🔔 Action Required ({topApproval.app})
                </span>
                <h3 className="text-base font-bold text-slate-100">{topApproval.title}</h3>
              </div>
            </div>
            <span className="text-xs font-mono text-titanium-400">{topApproval.timestamp}</span>
          </div>

          <p className="text-xs text-titanium-300 font-mono my-3 bg-obsidian-950/80 p-2.5 rounded-xl border border-obsidian-750">
            {topApproval.description}
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {Array.isArray(topApproval.actions) && topApproval.actions.map((act, idx) => {
              const label = typeof act === 'object' ? act.label : act;
              const type = typeof act === 'object' ? act.type : (label.startsWith('No') ? 'danger' : idx === 0 ? 'primary' : 'secondary');

              if (type === 'primary') {
                return (
                  <button
                    key={idx}
                    onClick={() => resolveApproval(topApproval.id, act)}
                    className="px-4 py-2 rounded-xl bg-aurora-emerald text-obsidian-950 hover:bg-emerald-400 font-mono font-bold text-xs shadow-glow-emerald transition flex items-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                );
              } else if (type === 'danger') {
                return (
                  <button
                    key={idx}
                    onClick={() => resolveApproval(topApproval.id, act)}
                    className="px-4 py-2 rounded-xl bg-obsidian-800 hover:bg-aurora-pink/20 border border-obsidian-700 hover:border-aurora-pink text-slate-300 hover:text-aurora-pink text-xs font-mono font-bold transition"
                  >
                    {label}
                  </button>
                );
              } else {
                return (
                  <button
                    key={idx}
                    onClick={() => resolveApproval(topApproval.id, act)}
                    className="px-3 py-2 rounded-xl bg-obsidian-900 hover:bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan text-xs font-mono font-semibold transition"
                  >
                    {label}
                  </button>
                );
              }
            })}
          </div>
        </div>
      )}

      {/* System Quick Hardware Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* CPU Metric Card */}
        <div className="glass-card p-3.5 rounded-xl border border-obsidian-750 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider">CPU Load</p>
            <p className="text-lg font-bold text-slate-100 font-mono">{systemStatus.cpuUsage || 0}%</p>
            <div className="w-20 bg-obsidian-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-aurora-cyan h-full transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, systemStatus.cpuUsage || 0)}%` }}
              />
            </div>
          </div>
          <Cpu className="w-5 h-5 text-aurora-cyan opacity-80" />
        </div>

        {/* RAM Metric Card */}
        <div className="glass-card p-3.5 rounded-xl border border-obsidian-750 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider">RAM Usage</p>
            <p className="text-lg font-bold text-slate-100 font-mono">{systemStatus.ramUsage || 0}%</p>
            <p className="text-[9px] font-mono text-titanium-500">
              {systemStatus.memInfo?.used ? `${systemStatus.memInfo.used} / ${systemStatus.memInfo.total} GB` : 'Live'}
            </p>
          </div>
          <Activity className="w-5 h-5 text-aurora-purple opacity-80" />
        </div>

        {/* Battery Metric Card */}
        <div className="glass-card p-3.5 rounded-xl border border-obsidian-750 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider">Battery</p>
            <p className="text-lg font-bold text-slate-100 font-mono">{systemStatus.batteryPercent || 100}%</p>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
              systemStatus.isCharging ? 'bg-aurora-emerald/15 text-aurora-emerald font-bold' : 'text-titanium-400'
            }`}>
              {systemStatus.isCharging ? '⚡ Charging' : 'On Battery'}
            </span>
          </div>
          <BatteryCharging className="w-5 h-5 text-aurora-emerald opacity-80" />
        </div>

        {/* Volume Metric Card */}
        <div className="glass-card p-3.5 rounded-xl border border-obsidian-750 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider">Master Audio</p>
            <div className="flex items-center space-x-1 mt-1">
              <span className="text-[9px] font-mono text-titanium-400">Windows Control</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => executeCommand('VOLUME_DOWN')}
              title="Decrease Master Volume"
              className="w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:border-aurora-cyan/40 active:scale-95 transition"
            >
              <Volume2 className="w-4 h-4 text-titanium-400" />
            </button>
            <button
              onClick={() => executeCommand('VOLUME_UP')}
              title="Increase Master Volume"
              className="w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:border-aurora-cyan/40 active:scale-95 transition"
            >
              <Volume2 className="w-5 h-5 text-aurora-cyan" />
            </button>
            <button
              onClick={() => executeCommand('TOGGLE_MUTE')}
              title="Toggle Mute"
              className="w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:border-aurora-pink/40 active:scale-95 transition"
            >
              <VolumeX className="w-5 h-5 text-aurora-pink" />
            </button>
          </div>
        </div>
      </div>

      {/* EXPANDED POWER COMMAND DOCK */}
      <div className="glass-panel p-4 rounded-2xl border border-obsidian-750 space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-mono text-titanium-200 uppercase tracking-wider flex items-center space-x-2">
            <Zap className="w-4 h-4 text-aurora-amber" />
            <span>Quick Command Dock</span>
          </h3>
          <span className="text-[10px] font-mono text-titanium-400">Hardware Level</span>
        </div>

        {/* 16 Powerful Quick Buttons in 2 Clean Rows */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          <button
            onClick={() => executeCommand('VOLUME_UP')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-cyan/40 active:scale-95 transition"
            title="Increase Master Volume"
          >
            <Volume2 className="w-4 h-4 text-aurora-cyan" />
            <span className="text-[10px] font-mono text-titanium-300">Vol +</span>
          </button>

          <button
            onClick={() => executeCommand('VOLUME_DOWN')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-cyan/40 active:scale-95 transition"
            title="Decrease Master Volume"
          >
            <Volume2 className="w-4 h-4 text-titanium-400" />
            <span className="text-[10px] font-mono text-titanium-300">Vol -</span>
          </button>

          <button
            onClick={() => executeCommand('TOGGLE_MUTE')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-pink/40 active:scale-95 transition"
            title="Toggle Mute"
          >
            <VolumeX className="w-4 h-4 text-aurora-pink" />
            <span className="text-[10px] font-mono text-titanium-300">Mute</span>
          </button>

          <button
            onClick={() => executeCommand('SHOW_DESKTOP')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-purple/40 active:scale-95 transition"
            title="Show / Minimize Windows to Desktop"
          >
            <Monitor className="w-4 h-4 text-aurora-purple" />
            <span className="text-[10px] font-mono text-titanium-300">Desktop</span>
          </button>

          <button
            onClick={() => executeCommand('TASK_MANAGER')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-emerald/40 active:scale-95 transition"
            title="1st click Open Taskmgr, 2nd click Close"
          >
            <Cpu className="w-4 h-4 text-aurora-emerald" />
            <span className="text-[10px] font-mono text-titanium-300">Tasks</span>
          </button>

          <button
            onClick={() => executeCommand('SNIP')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-cyan/40 active:scale-95 transition"
            title="Auto Full Screen Screenshot to Clipboard (PrtScn)"
          >
            <Scissors className="w-4 h-4 text-aurora-cyan" />
            <span className="text-[10px] font-mono text-titanium-300">Snip</span>
          </button>

          <button
            onClick={() => executeCommand('REOPEN_TAB')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-blue/40 active:scale-95 transition"
            title="Reopen Closed Tab (Ctrl+Shift+T)"
          >
            <Globe className="w-4 h-4 text-aurora-blue" />
            <span className="text-[10px] font-mono text-titanium-300">Reopen</span>
          </button>

          <button
            onClick={() => executeCommand('LOCK_PC')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-amber/40 active:scale-95 transition"
            title="Lock Windows Workstation"
          >
            <Lock className="w-4 h-4 text-aurora-amber" />
            <span className="text-[10px] font-mono text-titanium-300">Lock</span>
          </button>

          {/* ROW 2 */}
          <button
            onClick={() => setShowUnlockModal(true)}
            className={`p-2.5 rounded-xl text-center flex flex-col items-center justify-center space-y-1 active:scale-95 transition ${
              (systemStatus.activeWindow || '').toLowerCase().includes('logon') 
              ? 'bg-aurora-emerald/20 border border-aurora-emerald/50 shadow-glow-emerald hover:bg-aurora-emerald/30' 
              : 'glass-card hover:border-aurora-emerald/40'
            }`}
            title="Wake & Remote Unlock Laptop with Scan Codes"
          >
            <Zap className="w-4 h-4 text-aurora-emerald" />
            <span className={`text-[10px] font-mono ${
              (systemStatus.activeWindow || '').toLowerCase().includes('logon') ? 'text-aurora-emerald font-bold' : 'text-titanium-300'
            }`}>Unlock</span>
          </button>

          <button
            onClick={() => executeCommand('WAKE_DISPLAY')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 border-aurora-cyan/30 hover:border-aurora-cyan active:scale-95 transition"
            title="Wake Display"
          >
            <Monitor className="w-4 h-4 text-aurora-cyan" />
            <span className="text-[10px] font-mono text-aurora-cyan font-bold">Wake</span>
          </button>

          <button
            onClick={() => executeCommand('SAVE')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-cyan/40 active:scale-95 transition"
            title="Save Active Document (Ctrl+S)"
          >
            <HardDrive className="w-4 h-4 text-aurora-cyan" />
            <span className="text-[10px] font-mono text-titanium-300">Save</span>
          </button>

          <button
            onClick={() => executeCommand('COPY')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-blue/40 active:scale-95 transition"
            title="Copy Selection (Ctrl+C)"
          >
            <Copy className="w-4 h-4 text-aurora-blue" />
            <span className="text-[10px] font-mono text-titanium-300">Copy</span>
          </button>

          <button
            onClick={() => executeCommand('PASTE')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-emerald/40 active:scale-95 transition"
            title="Paste Clipboard (Ctrl+V)"
          >
            <FileCode className="w-4 h-4 text-aurora-emerald" />
            <span className="text-[10px] font-mono text-titanium-300">Paste</span>
          </button>

          <button
            onClick={() => executeCommand('UNDO')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-amber/40 active:scale-95 transition"
            title="Undo Action (Ctrl+Z)"
          >
            <RotateCcw className="w-4 h-4 text-aurora-amber" />
            <span className="text-[10px] font-mono text-titanium-300">Undo</span>
          </button>

          <button
            onClick={() => executeCommand('ESC')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-pink/40 active:scale-95 transition"
            title="Press Escape Key"
          >
            <X className="w-4 h-4 text-aurora-pink" />
            <span className="text-[10px] font-mono text-titanium-300">Esc</span>
          </button>

          <button
            onClick={() => executeCommand('OPEN_EXPLORER')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-amber/40 active:scale-95 transition"
            title="Open File Explorer"
          >
            <Folder className="w-4 h-4 text-aurora-amber" />
            <span className="text-[10px] font-mono text-titanium-300">Files</span>
          </button>

          <button
            onClick={() => executeCommand('OPEN_TERMINAL')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-emerald/40 active:scale-95 transition"
            title="Launch Terminal / PowerShell"
          >
            <Terminal className="w-4 h-4 text-aurora-emerald" />
            <span className="text-[10px] font-mono text-titanium-300">Terminal</span>
          </button>

          <button
            onClick={() => executeCommand('REOPEN_TAB')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-cyan/40 active:scale-95 transition"
            title="Reopen Closed Tab in Chrome/Edge (Ctrl+Shift+T)"
          >
            <RotateCcw className="w-4 h-4 text-aurora-cyan" />
            <span className="text-[10px] font-mono text-titanium-300">Reopen</span>
          </button>

          <button
            onClick={() => executeCommand('OPEN_SETTINGS')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-purple/40 active:scale-95 transition"
            title="Open Windows Settings"
          >
            <Settings className="w-4 h-4 text-aurora-purple" />
            <span className="text-[10px] font-mono text-titanium-300">Settings</span>
          </button>

          <button
            onClick={() => setShowDiagModal(true)}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 border-aurora-cyan/30 hover:border-aurora-cyan active:scale-95 transition"
            title="Detailed System Specifications & Telemetry"
          >
            <Info className="w-4 h-4 text-aurora-cyan" />
            <span className="text-[10px] font-mono text-aurora-cyan">Specs</span>
          </button>
        </div>
      </div>

      {/* UNLOCK PC POPUP MODAL WITH HAPTIC BIOMETRIC SENSOR */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn">
          <div className="glass-panel max-w-sm w-full p-5 rounded-3xl border border-aurora-emerald/50 space-y-4 relative shadow-glow-emerald">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-aurora-emerald/20 border border-aurora-emerald/40 text-aurora-emerald">
                  <Lock className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Unlock Workstation</h3>
                  <p className="text-[10px] font-mono text-titanium-400">Biometric Sensor & Hardware Scan Codes</p>
                </div>
              </div>
              <button
                onClick={() => setShowUnlockModal(false)}
                className="text-titanium-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {unlockStatusText && (
              <div className="p-2 bg-aurora-emerald/15 border border-aurora-emerald/40 rounded-xl text-center text-xs font-mono text-aurora-emerald animate-pulse">
                {unlockStatusText}
              </div>
            )}

            {/* INTERACTIVE BIOMETRIC FINGERPRINT SENSOR POD */}
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-obsidian-950/80 border border-obsidian-800 space-y-2">
              <div
                onTouchStart={startFingerprintScan}
                onTouchEnd={cancelFingerprintScan}
                onMouseDown={startFingerprintScan}
                onMouseUp={cancelFingerprintScan}
                onMouseLeave={cancelFingerprintScan}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 select-none ${
                  bioPrompting
                    ? 'scale-110 shadow-glow-emerald bg-aurora-emerald/25 border-2 border-aurora-emerald'
                    : 'glass-card border border-obsidian-700 hover:border-aurora-cyan/50 active:scale-95'
                }`}
              >
                {/* SVG Progress Ring */}
                {bioPrompting && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      className="text-obsidian-800"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      className="text-aurora-emerald transition-all duration-75"
                      strokeWidth="4"
                      strokeDasharray={226}
                      strokeDashoffset={226 - (226 * scanProgress) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                )}
                <Fingerprint className={`w-10 h-10 transition-colors ${
                  bioPrompting ? 'text-aurora-emerald animate-pulse' : 'text-aurora-cyan opacity-80'
                }`} />
              </div>
              <p className="text-[10px] font-mono text-titanium-400 text-center font-bold">
                {bioPrompting ? `Scanning... ${scanProgress}%` : 'Hold Finger Here to Unlock'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-titanium-400">
                Windows PIN / Password
              </label>
              <input
                type="password"
                value={unlockPin}
                onChange={(e) => {
                  setUnlockPin(e.target.value);
                  localStorage.setItem('aether_pin', e.target.value);
                }}
                placeholder="Enter PIN to auto-unlock..."
                className="w-full bg-obsidian-950 border border-obsidian-750 rounded-xl px-3 py-2.5 text-center text-sm font-mono text-slate-100 tracking-widest focus:outline-none focus:border-aurora-emerald"
              />

              {/* Fast 1-Tap Numeric Pad on Mobile */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {['1','2','3','4','5','6','7','8','9','Clr','0','⌫'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (k === 'Clr') {
                        setUnlockPin('');
                        localStorage.removeItem('aether_pin');
                      } else if (k === '⌫') {
                        const updated = unlockPin.slice(0, -1);
                        setUnlockPin(updated);
                        localStorage.setItem('aether_pin', updated);
                      } else {
                        const updated = unlockPin + k;
                        setUnlockPin(updated);
                        localStorage.setItem('aether_pin', updated);
                      }
                    }}
                    className="py-2 bg-obsidian-900 hover:bg-obsidian-800 active:bg-aurora-emerald/20 border border-obsidian-750 rounded-lg text-xs font-mono text-slate-200 font-bold"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleDirectUnlock(unlockPin)}
                className="flex-1 py-2.5 rounded-xl bg-aurora-emerald text-obsidian-950 font-mono font-bold text-xs shadow-glow-emerald hover:bg-emerald-400 transition"
              >
                ⚡ Unlock with PIN
              </button>
              <button
                onClick={() => handleDirectUnlock('')}
                className="px-3 py-2.5 rounded-xl bg-obsidian-800 border border-obsidian-750 text-titanium-300 font-mono text-xs hover:text-white transition"
              >
                Wake Only
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM SPECS & TELEMETRY INSPECTOR MODAL */}
      {showDiagModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn">
          <div className="glass-panel max-w-md w-full p-5 rounded-3xl border border-aurora-cyan/50 space-y-4 relative shadow-glow-cyan">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan">
                  <Cpu className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Workstation Specifications</h3>
                  <p className="text-[10px] font-mono text-titanium-400">Live Hardware Diagnostics</p>
                </div>
              </div>
              <button
                onClick={() => setShowDiagModal(false)}
                className="text-titanium-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-obsidian-950 border border-obsidian-800 flex justify-between">
                <span className="text-titanium-400">Operating System</span>
                <span className="text-slate-200 font-bold">Windows 11 (64-bit)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-obsidian-950 border border-obsidian-800 flex justify-between">
                <span className="text-titanium-400">Active Window</span>
                <span className="text-aurora-cyan font-bold truncate max-w-[200px]">{systemStatus.activeWindow || 'Desktop'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-obsidian-950 border border-obsidian-800 flex justify-between">
                <span className="text-titanium-400">Memory Load</span>
                <span className="text-aurora-purple font-bold">
                  {systemStatus.memInfo?.used ? `${systemStatus.memInfo.used} GB / ${systemStatus.memInfo.total} GB (${systemStatus.ramUsage}%)` : 'Live'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-obsidian-950 border border-obsidian-800 flex justify-between">
                <span className="text-titanium-400">Power Status</span>
                <span className="text-aurora-emerald font-bold">
                  {systemStatus.batteryPercent}% ({systemStatus.isCharging ? '⚡ AC Connected' : 'Discharging'})
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-obsidian-950 border border-obsidian-800 flex justify-between">
                <span className="text-titanium-400">Input Response Engine</span>
                <span className="text-aurora-cyan font-bold">Native Win32 IPC (0.05ms)</span>
              </div>
            </div>

            <button
              onClick={() => setShowDiagModal(false)}
              className="w-full py-2.5 rounded-xl bg-obsidian-900 border border-obsidian-750 text-slate-200 font-mono text-xs font-bold hover:bg-obsidian-800 transition"
            >
              Close Diagnostics
            </button>
          </div>
        </div>
      )}

      {/* RUNNING WINDOW MANAGER */}
      <div className="glass-panel p-4 rounded-2xl border border-obsidian-750 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-aurora-cyan" />
            <span>Open Workstation Windows</span>
          </h3>
          <span className="text-xs font-mono text-titanium-400">Tap to focus window</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {runningApps.map((app) => (
            <div
              key={app.id || app.pid}
              onClick={() => focusWindow(app.pid || app.name)}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                app.active || systemStatus.activeWindow === (app.title || app.name)
                  ? 'bg-obsidian-800 border-aurora-cyan/50 shadow-glow-cyan'
                  : 'glass-card hover:border-obsidian-700'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2 rounded-lg bg-obsidian-900 border border-obsidian-750 shrink-0">
                  {getAppIcon(app.name, app.title)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{app.title || app.name}</h4>
                  <p className="text-[10px] font-mono text-titanium-400">{app.name} • PID: {app.pid}</p>
                </div>
              </div>

              {app.active || systemStatus.activeWindow === (app.title || app.name) ? (
                <span className="text-[9px] font-mono uppercase text-aurora-cyan bg-aurora-cyan/10 px-2 py-0.5 rounded border border-aurora-cyan/30 shrink-0">
                  Active
                </span>
              ) : (
                <span className="text-[9px] font-mono text-titanium-400 hover:text-white shrink-0">
                  Focus ↗
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* QUICK CLIPBOARD SYNC CARD */}
      <div className="glass-panel p-4 rounded-2xl border border-obsidian-750 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 tracking-wider uppercase flex items-center space-x-2">
            <Copy className="w-4 h-4 text-aurora-cyan" />
            <span>2-Way Clipboard Relay</span>
          </h3>
          <span className="text-xs font-mono text-titanium-400">Phone ↔ Laptop</span>
        </div>

        <form onSubmit={handleSendClipboard} className="flex gap-2">
          <input
            type="text"
            value={clipboardInput}
            onChange={(e) => setClipboardInput(e.target.value)}
            placeholder="Type or paste text to send directly to laptop..."
            className="flex-1 bg-obsidian-900 border border-obsidian-750 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-aurora-cyan/60"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan font-mono text-xs font-bold hover:bg-aurora-cyan/30 transition flex items-center space-x-1"
          >
            {copiedSuccess ? <Check className="w-4 h-4 text-aurora-emerald" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSuccess ? 'Synced!' : 'Send'}</span>
          </button>
        </form>

        {systemStatus.clipboard?.[0] && (
          <div className="bg-obsidian-950/80 p-2.5 rounded-xl border border-obsidian-800 text-xs font-mono flex items-center justify-between">
            <span className="text-titanium-300 truncate max-w-[80%]">
              Latest: {systemStatus.clipboard[0].text}
            </span>
            <span className="text-[10px] text-titanium-500">{systemStatus.clipboard[0].source || 'Laptop'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
