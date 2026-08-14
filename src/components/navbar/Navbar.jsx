// src/components/navbar/Navbar.jsx
import React from 'react';
import { useAether } from '../../context/AetherContext';
import { Laptop, ShieldAlert, ShieldCheck, Wifi, QrCode, Bell, Eye, EyeOff } from 'lucide-react';

export default function Navbar() {
  const {
    connected, systemStatus, toggleKillSwitch, setPairingModalOpen,
    setActiveTab, activeTab, lanInfo, screenshareActive, setScreenshareActive, screenFps
  } = useAether();

  const pendingCount = systemStatus.pendingApprovals?.length || 0;
  const isKillSwitch = systemStatus.isKillSwitchActive;
  const latency = systemStatus.telemetry?.latency || '--';
  const lanIp = lanInfo?.interfaces?.[0]?.ip;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-obsidian-750 px-3 py-2 flex items-center justify-between shadow-2xl gap-2">
      {/* Brand */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-aurora-cyan/20 to-aurora-purple/20 border border-aurora-cyan/30 flex items-center justify-center">
            <Laptop className="w-4 h-4 text-aurora-cyan" />
          </div>
          <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-obsidian-950 ${
            isKillSwitch ? 'bg-red-500' : connected ? 'bg-aurora-emerald' : 'bg-yellow-500'
          }`} />
        </div>
        <div className="min-w-0">
          <h1 className="font-black text-sm tracking-widest text-slate-100 uppercase leading-none">
            AETHER <span className="text-aurora-cyan">CONTROL</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {lanIp && (
              <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-aurora-emerald/15 text-aurora-emerald border border-aurora-emerald/20 flex items-center gap-0.5">
                <Wifi className="w-2 h-2" /> LAN {lanIp}
              </span>
            )}
            <span className={`text-[9px] font-mono ${connected ? 'text-aurora-emerald' : 'text-yellow-400'}`}>
              {connected ? '● ONLINE' : '○ RECONNECTING'}
            </span>
            <span className="text-[9px] font-mono text-titanium-500">{latency}ms</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Screenshare quick toggle */}
        <button
          onClick={() => {
            if (activeTab !== 'desktop') {
              setScreenshareActive(true);
              setActiveTab('desktop');
            } else {
              setScreenshareActive(!screenshareActive);
            }
          }}
          className={`p-1.5 rounded-lg border transition text-[10px] font-mono flex items-center gap-1 ${
            screenshareActive
              ? 'bg-aurora-cyan/20 border-aurora-cyan text-aurora-cyan'
              : 'glass-card text-titanium-400 hover:text-white'
          }`}
          title="Toggle Live Screen (ON/OFF)"
        >
          {screenshareActive ? <Eye className="w-3.5 h-3.5 text-aurora-cyan" /> : <EyeOff className="w-3.5 h-3.5 text-titanium-400" />}
          {screenshareActive && screenFps > 0 && <span className="hidden sm:inline text-[9px] font-bold">{screenFps}fps</span>}
        </button>

        {/* Approvals badge */}
        <button
          onClick={() => setActiveTab('approvals')}
          className={`relative p-1.5 rounded-lg border transition ${
            pendingCount > 0
              ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse'
              : 'glass-card text-titanium-400 hover:text-white'
          }`}
          title="Approval Center"
        >
          <Bell className="w-3.5 h-3.5" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[8px] w-4 h-4 rounded-full flex items-center justify-center border border-obsidian-950">
              {pendingCount}
            </span>
          )}
        </button>

        {/* QR Pair */}
        <button
          onClick={() => setPairingModalOpen(true)}
          className="p-1.5 rounded-lg glass-card text-titanium-400 hover:text-aurora-cyan transition"
          title="Pair Phone"
        >
          <QrCode className="w-3.5 h-3.5" />
        </button>

        {/* Kill switch */}
        <button
          onClick={() => toggleKillSwitch(!isKillSwitch)}
          className={`px-2 py-1.5 rounded-lg border font-mono font-bold text-[10px] flex items-center gap-1 transition ${
            isKillSwitch
              ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
              : 'glass-card border-obsidian-700 text-titanium-300 hover:text-white'
          }`}
        >
          {isKillSwitch
            ? <><ShieldAlert className="w-3 h-3" /><span className="hidden sm:inline">PAUSED</span></>
            : <><ShieldCheck className="w-3 h-3 text-aurora-emerald" /><span className="hidden sm:inline">SECURE</span></>
          }
        </button>
      </div>
    </header>
  );
}
