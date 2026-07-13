"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Text tự chạy qua lại khi bị tràn (không đủ chỗ hiển thị hết) — dùng cho
 * các dòng "tên + chức vụ" trong danh sách/bảng xếp hạng chật hẹp, để người
 * dùng vẫn xem được đầy đủ thay vì bị cắt cụt (vd "Co-Le", "El", "C"...).
 * Nếu nội dung vừa đủ chỗ thì hiển thị tĩnh bình thường, không chạy.
 */
export function MarqueeText({ children, className = "", style, align = "left" }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; align?: "left" | "right" | "center" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    function check() {
      if (containerRef.current && contentRef.current) {
        const over = contentRef.current.scrollWidth - containerRef.current.clientWidth;
        setDistance(over > 4 ? over : 0);
      }
    }
    check();
    const ro = new ResizeObserver(check);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); window.removeEventListener("resize", check); };
  }, [children]);

  const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";

  return (
    <div ref={containerRef} className={`relative overflow-hidden min-w-0 ${className}`} style={style}>
      <div ref={contentRef}
        className={`whitespace-nowrap inline-flex items-center gap-1.5 ${distance > 0 ? "marquee-anim" : `truncate w-full flex ${justify}`}`}
        style={distance > 0 ? { ["--marquee-distance" as any]: `-${distance}px`, animationDuration: `${Math.max(3, Math.min(9, distance / 25))}s` } : undefined}>
        {children}
      </div>
    </div>
  );
}
