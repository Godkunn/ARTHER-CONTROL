// src/components/smartapps/SmartApps.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAether } from '../../context/AetherContext';
import { Globe, FileCode, Terminal, Download, ArrowLeft, ArrowRight, RefreshCw, Save, Check, Package, ChevronRight, Folder, File, ExternalLink, Play } from 'lucide-react';
import InstallManager from './InstallManager';

const TABS = [
  { id: 'browser', label: 'Browser', icon: Globe, color: 'aurora-blue' },
  { id: 'vscode', label: 'VS Code', icon: FileCode, color: 'aurora-purple' },
  { id: 'terminal', label: 'Terminal', icon: Terminal, color: 'aurora-emerald' },
  { id: 'install', label: 'Install', icon: Package, color: 'aurora-cyan' },
];

export default function SmartApps() {
  const { executeTerminalCommand, terminalLines, addLog, apiFetch } = useAether();
  const [activeSurface, setActiveSurface] = useState('browser');

  return (
    <div className="p-2 max-w-4xl mx-auto space-y-2 pb-24">
      {/* Tab Bar */}
      <div className="glass-panel p-1 rounded-xl border border-obsidian-750 flex gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSurface(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition ${
              activeSurface === tab.id
                ? `bg-${tab.color}/20 text-${tab.color} border border-${tab.color}/30`
                : 'text-titanium-500 hover:text-titanium-200'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeSurface === 'browser' && <BrowserSurface apiFetch={apiFetch} addLog={addLog} />}
      {activeSurface === 'vscode' && <VsCodeSurface apiFetch={apiFetch} addLog={addLog} />}
      {activeSurface === 'terminal' && <TerminalSurface executeTerminalCommand={executeTerminalCommand} terminalLines={terminalLines} />}
      {activeSurface === 'install' && <InstallManager apiFetch={apiFetch} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// BROWSER SURFACE
// ─────────────────────────────────────────────────────────────────────────
function BrowserSurface({ apiFetch, addLog, setActiveTab }) {
  const { setScreenshareActive, screenshareActive } = useAether();
  const [urlInput, setUrlInput] = useState('https://google.com');
  const [history, setHistory] = useState(['https://google.com']);
  const [histIdx, setHistIdx] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [lastOpened, setLastOpened] = useState(null);
  const [cmdResult, setCmdResult] = useState(null);

  const navigate = async (e, overrideUrl) => {
    e?.preventDefault();
    const raw = (overrideUrl || urlInput).trim();
    if (!raw) return;
    let url = raw.startsWith('http') ? raw : 'https://' + raw;
    setLaunching(true);
    setCmdResult(null);
    try {
      const res = await apiFetch('/api/terminal', {
        method: 'POST',
        body: JSON.stringify({ cmd: `Start-Process "${url}"` })
      });
      setHistory(prev => [...prev.slice(0, histIdx + 1), url]);
      setHistIdx(prev => prev + 1);
      setLastOpened(url);
      setCmdResult('opened');
      addLog('Browser', `Launched on laptop: ${url}`);
    } catch (_) {
      setCmdResult('error');
    }
    setLaunching(false);
  };

  const runCmd = async (cmd, label) => {
    try {
      await apiFetch('/api/terminal', { method: 'POST', body: JSON.stringify({ cmd }) });
      addLog('Browser', label);
      setCmdResult(label);
    } catch (_) {}
  };

  const quickSites = [
    { label: 'Google', url: 'https://google.com', icon: '🔍' },
    { label: 'GitHub', url: 'https://github.com', icon: '🐱' },
    { label: 'YouTube', url: 'https://youtube.com', icon: '▶' },
    { label: 'ChatGPT', url: 'https://chat.openai.com', icon: '🤖' },
    { label: 'npm', url: 'https://npmjs.com', icon: '📦' },
    { label: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '💬' },
  ];

  return (
    <div className="glass-panel p-3 rounded-xl border border-aurora-blue/20 space-y-3">
      {/* How it works notice */}
      <div className="flex items-start gap-2 p-2 rounded-lg bg-aurora-blue/5 border border-aurora-blue/15">
        <Globe className="w-3.5 h-3.5 text-aurora-blue mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="text-[10px] font-mono font-bold text-slate-200">Laptop Browser Remote Control</p>
          <p className="text-[9px] font-mono text-titanium-400">
            Commands run on your laptop's actual Chrome/Edge. To <strong className="text-aurora-cyan">see the result</strong>, use{' '}
            <button onClick={() => { setScreenshareActive(true); }} className="text-aurora-cyan underline">Live Screen</button>{' '}
            in the Screen tab — it captures your real laptop screen.
          </p>
        </div>
      </div>

      {/* Address bar */}
      <form onSubmit={navigate} className="flex gap-1">
        <button type="button" onClick={() => { if (histIdx > 0) { setHistIdx(h => h - 1); setUrlInput(history[histIdx - 1]); } }}
          disabled={histIdx === 0} className="p-1.5 rounded-lg glass-card text-titanium-400 disabled:opacity-30">
          <ArrowLeft className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => { if (histIdx < history.length - 1) { setHistIdx(h => h + 1); setUrlInput(history[histIdx + 1]); } }}
          disabled={histIdx >= history.length - 1} className="p-1.5 rounded-lg glass-card text-titanium-400 disabled:opacity-30">
          <ArrowRight className="w-3 h-3" />
        </button>
        <input
          type="text" value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          placeholder="Enter URL or search term..."
          className="flex-1 bg-obsidian-950 border border-obsidian-750 rounded-lg px-2 py-1.5 text-[10px] font-mono text-slate-200 focus:outline-none focus:border-aurora-blue"
        />
        <button type="submit" disabled={launching}
          className="px-2.5 py-1.5 rounded-lg bg-aurora-blue/20 border border-aurora-blue/30 text-aurora-blue text-[10px] font-mono font-bold flex items-center gap-1">
          {launching
            ? <div className="w-3 h-3 border border-aurora-blue border-t-transparent rounded-full animate-spin" />
            : <ExternalLink className="w-3 h-3" />}
          Open
        </button>
      </form>

      {/* Last action feedback */}
      {lastOpened && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-aurora-emerald/5 border border-aurora-emerald/20">
          <div className="min-w-0">
            <p className="text-[9px] font-mono text-aurora-emerald">✓ Opened on laptop browser</p>
            <p className="text-[8px] font-mono text-titanium-500 truncate">{lastOpened}</p>
          </div>
          <button
            onClick={() => { setScreenshareActive(true); }}
            className="ml-2 px-2 py-1 rounded bg-aurora-cyan/20 border border-aurora-cyan/30 text-aurora-cyan text-[9px] font-mono font-bold whitespace-nowrap flex items-center gap-1 shrink-0"
          >
            <span className="text-[10px]">👁</span> View Screen
          </button>
        </div>
      )}

      {/* Browser controls */}
      <div>
        <p className="text-[9px] font-mono text-titanium-500 mb-1.5">Browser Actions</p>
        <div className="grid grid-cols-2 gap-1 mb-2">
          {[
            { label: '← Back', cmd: `(New-Object -COM Shell.Application).Windows() | Select-Object -First 1 | ForEach-Object { $_.GoBack() }`, icon: '←' },
            { label: '→ Forward', cmd: `(New-Object -COM Shell.Application).Windows() | Select-Object -First 1 | ForEach-Object { $_.GoForward() }`, icon: '→' },
            { label: '⟳ Reload', cmd: `(New-Object -COM Shell.Application).Windows() | Select-Object -First 1 | ForEach-Object { $_.Refresh() }`, icon: '⟳' },
            { label: '✕ Close Tab', cmd: `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^w")`, icon: '✕' },
          ].map(b => (
            <button key={b.label} onClick={() => runCmd(b.cmd, b.label)}
              className="py-1.5 rounded-lg glass-card text-[9px] font-mono text-titanium-300 hover:text-white transition text-center">
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick sites */}
      <div>
        <p className="text-[9px] font-mono text-titanium-500 mb-1.5">Quick Open</p>
        <div className="grid grid-cols-3 gap-1">
          {quickSites.map(site => (
            <button key={site.url}
              onClick={() => { setUrlInput(site.url); navigate(null, site.url); }}
              className="flex items-center gap-1 py-1.5 px-2 rounded-lg glass-card text-[9px] font-mono text-titanium-300 hover:text-white transition">
              <span>{site.icon}</span><span>{site.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────
// VS CODE WORKSPACE SURFACE
// ─────────────────────────────────────────────────────────────────────────
function VsCodeSurface({ apiFetch, addLog }) {
  const [customPathInput, setCustomPathInput] = useState('C:/Users/Hp/Desktop/AETHER CONTROL');
  const [tunnelStatus, setTunnelStatus] = useState(null);
  const [entries, setEntries] = useState([]);
  const [parts, setParts] = useState([]);
  const [currentPath, setCurrentPath] = useState('C:/Users/Hp/Desktop/AETHER CONTROL');
  const [openFile, setOpenFile] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [launchingCode, setLaunchingCode] = useState(false);
  const [runningFile, setRunningFile] = useState(false);

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
      } else setError(data.error);
    } catch (err) { setError('Save failed'); }
  };

  const launchVSCodeDesktop = async (targetPath = null) => {
    const pathToOpen = (targetPath || customPathInput || currentPath).trim();
    setLaunchingCode(true);
    try {
      await apiFetch('/api/terminal', {
        method: 'POST',
        body: JSON.stringify({ cmd: `code "${pathToOpen.replace(/\//g, '\\')}"` })
      });
      addLog('VS Code', `Launched VS Code on laptop for: ${pathToOpen}`);
    } catch (_) {}
    setLaunchingCode(false);
  };

  const startVsCodeTunnel = async () => {
    setTunnelStatus('Starting VS Code Web Tunnel on laptop...');
    try {
      await apiFetch('/api/terminal', {
        method: 'POST',
        body: JSON.stringify({ cmd: `code tunnel --accept-server-license-terms` })
      });
      addLog('VS Code', 'Triggered VS Code Web Tunnel');
    } catch (_) {}
  };

  const runCurrentFile = async () => {
    if (!openFile) return;
    setRunningFile(true);
    try {
      const isJs = openFile.name.endsWith('.js');
      const isPy = openFile.name.endsWith('.py');
      const runner = isJs ? 'node' : isPy ? 'python' : 'powershell';
      await apiFetch('/api/terminal', {
        method: 'POST',
        body: JSON.stringify({ cmd: `${runner} "${openFile.path.replace(/\//g, '\\')}"` })
      });
      addLog('VS Code', `Executed: ${openFile.name}`);
    } catch (_) {}
    setRunningFile(false);
  };

  useEffect(() => { loadDir('C:/Users/Hp/Desktop/AETHER CONTROL'); }, []);

  const TEXT_EXTS = ['.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.md', '.txt', '.css', '.html', '.env', '.sh', '.ps1', '.yml', '.yaml', '.toml', '.xml', '.csv', '.log', '.ini', '.cfg'];
  const isEditable = (name) => TEXT_EXTS.some(ext => name.toLowerCase().endsWith(ext));

  return (
    <div className="glass-panel p-3 rounded-xl border border-aurora-purple/20 space-y-2.5">
      {/* 1. Custom Project Launcher Bar */}
      <div className="bg-obsidian-950 p-2.5 rounded-lg border border-obsidian-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-slate-200 flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5 text-aurora-purple" />
            <span>Launch Any Project in VS Code on Laptop</span>
          </span>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-aurora-purple/15 text-aurora-purple border border-aurora-purple/30">
            CLI: code v1.133
          </span>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); launchVSCodeDesktop(customPathInput); }} className="flex gap-1.5">
          <input
            type="text"
            value={customPathInput}
            onChange={e => setCustomPathInput(e.target.value)}
            placeholder="Enter any project/folder path (e.g. C:/Users/Hp/Desktop/...)"
            className="flex-1 bg-obsidian-900 border border-obsidian-750 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-100 placeholder-titanium-600 focus:outline-none focus:border-aurora-purple"
          />
          <button
            type="submit"
            disabled={launchingCode || !customPathInput.trim()}
            className="px-3 py-1.5 rounded-lg bg-aurora-purple/20 border border-aurora-purple/50 text-aurora-purple hover:bg-aurora-purple/30 text-[10px] font-mono font-bold flex items-center gap-1 transition shrink-0"
            title="Launch VS Code application on laptop"
          >
            <ExternalLink className="w-3 h-3" />
            <span>{launchingCode ? 'Launching...' : 'Open on PC'}</span>
          </button>
        </form>

        {/* Quick project buttons */}
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {QUICK_PROJECTS.map(p => (
            <button
              key={p.path}
              onClick={() => { setCustomPathInput(p.path); loadDir(p.path); }}
              className={`px-2 py-0.5 rounded text-[8px] font-mono whitespace-nowrap transition border ${
                currentPath === p.path
                  ? 'bg-aurora-purple/20 border-aurora-purple text-aurora-purple font-bold'
                  : 'glass-card border-obsidian-800 text-titanium-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. File Explorer / Editor Header */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-obsidian-750">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono font-bold text-slate-200 truncate">
            {openFile ? openFile.name : `Explorer: ${currentPath}`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {openFile ? (
            <>
              <button
                onClick={runCurrentFile}
                disabled={runningFile}
                className="px-2 py-1 rounded bg-aurora-emerald/20 border border-aurora-emerald/40 text-aurora-emerald text-[9px] font-mono font-bold flex items-center gap-1"
                title="Run active file with node/python on laptop"
              >
                <Play className="w-2.5 h-2.5" />
                <span>Run</span>
              </button>
              <button
                onClick={saveFile}
                className={`px-2 py-1 rounded text-[9px] font-mono font-bold flex items-center gap-1 border transition ${
                  saved ? 'bg-aurora-emerald/20 border-aurora-emerald text-aurora-emerald' : 'bg-aurora-purple/20 border-aurora-purple/40 text-aurora-purple'
                }`}
              >
                {saved ? <Check className="w-2.5 h-2.5" /> : <Save className="w-2.5 h-2.5" />}
                <span>{saved ? 'Saved' : 'Save'}</span>
              </button>
              <button onClick={() => setOpenFile(null)} className="text-[9px] font-mono text-titanium-400 px-2 py-1 rounded glass-card">
                Close
              </button>
            </>
          ) : (
            <button
              onClick={() => launchVSCodeDesktop(currentPath)}
              className="px-2 py-1 rounded bg-aurora-blue/20 border border-aurora-blue/30 text-aurora-blue text-[9px] font-mono font-bold flex items-center gap-1 hover:bg-aurora-blue/30 transition"
              title="Open current folder in VS Code on laptop"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              <span>Open This in PC</span>
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb Path */}
      {!openFile && (
        <div className="flex items-center gap-0.5 overflow-x-auto pb-0.5">
          {parts.map((part, i) => {
            const breadPath = parts.slice(0, i + 1).join('/');
            const fullPath = breadPath.match(/^[A-Za-z]:/) ? breadPath : '/' + breadPath;
            return (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="w-2.5 h-2.5 text-obsidian-600 shrink-0" />}
                <button
                  onClick={() => loadDir(fullPath)}
                  className="text-[9px] font-mono text-titanium-400 hover:text-aurora-purple whitespace-nowrap px-1 py-0.5 rounded hover:bg-obsidian-750 transition"
                >
                  {part}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {error && <div className="text-[9px] font-mono text-red-400 bg-red-950/30 border border-red-800/30 rounded px-2 py-1">{error}</div>}

      {/* Code Editor */}
      {openFile ? (
        <div className="relative">
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="w-full h-80 bg-obsidian-950 border border-obsidian-800 rounded-lg p-2.5 text-[10px] font-mono text-slate-100 focus:outline-none focus:border-aurora-purple/60 resize-none leading-relaxed font-medium"
            spellCheck={false}
          />
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-36">
          <div className="w-4 h-4 border-2 border-aurora-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-0.5 max-h-80 overflow-y-auto divide-y divide-obsidian-850">
          {entries.length === 0 && <p className="text-[9px] font-mono text-titanium-600 text-center py-6">Empty directory</p>}
          {entries.map(entry => {
            const editable = isEditable(entry.name);
            return (
              <div
                key={entry.path}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-obsidian-800/70 transition group cursor-pointer"
                onClick={() => {
                  if (entry.type === 'folder') loadDir(entry.path);
                  else if (editable) loadFile(entry.path, entry.name);
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {entry.type === 'folder' ? (
                    <Folder className="w-3 h-3 text-aurora-cyan shrink-0" />
                  ) : (
                    <File className={`w-3 h-3 shrink-0 ${editable ? 'text-aurora-purple' : 'text-titanium-500'}`} />
                  )}
                  <span className={`text-[10px] font-mono truncate ${entry.type === 'folder' ? 'text-slate-200 font-semibold' : editable ? 'text-titanium-200 group-hover:text-white' : 'text-titanium-500'}`}>
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
  );
}

// ─────────────────────────────────────────────────────────────────────────
// TERMINAL SURFACE
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

  const quickCmds = ['dir', 'ls', 'git status', 'npm run dev', 'npm run server', 'ipconfig', 'tasklist', 'cls'];

  return (
    <div className="glass-panel p-3 rounded-xl border border-aurora-emerald/20 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-aurora-emerald" />
          <span className="text-[10px] font-mono font-bold text-slate-200">PowerShell Terminal</span>
        </div>
        <span className="text-[9px] font-mono text-titanium-500 truncate max-w-[140px]">{cwd}</span>
      </div>

      {/* Quick commands */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {quickCmds.map(q => (
          <button key={q}
            onClick={() => { setCmd(q); }}
            className="px-2 py-1 rounded glass-card text-[9px] font-mono text-titanium-400 hover:text-white whitespace-nowrap transition">
            {q}
          </button>
        ))}
      </div>

      {/* Terminal output */}
      <div ref={termRef} className="bg-black rounded-lg border border-obsidian-800 p-2 h-60 overflow-y-auto font-mono text-[10px] space-y-0.5">
        {terminalLines.map(line => (
          <div key={line.id} className={
            line.type === 'cmd' ? 'text-aurora-cyan' :
            line.type === 'stderr' ? 'text-red-400' :
            line.type === 'exit' ? 'text-titanium-500 italic' :
            line.type === 'system' ? 'text-aurora-emerald/70 italic' :
            'text-titanium-200'
          }>
            {line.text}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-1">
        <span className="text-[10px] font-mono text-aurora-emerald self-center">PS&gt;</span>
        <input
          type="text" value={cmd}
          onChange={e => setCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter PowerShell command..."
          className="flex-1 bg-obsidian-950 border border-obsidian-750 rounded-lg px-2 py-1.5 text-[10px] font-mono text-slate-100 focus:outline-none focus:border-aurora-emerald"
          autoComplete="off" spellCheck={false}
        />
        <button type="submit" className="px-2.5 py-1.5 rounded-lg bg-aurora-emerald/20 border border-aurora-emerald/30 text-aurora-emerald text-[10px] font-mono font-bold flex items-center gap-1">
          <Play className="w-2.5 h-2.5" /> Run
        </button>
      </form>
    </div>
  );
}
