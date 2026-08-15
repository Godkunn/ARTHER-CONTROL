// src/components/smartapps/InstallManager.jsx
import React, { useState, useEffect } from 'react';
import { Package, Search, Download, CheckCircle, AlertCircle, Play, Sparkles, FolderDown, Monitor, ArrowRight, ExternalLink, HardDrive, RefreshCw, Globe, FileCode, Terminal, GitBranch, Film } from 'lucide-react';
import { useAether } from '../../context/AetherContext';

const POPULAR_DOWNLOADS = [
  { name: 'Google Chrome', url: 'https://dl.google.com/chrome/install/ChromeSetup.exe', filename: 'ChromeSetup.exe', icon: Globe, cat: 'Browser' },
  { name: 'VS Code', url: 'https://update.code.visualstudio.com/latest/win32-x64-user/stable', filename: 'VSCodeUserSetup-x64.exe', icon: FileCode, cat: 'Dev' },
  { name: 'Node.js LTS', url: 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi', filename: 'node-v20.18.0-x64.msi', icon: Terminal, cat: 'Dev' },
  { name: 'Git for Windows', url: 'https://github.com/git-for-windows/git/releases/download/v2.47.0.windows.1/Git-2.47.0-64-bit.exe', filename: 'Git-64-bit.exe', icon: GitBranch, cat: 'Dev' },
  { name: '7-Zip', url: 'https://www.7-zip.org/a/7z2408-x64.exe', filename: '7z2408-x64.exe', icon: Package, cat: 'Utility' },
  { name: 'VLC Media Player', url: 'https://get.videolan.org/vlc/3.0.21/win64/vlc-3.0.21-win64.exe', filename: 'vlc-3.0.21-win64.exe', icon: Film, cat: 'Media' },
];

export default function InstallManager({ apiFetch }) {
  const { addLog, setActiveTab } = useAether();
  const [downloadedSetups, setDownloadedSetups] = useState([]);
  const [loadingSetups, setLoadingSetups] = useState(false);
  const [launchStatus, setLaunchStatus] = useState({});

  // URL downloader state
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState(null);

  // Winget state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [installLogs, setInstallLogs] = useState([]);
  const [activeInstall, setActiveInstall] = useState(null);

  // Fetch downloaded installers on laptop
  const loadDownloadedInstallers = async () => {
    setLoadingSetups(true);
    try {
      const res = await apiFetch('/api/installers');
      const data = await res.json();
      setDownloadedSetups(data.installers || []);
    } catch (_) {}
    setLoadingSetups(false);
  };

  useEffect(() => {
    loadDownloadedInstallers();
  }, []);

  // Launch .exe installer on laptop
  const launchInstaller = async (installer) => {
    setLaunchStatus(prev => ({ ...prev, [installer.path]: 'launching' }));
    try {
      const res = await apiFetch('/api/installers/run', {
        method: 'POST',
        body: JSON.stringify({ path: installer.path, admin: true })
      });
      const data = await res.json();
      if (data.success) {
        setLaunchStatus(prev => ({ ...prev, [installer.path]: 'launched' }));
        addLog('Installer', `Launched on laptop: ${installer.name}`);
      } else {
        setLaunchStatus(prev => ({ ...prev, [installer.path]: 'error' }));
      }
    } catch (_) {
      setLaunchStatus(prev => ({ ...prev, [installer.path]: 'error' }));
    }
  };

  // Download software URL straight into laptop's Downloads
  const handleDownloadToLaptop = async (urlToDownload, customFilename = null) => {
    const targetUrl = (urlToDownload || downloadUrl).trim();
    if (!targetUrl) return;
    setDownloading(true);
    setDownloadMsg(`Downloading installer directly into laptop Downloads folder...`);
    try {
      const res = await apiFetch('/api/installers/download', {
        method: 'POST',
        body: JSON.stringify({ url: targetUrl, filename: customFilename })
      });
      const data = await res.json();
      if (data.success) {
        setDownloadMsg(`✅ Downloaded: ${data.filename} (${data.size})`);
        addLog('Installer', `Downloaded to laptop: ${data.filename}`);
        setDownloadUrl('');
        loadDownloadedInstallers();
      } else {
        setDownloadMsg(`❌ Download failed: ${data.error}`);
      }
    } catch (err) {
      setDownloadMsg(`❌ Error: ${err.message}`);
    }
    setDownloading(false);
  };

  // Winget package search
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setInstallLogs([]);
    try {
      const res = await apiFetch(`/api/winget/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace('data: ', ''));
            if (data.type === 'stdout' || data.type === 'stderr') {
              setInstallLogs(prev => [...prev, data.text]);
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      setInstallLogs(prev => [...prev, `Search error: ${err.message}`]);
    }
    setSearching(false);
  };

  return (
    <div className="space-y-3">
      {/* Interactive Install Guide Banner */}
      <div className="glass-panel p-3 rounded-xl border border-aurora-cyan/30 bg-aurora-cyan/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-aurora-cyan shrink-0 animate-pulse" />
          <div>
            <p className="text-[11px] font-mono font-bold text-slate-100">Interactive Setup Runner</p>
            <p className="text-[9px] font-mono text-titanium-400">
              Run any installer below → Switch to <span className="text-aurora-cyan font-bold">Screen</span> tab to click Next &gt; Install via touch!
            </p>
          </div>
        </div>
        {setActiveTab && (
          <button
            onClick={() => setActiveTab('desktop')}
            className="px-2.5 py-1.5 rounded-lg bg-aurora-cyan/20 border border-aurora-cyan/50 text-aurora-cyan hover:bg-aurora-cyan/30 transition text-[9px] font-mono font-bold shrink-0 flex items-center gap-1"
          >
            <span>Open Screen</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 1. DOWNLOADED INSTALLERS ON LAPTOP */}
      <div className="glass-panel p-3 rounded-xl border border-obsidian-750 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-aurora-emerald" />
            <h3 className="text-[11px] font-mono font-bold text-slate-200">
              Downloaded Setups on Laptop ({downloadedSetups.length})
            </h3>
          </div>
          <button
            onClick={loadDownloadedInstallers}
            className="p-1 rounded glass-card text-titanium-400 hover:text-white"
            title="Refresh downloads"
          >
            <RefreshCw className={`w-3 h-3 ${loadingSetups ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto divide-y divide-obsidian-800 rounded-lg border border-obsidian-800 bg-obsidian-950">
          {downloadedSetups.length === 0 ? (
            <p className="text-[9px] font-mono text-titanium-500 text-center py-6">
              No installers found in Downloads folder
            </p>
          ) : (
            downloadedSetups.map(item => {
              const status = launchStatus[item.path];
              return (
                <div key={item.path} className="p-2 flex items-center justify-between gap-2 hover:bg-obsidian-900 transition">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono font-semibold text-slate-200 truncate">{item.name}</p>
                    <p className="text-[8px] font-mono text-titanium-500">{item.size} • {item.modified}</p>
                  </div>
                  <button
                    onClick={() => launchInstaller(item)}
                    disabled={status === 'launching'}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1 border transition shrink-0 ${
                      status === 'launched'
                        ? 'bg-aurora-emerald/20 border-aurora-emerald text-aurora-emerald'
                        : 'bg-aurora-cyan/20 border-aurora-cyan/40 text-aurora-cyan hover:bg-aurora-cyan/30'
                    }`}
                  >
                    <Play className="w-2.5 h-2.5" />
                    <span>{status === 'launched' ? 'Running on PC' : status === 'launching' ? 'Launching...' : 'Run Setup'}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. DOWNLOAD NEW SOFTWARE STRAIGHT TO LAPTOP */}
      <div className="glass-panel p-3 rounded-xl border border-obsidian-750 space-y-2">
        <div className="flex items-center gap-1.5">
          <FolderDown className="w-3.5 h-3.5 text-aurora-blue" />
          <h3 className="text-[11px] font-mono font-bold text-slate-200">Download Software URL to Laptop</h3>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleDownloadToLaptop(); }} className="flex gap-1.5">
          <input
            type="url"
            value={downloadUrl}
            onChange={e => setDownloadUrl(e.target.value)}
            placeholder="Paste installer direct download URL (.exe / .msi)..."
            className="flex-1 bg-obsidian-950 border border-obsidian-750 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-100 placeholder-titanium-600 focus:outline-none focus:border-aurora-blue"
          />
          <button
            type="submit"
            disabled={downloading || !downloadUrl.trim()}
            className="px-3 py-1.5 rounded-lg bg-aurora-blue/20 border border-aurora-blue/40 text-aurora-blue hover:bg-aurora-blue/30 text-[10px] font-mono font-bold flex items-center gap-1 disabled:opacity-40 transition shrink-0"
          >
            <Download className="w-3 h-3" />
            <span>{downloading ? 'Downloading...' : 'Download'}</span>
          </button>
        </form>

        {downloadMsg && (
          <p className="text-[9px] font-mono text-aurora-cyan bg-obsidian-950 p-2 rounded border border-obsidian-800">
            {downloadMsg}
          </p>
        )}

        {/* 1-Tap Popular Installers */}
        <div>
          <p className="text-[9px] font-mono text-titanium-500 mb-1.5">1-Tap Download Presets (to Laptop):</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {POPULAR_DOWNLOADS.map(app => {
              const AppIcon = app.icon;
              return (
                <button
                  key={app.name}
                  onClick={() => handleDownloadToLaptop(app.url, app.filename)}
                  disabled={downloading}
                  className="p-2 rounded-xl glass-card border border-obsidian-750 hover:border-aurora-blue/40 flex items-center gap-2 text-left transition disabled:opacity-40"
                >
                  <div className="p-1 rounded-lg bg-obsidian-850 text-aurora-blue">
                    <AppIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-mono text-slate-200 truncate font-semibold">{app.name}</p>
                    <p className="text-[8px] font-mono text-titanium-500">{app.cat}</p>
                  </div>
                  <Download className="w-2.5 h-2.5 text-aurora-blue shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. WINGET SILENT PACKAGE SEARCH */}
      <div className="glass-panel p-3 rounded-xl border border-obsidian-750 space-y-2">
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-aurora-purple" />
          <h3 className="text-[11px] font-mono font-bold text-slate-200">Winget Package Manager (5,000+ Apps)</h3>
        </div>

        <form onSubmit={handleSearch} className="flex gap-1.5">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search winget packages (e.g., git, vlc, discord, spotify)..."
            className="flex-1 bg-obsidian-950 border border-obsidian-750 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-100 placeholder-titanium-600 focus:outline-none focus:border-aurora-purple"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-3 py-1.5 rounded-lg bg-aurora-purple/20 border border-aurora-purple/40 text-aurora-purple hover:bg-aurora-purple/30 text-[10px] font-mono font-bold flex items-center gap-1 transition shrink-0"
          >
            <Search className="w-3 h-3" />
            <span>{searching ? 'Searching...' : 'Search'}</span>
          </button>
        </form>

        {installLogs.length > 0 && (
          <pre className="bg-obsidian-950 p-2.5 rounded-lg border border-obsidian-800 text-[9px] font-mono text-aurora-cyan max-h-48 overflow-y-auto whitespace-pre-wrap select-text">
            {installLogs.join('')}
          </pre>
        )}
      </div>
    </div>
  );
}
