// src/components/security/PairingModal.jsx
import React, { useState } from 'react';
import { useAether } from '../../context/AetherContext';
import { QrCode, ShieldCheck, X, Copy, Check, ExternalLink, Wifi, Globe, Zap } from 'lucide-react';

export default function PairingModal() {
  const { pairingModalOpen, setPairingModalOpen, tunnelInfo, lanInfo } = useAether();
  const [copiedKey, setCopiedKey] = useState(null);
  const [selectedTab, setSelectedTab] = useState('cloudflare');

  if (!pairingModalOpen) return null;

  const cfUrl = tunnelInfo?.cloudflareUrl || (tunnelInfo?.url?.includes('trycloudflare') ? tunnelInfo?.url : null);
  const ltUrl = tunnelInfo?.localTunnelUrl || (tunnelInfo?.url?.includes('loca.lt') ? tunnelInfo?.url : null);
  const lanIps = lanInfo?.interfaces || [];
  const primaryLan = lanInfo?.primary?.url || (lanIps[0]?.url) || 'http://10.76.52.95:3001';
  const publicIp = tunnelInfo?.publicIp;

  const activeUrl = selectedTab === 'cloudflare'
    ? (cfUrl || tunnelInfo?.url || 'http://localhost:3001')
    : selectedTab === 'localtunnel'
    ? (ltUrl || 'http://localhost:3001')
    : primaryLan;

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeUrl)}&bgcolor=05070c&color=00f2fe&margin=6`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn">
      <div className="glass-panel max-w-md w-full p-5 rounded-3xl border border-aurora-cyan/40 space-y-4 relative shadow-glow-cyan">
        <button
          onClick={() => setPairingModalOpen(false)}
          className="absolute top-4 right-4 text-titanium-400 hover:text-white p-1 rounded-lg hover:bg-obsidian-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan flex items-center justify-center mx-auto shadow-glow-cyan mb-1.5">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Pair Phone with Laptop</h3>
          <p className="text-[11px] text-titanium-400 font-mono">Scan QR Code with your phone camera or open link</p>
        </div>

        {/* Connection Type Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-obsidian-950 border border-obsidian-800 rounded-xl">
          <button
            onClick={() => setSelectedTab('cloudflare')}
            className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition flex items-center justify-center gap-1 ${
              selectedTab === 'cloudflare'
                ? 'bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan'
                : 'text-titanium-400 hover:text-white'
            }`}
          >
            <Globe className="w-3 h-3" /> Cloudflare
          </button>
          <button
            onClick={() => setSelectedTab('lan')}
            className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition flex items-center justify-center gap-1 ${
              selectedTab === 'lan'
                ? 'bg-aurora-emerald/20 border border-aurora-emerald/40 text-aurora-emerald'
                : 'text-titanium-400 hover:text-white'
            }`}
          >
            <Wifi className="w-3 h-3" /> Hotspot/LAN
          </button>
          <button
            onClick={() => setSelectedTab('localtunnel')}
            className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition flex items-center justify-center gap-1 ${
              selectedTab === 'localtunnel'
                ? 'bg-aurora-amber/20 border border-aurora-amber/40 text-aurora-amber'
                : 'text-titanium-400 hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3" /> LocalTunnel
          </button>
        </div>

        {/* Real Dynamic QR Code */}
        <div className="flex flex-col items-center justify-center">
          <div className="p-2 bg-obsidian-950 rounded-2xl border-2 border-aurora-cyan/40 shadow-xl">
            <img
              src={qrSrc}
              alt="Scan QR code to connect phone"
              className="w-40 h-40 rounded-xl"
            />
          </div>
          <span className="text-[9px] font-mono text-titanium-500 mt-1">Live pairing QR for active link</span>
        </div>

        {/* Active URL Copy Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between bg-obsidian-950 border border-obsidian-750 p-2 rounded-xl text-xs font-mono">
            <span className="text-aurora-cyan truncate flex-1 mr-2">{activeUrl}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => copyToClipboard(activeUrl, 'active_url')}
                className="p-1.5 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 text-titanium-300 hover:text-white transition"
                title="Copy link"
              >
                {copiedKey === 'active_url' ? <Check className="w-3.5 h-3.5 text-aurora-emerald" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={activeUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 text-titanium-300 hover:text-white transition"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {selectedTab === 'localtunnel' && publicIp && (
            <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-[10px] font-mono text-amber-300 flex items-center justify-between">
              <span>LocalTunnel Password / Bypass IP: <strong className="text-white">{publicIp}</strong></span>
              <button
                onClick={() => copyToClipboard(publicIp, 'public_ip')}
                className="p-1 rounded bg-obsidian-900 text-titanium-300 hover:text-white"
              >
                {copiedKey === 'public_ip' ? <Check className="w-3 h-3 text-aurora-emerald" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>

        <div className="p-2.5 bg-obsidian-950 rounded-xl border border-obsidian-800 text-[11px] font-mono text-aurora-emerald flex items-center justify-center space-x-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Device Identity Verified (GODKUNN-LAPTOP)</span>
        </div>
      </div>
    </div>
  );
}
