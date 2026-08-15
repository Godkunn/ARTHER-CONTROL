// src/components/desktop/DesktopViewer.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAether } from '../../context/AetherContext';
import {
  Monitor, Maximize2, Minimize2, Keyboard, Zap, ZoomIn, ZoomOut,
  RotateCcw, Eye, EyeOff, Wifi, ChevronUp, ChevronDown, MousePointer,
  Crosshair, Move, Hand, Lock, Unlock, Mouse
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
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 }); // percent of container
  const [zoomLocked, setZoomLocked] = useState(true);

  const [touchLog, setTouchLog] = useState('Tap / buttons for clicks • 2-finger scroll • Pinch zoom');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clickRipple, setClickRipple] = useState(null);
  const [showCursorOverlay, setShowCursorOverlay] = useState(true);
  const [dragSelectMode, setDragSelectMode] = useState(false);
  const [isCurrentlyDragging, setIsCurrentlyDragging] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 960, y: 540, percentX: 0.5, percentY: 0.5 });
  
  const holdTimer = useRef(null);
  const pointerStartRef = useRef({ time: 0, x: 0, y: 0, moved: false, isDragging: false });
  const twoFingerStartRef = useRef({
    y: 0, dist: 0, startScale: 1, startPan: { x: 0, y: 0 }, lastScrollTime: 0
  });
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

  const resetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setZoomOrigin({ x: 50, y: 50 });
    setTouchLog('Zoom reset to 1.0x');
  };

  const getCoords = (e, el) => {
    if (!el) return { x: 960, y: 540, percentX: 0.5, percentY: 0.5 };
    const rect = el.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0) ?? 0;
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0) ?? 0;

    let relX, relY;
    if (!zoomLocked && zoomScale > 1.0) {
      relX = Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1)));
      relY = Math.max(0, Math.min(1, (clientY - rect.top) / (rect.height || 1)));
    } else {
      relX = Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1)));
      relY = Math.max(0, Math.min(1, (clientY - rect.top) / (rect.height || 1)));
    }

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

  // Dedicated Hardware Mouse Click Handlers
  const handleExplicitLeftClick = () => {
    sendInputEvent({ type: 'mouse_click', x: cursorPos.x, y: cursorPos.y, button: 'left' });
    showRipple(cursorPos.percentX, cursorPos.percentY, false);
    setTouchLog(`🖱️ Left Click → (${cursorPos.x}, ${cursorPos.y})`);
  };

  const handleExplicitRightClick = () => {
    sendInputEvent({ type: 'mouse_click', x: cursorPos.x, y: cursorPos.y, button: 'right' });
    showRipple(cursorPos.percentX, cursorPos.percentY, true);
    setTouchLog(`🖱️ Right Click → (${cursorPos.x}, ${cursorPos.y})`);
  };

  const handleExplicitDoubleClick = () => {
    sendInputEvent({ type: 'mouse_click', x: cursorPos.x, y: cursorPos.y, button: 'left' });
    setTimeout(() => {
      sendInputEvent({ type: 'mouse_click', x: cursorPos.x, y: cursorPos.y, button: 'left' });
    }, 70);
    showRipple(cursorPos.percentX, cursorPos.percentY, false);
    setTouchLog(`⚡ Double Click → (${cursorPos.x}, ${cursorPos.y})`);
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

  // Touch & Pointer handlers
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

    if (dragSelectMode) {
      pointerStartRef.current.isDragging = true;
      setIsCurrentlyDragging(true);
      sendInputEvent({ type: 'mouse_down', x: coords.x, y: coords.y, button: 'left' });
      setTouchLog('🎯 Dragging / Selecting active');
      return;
    }

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
      sendInputEvent({ type: 'mouse_up', x: coords.x, y: coords.y, button: 'left' });
      pointerStartRef.current.isDragging = false;
      setIsCurrentlyDragging(false);
      setTouchLog(`Released Selection → (${coords.x}, ${coords.y})`);
    } else {
      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);

      if (dx < 18 && dy < 18) {
        if (elapsed >= 550) {
          sendInputEvent({ type: 'mouse_click', x: coords.x, y: coords.y, button: 'right' });
          showRipple(coords.percentX, coords.percentY, true);
          setTouchLog(`Right-Click → (${coords.x}, ${coords.y})`);
        } else {
          sendInputEvent({ type: 'mouse_click', x: coords.x, y: coords.y, button: 'left' });
          showRipple(coords.percentX, coords.percentY, false);
          setTouchLog(`Click → (${coords.x}, ${coords.y})`);
        }
      }
    }
  };

  // Two-Finger Pinch Zoom & Scroll
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const avgX = (touch1.clientX + touch2.clientX) / 2;
      const avgY = (touch1.clientY + touch2.clientY) / 2;
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

      // Calculate zoom origin as % of container rect
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const originX = Math.max(0, Math.min(100, ((avgX - rect.left) / rect.width) * 100));
        const originY = Math.max(0, Math.min(100, ((avgY - rect.top) / rect.height) * 100));
        setZoomOrigin({ x: originX, y: originY });
      }

      twoFingerStartRef.current = {
        x: avgX,
        y: avgY,
        dist,
        startScale: zoomScale,
        startPan: { ...panOffset },
        lastScrollTime: Date.now()
      };

      if (!zoomLocked) {
        setTouchLog('Pinch to Zoom & Pan active');
      } else {
        setTouchLog('2-Finger Scroll Active');
      }
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      if (!zoomLocked) {
        const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        const factor = currentDist / (twoFingerStartRef.current.dist || 1);
        const newScale = Math.min(4.0, Math.max(1.0, twoFingerStartRef.current.startScale * factor));
        setZoomScale(newScale);

        if (newScale > 1.05) {
          const avgY = (touch1.clientY + touch2.clientY) / 2;
          const diffY = avgY - twoFingerStartRef.current.y;
          setPanOffset({
            x: Math.max(-300, Math.min(300, twoFingerStartRef.current.startPan.x)),
            y: Math.max(-300, Math.min(300, twoFingerStartRef.current.startPan.y + (diffY * 0.5)))
          });
        }
        setTouchLog(`Zoom: ${newScale.toFixed(2)}x`);
        return;
      }

      const now = Date.now();
      if (now - twoFingerStartRef.current.lastScrollTime < 50) return;

      const avgY = (touch1.clientY + touch2.clientY) / 2;
      const diffY = avgY - twoFingerStartRef.current.y;

      if (Math.abs(diffY) > 6) {
        const scrollDelta = diffY > 0 ? 160 : -160;
        handleScroll(scrollDelta);
        twoFingerStartRef.current.y = avgY;
        twoFingerStartRef.current.lastScrollTime = now;
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
    <div className="p-2 max-w-5xl mx-auto space-y-2 pb-36 select-none touch-none overscroll-none">
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
          {/* Zoom Lock / Unlock Toggle */}
          <button
            onClick={() => {
              if (!zoomLocked) resetZoom();
              setZoomLocked(!zoomLocked);
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition ${
              zoomLocked
                ? 'bg-obsidian-900 border border-obsidian-750 text-titanium-400 hover:text-slate-200'
                : 'bg-aurora-amber/20 border border-aurora-amber/60 text-aurora-amber shadow-glow-amber'
            }`}
            title={zoomLocked ? 'Screen is Locked 1:1' : 'Pinch Zoom is Active'}
          >
            {zoomLocked ? <Lock className="w-3 h-3 text-titanium-400" /> : <Unlock className="w-3 h-3 text-aurora-amber animate-pulse" />}
            <span>{zoomLocked ? 'Fixed' : 'Pinch'}</span>
          </button>

          {zoomScale > 1.05 && (
            <button
              onClick={resetZoom}
              className="px-2 py-1 rounded-lg bg-obsidian-900 border border-aurora-cyan/40 text-aurora-cyan text-[10px] font-mono font-bold"
            >
              1.0x
            </button>
          )}

          {/* Toggle Drag-Select Mode */}
          <button
            onClick={() => {
              setDragSelectMode(!dragSelectMode);
              setTouchLog(!dragSelectMode ? '🖐 Drag-Select Mode Active' : 'Touch Click Mode Active');
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition ${
              dragSelectMode
                ? 'bg-aurora-amber/25 border border-aurora-amber text-aurora-amber shadow-glow-amber'
                : 'bg-obsidian-900 border border-obsidian-750 text-titanium-400 hover:text-slate-200'
            }`}
            title="Toggle Drag & Select text mode"
          >
            <Hand className="w-3 h-3" />
            <span className="hidden sm:inline">Select</span>
          </button>

          {/* Trackpad Mode Toggle */}
          <button
            onClick={() => setTrackpadMode(!trackpadMode)}
            className={`p-1.5 rounded-lg transition ${
              trackpadMode
                ? 'bg-aurora-cyan/20 border border-aurora-cyan text-aurora-cyan shadow-glow-cyan'
                : 'glass-card text-titanium-400 hover:text-slate-200'
            }`}
            title="Trackpad Mode"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          {/* Keyboard Toggle */}
          <button
            onClick={() => setShowKeyboardBar(!showKeyboardBar)}
            className={`p-1.5 rounded-lg transition ${
              showKeyboardBar
                ? 'bg-aurora-cyan/20 border border-aurora-cyan text-aurora-cyan'
                : 'glass-card text-titanium-400 hover:text-slate-200'
            }`}
            title="Toggle Keyboard"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-aurora-cyan/20 border border-aurora-cyan text-aurora-cyan hover:bg-aurora-cyan/30 transition"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Screen Stream Display Container */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden border border-obsidian-750 bg-black shadow-2xl transition-all ${
          isFullscreen
            ? 'fixed inset-0 z-50 rounded-none w-screen h-screen flex items-center justify-center overscroll-none touch-none'
            : 'rounded-xl w-full flex items-center justify-center'
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
              transform: zoomScale > 1.0 ? `scale(${zoomScale}) translate(${panOffset.x}px, ${panOffset.y}px)` : 'none',
              transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
              transition: 'transform 0.05s ease-out'
            }}
          >
            {/* Exactly Fitted Screen Image Without Cropping */}
            <div className="relative inline-block max-w-full max-h-full">
              <img
                ref={imgRef}
                src={`data:image/jpeg;base64,${currentScreenJpeg}`}
                alt="Live Laptop Screen"
                className={`select-none cursor-crosshair block ${
                  isFullscreen ? 'max-w-full max-h-screen object-contain' : 'w-full h-auto max-w-full object-contain'
                }`}
                style={{
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  aspectRatio: '16/9'
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
                  className="px-4 py-2 rounded-xl bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan text-xs font-mono font-bold hover:bg-aurora-cyan/30 transition flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Resume Live Stream</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Floating HUD Controls in Fullscreen */}
        {isFullscreen && (
          <>
            <div className="absolute top-3 right-3 z-40 flex items-center gap-2 bg-black/75 backdrop-blur-md p-1.5 rounded-2xl border border-obsidian-750 shadow-2xl">
              <button
                onClick={() => {
                  if (!zoomLocked) resetZoom();
                  setZoomLocked(!zoomLocked);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                  zoomLocked
                    ? 'bg-obsidian-900 border border-obsidian-750 text-titanium-300'
                    : 'bg-aurora-amber/25 border border-aurora-amber text-aurora-amber shadow-glow-amber'
                }`}
              >
                {zoomLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 text-aurora-amber animate-pulse" />}
                <span>{zoomLocked ? 'Fixed' : 'Pinch'}</span>
              </button>

              {zoomScale > 1.05 && (
                <button
                  onClick={resetZoom}
                  className="px-2.5 py-1.5 rounded-xl bg-obsidian-900 border border-aurora-cyan/50 text-aurora-cyan text-xs font-mono font-bold"
                >
                  1.0x
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-obsidian-900 border border-obsidian-750 text-titanium-300 hover:text-white"
                title="Exit Fullscreen"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Floating Left/Right Thumb Trigger in Fullscreen */}
            <div className="absolute bottom-6 right-4 z-40 flex items-center gap-2">
              <button
                onClick={handleExplicitLeftClick}
                className="px-4 py-2.5 rounded-2xl bg-aurora-cyan text-obsidian-950 font-mono font-bold text-xs shadow-glow-cyan active:scale-90 transition"
              >
                Left Click
              </button>
              <button
                onClick={handleExplicitRightClick}
                className="px-4 py-2.5 rounded-2xl bg-aurora-pink text-white font-mono font-bold text-xs shadow-glow-pink active:scale-90 transition"
              >
                Right Click
              </button>
            </div>

            {/* FPS + Touch Log — bottom of fullscreen (does not cover screen content) */}
            <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none flex items-center justify-between px-3 py-1 bg-black/70 backdrop-blur border-t border-obsidian-800">
              <span className="text-[9px] font-mono text-titanium-300 truncate">{touchLog}</span>
              <span className="text-[9px] font-mono text-aurora-cyan shrink-0 ml-2">{screenFps || 0} FPS</span>
            </div>
          </>
        )}
      </div>

      {/* FPS + Touch Log — below screen in normal mode (completely outside the screen area) */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-obsidian-950/80 border border-obsidian-800">
          <span className="text-[9px] font-mono text-titanium-400 truncate">{touchLog}</span>
          <span className="text-[9px] font-mono text-aurora-cyan shrink-0 ml-2 font-bold">{screenFps || 0} FPS</span>
        </div>
      )}

      {/* Floating Keyboard Drawer */}
      {showKeyboardBar && (
        <div className="animate-fadeIn">
          <VirtualKeyboard />
        </div>
      )}

      {/* DEDICATED HARDWARE MOUSE BUTTONS & QUICK STRIP */}
      <div className="glass-panel p-2.5 rounded-2xl border border-obsidian-750 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        {/* Left, Double & Right Click Buttons */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <button
            onClick={handleExplicitLeftClick}
            className="flex-1 py-2 px-3 rounded-xl bg-aurora-cyan/20 border border-aurora-cyan/50 text-aurora-cyan font-bold text-xs shadow-glow-cyan hover:bg-aurora-cyan/30 active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Mouse className="w-3.5 h-3.5" />
            <span>Left Click</span>
          </button>

          <button
            onClick={handleExplicitDoubleClick}
            className="py-2 px-2.5 rounded-xl bg-aurora-purple/20 border border-aurora-purple/40 text-aurora-purple font-bold text-xs hover:bg-aurora-purple/30 active:scale-95 transition"
            title="Double Click"
          >
            2x
          </button>

          <button
            onClick={handleExplicitRightClick}
            className="flex-1 py-2 px-3 rounded-xl bg-aurora-pink/20 border border-aurora-pink/50 text-aurora-pink font-bold text-xs shadow-glow-pink hover:bg-aurora-pink/30 active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Mouse className="w-3.5 h-3.5" />
            <span>Right Click</span>
          </button>
        </div>

        {/* Navigation & Windows Shortcuts */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageScroll('up')}
            className="p-2 rounded-xl glass-card text-titanium-300 hover:text-white"
            title="Page Up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handlePageScroll('down')}
            className="p-2 rounded-xl glass-card text-titanium-300 hover:text-white"
            title="Page Down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => sendInputEvent({ type: 'hotkey', hotkey: 'Alt+Tab' })}
            className="px-2.5 py-2 rounded-xl glass-card text-titanium-300 hover:text-white text-[10px]"
          >
            Alt+Tab
          </button>
          <button
            onClick={() => executeCommand('SHOW_DESKTOP')}
            className="px-2.5 py-2 rounded-xl glass-card text-titanium-300 hover:text-white text-[10px]"
          >
            Win+D
          </button>
        </div>
      </div>
    </div>
  );
}
