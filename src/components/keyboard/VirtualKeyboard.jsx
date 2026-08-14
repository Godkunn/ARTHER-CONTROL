// src/components/keyboard/VirtualKeyboard.jsx
import React, { useState } from 'react';
import { useAether } from '../../context/AetherContext';
import { Keyboard as KeyboardIcon, Send, Code, Terminal, Sparkles, X } from 'lucide-react';

export default function VirtualKeyboard() {
  const { sendInputEvent, setShowKeyboardBar, executeCommand } = useAether();
  const [textInput, setTextInput] = useState('');
  const [activeModifiers, setActiveModifiers] = useState({ ctrl: false, alt: false, shift: false, win: false });

  const toggleModifier = (key) => {
    setActiveModifiers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [liveType, setLiveType] = useState(true);
  const [feedback, setFeedback] = useState('');

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
        // Stream the new chars
        const char = val.slice(textInput.length);
        sendInputEvent({ type: 'type_text', text: char });
      } else if (val.length < textInput.length) {
        // Stream backspaces
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
    { label: 'npx vite build', cmd: 'npx vite build\n' },
    { label: 'cls', cmd: 'cls\n' },
  ];

  return (
    <div className="glass-panel p-3 rounded-2xl border border-aurora-emerald/40 space-y-3 bg-obsidian-900/95 shadow-glow-emerald">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <KeyboardIcon className="w-4 h-4 text-aurora-emerald" />
          <span className="text-xs font-mono font-bold text-slate-100">Live Remote Keyboard & Hotkeys</span>
          {feedback && (
            <span className="text-[10px] font-mono text-aurora-emerald bg-aurora-emerald/15 px-1.5 py-0.5 rounded animate-pulse">
              {feedback}
            </span>
          )}
        </div>
        <button onClick={() => setShowKeyboardBar(false)} className="text-titanium-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Direct Text Input Line */}
      <form onSubmit={handleSendText} className="flex gap-2">
        <input
          type="text"
          value={textInput}
          onChange={handleInputChange}
          placeholder="Type text and press Send (auto-types on laptop)..."
          className="flex-1 bg-obsidian-950 border border-obsidian-750 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-aurora-emerald"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-xl bg-aurora-emerald text-obsidian-950 text-xs font-mono font-bold hover:bg-emerald-400 transition flex items-center space-x-1 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Type & Enter</span>
        </button>
      </form>

      {/* Modifier Keys & Navigation */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <button
          onClick={() => toggleModifier('ctrl')}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition ${
            activeModifiers.ctrl ? 'bg-aurora-cyan text-obsidian-950 border-aurora-cyan' : 'bg-obsidian-800 text-titanium-200 border-obsidian-700'
          }`}
        >
          CTRL
        </button>
        <button
          onClick={() => toggleModifier('alt')}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition ${
            activeModifiers.alt ? 'bg-aurora-purple text-obsidian-950 border-aurora-purple' : 'bg-obsidian-800 text-titanium-200 border-obsidian-700'
          }`}
        >
          ALT
        </button>
        <button
          onClick={() => toggleModifier('shift')}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition ${
            activeModifiers.shift ? 'bg-aurora-amber text-obsidian-950 border-aurora-amber' : 'bg-obsidian-800 text-titanium-200 border-obsidian-700'
          }`}
        >
          SHIFT
        </button>

        <button onClick={() => handleKeyPress('Escape')} className="px-2.5 py-1 rounded-lg bg-obsidian-800 border border-obsidian-700 text-slate-200 text-xs font-mono hover:border-aurora-cyan">
          ESC
        </button>
        <button onClick={() => handleKeyPress('Tab')} className="px-2.5 py-1 rounded-lg bg-obsidian-800 border border-obsidian-700 text-slate-200 text-xs font-mono hover:border-aurora-cyan">
          TAB
        </button>
        <button onClick={() => handleKeyPress('Backspace')} className="px-2.5 py-1 rounded-lg bg-obsidian-800 border border-obsidian-700 text-aurora-pink text-xs font-mono font-bold hover:bg-aurora-pink/20">
          ⌫ Backspace
        </button>
        <button onClick={() => handleKeyPress('Enter')} className="px-3 py-1 rounded-lg bg-aurora-emerald/30 border border-aurora-emerald text-aurora-emerald font-bold text-xs font-mono hover:bg-aurora-emerald/40">
          ↵ ENTER
        </button>
      </div>

      {/* Arrow Keys & Navigation */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={() => handleKeyPress('ArrowUp')} className="px-2 py-1 rounded-lg bg-obsidian-950 border border-obsidian-800 text-xs font-mono text-slate-300">↑ Up</button>
        <button onClick={() => handleKeyPress('ArrowDown')} className="px-2 py-1 rounded-lg bg-obsidian-950 border border-obsidian-800 text-xs font-mono text-slate-300">↓ Down</button>
        <button onClick={() => handleKeyPress('ArrowLeft')} className="px-2 py-1 rounded-lg bg-obsidian-950 border border-obsidian-800 text-xs font-mono text-slate-300">← Left</button>
        <button onClick={() => handleKeyPress('ArrowRight')} className="px-2 py-1 rounded-lg bg-obsidian-950 border border-obsidian-800 text-xs font-mono text-slate-300">→ Right</button>
        <button onClick={() => handleKeyPress('Space')} className="px-4 py-1 rounded-lg bg-obsidian-950 border border-obsidian-800 text-xs font-mono text-slate-300">Space</button>
      </div>

      {/* Quick Shortcut Buttons */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        <button onClick={() => handleKeyPress('Ctrl+C')} className="p-1.5 rounded-lg bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-titanium-300 hover:text-white">
          Ctrl+C
        </button>
        <button onClick={() => handleKeyPress('Ctrl+V')} className="p-1.5 rounded-lg bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-titanium-300 hover:text-white">
          Ctrl+V
        </button>
        <button onClick={() => handleKeyPress('Ctrl+Z')} className="p-1.5 rounded-lg bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-titanium-300 hover:text-white">
          Ctrl+Z
        </button>
        <button onClick={() => handleKeyPress('Ctrl+S')} className="p-1.5 rounded-lg bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-cyan font-bold">
          Ctrl+S
        </button>
        <button onClick={() => handleKeyPress('Ctrl+Shift+T')} className="p-1.5 rounded-lg bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-blue font-bold">
          Reopen Tab
        </button>
        <button onClick={() => handleKeyPress('Alt+Tab')} className="p-1.5 rounded-lg bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-purple font-bold">
          Alt+Tab
        </button>
        <button onClick={() => handleKeyPress('Win+D')} className="p-1.5 rounded-lg bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-titanium-300 hover:text-white">
          Win+D
        </button>
        <button onClick={() => handleKeyPress('Ctrl+`')} className="p-1.5 rounded-lg bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-aurora-amber font-bold">
          Ctrl+`
        </button>
      </div>

      {/* Code Snippet Shell Macros */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase text-titanium-400">Quick Shell Macros</span>
        <div className="flex flex-wrap gap-1.5">
          {macros.map((m, i) => (
            <button
              key={i}
              onClick={() => sendInputEvent({ type: 'type_text', text: m.cmd })}
              className="px-2 py-1 rounded-lg bg-obsidian-950 border border-obsidian-750 text-[11px] font-mono text-aurora-emerald hover:border-aurora-emerald/50"
            >
              + {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
