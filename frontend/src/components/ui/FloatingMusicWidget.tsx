"use client";
import { useEffect, useRef, useState } from "react";
import { useMusic } from "./MusicContext";
import { Music2, Play, Pause, Volume2, VolumeX, SkipForward, GripVertical } from "lucide-react";

const POS_KEY = "coc_music_player_pos";

export function FloatingMusicWidget() {
  const { config, playing, needsUnlock, currentTrack, playlist, togglePlay, skip, volume, setVolume } = useMusic();
  const boxRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragInfo = useRef<{ startX: number; startY: number; baseX: number; baseY: number; dragging: boolean; moved: boolean; lastPos: { x: number; y: number } | null }>({
    startX: 0, startY: 0, baseX: 0, baseY: 0, dragging: false, moved: false, lastPos: null,
  });

  function resetIdleTimer() {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 3000);
  }

  useEffect(() => {
    resetIdleTimer();
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) setPos(JSON.parse(saved));
    } catch {}
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, []);

  function clampPos(x: number, y: number) {
    const w = boxRef.current?.offsetWidth || 160;
    const h = boxRef.current?.offsetHeight || 44;
    const maxX = window.innerWidth - w - 8;
    const maxY = window.innerHeight - h - 8;
    return { x: Math.min(Math.max(8, x), Math.max(8, maxX)), y: Math.min(Math.max(8, y), Math.max(8, maxY)) };
  }

  function onPointerDown(e: React.PointerEvent) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragInfo.current = { startX: e.clientX, startY: e.clientY, baseX: rect.left, baseY: rect.top, dragging: true, moved: false, lastPos: null };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragInfo.current.dragging || !boxRef.current) return;
    const dx = e.clientX - dragInfo.current.startX;
    const dy = e.clientY - dragInfo.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragInfo.current.moved = true;
    const next = clampPos(dragInfo.current.baseX + dx, dragInfo.current.baseY + dy);
    boxRef.current.style.left = `${next.x}px`;
    boxRef.current.style.top = `${next.y}px`;
    boxRef.current.style.right = "auto";
    boxRef.current.style.bottom = "auto";
    dragInfo.current.lastPos = next;
  }

  function onPointerUp() {
    if (!dragInfo.current.dragging) return;
    dragInfo.current.dragging = false;
    const final = dragInfo.current.lastPos;
    if (final) {
      setPos(final);
      try { localStorage.setItem(POS_KEY, JSON.stringify(final)); } catch {}
    }
  }

  function toggleMute() {
    setMuted(m => !m);
  }

  if (!config.enabled || playlist.length === 0) return null;

  // Chỉ hiện trên desktop — trên điện thoại điều khiển nhạc nằm trong popup "Thêm" cho gọn
  if (needsUnlock) {
    return (
      <button onClick={togglePlay} ref={boxRef as any}
        className="hidden md:flex fixed z-40 items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm animate-pulse"
        style={{
          ...(pos ? { left: pos.x, top: pos.y, bottom: "auto", right: "auto" } : { bottom: 24, right: 12 }),
          background: "radial-gradient(circle at 35% 30%, #FFE8B8, #F4A130 55%, #B8731A 100%)",
          color: "#1A0F05", border: "2px solid #6B4115",
          boxShadow: "0 3px 0 #6B4115, 0 5px 12px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.6)",
        }}>
        <Music2 size={16} /> Bật nhạc nền
      </button>
    );
  }

  return (
    <div ref={boxRef}
      onMouseEnter={resetIdleTimer} onMouseMove={resetIdleTimer} onTouchStart={resetIdleTimer} onClick={resetIdleTimer}
      className="hidden md:flex fixed z-40 items-center gap-1 rounded-full px-2 py-2 select-none"
      style={{
        ...(pos ? { left: pos.x, top: pos.y, bottom: "auto", right: "auto" } : { bottom: 24, right: 12 }),
        background: "var(--player-bg)", border: "2px solid var(--player-border)",
        boxShadow: "0 3px 0 var(--player-border), 0 5px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        opacity: idle ? 0.35 : 1,
        transform: idle ? "scale(0.82)" : "scale(1)",
        transformOrigin: pos ? "center" : "bottom right",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}>
      <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        className="p-1 -ml-1 cursor-grab active:cursor-grabbing text-gray-600 touch-none">
        <GripVertical size={14} />
      </div>
      <button onClick={() => { if (!dragInfo.current.moved) togglePlay(); }} className="icon-btn-game w-8 h-8 text-gray-900">
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      {playlist.length > 1 && (
        <button onClick={skip} className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400">
          <SkipForward size={14} />
        </button>
      )}
      <div className="relative">
        <button onClick={() => setShowVolume(v => !v)} className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400">
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        {showVolume && (
          <div className="absolute bottom-full right-0 mb-2 bg-gray-900 border border-gray-800 rounded-xl p-3">
            <input type="range" min={0} max={1} step={0.05} value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="w-24 accent-yellow-500" style={{ writingMode: "vertical-lr" as any }} />
          </div>
        )}
      </div>
      {currentTrack && (
        <span className="text-[10px] text-gray-500 max-w-[90px] truncate pr-1.5 hidden sm:inline">
          {currentTrack.title}
        </span>
      )}
    </div>
  );
}
