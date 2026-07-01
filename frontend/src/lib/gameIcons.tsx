"use client";
import { thColor } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════════════════
   Thư viện icon Lâu Đài & Pháo — CoC Tracker
   - Fill opacity tăng để rõ trên cả theme sáng/tối
   - Animation: lâu đài nổi nhẹ, pháo đã bắn có glow
   ════════════════════════════════════════════════════════════════════════ */

export const CASTLE_KEYS = ["castle_classic", "castle_round", "castle_fortress", "castle_royal"] as const;
export const CANNON_KEYS = ["cannon_basic", "cannon_double", "cannon_turret", "cannon_mythic"] as const;

/* Inject animation keyframes một lần */
const ANIM_CSS = `
@keyframes castle-float {
  0%,100% { transform: translateY(0px); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
  50%      { transform: translateY(-3px); filter: drop-shadow(0 5px 8px rgba(0,0,0,0.4)); }
}
@keyframes cannon-glow {
  0%,100% { filter: drop-shadow(0 0 3px currentColor); }
  50%      { filter: drop-shadow(0 0 8px currentColor); }
}
@keyframes castle-pulse-shadow {
  0%,100% { filter: drop-shadow(0 0 2px rgba(244,161,48,0.4)); }
  50%      { filter: drop-shadow(0 0 8px rgba(244,161,48,0.8)); }
}
`;

let injected = false;
function injectStyles() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const style = document.createElement("style");
  style.textContent = ANIM_CSS;
  document.head.appendChild(style);
}

// ── Lâu Đài ──────────────────────────────────────────────────────────────

function CastleClassic({ color, size = 34 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <polygon points="17,3 31,14 31,31 3,31 3,14" fill={color} fillOpacity={0.65} stroke={color} strokeWidth={1.5} />
      <rect x="13" y="20" width="8" height="11" fill={color} fillOpacity={0.85} stroke={color} strokeWidth="1" />
      {/* Cửa sổ */}
      <rect x="8"  y="17" width="4" height="4" fill={color} fillOpacity={0.4} />
      <rect x="22" y="17" width="4" height="4" fill={color} fillOpacity={0.4} />
    </svg>
  );
}

function CastleRound({ color, size = 34 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <circle cx="9" cy="12" r="5" fill={color} fillOpacity={0.6} stroke={color} strokeWidth="1.5" />
      <circle cx="25" cy="12" r="5" fill={color} fillOpacity={0.6} stroke={color} strokeWidth="1.5" />
      <rect x="6" y="16" width="22" height="14" rx="2" fill={color} fillOpacity={0.6} stroke={color} strokeWidth="1.5" />
      <polygon points="9,4 11,8 7,8" fill={color} />
      <polygon points="25,4 27,8 23,8" fill={color} />
      <rect x="14" y="21" width="6" height="9" fill={color} fillOpacity={0.85} stroke={color} strokeWidth="1" />
    </svg>
  );
}

function CastleFortress({ color, size = 34 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <rect x="4" y="14" width="26" height="17" fill={color} fillOpacity={0.6} stroke={color} strokeWidth="1.5" />
      {[4, 9.5, 15, 20.5, 26].map((x, i) => (
        <rect key={i} x={x} y="9" width="3.5" height="6" fill={color} fillOpacity={0.75} stroke={color} strokeWidth="1" />
      ))}
      <rect x="13" y="21" width="8" height="10" fill={color} fillOpacity={0.85} stroke={color} strokeWidth="1" />
      <polygon points="17,1 19,7 15,7" fill={color} />
    </svg>
  );
}

function CastleRoyal({ color, size = 34 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <polygon points="17,2 30,13 30,31 4,31 4,13" fill={color} fillOpacity={0.6} stroke={color} strokeWidth="1.5" />
      <circle cx="6" cy="11" r="3.5" fill={color} fillOpacity={0.7} stroke={color} strokeWidth="1.2" />
      <circle cx="28" cy="11" r="3.5" fill={color} fillOpacity={0.7} stroke={color} strokeWidth="1.2" />
      <polygon points="17,2 21,9 13,9" fill="#FFD700" stroke={color} strokeWidth="0.8" />
      <rect x="13" y="20" width="8" height="11" fill={color} fillOpacity={0.85} stroke={color} strokeWidth="1" />
      <circle cx="17" cy="24" r="1.4" fill="#FFD700" />
    </svg>
  );
}

const CASTLE_COMPONENTS: Record<string, React.FC<{ color: string; size?: number }>> = {
  castle_classic:  CastleClassic,
  castle_round:    CastleRound,
  castle_fortress: CastleFortress,
  castle_royal:    CastleRoyal,
};

// ── Pháo ─────────────────────────────────────────────────────────────────

function CannonBasic({ color, size = 22, fired }: { color: string; size?: number; fired?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 1 : 0.6}>
      <circle cx="11" cy="14" r="6" fill={color} fillOpacity={0.55} stroke={color} strokeWidth="1.3" />
      <rect x="9" y="2" width="4" height="12" rx="1.5" fill={color} />
      {fired && <circle cx="11" cy="2" r="2" fill="#FFD700" fillOpacity={0.8} />}
    </svg>
  );
}

function CannonDouble({ color, size = 22, fired }: { color: string; size?: number; fired?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 1 : 0.6}>
      <circle cx="11" cy="15" r="6" fill={color} fillOpacity={0.55} stroke={color} strokeWidth="1.3" />
      <rect x="6"  y="3" width="3" height="12" rx="1.3" fill={color} />
      <rect x="13" y="3" width="3" height="12" rx="1.3" fill={color} />
      {fired && <>
        <circle cx="7.5"  cy="3" r="1.5" fill="#FFD700" fillOpacity={0.8} />
        <circle cx="14.5" cy="3" r="1.5" fill="#FFD700" fillOpacity={0.8} />
      </>}
    </svg>
  );
}

function CannonTurret({ color, size = 22, fired }: { color: string; size?: number; fired?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 1 : 0.6}>
      <rect x="3" y="12" width="16" height="7" rx="1.5" fill={color} fillOpacity={0.55} stroke={color} strokeWidth="1.3" />
      <circle cx="11" cy="11" r="5" fill={color} fillOpacity={0.6} stroke={color} strokeWidth="1.3" />
      <rect x="9.5" y="1" width="3" height="11" rx="1.3" fill={color} />
      {fired && <circle cx="11" cy="1.5" r="2" fill="#FFD700" fillOpacity={0.8} />}
    </svg>
  );
}

function CannonMythic({ color, size = 22, fired }: { color: string; size?: number; fired?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 1 : 0.6}>
      <circle cx="11" cy="14" r="6.5" fill={color} fillOpacity={0.5} stroke="#FFD700" strokeWidth="1.5" />
      <rect x="9" y="1" width="4" height="13" rx="1.8" fill={color} stroke="#FFD700" strokeWidth="0.8" />
      <circle cx="11" cy="14" r="2" fill="#FFD700" />
      {fired && <circle cx="11" cy="1.5" r="2.5" fill="#FFD700" />}
    </svg>
  );
}

const CANNON_COMPONENTS: Record<string, React.FC<{ color: string; size?: number; fired?: boolean }>> = {
  cannon_basic:   CannonBasic,
  cannon_double:  CannonDouble,
  cannon_turret:  CannonTurret,
  cannon_mythic:  CannonMythic,
};

// ── Export components ────────────────────────────────────────────────────

export function CastleIcon({ svgKey, th, size, animate = true }: {
  svgKey?: string | null; th: number; size?: number; animate?: boolean;
}) {
  if (typeof window !== "undefined") injectStyles();
  const Comp = CASTLE_COMPONENTS[svgKey || "castle_classic"] || CastleClassic;
  const color = thColor(th);
  return (
    <div className="relative inline-block"
      style={{ animation: animate ? "castle-float 3s ease-in-out infinite" : undefined }}>
      <Comp color={color} size={size} />
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold mt-1.5"
        style={{ color }}>{th}</span>
    </div>
  );
}

export function CannonIcon({ svgKey, fired, size, thColor: color }: {
  svgKey?: string | null; fired?: boolean; size?: number; thColor?: string;
}) {
  if (typeof window !== "undefined") injectStyles();
  const Comp = CANNON_COMPONENTS[svgKey || "cannon_basic"] || CannonBasic;
  const c = fired ? (color || "#F4A130") : "#777";
  return (
    <div style={{ animation: fired ? "cannon-glow 2s ease-in-out infinite" : undefined }}>
      <Comp color={c} fired={fired} size={size} />
    </div>
  );
}

export function CastlePreview({ svgKey, size = 48 }: { svgKey: string; size?: number }) {
  if (typeof window !== "undefined") injectStyles();
  const Comp = CASTLE_COMPONENTS[svgKey] || CastleClassic;
  return (
    <div style={{ animation: "castle-float 3s ease-in-out infinite" }}>
      <Comp color="#F4A130" size={size} />
    </div>
  );
}

export function CannonPreview({ svgKey, size = 32 }: { svgKey: string; size?: number }) {
  if (typeof window !== "undefined") injectStyles();
  const Comp = CANNON_COMPONENTS[svgKey] || CannonBasic;
  return (
    <div style={{ animation: "cannon-glow 2s ease-in-out infinite" }}>
      <Comp color="#F4A130" fired size={size} />
    </div>
  );
}
