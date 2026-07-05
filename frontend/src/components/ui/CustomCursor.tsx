"use client";
import { useEffect, useRef } from "react";

/**
 * Con trỏ chuột tuỳ chỉnh — hình viên ngọc vàng lấp lánh, có hạt tia lửa
 * vàng bay theo khi di chuyển, phóng to lúc bấm — chỉ hiện trên máy tính
 * (chuột thật), không ảnh hưởng gì trên điện thoại/máy tính bảng.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const lastSpark = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!isFinePointer) return;

    document.documentElement.classList.add("custom-cursor-active");

    function spawnSpark(x: number, y: number) {
      const el = document.createElement("span");
      el.className = "cursor-spark";
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 16;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      el.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
      particlesRef.current?.appendChild(el);
      setTimeout(() => el.remove(), 650);
    }

    function onMove(e: MouseEvent) {
      pos.current = { x: e.clientX, y: e.clientY };
      const now = performance.now();
      if (now - lastSpark.current > 45) {
        lastSpark.current = now;
        spawnSpark(e.clientX, e.clientY);
      }
      const target = e.target as HTMLElement;
      const clickable = !!target.closest("a, button, [role='button'], input, textarea, select, summary, .cursor-pointer, [onclick]");
      ringRef.current?.classList.toggle("cursor-ring-hover", clickable);
    }

    function onDown() { ringRef.current?.classList.add("cursor-ring-pressed"); }
    function onUp() { ringRef.current?.classList.remove("cursor-ring-pressed"); }

    function tick() {
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      }
      ringPos.current.x += (pos.current.x - ringPos.current.x) * 0.18;
      ringPos.current.y += (pos.current.y - ringPos.current.y) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringPos.current.x}px, ${ringPos.current.y}px)`;
      }
      rafId.current = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    rafId.current = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <>
      <div ref={particlesRef} className="cursor-particles" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 34 34">
          <defs>
            <linearGradient id="cursorGoldRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFE9A8" />
              <stop offset="50%" stopColor="#F4A130" />
              <stop offset="100%" stopColor="#B8731A" />
            </linearGradient>
          </defs>
          <circle cx="17" cy="17" r="14" fill="none" stroke="url(#cursorGoldRing)" strokeWidth="1.6" opacity={0.85} />
          <circle cx="17" cy="1.5" r="1.4" fill="#FFD700" />
          <circle cx="17" cy="32.5" r="1.4" fill="#FFD700" />
          <circle cx="1.5" cy="17" r="1.4" fill="#FFD700" />
          <circle cx="32.5" cy="17" r="1.4" fill="#FFD700" />
        </svg>
      </div>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 22 22">
          <defs>
            <linearGradient id="cursorGoldGem" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF3D0" />
              <stop offset="45%" stopColor="#F4A130" />
              <stop offset="100%" stopColor="#8B4513" />
            </linearGradient>
          </defs>
          <path d="M11 1 L19 8 L11 21 L3 8 Z" fill="url(#cursorGoldGem)" stroke="#FFD700" strokeWidth="0.8" />
          <path d="M11 1 L15 8 L11 21 L7 8 Z" fill="#FFFBEA" opacity={0.35} />
        </svg>
      </div>
    </>
  );
}
