"use client";
import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { api } from "@/lib/api";

const POS_KEY = "coc_cache_btn_pos";

/**
 * Nút nổi kéo-thả được, có mặt ở MỌI trang — bấm vào sẽ xoá cache CWL tạm
 * trên server + tải lại toàn bộ trang để lấy dữ liệu mới nhất. Thay cho các
 * nút refresh riêng lẻ ở từng trang (Tổng quan, War...) trước đây — gọn hơn,
 * dùng được ở bất cứ đâu. Mờ đi khi không dùng tới, rõ khi chạm/di chuột vào.
 */
export function FloatingCacheButton() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [idle, setIdle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragInfo = useRef<{ startX: number; startY: number; baseX: number; baseY: number; dragging: boolean; moved: boolean; lastPos: { x: number; y: number } | null }>({
    startX: 0, startY: 0, baseX: 0, baseY: 0, dragging: false, moved: false, lastPos: null,
  });

  function resetIdleTimer() {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2500);
  }

  useEffect(() => {
    resetIdleTimer();
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) setPos(JSON.parse(saved));
      else setPos({ x: window.innerWidth - 64, y: window.innerHeight - 160 });
    } catch {
      setPos({ x: 300, y: 300 });
    }
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, []);

  function clampPos(x: number, y: number) {
    const w = boxRef.current?.offsetWidth || 48;
    const h = boxRef.current?.offsetHeight || 48;
    const maxX = window.innerWidth - w - 8;
    const maxY = window.innerHeight - h - 8;
    return { x: Math.min(Math.max(8, x), Math.max(8, maxX)), y: Math.min(Math.max(8, y), Math.max(8, maxY)) };
  }

  function onPointerDown(e: React.PointerEvent) {
    resetIdleTimer();
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

  async function handleClick() {
    if (dragInfo.current.moved) return; // vừa kéo xong, không tính là bấm
    resetIdleTimer();
    setBusy(true); setMsg("");
    try {
      const res = await api.clearCache();
      setMsg(`Đã xoá ${res.cleared} mục — đang tải lại...`);
      setTimeout(() => window.location.reload(), 400);
    } catch {
      setMsg("Lỗi xoá cache");
      setBusy(false);
      setTimeout(() => setMsg(""), 2000);
    }
  }

  if (!pos) return null;

  return (
    <div ref={boxRef}
      className="fixed z-40 select-none transition-opacity duration-500"
      style={{ left: pos.x, top: pos.y, opacity: idle ? 0.35 : 1, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseEnter={resetIdleTimer}>
      <button onClick={handleClick} disabled={busy} title="Xoá cache & tải lại dữ liệu mới nhất"
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-70"
        style={{ background: "linear-gradient(135deg,#F4A130,#B8731A)", border: "2px solid rgba(255,255,255,0.2)" }}>
        <RotateCw size={20} className={`text-white ${busy ? "animate-spin" : ""}`} />
      </button>
      {msg && (
        <div className="absolute bottom-full right-0 mb-1.5 px-2.5 py-1.5 rounded-lg text-[11px] whitespace-nowrap text-white shadow-lg"
          style={{ background: "rgba(20,15,35,0.95)" }}>
          {msg}
        </div>
      )}
    </div>
  );
}
