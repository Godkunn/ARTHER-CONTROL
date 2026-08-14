// src/components/desktop/DesktopViewer.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAether } from '../../context/AetherContext';
import {
  Monitor, Maximize2, Minimize2, Keyboard, Zap, ZoomIn, ZoomOut,
  RotateCcw, Eye, EyeOff, Wifi, ChevronUp, ChevronDown, MousePointer,
  Crosshair, Move, Hand
} from 'lucide-react';
import VirtualKeyboard from '../keyboard/VirtualKeyboard';

export default function DesktopViewer() {
  const {
    systemStatus, screenshareActive, setScreenshareActive,
    currentScreenJpeg, screenFps, streamQuality, setStreamQuality,
    trackpadMode, setTrackpadMode, showKeyboardBar, setShowKeyboardBar,
    sendInputEvent, lanInfo, connected, executeCommand
  } = useAether();

  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [touchLog, setTouchLog] = useState('Tap to click • Hold & drag to select • 2-finger scroll');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clickRipple, setClickRipple] = useState(null);
  const [showCursorOverlay, setShowCursorOverlay] = useState(true);
  const [dragSelectMode, setDragSelectMode] = useState(false);
  const [isCurrentlyDragging, setIsCurrentlyDragging] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 960, y: 540, percentX: 0.5, percentY: 0.5 });
  
  const holdTimer = useRef(null);
  const pointerStartRef = useRef({ time: 0, x: 0, y: 0, moved: false, isDragging: false });
  const twoFingerStartRef = useRef({ y: 0, lastScrollTime: 0 });
  const didMountRef = useRef(false);

  // Auto-start screenshare once on first mount only
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      if (!screenshareActive) {
        setScreenshareActive(true);
      }
    }

    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const getCoords = (e, el) => {
    if (!el) return { x: 960, y: 540, percentX: 0.5, percentY: 0.5 };
    const rect = el.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0) ?? 0;
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0) ?? 0;
    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1)));
    const relY = Math.max(0, Math.min(1, (clientY - rect.top) / (rect.height || 1)));
    return {
      x: Math.round(relX * 1920) || 0,
      y: Math.round(relY * 1080) || 0,
      percentX: relX || 0,
      percentY: relY || 0
    };
  };

  const showRipple = (percentX, percentY, isRight = false) => {
    setClickRipple({ percentX, percentY, isRight, id: Date.now() });
    setTimeout(() => setClickRipple(null), 500);
  };

  const handleScroll = useCallback((deltaY) => {
    sendInputEvent({
      type: 'mouse_scroll',
      deltaY,
      x: cursorPos.x,
      y: cursorPos.y
    });
    setTouchLog(deltaY > 0 ? '📜 Scrolled Up' : '📜 Scrolled Down');
  }, [sendInputEvent, cursorPos]);

  const handlePageScroll = (direction) => {
    const deltaY = direction === 'up' ? 360 : -360;
    sendInputEvent({
      type: 'mouse_scroll',
      deltaY,
      x: cursorPos.x,
      y: cursorPos.y
    });
    sendInputEvent({ type: 'key_press', key: direction === 'up' ? 'PageUp' : 'PageDown' });
    setTouchLog(direction === 'up' ? 'Page Up' : 'Page Down');
  };

  // Touch & Pointer handlers with Hold & Drag Selection
  const handlePointerDown = (e) => {
    if (!imgRef.current) return;
    if (e.pointerType === 'touch' && e.isPrimary === false) return;

    const coords = getCoords(e, imgRef.current);
    setCursorPos({ x: coords.x, y: coords.y, percentX: coords.percentX, percentY: coords.percentY });

    pointerStartRef.current = {
      time: Date.now(),
      x: e.clientX,
      y: e.clientY,
      moved: false,
      isDragging: false
    };

    if (holdTimer.current) clearTimeout(holdTimer.current);

    // If Drag-Select mode is permanently ON, start mouse_down immediately
    if (dragSelectMode) {
      pointerStartRef.current.isDragging = true;
      setIsCurrentlyDragging(true);
      sendInputEvent({ type: 'mouse_down', x: coords.x, y: coords.y, button: 'left' });
      setTouchLog('🎯 Dragging / Selecting active');
      return;
    }

    // Hold for 260ms -> Activates Drag & Select
    holdTimer.current = setTimeout(() => {
      if (imgRef.current) {
        pointerStartRef.current.isDragging = true;
        setIsCurrentlyDragging(true);
        const c = getCoords(e, imgRef.current);
        sendInputEvent({ type: 'mouse_down', x: c.x, y: c.y, button: 'left' });
        showRipple(c.percentX, c.percentY, false);
        setTouchLog(`🎯 Hold Drag Active → (${c.x}, ${c.y})`);
      }
    }, 260);
  };

  const handlePointerMove = (e) => {
    if (!imgRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);

    if (dx > 8 || dy > 8) {
      pointerStartRef.current.moved = true;
      const coords = getCoords(e, imgRef.current);
      setCursorPos({ x: coords.x, y: coords.y, percentX: coords.percentX, percentY: coords.percentY });

      // If currently dragging or in trackpad mode, stream mouse moves smoothly
      if (pointerStartRef.current.isDragging || isCurrentlyDragging) {
        sendInputEvent({ type: 'mouse_move', x: coords.x, y: coords.y });
      } else if (trackpadMode) {
        sendInputEvent({ type: 'mouse_move', x: coords.x, y: coords.y });
      }
    }
  };

  const handlePointerUp = (e) => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    const elapsed = Date.now() - pointerStartRef.current.time;
    const coords = getCoords(e, imgRef.current);
    setCursorPos({ x: coords.x, y: coords.y, percentX: coords.percentX, percentY: coords.percentY });

    if (pointerStartRef.current.isDragging || isCurrentlyDragging) {
      // Release held mouse button
      sendInputEvent({ type: 'mouse_up', x: coords.x, y: coords.y, button: 'left' });
      pointerStartRef.current.isDragging = false;
      setIsCurrentlyDragging(false);
      setTouchLog(`Released Selection → (${coords.x}, ${coords.y})`);
    } else {
      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);

      // If movement was small (< 18px), treat as 100% intentional click
      if (dx < 18 && dy < 18) {
        if (elapsed >= 550) {
          // Long press = Right Click
          sendInputEvent({ type: 'mouse_click', x: coords.x, y: coords.y, button: 'right' });
          showRipple(coords.percentX, coords.percentY, true);
          setTouchLog(`Right-Click → (${coords.x}, ${coords.y})`);
        } else {
          // Normal Tap = Left Click
          sendInputEvent({ type: 'mouse_click', x: coords.x, y: coords.y, button: 'left' });
          showRipple(coords.percentX, coords.percentY, false);
          setTouchLog(`Click → (${coords.x}, ${coords.y})`);
        }
      }
    }
  };

  // Two-Finger Touch Scroll for Mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      const avgY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      twoFingerStartRef.current = { y: avgY, lastScrollTime: Date.now() };
      setTouchLog('2-Finger Scroll Active');
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const now = Date.now();
      if (now - twoFingerStartRef.current.lastScrollTime < 60) return;

      const avgY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const diffY = avgY - twoFingerStartRef.current.y;

      if (Math.abs(diffY) > 6) {
        const scrollDelta = diffY > 0 ? 160 : -160;
        handleScroll(scrollDelta);
        twoFingerStartRef.current = { y: avgY, lastScrollTime: now };
      }
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if (containerRef.current?.webkitRequestFullscreen) {
          await containerRef.current.webkitRequestFullscreen();
        }
        try {
          if (window.screen?.orientation?.lock) {
            await window.screen.orientation.lock('landscape');
          }
        } catch (_) {}
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        try {
          if (window.screen?.orientation?.unlock) {
            window.screen.orientation.unlock();
          }
        } catch (_) {}
        setIsFullscreen(false);
      }
    } catch (_) {}
  };

  const lanIp = lanInfo?.interfaces?.[0]?.ip;

  return (
    <div className="p-2 max-w-5xl mx-auto space-y-2 pb-24 select-none touch-none overscroll-none">
      {/* Top Control Bar */}
      <div className="glass-panel px-3 py-2 rounded-xl border border-obsidian-750 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <Monitor className="w-3.5 h-3.5 text-aurora-cyan shrink-0" />
          <span className="text-[10px] font-mono text-slate-300 truncate max-w-[120px]">
            {systemStatus?.activeWindow || 'Desktop'}
          </span>
          {lanIp && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-aurora-emerald/15 text-aurora-emerald border border-aurora-emerald/25 flex items-center gap-1">
              <Wifi className="w-2.5 h-2.5" />LAN
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Screenshare Toggle */}
          <button
            onClick={() => setScreenshareActive(!screenshareActive)}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition border ${
              screenshareActive
                ? 'bg-aurora-cyan/20 border-aurora-cyan text-aurora-cyan'
                : 'bg-obsidian-800 border-obsidian-700 text-titanium-400'
            }`}
          >
            {screenshareActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {screenshareActive ? `LIVE ${screenFps > 0 ? screenFps + 'fps' : ''}` : 'OFF'}
          </button>

          {/* Quality Selector */}
          <select
            value={streamQuality}
            onChange={e => setStreamQuality(e.target.value)}
            className="bg-obsidian-900 border border-obsidian-750 text-[10px] font-mono text-titanium-300 rounded-lg px-1.5 py-1 focus:outline-none"
          >
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="540p">540p</option>
          </select>

          {/* Drag & Select Toggle Button */}
          <button
            onClick={() => {
              setDragSelectMode(!dragSelectMode);
              setTouchLog(!dragSelectMode ? '🖐 Drag-Select Mode ON (Touch & drag to highlight text)' : 'Touch mode normal');
            }}
            className={`p-1.5 rounded-lg border transition text-[10px] ${
              dragSelectMode ? 'bg-aurora-amber/20 border-aurora-amber text-aurora-amber shadow-glow-amber' : 'glass-card text-titanium-400'
            }`}
            title="Toggle Drag & Select Mode"
          >
            <Hand className="w-3 h-3" />
          </button>

          {/* Laser Cursor HUD Toggle */}
          <button
            onClick={() => setShowCursorOverlay(!showCursorOverlay)}
            className={`p-1.5 rounded-lg border transition text-[10px] ${
              showCursorOverlay ? 'bg-aurora-cyan/20 border-aurora-cyan text-aurora-cyan' : 'glass-card text-titanium-400'
            }`}
            title="Toggle Laser Cursor"
          >
            <Crosshair className="w-3 h-3" />
          </button>

          {/* Trackpad Mode Toggle */}
          <button
            onClick={() => setTrackpadMode(!trackpadMode)}
            className={`p-1.5 rounded-lg border transition text-[10px] ${
              trackpadMode ? 'bg-aurora-purple/20 border-aurora-purple text-aurora-purple' : 'glass-card text-titanium-400'
            }`}
            title="Trackpad Mode"
          >
            <MousePointer className="w-3 h-3" />
          </button>

          {/* Keyboard Toggle */}
          <button
            onClick={() => setShowKeyboardBar(!showKeyboardBar)}
            className={`p-1.5 rounded-lg border transition ${
              showKeyboardBar ? 'bg-aurora-emerald/20 border-aurora-emerald text-aurora-emerald' : 'glass-card text-titanium-400'
            }`}
            title="Virtual Keyboard"
          >
            <Keyboard className="w-3 h-3" />
          </button>

          {/* Zoom Controls */}
          <button onClick={() => setZoomScale(s => Math.max(s - 0.25, 1))} className="p-1.5 rounded-lg glass-card text-titanium-400">
            <ZoomOut className="w-3 h-3" />
          </button>
          <button onClick={() => setZoomScale(s => Math.min(s + 0.25, 2.5))} className="p-1.5 rounded-lg glass-card text-titanium-400">
            <ZoomIn className="w-3 h-3" />
          </button>
          <button onClick={() => setZoomScale(1)} className="p-1.5 rounded-lg glass-card text-titanium-400">
            <RotateCcw className="w-3 h-3" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-aurora-cyan/20 border border-aurora-cyan text-aurora-cyan hover:bg-aurora-cyan/30 transition"
            title="Fullscreen"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Screen Stream Display Container */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden border border-obsidian-750 bg-black shadow-2xl transition-all ${
          isFullscreen
            ? 'fixed inset-0 z-50 rounded-none w-screen h-screen flex items-center justify-center overscroll-none touch-none'
            : 'rounded-xl'
        }`}
        style={{
          minHeight: isFullscreen ? '100vh' : 240,
          touchAction: 'none',
          overscrollBehavior: 'none'
        }}
      >
        {screenshareActive && currentScreenJpeg ? (
          <div
            className="relative w-full h-full flex items-center justify-center touch-none select-none"
            style={{
              transform: isFullscreen ? 'none' : `scale(${zoomScale})`,
              transformOrigin: 'top left',
              transition: 'transform 0.1s'
            }}
          >
            {/* Sized exactly to rendered image */}
            <div className="relative inline-block max-w-full max-h-full">
              <img
                ref={imgRef}
                src={`data:image/jpeg;base64,${currentScreenJpeg}`}
                alt="Live Laptop Screen"
                className={`select-none cursor-crosshair block ${
                  isFullscreen ? 'max-w-full max-h-screen object-contain' : 'w-full h-auto'
                }`}
                style={{
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none'
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onContextMenu={e => e.preventDefault()}
                draggable={false}
              />

              {/* Glowing Laser Target Cursor Overlay */}
              {showCursorOverlay && (
                <div
                  className="absolute pointer-events-none transition-all duration-75 z-20"
                  style={{
                    left: `${cursorPos.percentX * 100}%`,
                    top: `${cursorPos.percentY * 100}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center animate-pulse ${
                      isCurrentlyDragging || dragSelectMode
                        ? 'border-aurora-amber bg-aurora-amber/25 shadow-glow-amber'
                        : 'border-aurora-cyan/80 bg-aurora-cyan/20 shadow-glow-cyan'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isCurrentlyDragging || dragSelectMode ? 'bg-aurora-amber' : 'bg-aurora-cyan'}`} />
                    </div>
                    <div className={`absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/85 backdrop-blur px-1.5 py-0.5 rounded border text-[8px] font-mono font-bold shadow-lg ${
                      isCurrentlyDragging || dragSelectMode
                        ? 'border-aurora-amber/60 text-aurora-amber'
                        : 'border-aurora-cyan/40 text-aurora-cyan'
                    }`}>
                      {isCurrentlyDragging ? 'SELECTING' : `(${cursorPos.x}, ${cursorPos.y})`}
                    </div>
                  </div>
                </div>
              )}

              {/* Click Ripple Animation */}
              {clickRipple && (
                <div
                  className={`absolute w-8 h-8 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-ping z-30 ${
                    clickRipple.isRight ? 'bg-aurora-pink/90 border-2 border-white' : 'bg-aurora-cyan/90 border-2 border-white'
                  }`}
                  style={{ left: `${clickRipple.percentX * 100}%`, top: `${clickRipple.percentY * 100}%` }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-56 gap-3 text-center px-4">
            {screenshareActive ? (
              <>
                <div className="w-6 h-6 border-2 border-aurora-cyan border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] font-mono text-titanium-400">Streaming laptop display...</span>
              </>
            ) : (
              <>
                <Monitor className="w-8 h-8 text-obsidian-600" />
                <span className="text-[11px] font-mono text-titanium-500">Screen stream paused</span>
                <button
                  onClick={() => setScreenshareActive(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan text-[11px] font-mono font-bold hover:bg-aurora-cyan/30 transition"
                >
                  Start Live Screen
                </button>
              </>
            )}
          </div>
        )}

        {/* Floating Quick Scroll & Page Controls Bar (Right Edge) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-40 bg-obsidian-950/85 backdrop-blur p-1 rounded-xl border border-obsidian-750 shadow-xl">
          <button
            onClick={() => handleScroll(160)}
            className="p-2 rounded-lg bg-obsidian-850 hover:bg-aurora-cyan/20 border border-obsidian-700 text-titanium-200 active:scale-95 transition"
            title="Scroll Laptop Up"
          >
            <ChevronUp className="w-4 h-4 text-aurora-cyan" />
          </button>
          
          <button
            onClick={() => handlePageScroll('up')}
            className="px-1.5 py-1 rounded bg-obsidian-850 hover:bg-obsidian-750 text-[8px] font-mono font-bold text-titanium-400 active:text-white"
            title="Page Up"
          >
            PgUp
          </button>

          <button
            onClick={() => handlePageScroll('down')}
            className="px-1.5 py-1 rounded bg-obsidian-850 hover:bg-obsidian-750 text-[8px] font-mono font-bold text-titanium-400 active:text-white"
            title="Page Down"
          >
            PgDn
          </button>

          <button
            onClick={() => handleScroll(-160)}
            className="p-2 rounded-lg bg-obsidian-850 hover:bg-aurora-cyan/20 border border-obsidian-700 text-titanium-200 active:scale-95 transition"
            title="Scroll Laptop Down"
          >
            <ChevronDown className="w-4 h-4 text-aurora-cyan" />
          </button>
        </div>

        {/* Fullscreen HUD Strip */}
        {isFullscreen && (
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-40 pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur px-2 py-1 rounded-lg border border-obsidian-750">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-mono text-aurora-cyan font-bold">FULLSCREEN LIVE</span>
              <span className="text-[9px] font-mono text-titanium-400">({cursorPos.x}, {cursorPos.y})</span>
            </div>

            <div className="flex items-center gap-1 bg-black/80 backdrop-blur p-1 rounded-lg border border-obsidian-750">
              <button
                onClick={() => setDragSelectMode(!dragSelectMode)}
                className={`p-1.5 rounded text-[10px] ${dragSelectMode ? 'bg-aurora-amber/20 text-aurora-amber' : 'text-titanium-400'}`}
                title="Drag Select Mode"
              >
                <Hand className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowKeyboardBar(!showKeyboardBar)}
                className={`p-1.5 rounded text-[10px] ${showKeyboardBar ? 'bg-aurora-emerald/20 text-aurora-emerald' : 'text-titanium-400'}`}
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowCursorOverlay(!showCursorOverlay)}
                className={`p-1.5 rounded text-[10px] ${showCursorOverlay ? 'bg-aurora-cyan/20 text-aurora-cyan' : 'text-titanium-400'}`}
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30"
                title="Exit Fullscreen"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Live Badge in Normal Mode */}
        {!isFullscreen && screenshareActive && currentScreenJpeg && (
          <div className="absolute top-2 left-2 bg-black/75 backdrop-blur border border-aurora-cyan/30 text-aurora-cyan text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE {screenFps > 0 && `• ${screenFps}fps`}
          </div>
        )}
      </div>

      {/* Quick Launch & System Controls */}
      <div className="glass-panel p-2 rounded-xl border border-obsidian-750 flex flex-wrap items-center gap-1.5 justify-between">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 flex-1">
          <button
            onClick={() => { executeCommand('WAKE_DISPLAY'); setTouchLog('Waking screen...'); }}
            className="px-2 py-1 rounded-lg bg-aurora-amber/15 border border-aurora-amber/40 text-aurora-amber text-[9px] font-mono font-bold flex items-center gap-1 hover:bg-aurora-amber/25 transition shrink-0"
          >
            <Zap className="w-3 h-3" />
            <span>Wake</span>
          </button>

          <button
            onClick={() => { sendInputEvent({ type: 'hotkey', hotkey: '^{ESC}' }); setTouchLog('Sent Windows Start key'); }}
            className="px-2 py-1 rounded-lg glass-card border border-obsidian-750 text-slate-200 text-[9px] font-mono flex items-center gap-1 hover:text-white transition shrink-0"
          >
            <span>🪟</span>
            <span>Start</span>
          </button>

          <button
            onClick={() => { executeCommand('SHOW_DESKTOP'); setTouchLog('Toggled Desktop'); }}
            className="px-2 py-1 rounded-lg glass-card border border-obsidian-750 text-slate-200 text-[9px] font-mono flex items-center gap-1 hover:text-white transition shrink-0"
          >
            <span>🖥</span>
            <span>Desktop</span>
          </button>

          <button
            onClick={() => { sendInputEvent({ type: 'hotkey', hotkey: '%{TAB}' }); setTouchLog('Alt + Tab'); }}
            className="px-2 py-1 rounded-lg bg-aurora-purple/15 border border-aurora-purple/40 text-aurora-purple text-[9px] font-mono font-bold flex items-center gap-1 shrink-0"
          >
            <Move className="w-3 h-3" />
            <span>Switch App</span>
          </button>
        </div>
      </div>

      {/* Precision Trackpad View (When Trackpad Mode is active) */}
      {trackpadMode && (
        <div className="glass-panel p-3 rounded-xl border border-aurora-purple/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-aurora-purple font-bold flex items-center gap-1">
              <MousePointer className="w-3 h-3" />
              <span>Precision Trackpad • Cursor at ({cursorPos.x}, {cursorPos.y})</span>
            </span>
            <button onClick={() => setTrackpadMode(false)} className="text-[9px] font-mono text-titanium-400">✕ Close</button>
          </div>
          <div
            onMouseMove={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
              const x = Math.round(px * 1920);
              const y = Math.round(py * 1080);
              setCursorPos({ x, y, percentX: px, percentY: py });
              sendInputEvent({ type: 'mouse_move', x, y });
            }}
            onTouchMove={e => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const t = e.touches[0];
              const px = Math.max(0, Math.min(1, (t.clientX - rect.left) / rect.width));
              const py = Math.max(0, Math.min(1, (t.clientY - rect.top) / rect.height));
              const x = Math.round(px * 1920);
              const y = Math.round(py * 1080);
              setCursorPos({ x, y, percentX: px, percentY: py });
              sendInputEvent({ type: 'mouse_move', x, y });
            }}
            className="w-full h-28 bg-obsidian-950 border border-obsidian-750 rounded-lg flex items-center justify-center cursor-move text-[9px] text-titanium-400 font-mono select-none"
          >
            Glide finger here to move cursor smoothly
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => sendInputEvent({ type: 'mouse_click', x: cursorPos.x, y: cursorPos.y, button: 'left' })}
              className="py-2.5 rounded-lg bg-obsidian-800 border border-obsidian-700 text-slate-100 text-[10px] font-mono font-bold active:bg-aurora-cyan/30"
            >
              LEFT CLICK
            </button>
            <button
              onClick={() => {
                sendInputEvent({ type: 'mouse_click', x: cursorPos.x, y: cursorPos.y, button: 'left' });
                setTimeout(() => sendInputEvent({ type: 'mouse_click', x: cursorPos.x, y: cursorPos.y, button: 'left' }), 100);
              }}
              className="py-2.5 rounded-lg bg-obsidian-800 border border-obsidian-700 text-aurora-cyan text-[10px] font-mono font-bold active:bg-aurora-cyan/30"
            >
              DOUBLE CLICK
            </button>
            <button
              onClick={() => sendInputEvent({ type: 'mouse_click', x: cursorPos.x, y: cursorPos.y, button: 'right' })}
              className="py-2.5 rounded-lg bg-obsidian-800 border border-obsidian-700 text-slate-100 text-[10px] font-mono font-bold active:bg-aurora-purple/30"
            >
              RIGHT CLICK
            </button>
          </div>
        </div>
      )}

      {showKeyboardBar && <VirtualKeyboard />}

      {/* Touch Interaction Status Bar */}
      <div className="bg-obsidian-900/60 px-3 py-1.5 rounded-lg border border-obsidian-800 flex items-center justify-between">
        <span className="text-[9px] font-mono text-titanium-400 truncate max-w-[240px]">{touchLog}</span>
        <span className={`text-[9px] font-mono ${connected ? 'text-aurora-emerald' : 'text-red-400'}`}>
          {connected ? '● Connected' : '○ Reconnecting...'}
        </span>
      </div>
    </div>
  );
}
