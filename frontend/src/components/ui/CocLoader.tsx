/**
 * CocLoader — màn hình loading CoC-themed
 * Có lâu đài nổi + pháo quay + tia lửa + thanh tiến trình
 */
"use client";
import { useEffect, useRef } from "react";

const LOADER_CSS = `
@keyframes coc-castle-bob {
  0%,100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-6px) scale(1.04); }
}
@keyframes coc-loader-bar {
  0%   { width: 5%; }
  30%  { width: 45%; }
  70%  { width: 75%; }
  90%  { width: 90%; }
  100% { width: 98%; }
}
@keyframes coc-dot {
  0%,80%,100% { transform: scale(0.6); opacity: 0.3; }
  40%          { transform: scale(1);   opacity: 1;   }
}
@keyframes coc-star-twinkle {
  0%,100% { opacity: 0.2; transform: scale(0.7); }
  50%     { opacity: 1;   transform: scale(1.2); }
}
`;
let loaderInjected = false;
function ensureLoaderStyles() {
  if (loaderInjected || typeof document === "undefined") return;
  loaderInjected = true;
  const s = document.createElement("style");
  s.textContent = LOADER_CSS;
  document.head.appendChild(s);
}

/* Mini lâu đài SVG inline */
function LoaderCastle() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ animation: "coc-castle-bob 2s ease-in-out infinite" }}>
      {/* Body */}
      <polygon points="32,6 56,22 56,58 8,58 8,22" fill="#F4A130" fillOpacity={0.9}/>
      <polygon points="32,6 37,18 27,18" fill="#FFD700"/>
      {/* Tower left */}
      <rect x="6" y="24" width="14" height="34" rx="2" fill="#D4821A"/>
      {/* Tower right */}
      <rect x="44" y="24" width="14" height="34" rx="2" fill="#D4821A"/>
      {/* Battlements left */}
      {[6,11,16].map((x,i) => <rect key={i} x={x} y="18" width="4" height="8" rx="1" fill="#B8731A"/>)}
      {/* Battlements right */}
      {[44,49,54].map((x,i) => <rect key={i} x={x} y="18" width="4" height="8" rx="1" fill="#B8731A"/>)}
      {/* Gate */}
      <path d="M26 58 L26 40 Q32 34 38 40 L38 58 Z" fill="#1A0A00" fillOpacity={0.7}/>
      {/* Windows */}
      <rect x="12" y="34" width="6" height="7" rx="1" fill="#FFD700" fillOpacity={0.6}/>
      <rect x="46" y="34" width="6" height="7" rx="1" fill="#FFD700" fillOpacity={0.6}/>
      {/* Flag */}
      <line x1="32" y1="6" x2="32" y2="-4" stroke="#8B5A1E" strokeWidth="1.5"/>
      <polygon points="32,-4 40,0 32,4" fill="#F4A130"/>

      {/* Pháo trái */}
      <g>
        <circle cx="13" cy="52" r="5" fill="#B8731A" fillOpacity={0.7} stroke="#F4A130" strokeWidth="1"/>
        <g>
          <rect x="11.5" y="43" width="3" height="9" rx="1.5" fill="#F4A130"/>
          <animateTransform attributeName="transform" type="rotate"
            values="-12 13 52;12 13 52;-12 13 52"
            keyTimes="0;0.5;1" dur="2.8s" repeatCount="indefinite"
            calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/>
        </g>
      </g>
      {/* Pháo phải */}
      <g>
        <circle cx="51" cy="52" r="5" fill="#B8731A" fillOpacity={0.7} stroke="#F4A130" strokeWidth="1"/>
        <g>
          <rect x="49.5" y="43" width="3" height="9" rx="1.5" fill="#F4A130"/>
          <animateTransform attributeName="transform" type="rotate"
            values="12 51 52;-12 51 52;12 51 52"
            keyTimes="0;0.5;1" dur="2.8s" repeatCount="indefinite"
            calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/>
        </g>
      </g>

      {/* Glitter stars */}
      {[[10,10,1],[54,8,1.5],[40,16,0.8]].map(([x,y,d],i) => (
        <polygon key={i} points={`${x},${y-3} ${x+1},${y} ${x+3},${y} ${x+1.5},${y+2} ${x+2},${y+4} ${x},${y+2.5} ${x-2},${y+4} ${x-1.5},${y+2} ${x-3},${y} ${x-1},${y}`}
          fill="#FFD700" style={{ animation: `coc-star-twinkle ${d+0.8}s ease-in-out infinite ${i*0.3}s` }}/>
      ))}
    </svg>
  );
}

interface CocLoaderProps {
  /** Hiển thị dạng card đầy đủ (mặc định) hay inline nhỏ */
  variant?: "card" | "inline" | "fullcard";
  text?: string;
  minHeight?: number;
}

export function CocLoader({ variant = "card", text = "Đang tải...", minHeight = 200 }: CocLoaderProps) {
  ensureLoaderStyles();

  if (variant === "inline") {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        {[0,1,2].map(i => (
          <span key={i} className="w-2 h-2 rounded-full bg-yellow-400"
            style={{ animation: `coc-dot 1.2s ease-in-out infinite ${i*0.2}s` }}/>
        ))}
        <span className="text-sm text-gray-400 ml-1">{text}</span>
      </div>
    );
  }

  return (
    <div className={`card flex flex-col items-center justify-center gap-4 relative overflow-hidden ${variant === "fullcard" ? "min-h-[240px]" : ""}`}
      style={{ minHeight }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(244,161,48,0.08) 0%, transparent 70%)" }}/>

      {/* Tia lửa nhỏ */}
      {[15,35,55,75,90].map((left, i) => (
        <span key={i} className="absolute bottom-0 rounded-full pointer-events-none ember-particle"
          style={{
            left: `${left}%`,
            width: 3 + (i % 3), height: 3 + (i % 3),
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${2.5 + i * 0.3}s`,
            ["--ember-drift" as any]: `${(i%2===0?1:-1)*10}px`,
          }}/>
      ))}

      {/* Castle illustration */}
      <LoaderCastle />

      {/* Text + dots */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-yellow-400">{text}</span>
        {[0,1,2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-yellow-400"
            style={{ animation: `coc-dot 1.2s ease-in-out infinite ${i*0.2}s` }}/>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-40 h-2 rounded-full overflow-hidden"
        style={{ background: "rgba(244,161,48,0.15)", border: "1px solid rgba(244,161,48,0.25)" }}>
        <div className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, #F4A130, #FFD700)",
            animation: "coc-loader-bar 2.5s ease-out forwards",
            boxShadow: "0 0 8px rgba(244,161,48,0.5)",
          }}/>
      </div>
    </div>
  );
}
