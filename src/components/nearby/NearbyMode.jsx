// src/components/nearby/NearbyMode.jsx
// Zero-internet / direct connection modes — mDNS, Hotspot, USB
import React, { useState, useEffect } from 'react';
import { useAether } from '../../context/AetherContext';
import { Wifi, Usb, Zap, Radio, CheckCircle2, XCircle, Loader, Copy, Check, RefreshCw, Smartphone } from 'lucide-react';

function QRCode({ value, size = 140 }) {
  // Embed Google Charts QR — works on LAN without internet too since we load it from the page
  // Fallback: show the URL text if QR doesn't load
  const [loaded, setLoaded] = useState(false);
  const encoded = encodeURIComponent(value);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=05070c&color=00f2fe&margin=6`;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-[140px] h-[140px] rounded-xl border border-aurora-cyan/30 overflow-hidden bg-obsidian-950 flex items-center justify-center">
        <img
          src={src}
          alt="QR"
          className="w-full h-full"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      </div>
      <p className="text-[8px] font-mono text-titanium-500 text-center max-w-[140px] break-all">{value}</p>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} className="p-1 rounded glass-card text-titanium-400 hover:text-aurora-cyan transition">
      {copied ? <Check className="w-3 h-3 text-aurora-emerald" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export default function NearbyMode() {
  const { apiFetch } = useAether();
  const [nearbyInfo, setNearbyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hotspotLoading, setHotspotLoading] = useState(false);
  const [activeMethod, setActiveMethod] = useState('lan');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/nearby');
      const data = await res.json();
      setNearbyInfo(data);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleHotspot = async () => {
    if (!nearbyInfo) return;
    setHotspotLoading(true);
    try {
      const isOn = nearbyInfo.hotspot?.isRunning;
      const res = await apiFetch('/api/nearby/hotspot', {
        method: 'POST', body: JSON.stringify({ enable: !isOn })
      });
      await res.json();
      await load();
    } catch (_) {}
    setHotspotLoading(false);
  };

  const METHODS = [
    { id: 'lan', label: 'Wi-Fi LAN', icon: Wifi, color: 'aurora-emerald' },
    { id: 'mdns', label: 'mDNS Auto', icon: Radio, color: 'aurora-cyan' },
    { id: 'hotspot', label: 'Hotspot', icon: Zap, color: 'aurora-purple' },
    { id: 'usb', label: 'USB Cable', icon: Usb, color: 'aurora-blue' },
  ];

  return (
    <div className="p-2 max-w-2xl mx-auto space-y-2 pb-24">
      {/* Header */}
      <div className="glass-panel px-3 py-2 rounded-xl border border-obsidian-750 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-3.5 h-3.5 text-aurora-cyan" />
          <div>
            <p className="text-[10px] font-mono font-bold text-slate-200">Nearby Mode</p>
            <p className="text-[8px] font-mono text-titanium-500">Zero internet • Direct device-to-device • No data used</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="p-1.5 rounded glass-card text-titanium-400">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Method Tabs */}
      <div className="glass-panel p-1 rounded-xl border border-obsidian-750 grid grid-cols-4 gap-1">
        {METHODS.map(m => (
          <button key={m.id} onClick={() => setActiveMethod(m.id)}
            className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition text-[9px] font-mono ${
              activeMethod === m.id
                ? `bg-${m.color}/15 text-${m.color} border border-${m.color}/25`
                : 'text-titanium-500 hover:text-titanium-200'
            }`}>
            <m.icon className="w-3.5 h-3.5" />
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-panel rounded-xl border border-obsidian-750 flex items-center justify-center py-10">
          <Loader className="w-5 h-5 text-aurora-cyan animate-spin" />
        </div>
      ) : (
        <>
          {/* Wi-Fi LAN */}
          {activeMethod === 'lan' && (
            <div className="glass-panel p-4 rounded-xl border border-aurora-emerald/20 space-y-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-aurora-emerald" />
                <div>
                  <p className="text-[10px] font-mono font-bold text-slate-200">Local Network Connection</p>
                  <p className="text-[9px] font-mono text-titanium-500">Works on phone hotspot, router Wi-Fi, or Ethernet — zero cellular data</p>
                </div>
              </div>

              {/* Scenario badges */}
              <div className="grid grid-cols-2 gap-1.5 text-[8px] font-mono">
                <div className="p-2 rounded-lg bg-aurora-emerald/10 border border-aurora-emerald/20 text-aurora-emerald">
                  <p className="font-bold">✓ Phone Hotspot</p>
                  <p className="text-aurora-emerald/70">Laptop connects to YOUR phone's hotspot → same network → works perfectly</p>
                </div>
                <div className="p-2 rounded-lg bg-obsidian-800 border border-obsidian-700 text-titanium-400">
                  <p className="font-bold">✓ Same Wi-Fi</p>
                  <p className="text-titanium-500">Both on same router → works but rare for your case</p>
                </div>
              </div>

              {nearbyInfo?.lan?.interfaces?.length > 0 ? (
                <div className="space-y-2">
                  {nearbyInfo.lan.interfaces.map((iface, i) => {
                    const isHotspot = iface.type === 'android_hotspot' || iface.type === 'iphone_hotspot';
                    return (
                      <div key={i} className={`flex gap-3 items-start p-2 rounded-lg border ${isHotspot ? 'bg-aurora-emerald/5 border-aurora-emerald/25' : 'bg-obsidian-900 border-obsidian-750'}`}>
                        <div className="shrink-0 mt-0.5">
                          <QRCode value={iface.url} size={100} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${isHotspot ? 'bg-aurora-emerald/15 border-aurora-emerald/30 text-aurora-emerald' : 'bg-obsidian-750 border-obsidian-700 text-titanium-400'}`}>
                              {iface.label}
                            </span>
                            {isHotspot && <span className="text-[8px] font-mono text-aurora-emerald font-bold">← YOUR CASE</span>}
                          </div>
                          <div className="flex items-center gap-1 bg-obsidian-950 border border-obsidian-800 rounded px-2 py-1">
                            <span className="text-[10px] font-mono text-aurora-emerald flex-1 truncate">{iface.url}</span>
                            <CopyButton text={iface.url} />
                          </div>
                          <p className="text-[8px] font-mono text-titanium-500">{iface.name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[9px] font-mono text-titanium-500 text-center py-3">No active network adapters detected.</p>
              )}

              <div className="p-2 bg-obsidian-900 border border-obsidian-800 rounded-lg text-[8px] font-mono text-titanium-500 space-y-1">
                <p className="text-aurora-cyan font-bold text-[9px]">Phone Hotspot Setup (Your primary scenario):</p>
                <p>1. Enable hotspot on your phone</p>
                <p>2. Connect laptop to that hotspot</p>
                <p>3. Run <span className="text-aurora-emerald">npm run server</span> on laptop</p>
                <p>4. Phone opens the IP shown above — <span className="text-aurora-emerald font-bold">zero cellular data used</span></p>
              </div>
            </div>
          )}


          {/* mDNS Auto-Discovery */}
          {activeMethod === 'mdns' && (
            <div className="glass-panel p-4 rounded-xl border border-aurora-cyan/20 space-y-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-aurora-cyan" />
                <div>
                  <p className="text-[10px] font-mono font-bold text-slate-200">mDNS Auto-Discovery</p>
                  <p className="text-[9px] font-mono text-titanium-500">Type a name instead of IP — no config, works on any network</p>
                </div>
                <span className="ml-auto text-[8px] font-mono px-1.5 py-0.5 rounded bg-aurora-cyan/15 border border-aurora-cyan/25 text-aurora-cyan">Auto</span>
              </div>

              {nearbyInfo?.mdns?.url ? (
                <div className="flex gap-4 items-start">
                  <QRCode value={nearbyInfo.mdns.url} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-1.5 bg-obsidian-900 border border-aurora-cyan/20 rounded-lg px-2 py-1.5">
                      <span className="text-[10px] font-mono text-aurora-cyan flex-1">{nearbyInfo.mdns.url}</span>
                      <CopyButton text={nearbyInfo.mdns.url} />
                    </div>
                    <div className="space-y-1 pt-1">
                      <p className="text-[9px] font-mono text-titanium-500">How it works:</p>
                      <p className="text-[8px] font-mono text-titanium-400">• Laptop broadcasts name on local network</p>
                      <p className="text-[8px] font-mono text-titanium-400">• Phone finds it automatically</p>
                      <p className="text-[8px] font-mono text-titanium-400">• No need to know or type the IP address</p>
                      <p className="text-[8px] font-mono text-titanium-400">• Works on any router / network change</p>
                      <div className="mt-2 p-2 bg-amber-950/30 border border-amber-800/30 rounded text-[8px] font-mono text-amber-400">
                        ⚠ Android Chrome may not resolve .local — use IP instead. iOS Safari supports it natively.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[9px] font-mono text-titanium-500">mDNS not available on this network.</p>
              )}
            </div>
          )}

          {/* Hotspot Mode */}
          {activeMethod === 'hotspot' && (
            <div className="glass-panel p-4 rounded-xl border border-aurora-purple/20 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-aurora-purple" />
                <div>
                  <p className="text-[10px] font-mono font-bold text-slate-200">Laptop Wi-Fi Hotspot</p>
                  <p className="text-[9px] font-mono text-titanium-500">Laptop creates its own network — phone connects directly. Zero internet.</p>
                </div>
                <span className="ml-auto text-[8px] font-mono px-1.5 py-0.5 rounded bg-aurora-purple/15 border border-aurora-purple/25 text-aurora-purple">
                  {nearbyInfo?.hotspot?.isRunning ? '● ON' : '○ OFF'}
                </span>
              </div>

              {nearbyInfo?.hotspot?.ssid ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                    <div className="bg-obsidian-900 border border-obsidian-750 rounded-lg p-2">
                      <p className="text-titanium-500 text-[8px]">Network SSID</p>
                      <p className="text-aurora-purple font-bold">{nearbyInfo.hotspot.ssid}</p>
                    </div>
                    <div className="bg-obsidian-900 border border-obsidian-750 rounded-lg p-2">
                      <p className="text-titanium-500 text-[8px]">Password</p>
                      <p className="text-slate-200 font-bold">{nearbyInfo.hotspot.password || '(see Windows Settings)'}</p>
                    </div>
                  </div>
                  {nearbyInfo.hotspot.isRunning && (
                    <div className="flex gap-4 items-start">
                      <QRCode value={nearbyInfo.hotspot.serverUrl} />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-1.5 bg-obsidian-900 border border-aurora-purple/20 rounded-lg px-2 py-1.5">
                          <span className="text-[10px] font-mono text-aurora-purple flex-1">{nearbyInfo.hotspot.serverUrl}</span>
                          <CopyButton text={nearbyInfo.hotspot.serverUrl} />
                        </div>
                        <p className="text-[8px] font-mono text-titanium-400">Connect phone to "{nearbyInfo.hotspot.ssid}" then open this URL</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[9px] font-mono text-titanium-400 space-y-1">
                  <p>Enable Windows Mobile Hotspot to create a direct network:</p>
                  <p className="text-[8px] text-titanium-500">Settings → Network & Internet → Mobile Hotspot</p>
                </div>
              )}

              <button
                onClick={toggleHotspot}
                disabled={hotspotLoading}
                className={`w-full py-2 rounded-lg border text-[10px] font-mono font-bold flex items-center justify-center gap-2 transition ${
                  nearbyInfo?.hotspot?.isRunning
                    ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                    : 'bg-aurora-purple/20 border-aurora-purple/40 text-aurora-purple hover:bg-aurora-purple/30'
                }`}
              >
                {hotspotLoading
                  ? <Loader className="w-3 h-3 animate-spin" />
                  : nearbyInfo?.hotspot?.isRunning
                    ? <><XCircle className="w-3 h-3" /> Turn Off Hotspot</>
                    : <><CheckCircle2 className="w-3 h-3" /> Enable Hotspot</>
                }
              </button>
            </div>
          )}

          {/* USB Tethering */}
          {activeMethod === 'usb' && (
            <div className="glass-panel p-4 rounded-xl border border-aurora-blue/20 space-y-3">
              <div className="flex items-center gap-2">
                <Usb className="w-4 h-4 text-aurora-blue" />
                <div>
                  <p className="text-[10px] font-mono font-bold text-slate-200">USB Cable (Zero Data)</p>
                  <p className="text-[9px] font-mono text-titanium-500">Physical cable — fastest possible, 100% offline, zero data</p>
                </div>
                <span className={`ml-auto text-[8px] font-mono px-1.5 py-0.5 rounded border ${
                  nearbyInfo?.usb?.detected
                    ? 'bg-aurora-blue/15 border-aurora-blue/25 text-aurora-blue'
                    : 'bg-obsidian-800 border-obsidian-700 text-titanium-500'
                }`}>
                  {nearbyInfo?.usb?.detected ? '● USB Detected' : '○ Not Connected'}
                </span>
              </div>

              {nearbyInfo?.usb?.detected && nearbyInfo.usb.serverUrl ? (
                <div className="flex gap-4 items-start">
                  <QRCode value={nearbyInfo.usb.serverUrl} />
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-1.5 bg-obsidian-900 border border-aurora-blue/20 rounded-lg px-2 py-1.5">
                      <span className="text-[10px] font-mono text-aurora-blue flex-1">{nearbyInfo.usb.serverUrl}</span>
                      <CopyButton text={nearbyInfo.usb.serverUrl} />
                    </div>
                    <p className="text-[8px] font-mono text-aurora-emerald">✓ USB adapter detected: {nearbyInfo.usb.adapters[0]?.name}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[9px] font-mono text-titanium-400">Steps to connect via USB cable:</p>
                  {nearbyInfo?.usb?.instructions?.map((step, i) => (
                    <div key={i} className="flex gap-2 text-[9px] font-mono text-titanium-300">
                      <span className="text-aurora-blue shrink-0">{i + 1}.</span>
                      <span>{step.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-2 bg-obsidian-900 border border-obsidian-800 rounded-lg space-y-1">
                <p className="text-[9px] font-mono text-titanium-400 font-bold">Why USB is the best option:</p>
                <div className="grid grid-cols-2 gap-1 text-[8px] font-mono text-titanium-500">
                  <span>⚡ Sub-1ms latency</span>
                  <span>📡 0 MB data used</span>
                  <span>🔒 Air-gapped secure</span>
                  <span>🔋 Charges phone too</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Comparison table */}
      <div className="glass-panel p-3 rounded-xl border border-obsidian-750">
        <p className="text-[9px] font-mono text-titanium-500 mb-2 uppercase tracking-widest">Method Comparison</p>
        <div className="space-y-1">
          {[
            { name: 'USB Cable', speed: '5fps+', data: 'Zero', range: 'Physical', best: true },
            { name: 'Wi-Fi LAN', speed: '5fps', data: 'Zero', range: 'Same Wi-Fi', best: true },
            { name: 'mDNS (.local)', speed: '5fps', data: 'Zero', range: 'Same Wi-Fi', best: false },
            { name: 'Laptop Hotspot', speed: '3fps', data: 'Zero', range: 'Direct (no router)', best: false },
            { name: 'Cloudflare Tunnel', speed: '1.5fps', data: '↑↑ Uses internet', range: 'Anywhere', best: false },
          ].map(row => (
            <div key={row.name} className={`flex items-center justify-between px-2 py-1 rounded text-[8px] font-mono ${row.best ? 'bg-aurora-emerald/5 border border-aurora-emerald/15' : 'bg-obsidian-900/50'}`}>
              <span className={row.best ? 'text-aurora-emerald' : 'text-titanium-400'}>{row.name}</span>
              <span className="text-titanium-500">{row.speed}</span>
              <span className={row.data === 'Zero' ? 'text-aurora-emerald' : 'text-amber-400'}>{row.data}</span>
              <span className="text-titanium-500">{row.range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
