// src/components/dashboard/Dashboard.jsx
import React, { useState } from 'react';
import { useAether } from '../../context/AetherContext';
import {
  Monitor, Zap, Shield, Volume2, VolumeX, Lock, Cpu, Eye,
  Copy, Check, AlertTriangle, ArrowUpRight, Code2, Terminal, Globe, FileCode, Folder, Activity, BatteryCharging
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

  const getAppIcon = (name) => {
    if (name.includes('Antigravity')) return <Code2 className="w-5 h-5 text-aurora-cyan" />;
    if (name.includes('Codex') || name.includes('Terminal')) return <Terminal className="w-5 h-5 text-aurora-emerald" />;
    if (name.includes('Chrome')) return <Globe className="w-5 h-5 text-aurora-blue" />;
    if (name.includes('VS Code')) return <FileCode className="w-5 h-5 text-aurora-purple" />;
    return <Folder className="w-5 h-5 text-titanium-300" />;
  };

  return (
    <div className="p-4 space-y-5 pb-24 max-w-4xl mx-auto">
      {/* Operating Mode Selector Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-obsidian-750 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-mono tracking-widest text-aurora-cyan font-bold">Mode</span>
            <h2 className="text-lg font-bold text-slate-100">Hybrid Operating Console</h2>
          </div>
          <p className="text-xs text-titanium-400">
            Current active target: <span className="text-aurora-cyan font-mono font-semibold">{systemStatus.activeWindow}</span>
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
        <div className="glass-card p-3 rounded-xl border border-obsidian-750 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider">CPU Load</p>
            <p className="text-lg font-bold text-slate-100 font-mono">{systemStatus.cpuUsage}%</p>
          </div>
          <Cpu className="w-5 h-5 text-aurora-cyan opacity-80" />
        </div>

        <div className="glass-card p-3 rounded-xl border border-obsidian-750 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider">RAM Usage</p>
            <p className="text-lg font-bold text-slate-100 font-mono">{systemStatus.ramUsage}%</p>
          </div>
          <Activity className="w-5 h-5 text-aurora-purple opacity-80" />
        </div>

        <div className="glass-card p-3 rounded-xl border border-obsidian-750 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider">Battery</p>
            <p className="text-lg font-bold text-slate-100 font-mono">{systemStatus.batteryPercent}%</p>
          </div>
          <BatteryCharging className="w-5 h-5 text-aurora-emerald opacity-80" />
        </div>

        <div className="glass-card p-3 rounded-xl border border-obsidian-750 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider">Volume</p>
            <p className="text-lg font-bold text-slate-100 font-mono">
              {systemStatus.isMuted ? 'Muted' : `${systemStatus.volume}%`}
            </p>
          </div>
          {systemStatus.isMuted ? (
            <VolumeX className="w-5 h-5 text-aurora-pink" />
          ) : (
            <Volume2 className="w-5 h-5 text-aurora-blue" />
          )}
        </div>
      </div>

      {/* QUICK COMMAND DOCK */}
      <div className="glass-panel p-4 rounded-2xl border border-obsidian-750 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 tracking-wider uppercase flex items-center space-x-2">
            <Zap className="w-4 h-4 text-aurora-amber" />
            <span>Quick Command Dock</span>
          </h3>
          <span className="text-[10px] font-mono text-titanium-400">Zero Bandwidth</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          <button
            onClick={() => executeCommand('VOLUME_UP')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-cyan/40"
          >
            <Volume2 className="w-4 h-4 text-aurora-cyan" />
            <span className="text-[10px] font-mono text-titanium-300">Vol +</span>
          </button>

          <button
            onClick={() => executeCommand('VOLUME_DOWN')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-cyan/40"
          >
            <Volume2 className="w-4 h-4 text-titanium-400" />
            <span className="text-[10px] font-mono text-titanium-300">Vol -</span>
          </button>

          <button
            onClick={() => executeCommand('TOGGLE_MUTE')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-pink/40"
          >
            <VolumeX className="w-4 h-4 text-aurora-pink" />
            <span className="text-[10px] font-mono text-titanium-300">Mute</span>
          </button>

          <button
            onClick={() => executeCommand('SHOW_DESKTOP')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-purple/40"
          >
            <Monitor className="w-4 h-4 text-aurora-purple" />
            <span className="text-[10px] font-mono text-titanium-300">Desktop</span>
          </button>

          <button
            onClick={() => executeCommand('TASK_MANAGER')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-emerald/40"
          >
            <Cpu className="w-4 h-4 text-aurora-emerald" />
            <span className="text-[10px] font-mono text-titanium-300">Tasks</span>
          </button>

          <button
            onClick={() => executeCommand('LOCK_PC')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 hover:border-aurora-amber/40"
          >
            <Lock className="w-4 h-4 text-aurora-amber" />
            <span className="text-[10px] font-mono text-titanium-300">Lock</span>
          </button>

          <button
            onClick={() => triggerTestApproval('Antigravity IDE')}
            className="p-2.5 rounded-xl glass-card text-center flex flex-col items-center justify-center space-y-1 border-aurora-cyan/30 hover:border-aurora-cyan"
            title="Simulate incoming approval prompt"
          >
            <Shield className="w-4 h-4 text-aurora-cyan" />
            <span className="text-[10px] font-mono text-aurora-cyan">Test Appr</span>
          </button>

          <button
            onClick={() => setActiveTab('desktop')}
            className="p-2.5 rounded-xl glass-panel-active text-center flex flex-col items-center justify-center space-y-1"
          >
            <ArrowUpRight className="w-4 h-4 text-aurora-cyan" />
            <span className="text-[10px] font-mono text-aurora-cyan font-bold">Remote UI</span>
          </button>
        </div>
      </div>

      {/* RUNNING WINDOW MANAGER */}
      <div className="glass-panel p-4 rounded-2xl border border-obsidian-750 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 tracking-wider uppercase">
            Running Application Switcher
          </h3>
          <span className="text-xs font-mono text-titanium-400">Tap to focus window</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {systemStatus.runningApps.map((app) => (
            <div
              key={app.id}
              onClick={() => focusWindow(app.name)}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                app.active
                  ? 'bg-obsidian-800 border-aurora-cyan/50 shadow-glow-cyan'
                  : 'glass-card hover:border-obsidian-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-obsidian-900 border border-obsidian-750">
                  {getAppIcon(app.name)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{app.name}</h4>
                  <p className="text-[10px] font-mono text-titanium-400">PID: {app.pid}</p>
                </div>
              </div>

              {app.active ? (
                <span className="text-[10px] font-mono uppercase text-aurora-cyan bg-aurora-cyan/10 px-2 py-0.5 rounded border border-aurora-cyan/30">
                  Focused
                </span>
              ) : (
                <span className="text-[10px] font-mono text-titanium-400 hover:text-white">
                  Bring to front
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
            <span className="text-[10px] text-titanium-400">({systemStatus.clipboard[0].source})</span>
          </div>
        )}
      </div>
    </div>
  );
}
