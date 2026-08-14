// src/components/files/FileManager.jsx
import React, { useState, useEffect } from 'react';
import { useAether } from '../../context/AetherContext';
import {
  Folder, File, Download, HardDrive, ChevronRight, RefreshCw, ArrowLeft,
  Eye, X, Play, Music, Image as ImageIcon, FileText, Code, Copy, Check
} from 'lucide-react';

const ROOTS = [
  { label: 'Project', path: 'C:/Users/Hp/Desktop/AETHER CONTROL', icon: '⚡' },
  { label: 'Desktop', path: 'C:/Users/Hp/Desktop', icon: '🖥' },
  { label: 'Downloads', path: 'C:/Users/Hp/Downloads', icon: '⬇' },
  { label: 'Documents', path: 'C:/Users/Hp/Documents', icon: '📄' },
  { label: 'Pictures', path: 'C:/Users/Hp/Pictures', icon: '🖼' },
  { label: 'Music', path: 'C:/Users/Hp/Music', icon: '🎵' },
  { label: 'C:\\', path: 'C:/', icon: '💾' },
];

const EXT_COLORS = {
  '.js': 'text-yellow-400', '.jsx': 'text-aurora-cyan', '.ts': 'text-blue-400', '.tsx': 'text-blue-300',
  '.py': 'text-green-400', '.json': 'text-orange-400', '.md': 'text-slate-300',
  '.pdf': 'text-red-400', '.png': 'text-pink-400', '.jpg': 'text-pink-400', '.jpeg': 'text-pink-400',
  '.mp4': 'text-purple-400', '.mp3': 'text-aurora-emerald', '.zip': 'text-amber-400', '.exe': 'text-red-500',
};

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.mkv', '.ogg'];
const AUDIO_EXTS = ['.mp3', '.wav', '.m4a', '.flac', '.aac'];
const CODE_EXTS = ['.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.md', '.txt', '.css', '.html', '.env', '.sh', '.ps1', '.yml', '.yaml', '.toml', '.xml', '.csv', '.log', '.ini', '.cfg'];

export default function FileManager() {
  const { apiFetch, addLog } = useAether();
  const [currentPath, setCurrentPath] = useState('C:/Users/Hp/Desktop/AETHER CONTROL');
  const [entries, setEntries] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [navHistory, setNavHistory] = useState(['C:/Users/Hp/Desktop/AETHER CONTROL']);
  const [histIdx, setHistIdx] = useState(0);

  // Preview Modal State
  const [previewFile, setPreviewFile] = useState(null); // { path, name, ext, type, content, streamUrl }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const getApiBase = () => {
    const isDevPort = window.location.port === '5173' || window.location.port === '5174';
    return isDevPort ? `http://${window.location.hostname}:3001` : '';
  };

  const loadDir = async (dirPath, addToHistory = true) => {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch(`/api/files?path=${encodeURIComponent(dirPath)}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setParts(data.parts || []);
      setCurrentPath(data.path || dirPath);
      if (addToHistory) {
        setNavHistory(prev => [...prev.slice(0, histIdx + 1), data.path || dirPath]);
        setHistIdx(prev => prev + 1);
      }
    } catch (err) { setError('Cannot access this location'); }
    setLoading(false);
  };

  const goBack = () => {
    if (histIdx > 0) {
      const prev = navHistory[histIdx - 1];
      setHistIdx(h => h - 1);
      loadDir(prev, false);
    }
  };

  const handleItemClick = async (entry) => {
    if (entry.type === 'folder') {
      loadDir(entry.path);
      return;
    }

    const ext = entry.ext ? entry.ext.toLowerCase() : '';
    const isImg = IMAGE_EXTS.includes(ext);
    const isVid = VIDEO_EXTS.includes(ext);
    const isAud = AUDIO_EXTS.includes(ext);
    const isCode = CODE_EXTS.includes(ext);
    const isPdf = ext === '.pdf';

    const streamUrl = `${getApiBase()}/api/files/download?path=${encodeURIComponent(entry.path)}`;

    if (isCode) {
      setPreviewLoading(true);
      setPreviewFile({ path: entry.path, name: entry.name, ext, kind: 'code', content: '', streamUrl, size: entry.size });
      try {
        const res = await apiFetch(`/api/files/read?path=${encodeURIComponent(entry.path)}`);
        const d = await res.json();
        setPreviewFile({ path: entry.path, name: entry.name, ext, kind: 'code', content: d.content || '', streamUrl, size: entry.size });
        addLog('Files', `Streamed preview: ${entry.name}`);
      } catch (_) {
        setPreviewFile(null);
      }
      setPreviewLoading(false);
    } else if (isImg) {
      setPreviewFile({ path: entry.path, name: entry.name, ext, kind: 'image', streamUrl, size: entry.size });
      addLog('Files', `Viewed image: ${entry.name}`);
    } else if (isVid) {
      setPreviewFile({ path: entry.path, name: entry.name, ext, kind: 'video', streamUrl, size: entry.size });
      addLog('Files', `Streamed video: ${entry.name}`);
    } else if (isAud) {
      setPreviewFile({ path: entry.path, name: entry.name, ext, kind: 'audio', streamUrl, size: entry.size });
      addLog('Files', `Streamed audio: ${entry.name}`);
    } else if (isPdf) {
      setPreviewFile({ path: entry.path, name: entry.name, ext, kind: 'pdf', streamUrl, size: entry.size });
    } else {
      setPreviewFile({ path: entry.path, name: entry.name, ext, kind: 'other', streamUrl, size: entry.size });
    }
  };

  const copyContent = () => {
    if (previewFile?.content) {
      navigator.clipboard?.writeText(previewFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => { loadDir('C:/Users/Hp/Desktop/AETHER CONTROL', false); }, []);

  return (
    <div className="p-2 max-w-4xl mx-auto space-y-2 pb-24">
      {/* Header */}
      <div className="glass-panel px-3 py-2 rounded-xl border border-obsidian-750 flex items-center gap-2">
        <HardDrive className="w-3.5 h-3.5 text-aurora-cyan shrink-0" />
        <span className="text-[10px] font-mono font-bold text-slate-200">File Manager</span>
        <span className="text-[9px] font-mono text-titanium-500 truncate flex-1">{currentPath}</span>
        <button onClick={goBack} disabled={histIdx === 0} className="p-1 rounded glass-card text-titanium-400 disabled:opacity-30">
          <ArrowLeft className="w-3 h-3" />
        </button>
        <button onClick={() => loadDir(currentPath, false)} className="p-1 rounded glass-card text-titanium-400">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Root shortcuts */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {ROOTS.map(root => (
          <button key={root.path}
            onClick={() => loadDir(root.path)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[9px] font-mono whitespace-nowrap transition ${
              currentPath === root.path
                ? 'bg-aurora-cyan/20 border-aurora-cyan text-aurora-cyan font-bold'
                : 'glass-card border-obsidian-750 text-titanium-400 hover:text-white'
            }`}>
            <span>{root.icon}</span> {root.label}
          </button>
        ))}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {parts.map((part, i) => {
          const breadPath = parts.slice(0, i + 1).join('/');
          const fullPath = breadPath.match(/^[A-Za-z]:/) ? breadPath : '/' + breadPath;
          return (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-2.5 h-2.5 text-obsidian-600 shrink-0" />}
              <button onClick={() => loadDir(fullPath)}
                className="text-[9px] font-mono text-titanium-400 hover:text-aurora-cyan whitespace-nowrap px-1 py-0.5 rounded hover:bg-obsidian-750 transition">
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* File list */}
      <div className="glass-panel rounded-xl border border-obsidian-750 overflow-hidden">
        {error && (
          <div className="p-3 text-[9px] font-mono text-red-400">{error}</div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-4 h-4 border-2 border-aurora-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-obsidian-800">
            {entries.length === 0 && !error && (
              <p className="text-[9px] font-mono text-titanium-600 text-center py-6">Empty directory</p>
            )}
            {entries.map(entry => {
              const extColor = entry.ext ? EXT_COLORS[entry.ext] || 'text-titanium-400' : '';
              const isVideo = VIDEO_EXTS.includes(entry.ext?.toLowerCase());
              const isAudio = AUDIO_EXTS.includes(entry.ext?.toLowerCase());
              const isImage = IMAGE_EXTS.includes(entry.ext?.toLowerCase());

              return (
                <div key={entry.path}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-obsidian-800/60 transition group cursor-pointer"
                  onClick={() => handleItemClick(entry)}
                >
                  {entry.type === 'folder' ? (
                    <Folder className="w-3.5 h-3.5 text-aurora-cyan shrink-0" />
                  ) : isImage ? (
                    <ImageIcon className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  ) : isVideo ? (
                    <Play className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  ) : isAudio ? (
                    <Music className="w-3.5 h-3.5 text-aurora-emerald shrink-0" />
                  ) : (
                    <File className={`w-3.5 h-3.5 shrink-0 ${extColor}`} />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-mono truncate ${entry.type === 'folder' ? 'text-slate-200 font-semibold' : 'text-titanium-300 group-hover:text-white'}`}>
                      {entry.name}
                    </p>
                    <p className="text-[8px] font-mono text-titanium-600">{entry.modified}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {entry.size !== '--' && <span className="text-[9px] font-mono text-titanium-600 mr-1">{entry.size}</span>}
                    {entry.type === 'file' && (
                      <>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-obsidian-900 text-aurora-cyan border border-aurora-cyan/30 flex items-center gap-0.5 hover:bg-aurora-cyan/20">
                          <Eye className="w-2.5 h-2.5" /> View
                        </span>
                        <a
                          href={`${getApiBase()}/api/files/download?path=${encodeURIComponent(entry.path)}`}
                          download={entry.name}
                          onClick={e => e.stopPropagation()}
                          className="px-1.5 py-0.5 rounded bg-obsidian-900 text-titanium-300 border border-obsidian-750 flex items-center gap-0.5 hover:text-aurora-emerald hover:border-aurora-emerald/40 transition text-[9px] font-mono"
                          title="Download file to phone storage"
                        >
                          <Download className="w-2.5 h-2.5" /> Save
                        </a>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEAMLESS IN-APP STREAM & PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn">
          <div className="glass-panel max-w-2xl w-full max-h-[85vh] rounded-2xl border border-aurora-cyan/40 flex flex-col shadow-glow-cyan overflow-hidden">
            {/* Modal Header */}
            <div className="p-3 border-b border-obsidian-750 flex items-center justify-between bg-obsidian-950">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-aurora-cyan shrink-0" />
                <span className="text-[11px] font-mono font-bold text-slate-100 truncate">{previewFile.name}</span>
                {previewFile.size && <span className="text-[9px] font-mono text-titanium-500">{previewFile.size}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                {previewFile.kind === 'code' && (
                  <button
                    onClick={copyContent}
                    className="p-1.5 rounded-lg bg-obsidian-800 text-titanium-300 hover:text-white flex items-center gap-1 text-[9px] font-mono"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-3 h-3 text-aurora-emerald" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                )}
                <a
                  href={previewFile.streamUrl}
                  download={previewFile.name}
                  className="px-2 py-1 rounded-lg bg-aurora-emerald/20 border border-aurora-emerald/40 text-aurora-emerald hover:bg-aurora-emerald/30 flex items-center gap-1 text-[9px] font-mono font-bold transition"
                  title="Download copy to phone storage"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-lg bg-obsidian-800 text-titanium-300 hover:text-white ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-3 flex-1 overflow-auto bg-obsidian-900">
              {previewLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-aurora-cyan border-t-transparent rounded-full animate-spin" />
                </div>
              ) : previewFile.kind === 'image' ? (
                <div className="flex items-center justify-center">
                  <img
                    src={previewFile.streamUrl}
                    alt={previewFile.name}
                    className="max-h-[60vh] max-w-full rounded-lg object-contain"
                  />
                </div>
              ) : previewFile.kind === 'video' ? (
                <div className="flex items-center justify-center">
                  <video
                    src={previewFile.streamUrl}
                    controls
                    autoPlay
                    className="max-h-[60vh] max-w-full rounded-lg bg-black"
                  />
                </div>
              ) : previewFile.kind === 'audio' ? (
                <div className="py-10 flex flex-col items-center justify-center space-y-4">
                  <Music className="w-12 h-12 text-aurora-emerald animate-pulse" />
                  <audio src={previewFile.streamUrl} controls autoPlay className="w-full max-w-md" />
                </div>
              ) : previewFile.kind === 'code' ? (
                <pre className="text-[10px] font-mono text-slate-200 whitespace-pre-wrap leading-relaxed select-text p-2 bg-obsidian-950 rounded-lg border border-obsidian-800">
                  {previewFile.content || '// Empty file'}
                </pre>
              ) : (
                <div className="text-center py-10 space-y-2">
                  <File className="w-10 h-10 text-titanium-400 mx-auto" />
                  <p className="text-[11px] font-mono text-slate-200 font-bold">{previewFile.name}</p>
                  <p className="text-[9px] font-mono text-titanium-500">Size: {previewFile.size || 'Unknown'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
