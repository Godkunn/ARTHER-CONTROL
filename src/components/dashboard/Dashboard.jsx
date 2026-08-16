// src/components/dashboard/Dashboard.jsx
import React, { useState, useRef } from 'react';
import { useAether } from '../../context/AetherContext';
import {
  Monitor, Zap, Shield, Volume2, VolumeX, Lock, Cpu, Eye, Download,
  Copy, Check, AlertTriangle, ArrowUpRight, Code2, Terminal, Globe, FileCode, Folder, Activity, BatteryCharging, RefreshCw, RotateCcw, Fingerprint, Scissors, Maximize, Plus, X, Settings, HardDrive, Info, Sparkles, CornerDownLeft
} from 'lucide-react';

export default function Dashboard() {
  const {
    systemStatus,
    setSystemStatus,
    streamMode,
    setStreamMode,
    setActiveTab,
    focusWindow,
    executeCommand,
    addClipboard
  } = useAether();

  const [clipboardInput, setClipboardInput] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [showDiagModal, setShowDiagModal] = useState(false);

  const handleSendClipboard = (e) => {
    e.preventDefault();
    if (!clipboardInput.trim()) return;
    addClipboard(clipboardInput.trim());
    setClipboardInput('');
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
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

      {/* System Quick Hardware Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* CPU Metric Card (Interactive Cool Down) */}
        <div 
          onClick={() => executeCommand('REDUCE_CPU_LOAD')}
          className="glass-card p-3.5 rounded-xl border border-obsidian-750 flex items-center justify-between cursor-pointer hover:border-aurora-cyan/40 active:scale-95 transition group"
          title="Tap to Cool Down CPU & Optimize Tasks"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider group-hover:text-aurora-cyan transition">CPU (Tap to Cool Down)</p>
            <p className="text-lg font-bold text-slate-100 font-mono">{systemStatus.cpuUsage || 0}%</p>
            <div className="w-20 bg-obsidian-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-aurora-cyan h-full transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, systemStatus.cpuUsage || 0)}%` }}
              />
            </div>
          </div>
          <Cpu className="w-5 h-5 text-aurora-cyan opacity-80 group-hover:opacity-100 group-hover:scale-110 transition" />
        </div>

        {/* RAM Metric Card */}
        <div 
          onClick={() => executeCommand('CLEAR_RAM')}
          className="glass-card p-3.5 rounded-xl border border-obsidian-750 flex items-center justify-between cursor-pointer hover:border-aurora-purple/40 active:scale-95 transition group"
          title="Tap to Optimize & Free Memory"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider group-hover:text-aurora-purple transition">RAM Usage (Tap to Clear)</p>
            <p className="text-lg font-bold text-slate-100 font-mono">{systemStatus.ramUsage || 0}%</p>
            <p className="text-[9px] font-mono text-titanium-500">
              {systemStatus.memInfo?.used ? `${systemStatus.memInfo.used} / ${systemStatus.memInfo.total} GB` : 'Live'}
            </p>
          </div>
          <Activity className="w-5 h-5 text-aurora-purple opacity-80 group-hover:opacity-100 group-hover:scale-110 transition" />
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

        {/* Master Audio Metric Card - Dynamic Silent / Red State on Mute */}
        <div className={`px-3 py-2.5 rounded-xl border flex items-center gap-2 overflow-hidden transition-all duration-300 ${
          systemStatus.isMuted
            ? 'bg-aurora-pink/15 border-aurora-pink/60 shadow-glow-pink'
            : 'glass-card border-obsidian-750'
        }`}>
          {/* Mute toggle icon — animated swap on mute/unmute */}
          <button
            onClick={() => {
              executeCommand('TOGGLE_MUTE');
            }}
            title={systemStatus.isMuted ? 'Click to Unmute' : 'Click to Mute'}
            className={`p-2 rounded-xl shrink-0 transition-all duration-200 active:scale-90 ${
              systemStatus.isMuted
                ? 'bg-aurora-pink text-obsidian-950 font-bold shadow-lg shadow-aurora-pink/40 animate-pulse'
                : 'bg-obsidian-850 border border-obsidian-700 text-aurora-cyan hover:border-aurora-pink/40'
            }`}
          >
            <div className="relative w-4 h-4 flex items-center justify-center">
              {systemStatus.isMuted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-aurora-cyan" />
              )}
            </div>
          </button>
          {/* Volume label */}
          <div className="min-w-0 flex-1">
            <p className={`text-[9px] font-mono uppercase tracking-wider leading-none font-bold ${
              systemStatus.isMuted ? 'text-aurora-pink' : 'text-titanium-400'
            }`}>
              Master Audio
            </p>
            <p className={`text-sm font-bold font-mono leading-tight mt-0.5 transition-colors duration-200 ${
              systemStatus.isMuted ? 'text-aurora-pink font-extrabold' : 'text-slate-100'
            }`}>
              {systemStatus.isMuted ? 'MUTED' : `${systemStatus.volume || 75}%`}
            </p>
          </div>
          {/* Vol down / up compact buttons */}
          <button
            onClick={() => {
              executeCommand('VOLUME_DOWN');
              setSystemStatus(prev => ({ ...prev, volume: Math.max(0, (prev.volume || 0) - 2) }));
            }}
            title="Decrease Volume"
            className="w-7 h-7 rounded-lg glass-card flex items-center justify-center hover:border-aurora-cyan/40 hover:bg-white/5 active:scale-90 transition text-titanium-300 hover:text-white font-mono text-sm font-bold shrink-0"
          >−</button>
          <button
            onClick={() => {
              executeCommand('VOLUME_UP');
              setSystemStatus(prev => ({ ...prev, volume: Math.min(100, (prev.volume || 0) + 2) }));
            }}
            title="Increase Volume"
            className="w-7 h-7 rounded-lg glass-card flex items-center justify-center hover:border-aurora-cyan/40 hover:bg-white/5 active:scale-90 transition text-aurora-cyan hover:text-cyan-300 font-mono text-sm font-bold shrink-0"
          >+</button>
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

        {/* 16 Powerful Quick Buttons in 4x4 Clean Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
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
            onClick={() => executeCommand('UNLOCK_PC')}
            className={`p-2.5 rounded-xl text-center flex flex-col items-center justify-center space-y-1 active:scale-95 transition ${
              systemStatus.isLocked
              ? 'bg-aurora-cyan/25 border border-aurora-cyan shadow-glow-cyan hover:bg-aurora-cyan/35' 
              : 'glass-card hover:border-aurora-cyan/40'
            }`}
            title="Wake Display Only (PIN Injection Disabled for Safety)"
          >
            <Zap className="w-4 h-4 text-aurora-cyan" />
            <span className={`text-[10px] font-mono ${
              systemStatus.isLocked ? 'text-aurora-cyan font-bold' : 'text-titanium-300'
            }`}>Wake</span>
          </button>

          <button
            onClick={() => executeCommand('ENTER')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-cyan/40 active:scale-95 transition"
            title="Press Enter"
          >
            <CornerDownLeft className="w-4 h-4 text-aurora-cyan" />
            <span className="text-[10px] font-mono text-titanium-300">Enter</span>
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

        {/* Clipboard items list (Text + Image support) */}
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          {(systemStatus.clipboard && systemStatus.clipboard.length > 0) ? (
            systemStatus.clipboard.slice(0, 8).map((item, idx) => (
              <div key={item.id || idx} className="bg-obsidian-950/80 p-2.5 rounded-xl border border-obsidian-800 text-xs font-mono flex items-center justify-between gap-2">
                {item.type === 'image' && item.data ? (
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={`data:image/jpeg;base64,${item.data}`}
                      alt="Copied screenshot"
                      className="w-14 h-10 object-cover rounded-lg border border-obsidian-700 shrink-0 shadow"
                    />
                    <div className="min-w-0">
                      <p className="text-slate-200 font-bold text-[11px] truncate">📸 Copied Image / Screenshot</p>
                      <p className="text-[10px] text-titanium-500">{item.time || 'Live'} • {item.source || 'Laptop'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="text-titanium-200 truncate font-mono">{item.text}</p>
                    <p className="text-[9px] text-titanium-500">{item.time || 'Live'} • {item.source || 'Laptop'}</p>
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.type === 'image' && item.data ? (
                    <a
                      href={`data:image/jpeg;base64,${item.data}`}
                      download={`clipboard_image_${Date.now()}.jpg`}
                      className="px-2.5 py-1.5 rounded-lg bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan hover:bg-aurora-cyan/30 text-[10px] font-mono font-bold flex items-center gap-1 transition shadow-glow-cyan"
                    >
                      <Download className="w-3 h-3" />
                      <span>Save</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(item.text);
                          setCopiedSuccess(true);
                          setTimeout(() => setCopiedSuccess(false), 2000);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-750 text-titanium-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-obsidian-950/80 p-2.5 rounded-xl border border-obsidian-800 text-xs font-mono text-center text-titanium-500">
              Clipboard is empty. Copy text or take a screenshot on laptop to view here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
