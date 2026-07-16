"use client";
/**
 * SlidingTabs — tab-pill-group với hiệu ứng viên vàng trượt mượt
 * khi chuyển tab, thay thế pattern tab-pill / tab-pill-active.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface TabDef {
  id: string;
  label: string;
  /** Icon SVG La Mã/Hy Lạp (xem @/components/ui/GrecoIcons) — hiện trong huy hiệu vàng trước label */
  icon?: ReactNode;
}

interface Props {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SlidingTabs({ tabs, active, onChange, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [slider, setSlider] = useState({ left: 0, width: 0, ready: false });

  function updateSlider(id: string) {
    const container = containerRef.current;
    if (!container) return;
    const btn = container.querySelector<HTMLElement>(`[data-tab="${id}"]`);
    if (!btn) return;
    setSlider({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true });
  }

  useIsomorphicLayoutEffect(() => { updateSlider(active); }, [active]);

  // Cập nhật lại khi resize (responsive)
  useEffect(() => {
    const observer = new ResizeObserver(() => updateSlider(active));
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [active]);

  return (
    <div
      ref={containerRef}
      className={`tab-pill-group relative ${className}`}
    >
      {/* Viên gold trượt */}
      {slider.ready && (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 rounded-xl pointer-events-none"
          style={{
            left:       slider.left,
            width:      slider.width,
            transition: "left 0.22s cubic-bezier(.4,0,.2,1), width 0.22s cubic-bezier(.4,0,.2,1)",
            background: "linear-gradient(180deg, #FFD27A 0%, #F4A130 50%, #D4821A 100%)",
            border:     "1px solid #8B5A1E",
            boxShadow:  "0 2px 0 #8B5A1E, 0 3px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        />
      )}

      {tabs.map(({ id, label, icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            data-tab={id}
            onClick={() => onChange(id)}
            className="relative z-10 px-4 py-2 text-sm rounded-xl transition-colors duration-150 whitespace-nowrap inline-flex items-center gap-1.5"
            style={{
              fontWeight:  isActive ? 700 : 600,
              color:       isActive ? "#1A0F05" : undefined,
              // text color tự inherit từ .tab-pill khi không active
              // nhưng cần reset khi active để text đen nổi trên nền vàng
            }}
          >
            {icon && <span className="tab-icon-medallion">{icon}</span>}
            {label}
          </button>
        );
      })}
    </div>
  );
}
