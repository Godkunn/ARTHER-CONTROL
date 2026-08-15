// src/components/keyboard/VirtualKeyboard.jsx
import React, { useState } from 'react';
import { useAether } from '../../context/AetherContext';
import { Keyboard as KeyboardIcon, Send, Code, Terminal, Sparkles, X, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

export default function VirtualKeyboard() {
  const { sendInputEvent, setShowKeyboardBar } = useAether();
  const [textInput, setTextInput] = useState('');
  const [activeModifiers, setActiveModifiers] = useState({ ctrl: false, alt: false, shift: false, win: false });
  const [currentTab, setCurrentTab] = useState(1); // 1: Modifiers & Nav, 2: Shortcuts, 3: F-Keys & System
  const [liveType, setLiveType] = useState(true);
  const [feedback, setFeedback] = useState('');

  const toggleModifier = (key) => {
    setActiveModifiers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 1500);
  };

  const handleKeyPress = (keyName) => {
    sendInputEvent({
      type: 'key_press',
      key: keyName,
      modifiers: activeModifiers
    });
    showFeedback(`Sent: ${keyName}`);
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (liveType) {
      sendInputEvent({ type: 'key_press', key: 'Enter' });
      showFeedback(`Sent: Enter`);
    } else {
      if (!textInput) return;
      sendInputEvent({ type: 'type_text', text: textInput + '\n' });
      showFeedback(`Typed & Enter`);
    }
    setTextInput('');
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (liveType) {
      if (val.length > textInput.length) {
        const char = val.slice(textInput.length);
        sendInputEvent({ type: 'type_text', text: char });
      } else if (val.length < textInput.length) {
        const diff = textInput.length - val.length;
        for (let i = 0; i < diff; i++) {
          sendInputEvent({ type: 'key_press', key: 'Backspace' });
        }
      }
    }
    setTextInput(val);
  };

  const macros = [
    { label: 'npm run dev', cmd: 'npm run dev\n' },
    { label: 'git status', cmd: 'git status\n' },
    { label: 'python main.py', cmd: 'python main.py\n' },
    { label: 'cls', cmd: 'cls\n' },
  ];

  return (
    <div className="glass-panel p-3 rounded-2xl border border-aurora-emerald/40 space-y-2.5 bg-obsidian-900/95 shadow-glow-emerald animate-fadeIn">
      {/* Top Header & Close */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <KeyboardIcon className="w-4 h-4 text-aurora-emerald" />
          <span className="text-xs font-mono font-bold text-slate-100">Live Remote Keyboard</span>
          {feedback && (
            <span className="text-[10px] font-mono text-aurora-emerald bg-aurora-emerald/15 px-1.5 py-0.5 rounded animate-pulse">
              {feedback}
            </span>
          )}
        </div>

        {/* Tab switcher chips (1 to 6) */}
        <div className="flex items-center gap-1 bg-obsidian-950 p-1 rounded-xl border border-obsidian-800 overflow-x-auto scrollbar-none max-w-[65vw]">
          {[
            { id: 1, label: '1:Nav' },
            { id: 2, label: '2:Edit' },
            { id: 3, label: '3:Dev' },
            { id: 4, label: '4:Win' },
            { id: 5, label: '5:Web' },
            { id: 6, label: '6:F-Keys' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition ${
                currentTab === tab.id
                  ? 'bg-aurora-emerald text-obsidian-950 shadow-glow-emerald'
                  : 'text-titanium-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => setShowKeyboardBar(false)}
            className="text-titanium-400 hover:text-white p-1 ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Direct Text Input Line */}
      <form onSubmit={handleSendText} className="flex gap-2">
        <input
          type="text"
          value={textInput}
          onChange={handleInputChange}
          placeholder="Type here to stream directly to active laptop window..."
          className="flex-1 bg-obsidian-950 border border-obsidian-750 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-aurora-emerald"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-xl bg-aurora-emerald text-obsidian-950 text-xs font-mono font-bold hover:bg-emerald-400 transition flex items-center space-x-1 shrink-0 shadow-glow-emerald"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Enter</span>
        </button>
      </form>

      {/* TAB 1: MODIFIERS & CORE NAVIGATION */}
      {currentTab === 1 && (
        <div className="space-y-2 animate-fadeIn">
          {/* Modifiers row */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            <button
              onClick={() => toggleModifier('ctrl')}
              className={`py-1.5 rounded-xl text-xs font-mono font-bold border transition ${
                activeModifiers.ctrl ? 'bg-aurora-cyan text-obsidian-950 border-aurora-cyan shadow-glow-cyan' : 'bg-obsidian-800 text-titanium-200 border-obsidian-700'
              }`}
            >
              CTRL
            </button>
            <button
              onClick={() => toggleModifier('alt')}
              className={`py-1.5 rounded-xl text-xs font-mono font-bold border transition ${
                activeModifiers.alt ? 'bg-aurora-purple text-obsidian-950 border-aurora-purple shadow-glow-purple' : 'bg-obsidian-800 text-titanium-200 border-obsidian-700'
              }`}
            >
              ALT
            </button>
            <button
              onClick={() => toggleModifier('shift')}
              className={`py-1.5 rounded-xl text-xs font-mono font-bold border transition ${
                activeModifiers.shift ? 'bg-aurora-amber text-obsidian-950 border-aurora-amber shadow-glow-amber' : 'bg-obsidian-800 text-titanium-200 border-obsidian-700'
              }`}
            >
              SHIFT
            </button>
            <button
              onClick={() => toggleModifier('win')}
              className={`py-1.5 rounded-xl text-xs font-mono font-bold border transition ${
                activeModifiers.win ? 'bg-aurora-pink text-white border-aurora-pink shadow-glow-pink' : 'bg-obsidian-800 text-titanium-200 border-obsidian-700'
              }`}
            >
              WIN
            </button>
            <button onClick={() => handleKeyPress('Escape')} className="py-1.5 rounded-xl bg-obsidian-800 border border-obsidian-700 text-slate-200 text-xs font-mono font-bold hover:border-aurora-cyan">
              ESC
            </button>
            <button onClick={() => handleKeyPress('Tab')} className="py-1.5 rounded-xl bg-obsidian-800 border border-obsidian-700 text-slate-200 text-xs font-mono font-bold hover:border-aurora-cyan">
              TAB
            </button>
            <button onClick={() => handleKeyPress('Backspace')} className="py-1.5 rounded-xl bg-obsidian-800 border border-obsidian-700 text-aurora-pink text-xs font-mono font-bold hover:bg-aurora-pink/20">
              ⌫ DEL
            </button>
          </div>

          {/* Quick Browser & Tab Row in Tab 1 */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => handleKeyPress('Ctrl+Shift+T')}
              className="py-1.5 rounded-xl bg-aurora-cyan/20 border border-aurora-cyan/50 text-[11px] font-mono text-aurora-cyan font-bold hover:bg-aurora-cyan/30 flex items-center justify-center gap-1 shadow-glow-cyan"
              title="Reopen Closed Tab / Retrieve Tab History (Ctrl+Shift+T)"
            >
              <span>📑 Reopen Tab</span>
            </button>
            <button
              onClick={() => handleKeyPress('Ctrl+H')}
              className="py-1.5 rounded-xl bg-obsidian-900 border border-obsidian-750 text-[11px] font-mono text-titanium-200 font-bold hover:border-aurora-purple"
              title="Browser History (Ctrl+H)"
            >
              <span>🕒 History</span>
            </button>
            <button
              onClick={() => handleKeyPress('Ctrl+T')}
              className="py-1.5 rounded-xl bg-obsidian-900 border border-obsidian-750 text-[11px] font-mono text-titanium-200 font-bold hover:border-aurora-emerald"
              title="New Tab (Ctrl+T)"
            >
              <span>+ New Tab</span>
            </button>
            <button
              onClick={() => handleKeyPress('Ctrl+W')}
              className="py-1.5 rounded-xl bg-obsidian-900 border border-obsidian-750 text-[11px] font-mono text-aurora-pink font-bold hover:border-aurora-pink"
              title="Close Tab (Ctrl+W)"
            >
              <span>✕ Close Tab</span>
            </button>
          </div>

          {/* D-Pad Arrow Keys & Space */}
          <div className="grid grid-cols-5 gap-1.5">
            <button onClick={() => handleKeyPress('ArrowLeft')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-xs font-mono text-slate-200 font-bold hover:border-aurora-cyan">←</button>
            <button onClick={() => handleKeyPress('ArrowUp')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-xs font-mono text-slate-200 font-bold hover:border-aurora-cyan">↑</button>
            <button onClick={() => handleKeyPress('ArrowDown')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-xs font-mono text-slate-200 font-bold hover:border-aurora-cyan">↓</button>
            <button onClick={() => handleKeyPress('ArrowRight')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-xs font-mono text-slate-200 font-bold hover:border-aurora-cyan">→</button>
            <button onClick={() => handleKeyPress('Space')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-xs font-mono text-slate-300 font-bold hover:border-aurora-cyan">SPACE</button>
          </div>
        </div>
      )}

      {/* TAB 2: EDITING SHORTCUTS */}
      {currentTab === 2 && (
        <div className="space-y-2 animate-fadeIn">
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={() => handleKeyPress('Ctrl+C')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-titanium-200 hover:border-aurora-blue font-bold">
              Ctrl+C (Copy)
            </button>
            <button onClick={() => handleKeyPress('Ctrl+V')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-titanium-200 hover:border-aurora-emerald font-bold">
              Ctrl+V (Paste)
            </button>
            <button onClick={() => handleKeyPress('Ctrl+X')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-titanium-200 hover:border-aurora-pink font-bold">
              Ctrl+X (Cut)
            </button>
            <button onClick={() => handleKeyPress('Ctrl+A')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-cyan font-bold hover:border-aurora-cyan">
              Ctrl+A (All)
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={() => handleKeyPress('Ctrl+Z')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-titanium-200 hover:border-aurora-amber font-bold">
              Ctrl+Z (Undo)
            </button>
            <button onClick={() => handleKeyPress('Ctrl+Y')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-titanium-200 hover:border-aurora-emerald font-bold">
              Ctrl+Y (Redo)
            </button>
            <button onClick={() => handleKeyPress('Ctrl+S')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-cyan font-bold hover:border-aurora-cyan">
              Ctrl+S (Save)
            </button>
            <button onClick={() => handleKeyPress('Ctrl+F')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-purple font-bold hover:border-aurora-purple">
              Ctrl+F (Find)
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: DEV & TERMINAL */}
      {currentTab === 3 && (
        <div className="space-y-2 animate-fadeIn">
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={() => sendInputEvent({ type: 'type_text', text: 'npm run dev\n' })} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-aurora-emerald font-bold hover:border-aurora-emerald">
              npm run dev
            </button>
            <button onClick={() => sendInputEvent({ type: 'type_text', text: 'git status\n' })} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-aurora-cyan font-bold hover:border-aurora-cyan">
              git status
            </button>
            <button onClick={() => sendInputEvent({ type: 'type_text', text: 'git pull\n' })} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-aurora-blue font-bold hover:border-aurora-blue">
              git pull
            </button>
            <button onClick={() => sendInputEvent({ type: 'type_text', text: 'cls\n' })} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-titanium-300 font-bold hover:border-white">
              clear / cls
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={() => handleKeyPress('Ctrl+C')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-aurora-pink font-bold hover:border-aurora-pink">
              SIGINT (Ctrl+C)
            </button>
            <button onClick={() => handleKeyPress('Ctrl+`')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-aurora-amber font-bold hover:border-aurora-amber">
              VS Code Term
            </button>
            <button onClick={() => sendInputEvent({ type: 'type_text', text: 'python main.py\n' })} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-aurora-purple font-bold hover:border-aurora-purple">
              python main
            </button>
            <button onClick={() => sendInputEvent({ type: 'type_text', text: 'npm test\n' })} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-aurora-cyan font-bold hover:border-aurora-cyan">
              npm test
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: WINDOWS & OS */}
      {currentTab === 4 && (
        <div className="space-y-2 animate-fadeIn">
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={() => handleKeyPress('Alt+Tab')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-purple font-bold hover:border-aurora-purple">
              Alt+Tab
            </button>
            <button onClick={() => handleKeyPress('Win+D')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-titanium-200 hover:border-aurora-cyan font-bold">
              Win+D (Desk)
            </button>
            <button onClick={() => handleKeyPress('Win+E')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-amber font-bold hover:border-aurora-amber">
              Win+E (Files)
            </button>
            <button onClick={() => handleKeyPress('Win+V')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-cyan font-bold hover:border-aurora-cyan">
              Win+V (Clip)
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => handleKeyPress('Ctrl+Shift+Esc')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-aurora-pink font-bold hover:border-aurora-pink">
              Task Manager
            </button>
            <button onClick={() => handleKeyPress('Win+Shift+S')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-aurora-blue font-bold hover:border-aurora-blue">
              Snip / Screenshot
            </button>
            <button onClick={() => handleKeyPress('Win+L')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-titanium-300 font-bold hover:border-white">
              Win+L (Lock)
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: BROWSER & WEB */}
      {currentTab === 5 && (
        <div className="space-y-2 animate-fadeIn">
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={() => handleKeyPress('Alt+Left')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-cyan font-bold hover:border-aurora-cyan">
              ← Back
            </button>
            <button onClick={() => handleKeyPress('Alt+Right')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-cyan font-bold hover:border-aurora-cyan">
              → Forward
            </button>
            <button onClick={() => handleKeyPress('Ctrl+R')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-emerald font-bold hover:border-aurora-emerald">
              ⟳ Reload
            </button>
            <button onClick={() => handleKeyPress('Ctrl+W')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-pink font-bold hover:border-aurora-pink">
              ✕ Close Tab
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={() => handleKeyPress('Ctrl+T')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-aurora-blue font-bold hover:border-aurora-blue">
              + New Tab
            </button>
            <button onClick={() => handleKeyPress('Ctrl+Shift+T')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-aurora-purple font-bold hover:border-aurora-purple">
              Reopen Tab
            </button>
            <button onClick={() => handleKeyPress('Ctrl+D')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-aurora-amber font-bold hover:border-aurora-amber">
              ★ Bookmark
            </button>
            <button onClick={() => handleKeyPress('F11')} className="py-1.5 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-titanium-200 font-bold hover:border-white">
              ⛶ Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: FUNCTION KEYS (F1 - F12) & SYSTEM */}
      {currentTab === 6 && (
        <div className="space-y-2 animate-fadeIn">
          {/* F1 - F6 */}
          <div className="grid grid-cols-6 gap-1">
            {['F1', 'F2', 'F3', 'F4', 'F5', 'F6'].map(k => (
              <button
                key={k}
                onClick={() => handleKeyPress(k)}
                className="py-1 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-slate-200 font-bold hover:border-aurora-cyan hover:bg-obsidian-850"
              >
                {k}
              </button>
            ))}
          </div>

          {/* F7 - F12 */}
          <div className="grid grid-cols-6 gap-1">
            {['F7', 'F8', 'F9', 'F10', 'F11', 'F12'].map(k => (
              <button
                key={k}
                onClick={() => handleKeyPress(k)}
                className="py-1 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono text-slate-200 font-bold hover:border-aurora-cyan hover:bg-obsidian-850"
              >
                {k}
              </button>
            ))}
          </div>

          {/* Navigation helpers */}
          <div className="grid grid-cols-4 gap-1 pt-0.5">
            {['Home', 'End', 'PageUp', 'PageDown'].map(k => (
              <button
                key={k}
                onClick={() => handleKeyPress(k)}
                className="py-1 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[9px] font-mono text-titanium-300 hover:text-white"
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Shell Macros Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none pt-1 border-t border-obsidian-800/80">
        <span className="text-[9px] font-mono text-titanium-500 uppercase shrink-0">Macros:</span>
        {macros.map((m, i) => (
          <button
            key={i}
            onClick={() => sendInputEvent({ type: 'type_text', text: m.cmd })}
            className="px-2 py-0.5 rounded-lg bg-obsidian-950 border border-obsidian-750 text-[10px] font-mono text-aurora-emerald hover:border-aurora-emerald/50 hover:bg-aurora-emerald/10 whitespace-nowrap transition"
          >
            +{m.label}
          </button>
        ))}
      </div>

      {/* Pagination Dot Indicators (6 Workflow Tabs) */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setCurrentTab(prev => (prev > 1 ? prev - 1 : 6))}
          className="text-titanium-400 hover:text-white text-[10px] font-mono flex items-center gap-0.5 px-2 py-0.5 rounded-lg hover:bg-obsidian-800 transition"
        >
          <ChevronLeft className="w-3 h-3" />
          <span>Prev</span>
        </button>

        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5, 6].map(tabId => (
            <button
              key={tabId}
              onClick={() => setCurrentTab(tabId)}
              className={`h-2 rounded-full transition-all ${
                currentTab === tabId ? 'w-5 bg-aurora-emerald shadow-glow-emerald' : 'w-2 bg-obsidian-750 hover:bg-titanium-400'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentTab(prev => (prev < 6 ? prev + 1 : 1))}
          className="text-titanium-400 hover:text-white text-[10px] font-mono flex items-center gap-0.5 px-2 py-0.5 rounded-lg hover:bg-obsidian-800 transition"
        >
          <span>Next</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
