// src/components/smartapps/SmartApps.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAether } from '../../context/AetherContext';
import {
  Globe, FileCode, Terminal, Download, ArrowLeft, ArrowRight, RefreshCw,
  Save, Check, Package, ChevronRight, Folder, File, ExternalLink, Play,
  Search, Cpu, Monitor, Sparkles, Layers, Sliders, Music, MessageSquare,
  Command, Wrench, Shield, Zap, X, CornerDownRight, PlayCircle, Eye,
  Activity, Trash2, Maximize2, Minimize2, Bot, Brain, Film, Tv, Video,
  BookOpen, FileText, Cloud, Palette, FileEdit, MessageCircle, Users,
  PhoneCall, Calculator, Scissors, Brush, HelpCircle, GitBranch, Boxes
} from 'lucide-react';
import InstallManager from './InstallManager';

const HUBS = [
  { id: 'browser', label: 'Web & Search', icon: Globe, color: 'aurora-blue', desc: 'Remote browsers & multi-engine search' },
  { id: 'vscode', label: 'Dev Studio', icon: FileCode, color: 'aurora-purple', desc: 'VS Code workspaces & code editor' },
  { id: 'productivity', label: 'Apps & Media', icon: Sparkles, color: 'aurora-pink', desc: 'Spotify, Discord, Notion & media' },
  { id: 'system', label: 'System Tools', icon: Wrench, color: 'aurora-amber', desc: 'Taskmgr, PowerShell & diagnostics' },
  { id: 'terminal', label: 'Terminal', icon: Terminal, color: 'aurora-emerald', desc: 'Live remote PowerShell console' },
  { id: 'install', label: 'App Store', icon: Package, color: 'aurora-cyan', desc: 'Winget & direct setup installers' },
];

export default function SmartApps() {
  const { executeTerminalCommand, terminalLines, addLog, apiFetch, systemStatus, focusWindow, setScreenshareActive, setActiveTab } = useAether();
  const [activeHub, setActiveHub] = useState('browser');
  const [lastActionStatus, setLastActionStatus] = useState(null);

  const runningApps = systemStatus.runningApps || [];

  const triggerAppFeedback = (label, details = '') => {
    setLastActionStatus({ label, details, time: Date.now() });
    setTimeout(() => {
      setLastActionStatus(prev => (prev?.time && Date.now() - prev.time >= 4000 ? null : prev));
    }, 4500);
  };

  return (
    <div className="p-2 sm:p-3 max-w-4xl mx-auto space-y-3 pb-24 animate-fadeIn">
      {/* 1. TOP STATUS & ACTION FEEDBACK BANNER */}
      {lastActionStatus && (
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-aurora-cyan/15 via-aurora-blue/15 to-aurora-purple/15 border border-aurora-cyan/30 flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-aurora-cyan animate-ping shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold text-slate-100 truncate">{lastActionStatus.label}</p>
              {lastActionStatus.details && (
                <p className="text-[9px] font-mono text-titanium-400 truncate">{lastActionStatus.details}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setScreenshareActive(true);
                setActiveTab('desktop');
              }}
              className="px-2.5 py-1 rounded-lg bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan text-[9px] font-mono font-bold hover:bg-aurora-cyan/30 flex items-center gap-1 transition"
            >
              <Eye className="w-3 h-3" />
              <span>View Screen</span>
            </button>
            <button
              onClick={() => setLastActionStatus(null)}
              className="text-titanium-400 hover:text-white p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* 2. LIVE ACTIVE WINDOWS & TASKBAR */}
      <div className="glass-panel p-2.5 rounded-2xl border border-obsidian-750 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-slate-200 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-aurora-cyan animate-pulse" />
            <span>Active Windows on Laptop ({runningApps.length})</span>
          </span>
          <span className="text-[9px] font-mono text-titanium-400">
            Active: <strong className="text-aurora-cyan">{typeof systemStatus.activeWindow === 'string' ? systemStatus.activeWindow : 'Desktop'}</strong>
          </span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {runningApps.length === 0 ? (
            <span className="text-[9px] font-mono text-titanium-500 py-1">Connecting to window manager...</span>
          ) : (
            runningApps.map(app => {
              const activeName = typeof systemStatus.activeWindow === 'string' ? systemStatus.activeWindow : '';
              const isActive = app.active || app.name === activeName;
              return (
                <button
                  key={app.id || app.pid || app.name}
                  onClick={async () => {
                    focusWindow(app.name);
                    try {
                      await apiFetch('/api/command', {
                        method: 'POST',
                        body: JSON.stringify({ command: 'FOCUS_WINDOW', payload: { name: app.name, pid: app.pid } })
                      });
                    } catch (_) {}
                    triggerAppFeedback(`Focused window: ${app.name}`);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-mono font-bold whitespace-nowrap transition shrink-0 ${
                    isActive
                      ? 'bg-aurora-cyan/20 border-aurora-cyan text-aurora-cyan shadow-glow-cyan'
                      : 'glass-card text-titanium-400 hover:text-slate-100 hover:border-obsidian-600'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-aurora-cyan" />
                  <span>{app.name}</span>
                  {app.pid && <span className="text-[8px] text-titanium-500 font-normal">#{app.pid}</span>}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 3. CATEGORY HUB SELECTOR */}
      <div className="glass-panel p-1 rounded-2xl border border-obsidian-750 grid grid-cols-3 sm:grid-cols-6 gap-1">
        {HUBS.map(hub => {
          const Icon = hub.icon;
          const isSelected = activeHub === hub.id;
          return (
            <button
              key={hub.id}
              onClick={() => setActiveHub(hub.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition text-center ${
                isSelected
                  ? 'bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan shadow-glow-cyan'
                  : 'text-titanium-400 hover:text-slate-100 hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isSelected ? 'text-aurora-cyan' : 'text-titanium-400'}`} />
              <span className={`text-[9px] font-mono leading-tight ${isSelected ? 'font-bold text-slate-100' : ''}`}>
                {hub.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. ACTIVE HUB SURFACE VIEW */}
      {activeHub === 'browser' && <BrowserHub apiFetch={apiFetch} addLog={addLog} onTrigger={triggerAppFeedback} />}
      {activeHub === 'vscode' && <VsCodeHub apiFetch={apiFetch} addLog={addLog} onTrigger={triggerAppFeedback} />}
      {activeHub === 'productivity' && <ProductivityHub apiFetch={apiFetch} addLog={addLog} onTrigger={triggerAppFeedback} />}
      {activeHub === 'system' && <SystemToolsHub apiFetch={apiFetch} addLog={addLog} onTrigger={triggerAppFeedback} />}
      {activeHub === 'terminal' && <TerminalSurface executeTerminalCommand={executeTerminalCommand} terminalLines={terminalLines} />}
      {activeHub === 'install' && <InstallManager apiFetch={apiFetch} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 1. WEB & SEARCH ENGINE HUB
// ─────────────────────────────────────────────────────────────────────────
function BrowserHub({ apiFetch, addLog, onTrigger }) {
  const [urlInput, setUrlInput] = useState('');
  const [searchEngine, setSearchEngine] = useState('google');
  const [launching, setLaunching] = useState(false);

  const ENGINES = [
    { id: 'google', label: 'Google', searchUrl: 'https://www.google.com/search?q=', icon: Search },
    { id: 'perplexity', label: 'Perplexity AI', searchUrl: 'https://www.perplexity.ai/search?q=', icon: Brain },
    { id: 'youtube', label: 'YouTube', searchUrl: 'https://www.youtube.com/results?search_query=', icon: Film },
    { id: 'github', label: 'GitHub', searchUrl: 'https://github.com/search?q=', icon: GitBranch },
    { id: 'chatgpt', label: 'ChatGPT', searchUrl: 'https://chatgpt.com/?q=', icon: Bot },
    { id: 'reddit', label: 'Reddit', searchUrl: 'https://www.reddit.com/search/?q=', icon: MessageSquare },
  ];

  const BOOKMARKS = [
    { cat: 'AI Copilots', items: [
      { name: 'ChatGPT', url: 'https://chatgpt.com', icon: Bot },
      { name: 'Claude', url: 'https://claude.ai', icon: Sparkles },
      { name: 'Perplexity', url: 'https://perplexity.ai', icon: Brain },
      { name: 'Hugging Face', url: 'https://huggingface.co', icon: Cpu },
    ]},
    { cat: 'Developer Tools', items: [
      { name: 'GitHub', url: 'https://github.com', icon: GitBranch },
      { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: HelpCircle },
      { name: 'NPM Registry', url: 'https://npmjs.com', icon: Package },
      { name: 'MDN Docs', url: 'https://developer.mozilla.org', icon: BookOpen },
      { name: 'Vercel', url: 'https://vercel.com', icon: Zap },
      { name: 'Cloudflare', url: 'https://dash.cloudflare.com', icon: Cloud },
    ]},
    { cat: 'Media & Entertainment', items: [
      { name: 'YouTube', url: 'https://youtube.com', icon: Film },
      { name: 'Spotify Web', url: 'https://open.spotify.com', icon: Music },
      { name: 'Twitch', url: 'https://twitch.tv', icon: Tv },
      { name: 'Netflix', url: 'https://netflix.com', icon: Video },
    ]},
    { cat: 'Social & Communication', items: [
      { name: 'WhatsApp Web', url: 'https://web.whatsapp.com', icon: PhoneCall },
      { name: 'Discord', url: 'https://discord.com/app', icon: MessageCircle },
      { name: 'Twitter / X', url: 'https://x.com', icon: Globe },
      { name: 'Reddit', url: 'https://reddit.com', icon: MessageSquare },
    ]}
  ];

  const handleOpenUrl = async (targetUrl) => {
    if (!targetUrl) return;
    let url = targetUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const eng = ENGINES.find(e => e.id === searchEngine) || ENGINES[0];
      url = eng.searchUrl + encodeURIComponent(url);
    }

    setLaunching(true);
    try {
      await apiFetch('/api/terminal', {
        method: 'POST',
        body: JSON.stringify({ cmd: `Start-Process "${url}"` })
      });
      addLog('Browser', `Launched URL: ${url}`);
      onTrigger?.('Opened Web Browser', url);
    } catch (_) {}
    setLaunching(false);
  };

  const runBrowserAction = async (cmd, label) => {
    try {
      await apiFetch('/api/terminal', { method: 'POST', body: JSON.stringify({ cmd }) });
      addLog('Browser', label);
      onTrigger?.(`Browser: ${label}`);
    } catch (_) {}
  };

  return (
    <div className="space-y-3">
      {/* 1. Multi-Engine Search & Address Bar */}
      <div className="glass-panel p-3 rounded-2xl border border-aurora-blue/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-aurora-blue" />
            <span className="text-[11px] font-mono font-bold text-slate-100">Workstation Browser Remote</span>
          </div>
          <span className="text-[9px] font-mono text-titanium-400">Chrome / Edge / Firefox</span>
        </div>

        {/* Engine switcher chips */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {ENGINES.map(eng => {
            const EngineIcon = eng.icon;
            return (
              <button
                key={eng.id}
                onClick={() => setSearchEngine(eng.id)}
                className={`px-2 py-1 rounded-lg text-[9px] font-mono whitespace-nowrap transition flex items-center gap-1.5 border ${
                  searchEngine === eng.id
                    ? 'bg-aurora-blue/25 border-aurora-blue text-aurora-blue font-bold'
                    : 'glass-card border-obsidian-800 text-titanium-400 hover:text-white'
                }`}
              >
                <EngineIcon className="w-3 h-3" />
                <span>{eng.label}</span>
              </button>
            );
          })}
        </div>

        {/* URL / Search Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleOpenUrl(urlInput);
          }}
          className="flex gap-1.5"
        >
          <input
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder={`Search ${ENGINES.find(e => e.id === searchEngine)?.label || 'Google'} or enter URL (e.g. github.com)...`}
            className="flex-1 bg-obsidian-950 border border-obsidian-750 rounded-xl px-3 py-2 text-[10px] font-mono text-slate-100 placeholder-titanium-600 focus:outline-none focus:border-aurora-blue"
          />
          <button
            type="submit"
            disabled={launching || !urlInput.trim()}
            className="px-3.5 py-2 rounded-xl bg-aurora-blue text-obsidian-950 font-mono font-bold text-[10px] flex items-center gap-1 hover:bg-blue-400 transition shrink-0 disabled:opacity-40"
          >
            {launching ? (
              <div className="w-3 h-3 border border-obsidian-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ExternalLink className="w-3 h-3" />
            )}
            <span>Open</span>
          </button>
        </form>

        {/* Browser Quick Control Keys */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[
            { label: '← Back', cmd: `(New-Object -COM Shell.Application).Windows() | Select-Object -First 1 | ForEach-Object { $_.GoBack() }` },
            { label: '→ Forward', cmd: `(New-Object -COM Shell.Application).Windows() | Select-Object -First 1 | ForEach-Object { $_.GoForward() }` },
            { label: '⟳ Refresh', cmd: `(New-Object -COM Shell.Application).Windows() | Select-Object -First 1 | ForEach-Object { $_.Refresh() }` },
            { label: '✕ Close Tab', cmd: `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^w")` },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={() => runBrowserAction(btn.cmd, btn.label)}
              className="py-1.5 rounded-lg glass-card text-[9px] font-mono text-titanium-300 hover:text-white hover:border-aurora-blue/40 text-center transition active:scale-95"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Curated Web App Directory */}
      <div className="glass-panel p-3 rounded-2xl border border-obsidian-750 space-y-3">
        <h3 className="text-[10px] font-mono text-titanium-300 uppercase tracking-wider">Quick Web Apps & Portals</h3>

        <div className="space-y-3">
          {BOOKMARKS.map(section => (
            <div key={section.cat} className="space-y-1.5">
              <p className="text-[9px] font-mono text-titanium-500 font-bold uppercase">{section.cat}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {section.items.map(site => {
                  const SiteIcon = site.icon;
                  return (
                    <button
                      key={site.name}
                      onClick={() => handleOpenUrl(site.url)}
                      className="flex items-center gap-2 p-2 rounded-xl glass-card hover:border-aurora-blue/40 hover:bg-aurora-blue/5 text-left transition group active:scale-95"
                    >
                      <div className="p-1.5 rounded-lg bg-obsidian-850 text-aurora-blue group-hover:bg-aurora-blue/20 transition shrink-0">
                        <SiteIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono font-bold text-slate-200 group-hover:text-aurora-blue truncate">
                          {site.name}
                        </p>
                        <p className="text-[8px] font-mono text-titanium-500 truncate">{site.url.replace(/^https?:\/\//, '')}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 2. DEV STUDIO & VS CODE WORKSPACE HUB
// ─────────────────────────────────────────────────────────────────────────
function VsCodeHub({ apiFetch, addLog, onTrigger }) {
  const [customPathInput, setCustomPathInput] = useState('C:/Users/Hp/Desktop/AETHER CONTROL');
  const [entries, setEntries] = useState([]);
  const [parts, setParts] = useState([]);
  const [currentPath, setCurrentPath] = useState('C:/Users/Hp/Desktop/AETHER CONTROL');
  const [openFile, setOpenFile] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const QUICK_PROJECTS = [
    { label: 'AETHER CONTROL', path: 'C:/Users/Hp/Desktop/AETHER CONTROL' },
    { label: 'Desktop', path: 'C:/Users/Hp/Desktop' },
    { label: 'Documents', path: 'C:/Users/Hp/Documents' },
    { label: 'Downloads', path: 'C:/Users/Hp/Downloads' },
    { label: 'C:\\ Drive', path: 'C:/' },
  ];

  const loadDir = async (dirPath) => {
    setLoading(true); setError(null); setOpenFile(null);
    try {
      const res = await apiFetch(`/api/files?path=${encodeURIComponent(dirPath)}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setParts(data.parts || []);
      setCurrentPath(data.path || dirPath);
      setCustomPathInput(data.path || dirPath);
    } catch (err) { setError('Failed to load project directory'); }
    setLoading(false);
  };

  const loadFile = async (filePath, fileName) => {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      setOpenFile({ path: filePath, name: fileName });
      setEditContent(data.content || '');
      addLog('VS Code', `Opened: ${fileName}`);
    } catch (err) { setError('Failed to read file'); }
    setLoading(false);
  };

  const saveFile = async () => {
    if (!openFile) return;
    try {
      const res = await apiFetch('/api/files/write', {
        method: 'POST', body: JSON.stringify({ path: openFile.path, content: editContent })
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        addLog('VS Code', `Saved: ${openFile.name}`);
        onTrigger?.('Saved File on Laptop', openFile.name);
      } else setError(data.error);
    } catch (err) { setError('Save failed'); }
  };

  const launchVSCodeDesktop = async (targetPath = null) => {
    const pathToOpen = (targetPath || customPathInput || currentPath).trim();
    try {
      await apiFetch('/api/terminal', {
        method: 'POST',
        body: JSON.stringify({ cmd: `code "${pathToOpen.replace(/\//g, '\\')}"` })
      });
      addLog('VS Code', `Launched VS Code on laptop for: ${pathToOpen}`);
      onTrigger?.('Launched VS Code on PC', pathToOpen);
    } catch (_) {}
  };

  const runDevScript = async (cmd, label) => {
    try {
      await apiFetch('/api/terminal', {
        method: 'POST',
        body: JSON.stringify({ cmd, cwd: currentPath })
      });
      addLog('Dev', label);
      onTrigger?.(`Ran Dev Script: ${label}`);
    } catch (_) {}
  };

  useEffect(() => { loadDir('C:/Users/Hp/Desktop/AETHER CONTROL'); }, []);

  const TEXT_EXTS = ['.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.md', '.txt', '.css', '.html', '.env', '.sh', '.ps1', '.yml', '.yaml', '.toml', '.xml', '.csv', '.log'];
  const isEditable = (name) => TEXT_EXTS.some(ext => name.toLowerCase().endsWith(ext));

  return (
    <div className="space-y-3">
      {/* 1. Project Launch Bar */}
      <div className="glass-panel p-3 rounded-2xl border border-aurora-purple/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-aurora-purple" />
            <span className="text-[11px] font-mono font-bold text-slate-100">VS Code & Project Studio</span>
          </div>
          <button
            onClick={() => launchVSCodeDesktop(currentPath)}
            className="px-2 py-1 rounded-lg bg-aurora-purple/20 border border-aurora-purple/40 text-aurora-purple text-[9px] font-mono font-bold flex items-center gap-1 hover:bg-aurora-purple/30 transition"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open in VS Code App</span>
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); launchVSCodeDesktop(customPathInput); }} className="flex gap-1.5">
          <input
            type="text"
            value={customPathInput}
            onChange={e => setCustomPathInput(e.target.value)}
            placeholder="Enter any project/folder path..."
            className="flex-1 bg-obsidian-950 border border-obsidian-750 rounded-xl px-3 py-2 text-[10px] font-mono text-slate-100 placeholder-titanium-600 focus:outline-none focus:border-aurora-purple"
          />
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-aurora-purple text-obsidian-950 font-mono font-bold text-[10px] hover:bg-purple-400 transition shrink-0"
          >
            Launch
          </button>
        </form>

        {/* Quick project chips */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {QUICK_PROJECTS.map(p => (
            <button
              key={p.path}
              onClick={() => { setCustomPathInput(p.path); loadDir(p.path); }}
              className={`px-2 py-1 rounded-lg text-[9px] font-mono whitespace-nowrap transition border ${
                currentPath === p.path
                  ? 'bg-aurora-purple/25 border-aurora-purple text-aurora-purple font-bold'
                  : 'glass-card border-obsidian-800 text-titanium-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Dev Quick Actions (NPM, Git) */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[
            { label: 'npm run dev', cmd: 'npm run dev' },
            { label: 'git status', cmd: 'git status' },
            { label: 'git pull', cmd: 'git pull' },
            { label: 'npm test', cmd: 'npm test' },
          ].map(act => (
            <button
              key={act.label}
              onClick={() => runDevScript(act.cmd, act.label)}
              className="py-1.5 rounded-lg glass-card text-[9px] font-mono text-titanium-300 hover:text-white hover:border-aurora-purple/40 text-center transition active:scale-95"
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. File Explorer / Editor */}
      <div className="glass-panel p-3 rounded-2xl border border-obsidian-750 space-y-2.5">
        <div className="flex items-center justify-between border-b border-obsidian-750 pb-2">
          <span className="text-[10px] font-mono font-bold text-slate-200 truncate">
            {openFile ? openFile.name : `Folder: ${currentPath}`}
          </span>

          <div className="flex items-center gap-1.5">
            {openFile ? (
              <>
                <button
                  onClick={saveFile}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1 border transition ${
                    saved ? 'bg-aurora-emerald/20 border-aurora-emerald text-aurora-emerald' : 'bg-aurora-purple/20 border-aurora-purple/40 text-aurora-purple'
                  }`}
                >
                  {saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                  <span>{saved ? 'Saved' : 'Save'}</span>
                </button>
                <button
                  onClick={() => setOpenFile(null)}
                  className="text-[9px] font-mono text-titanium-400 px-2 py-1 rounded-lg glass-card hover:text-white"
                >
                  Close
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Breadcrumbs */}
        {!openFile && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {parts.map((part, i) => {
              const breadPath = parts.slice(0, i + 1).join('/');
              const fullPath = breadPath.match(/^[A-Za-z]:/) ? breadPath : '/' + breadPath;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="w-3 h-3 text-obsidian-600 shrink-0" />}
                  <button
                    onClick={() => loadDir(fullPath)}
                    className="text-[9px] font-mono text-titanium-400 hover:text-aurora-purple whitespace-nowrap px-1.5 py-0.5 rounded hover:bg-obsidian-800 transition"
                  >
                    {part}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* File Content / List */}
        {openFile ? (
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="w-full h-80 bg-obsidian-950 border border-obsidian-800 rounded-xl p-3 text-[10px] font-mono text-slate-100 focus:outline-none focus:border-aurora-purple resize-none leading-relaxed"
            spellCheck={false}
          />
        ) : loading ? (
          <div className="flex items-center justify-center h-36">
            <div className="w-5 h-5 border-2 border-aurora-purple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-0.5 max-h-72 overflow-y-auto divide-y divide-obsidian-850">
            {entries.length === 0 && <p className="text-[9px] font-mono text-titanium-600 text-center py-6">Directory is empty</p>}
            {entries.map(entry => {
              const editable = isEditable(entry.name);
              return (
                <div
                  key={entry.path}
                  onClick={() => {
                    if (entry.type === 'folder') loadDir(entry.path);
                    else if (editable) loadFile(entry.path, entry.name);
                  }}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-obsidian-800/70 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {entry.type === 'folder' ? (
                      <Folder className="w-3.5 h-3.5 text-aurora-cyan shrink-0" />
                    ) : (
                      <File className={`w-3.5 h-3.5 shrink-0 ${editable ? 'text-aurora-purple' : 'text-titanium-500'}`} />
                    )}
                    <span className={`text-[10px] font-mono truncate ${entry.type === 'folder' ? 'text-slate-200 font-semibold' : 'text-titanium-300'}`}>
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-titanium-600">{entry.size}</span>
                    {editable && (
                      <span className="text-[8px] font-mono text-aurora-purple bg-aurora-purple/10 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                        Edit
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 3. PRODUCTIVITY & MEDIA LAUNCHER HUB
// ─────────────────────────────────────────────────────────────────────────
function ProductivityHub({ apiFetch, addLog, onTrigger }) {
  const APPS_LIST = [
    { cat: 'Media & Streaming', items: [
      { name: 'Spotify', exe: 'spotify', desc: 'Music & Podcasts', icon: Music },
      { name: 'VLC Player', exe: 'vlc', desc: 'Video Player', icon: Film },
      { name: 'Media Player', exe: 'wmplayer', desc: 'Default Player', icon: Tv },
    ]},
    { cat: 'Productivity & Notes', items: [
      { name: 'Notion', exe: 'notion', desc: 'Workspace & Docs', icon: FileText },
      { name: 'Obsidian', exe: 'obsidian', desc: 'Knowledge Base', icon: Boxes },
      { name: 'Figma', exe: 'figma', desc: 'UI/UX Design', icon: Palette },
      { name: 'Notepad', exe: 'notepad', desc: 'Text Editor', icon: FileEdit },
    ]},
    { cat: 'Communication', items: [
      { name: 'Discord', exe: 'discord', desc: 'Voice & Chat', icon: MessageCircle },
      { name: 'Slack', exe: 'slack', desc: 'Team Chat', icon: Users },
      { name: 'WhatsApp', exe: 'whatsapp', desc: 'Messaging', icon: PhoneCall },
      { name: 'Zoom', exe: 'zoom', desc: 'Video Meetings', icon: Video },
    ]},
    { cat: 'Quick Utilities', items: [
      { name: 'Calculator', exe: 'calc', desc: 'Programmer Calc', icon: Calculator },
      { name: 'Paint', exe: 'mspaint', desc: 'Drawing & Edit', icon: Brush },
      { name: 'Snipping Tool', exe: 'snippingtool', desc: 'Screen Capture', icon: Scissors },
      { name: 'File Explorer', exe: 'explorer', desc: 'Windows Drives', icon: Folder },
    ]}
  ];

  const launchNativeApp = async (app) => {
    try {
      await apiFetch('/api/terminal', {
        method: 'POST',
        body: JSON.stringify({ cmd: `Start-Process "${app.exe}" -ErrorAction SilentlyContinue` })
      });
      addLog('Apps', `Launched ${app.name} on PC`);
      onTrigger?.(`Launched ${app.name}`, `Running ${app.exe}.exe on laptop`);
    } catch (_) {}
  };

  return (
    <div className="glass-panel p-3 rounded-2xl border border-aurora-pink/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-aurora-pink" />
          <span className="text-[11px] font-mono font-bold text-slate-100">Productivity & Native Desktop Apps</span>
        </div>
        <span className="text-[9px] font-mono text-titanium-400">1-Tap Hardware Launch</span>
      </div>

      <div className="space-y-4">
        {APPS_LIST.map(group => (
          <div key={group.cat} className="space-y-1.5">
            <p className="text-[9px] font-mono text-titanium-500 font-bold uppercase">{group.cat}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {group.items.map(item => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => launchNativeApp(item)}
                    className="p-2.5 rounded-xl glass-card hover:border-aurora-pink/50 hover:bg-aurora-pink/5 text-left transition group active:scale-95 flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-obsidian-850 text-aurora-pink group-hover:bg-aurora-pink/20 transition">
                        <ItemIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-obsidian-850 text-titanium-400 group-hover:text-aurora-pink transition">
                        RUN
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono font-bold text-slate-200 group-hover:text-aurora-pink truncate">
                        {item.name}
                      </p>
                      <p className="text-[8px] font-mono text-titanium-500 truncate">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 4. SYSTEM TOOLS & DIAGNOSTICS HUB
// ─────────────────────────────────────────────────────────────────────────
function SystemToolsHub({ apiFetch, addLog, onTrigger }) {
  const TOOLS = [
    { name: 'Task Manager', cmd: 'taskmgr', icon: Cpu, desc: 'Process & Resource Monitor' },
    { name: 'PowerShell (Admin)', cmd: 'powershell -NoExit', icon: Terminal, desc: 'Windows Shell Prompt' },
    { name: 'Command Prompt', cmd: 'cmd /k', icon: Command, desc: 'Classic Windows CMD' },
    { name: 'Device Manager', cmd: 'devmgmt.msc', icon: Sliders, desc: 'Hardware & Drivers' },
    { name: 'Registry Editor', cmd: 'regedit', icon: Shield, desc: 'Windows Reg Configuration' },
    { name: 'Disk Cleanup', cmd: 'cleanmgr', icon: Trash2, desc: 'Free Up SSD / HDD Space' },
    { name: 'Network Adapters', cmd: 'ncpa.cpl', icon: Globe, desc: 'Wi-Fi & LAN Settings' },
    { name: 'Windows Services', cmd: 'services.msc', icon: Wrench, desc: 'Background Service Daemon' },
    { name: 'Windows Settings', cmd: 'Start-Process ms-settings:', icon: Zap, desc: 'System Settings Panel' },
    { name: 'DirectX Diagnostics', cmd: 'dxdiag', icon: Monitor, desc: 'GPU & Display Specs' },
  ];

  const launchTool = async (tool) => {
    try {
      await apiFetch('/api/terminal', {
        method: 'POST',
        body: JSON.stringify({ cmd: `Start-Process ${tool.cmd} -ErrorAction SilentlyContinue` })
      });
      addLog('System', `Launched: ${tool.name}`);
      onTrigger?.(`Launched ${tool.name}`, tool.cmd);
    } catch (_) {}
  };

  return (
    <div className="glass-panel p-3 rounded-2xl border border-aurora-amber/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wrench className="w-4 h-4 text-aurora-amber" />
          <span className="text-[11px] font-mono font-bold text-slate-100">Windows System & Diagnostics Toolkit</span>
        </div>
        <span className="text-[9px] font-mono text-titanium-400">Admin Level</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TOOLS.map(tool => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.name}
              onClick={() => launchTool(tool)}
              className="p-3 rounded-xl glass-card hover:border-aurora-amber/50 hover:bg-aurora-amber/5 text-left transition group active:scale-95 flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-1.5 rounded-lg bg-obsidian-850 text-aurora-amber group-hover:bg-aurora-amber/20 transition">
                  <Icon className="w-4 h-4" />
                </div>
                <ExternalLink className="w-3 h-3 text-titanium-500 group-hover:text-aurora-amber transition" />
              </div>
              <div>
                <p className="text-[10px] font-mono font-bold text-slate-200 group-hover:text-aurora-amber truncate">
                  {tool.name}
                </p>
                <p className="text-[8px] font-mono text-titanium-500 truncate">{tool.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 5. TERMINAL SURFACE
// ─────────────────────────────────────────────────────────────────────────
function TerminalSurface({ executeTerminalCommand, terminalLines }) {
  const [cmd, setCmd] = useState('');
  const [cwd, setCwd] = useState('C:\\Users\\Hp\\Desktop\\AETHER CONTROL');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const termRef = useRef(null);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [terminalLines]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cmd.trim()) return;
    const c = cmd.trim();
    setCmdHistory(prev => [c, ...prev.slice(0, 49)]);
    setHistIdx(-1);
    setCmd('');
    await executeTerminalCommand(c, cwd);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(next);
      setCmd(cmdHistory[next] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setCmd(next === -1 ? '' : cmdHistory[next]);
    }
  };

  const quickCmds = ['dir', 'git status', 'npm run dev', 'ipconfig', 'tasklist', 'cls'];

  return (
    <div className="glass-panel p-3 rounded-2xl border border-aurora-emerald/30 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-aurora-emerald" />
          <span className="text-[11px] font-mono font-bold text-slate-100">Live PowerShell Console</span>
        </div>
        <span className="text-[9px] font-mono text-titanium-500 truncate max-w-[140px]">{cwd}</span>
      </div>

      {/* Quick command buttons */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {quickCmds.map(q => (
          <button
            key={q}
            onClick={() => { setCmd(q); }}
            className="px-2 py-1 rounded-lg glass-card text-[9px] font-mono text-titanium-400 hover:text-white whitespace-nowrap transition"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Terminal Output Window */}
      <div ref={termRef} className="bg-black rounded-xl border border-obsidian-800 p-3 h-64 overflow-y-auto font-mono text-[10px] space-y-0.5">
        {terminalLines.map(line => (
          <div key={line.id} className={
            line.type === 'cmd' ? 'text-aurora-cyan font-bold' :
            line.type === 'stderr' ? 'text-red-400' :
            line.type === 'exit' ? 'text-titanium-500 italic' :
            line.type === 'system' ? 'text-aurora-emerald/70 italic' :
            'text-titanium-200'
          }>
            {line.text}
          </div>
        ))}
      </div>

      {/* Input Line */}
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <span className="text-[10px] font-mono text-aurora-emerald font-bold self-center">PS&gt;</span>
        <input
          type="text"
          value={cmd}
          onChange={e => setCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command (e.g. dir, npm test, python script.py)..."
          className="flex-1 bg-obsidian-950 border border-obsidian-750 rounded-xl px-3 py-2 text-[10px] font-mono text-slate-100 focus:outline-none focus:border-aurora-emerald"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="px-3.5 py-2 rounded-xl bg-aurora-emerald text-obsidian-950 font-mono font-bold text-[10px] flex items-center gap-1 hover:bg-emerald-400 transition shrink-0"
        >
          <Play className="w-3 h-3" />
          <span>Run</span>
        </button>
      </form>
    </div>
  );
}
