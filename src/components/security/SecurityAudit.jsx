// src/components/security/SecurityAudit.jsx
import React from 'react';
import { useAether } from '../../context/AetherContext';
import { ShieldCheck, ShieldAlert, Wifi, Activity, Smartphone, QrCode, Lock, CheckCircle2 } from 'lucide-react';

export default function SecurityAudit() {
  const { systemStatus, toggleKillSwitch, setPairingModalOpen, logs, tunnelInfo } = useAether();
  const isKillSwitch = systemStatus.isKillSwitchActive;
  const telemetry = systemStatus.telemetry || {};
  const tunnel = tunnelInfo || {};

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5 pb-24">
      {/* Header */}
      <div className="glass-panel p-4 rounded-2xl border border-obsidian-750 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl border ${isKillSwitch ? 'bg-aurora-pink/20 border-aurora-pink/40 text-aurora-pink' : 'bg-aurora-emerald/20 border-aurora-emerald/40 text-aurora-emerald'} shadow-glow-emerald`}>
            {isKillSwitch ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Security & AETHER LINK Telemetry</h2>
            <p className="text-xs text-titanium-400 font-mono">
              Network health auto-tuning, device identity & audit logs
            </p>
          </div>
        </div>

        <button
          onClick={() => setPairingModalOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan font-mono text-xs font-bold hover:bg-aurora-cyan/30 transition flex items-center space-x-1"
        >
          <QrCode className="w-4 h-4" />
          <span>Pair Phone</span>
        </button>
      </div>

      {/* CLOUDFLARE TUNNEL & LOCALTUNNEL FAILSAFE CARD */}
      <div className="glass-panel p-4 rounded-2xl border border-aurora-cyan/40 bg-gradient-to-r from-aurora-cyan/10 via-obsidian-900 to-obsidian-950 space-y-3 shadow-glow-cyan">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-aurora-cyan" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
              Secure Transport Tunnel Status
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-aurora-emerald/20 text-aurora-emerald border border-aurora-emerald/40">
            {tunnel.status || 'Active'}
          </span>
        </div>

        <div className="bg-obsidian-950 p-3 rounded-xl border border-obsidian-800 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between items-center text-titanium-400 text-[11px]">
            <span>TUNNEL MODE</span>
            <span className="text-aurora-cyan font-bold">{tunnel.mode || 'Cloudflare / LocalTunnel Fallback'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-200">
            <span>PUBLIC ENDPOINT:</span>
            <span className="text-aurora-emerald font-bold truncate max-w-[240px]">{tunnel.url || 'http://localhost:3001'}</span>
          </div>
        </div>

        <p className="text-[11px] font-mono text-titanium-400">
          🛡️ <span className="text-slate-200 font-semibold">Automatic Failover Protection:</span> Primary transport runs via Cloudflare Quick Tunnel. If Cloudflare connection drops or hotspot fluctuates, localtunnel automatically takes over as a protected secondary fallback.
        </p>
      </div>

      {/* AETHER LINK Telemetry Gauge Grid */}
      <div className="glass-panel p-4 rounded-2xl border border-obsidian-750 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <Wifi className="w-4 h-4 text-aurora-cyan" />
            <span>AETHER LINK Telemetry Gauge</span>
          </h3>
          <span className="text-xs font-mono text-aurora-emerald">Signal: {telemetry.signalQuality || 'Excellent'}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-obsidian-950 p-3 rounded-xl border border-obsidian-800 font-mono">
            <span className="text-[10px] text-titanium-400 uppercase">Latency</span>
            <p className="text-lg font-bold text-aurora-emerald">{telemetry.latency || 24} ms</p>
          </div>

          <div className="bg-obsidian-950 p-3 rounded-xl border border-obsidian-800 font-mono">
            <span className="text-[10px] text-titanium-400 uppercase">Wi-Fi RSSI</span>
            <p className="text-lg font-bold text-aurora-cyan">{telemetry.rssi || -58} dBm</p>
          </div>

          <div className="bg-obsidian-950 p-3 rounded-xl border border-obsidian-800 font-mono">
            <span className="text-[10px] text-titanium-400 uppercase">Bandwidth</span>
            <p className="text-lg font-bold text-aurora-purple">{telemetry.bandwidth || 84.5} Mbps</p>
          </div>

          <div className="bg-obsidian-950 p-3 rounded-xl border border-obsidian-800 font-mono">
            <span className="text-[10px] text-titanium-400 uppercase">Packet Loss</span>
            <p className="text-lg font-bold text-slate-200">{telemetry.packetLoss || 0.1}%</p>
          </div>
        </div>

        {/* Auto-Tuning Info Box */}
        <div className="bg-obsidian-950/80 p-3 rounded-xl border border-obsidian-800 text-xs font-mono text-titanium-300 space-y-1">
          <span className="text-aurora-cyan font-bold">⚡ Smart Bitrate Auto-Tuning Active:</span>
          <p>
            System monitors hotspot telemetry. If latency exceeds 60ms, stream quality automatically scales down to 720p/540p to keep remote pointer control low-latency.
          </p>
        </div>
      </div>

      {/* Security Kill Switch Card */}
      <div className="glass-panel p-4 rounded-2xl border border-obsidian-750 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Emergency Security Kill Switch</h3>
          <p className="text-xs text-titanium-400 font-mono">
            Instantly drop all remote input listeners and freeze control daemon.
          </p>
        </div>

        <button
          onClick={() => toggleKillSwitch(!isKillSwitch)}
          className={`px-4 py-2 rounded-xl font-mono font-bold text-xs transition ${
            isKillSwitch 
              ? 'bg-aurora-pink border border-aurora-pink text-white shadow-glow-danger' 
              : 'bg-obsidian-800 border border-obsidian-700 text-titanium-300 hover:text-white'
          }`}
        >
          {isKillSwitch ? 'PAUSED' : 'ACTIVATE KILL SWITCH'}
        </button>
      </div>

      {/* Trusted Devices List */}
      <div className="glass-panel p-4 rounded-2xl border border-obsidian-750 space-y-3">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Paired Mobile Devices</h3>

        <div className="bg-obsidian-950 p-3 rounded-xl border border-obsidian-800 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center space-x-3">
            <Smartphone className="w-5 h-5 text-aurora-cyan" />
            <div>
              <p className="text-slate-200 font-bold">Ayush Phone (Mobile Controller)</p>
              <p className="text-[10px] text-titanium-400">Session ID: sess_891274 • Connected via Cloudflare</p>
            </div>
          </div>
          <span className="text-[10px] text-aurora-emerald bg-aurora-emerald/10 px-2 py-0.5 rounded border border-aurora-emerald/30 font-bold flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>TRUSTED</span>
          </span>
        </div>
      </div>

      {/* Timestamped Session Audit Log */}
      <div className="glass-panel p-4 rounded-2xl border border-obsidian-750 space-y-3">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Session Audit Trail</h3>

        <div className="bg-black p-3 rounded-xl border border-obsidian-800 font-mono text-xs max-h-60 overflow-y-auto space-y-1.5">
          {logs.map((log) => (
            <div key={log.id} className="text-titanium-300 flex items-start space-x-2">
              <span className="text-titanium-400 text-[10px] min-w-[55px]">[{log.time}]</span>
              <span className="text-aurora-cyan font-bold">[{log.category}]</span>
              <span className="text-slate-200">{log.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
