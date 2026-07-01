"use client";
import { thColor } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════════════════
   Thư viện icon Lâu Đài & Pháo — CoC Tracker
   - Màu cam #F4A130 nhất quán (dễ đọc trên cả theme sáng/tối)
   - Castle: animation float lên xuống
   - Cannon: animation nòng súng xoay quét (khi đã bắn)
   ════════════════════════════════════════════════════════════════════════ */

export const CASTLE_KEYS = ["castle_classic", "castle_round", "castle_fortress", "castle_royal"] as const;
export const CANNON_KEYS = ["cannon_basic", "cannon_double", "cannon_turret", "cannon_mythic"] as const;

const ORANGE = "#F4A130";
const GOLD   = "#FFD700";

const ANIM_CSS = `
@keyframes castle-float {
  0%,100% { transform: translateY(0); filter: drop-shadow(0 3px 5px rgba(180,100,0,0.25)); }
  50%      { transform: translateY(-3px); filter: drop-shadow(0 6px 10px rgba(180,100,0,0.4)); }
}
@keyframes cannon-aim {
  0%,100% { transform: rotate(-14deg); }
  50%      { transform: rotate(14deg); }
}
@keyframes cannon-glow {
  0%,100% { filter: drop-shadow(0 0 3px #F4A130); }
  50%      { filter: drop-shadow(0 0 9px #F4A130); }
}
`;
let injected = false;
function ensureStyles() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.textContent = ANIM_CSS;
  document.head.appendChild(s);
}

// ── Lâu Đài (màu cam cố định) ────────────────────────────────────────────

function CastleClassic({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <polygon points="17,3 31,14 31,31 3,31 3,14"
        fill={ORANGE} fillOpacity={0.75} stroke={ORANGE} strokeWidth={1.5} />
      <rect x="8"  y="16" width="4" height="4" fill={ORANGE} fillOpacity={0.5}/>
      <rect x="22" y="16" width="4" height="4" fill={ORANGE} fillOpacity={0.5}/>
      <rect x="13" y="20" width="8" height="11" fill={ORANGE} fillOpacity={0.9} stroke={ORANGE} strokeWidth="1"/>
    </svg>
  );
}

function CastleRound({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <circle cx="9" cy="12" r="5"  fill={ORANGE} fillOpacity={0.65} stroke={ORANGE} strokeWidth="1.5"/>
      <circle cx="25" cy="12" r="5" fill={ORANGE} fillOpacity={0.65} stroke={ORANGE} strokeWidth="1.5"/>
      <rect x="6" y="16" width="22" height="14" rx="2" fill={ORANGE} fillOpacity={0.65} stroke={ORANGE} strokeWidth="1.5"/>
      <polygon points="9,4 11,8 7,8"   fill={ORANGE}/>
      <polygon points="25,4 27,8 23,8" fill={ORANGE}/>
      <rect x="14" y="21" width="6" height="9" fill={ORANGE} fillOpacity={0.9} stroke={ORANGE} strokeWidth="1"/>
    </svg>
  );
}

function CastleFortress({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <rect x="4" y="14" width="26" height="17" fill={ORANGE} fillOpacity={0.65} stroke={ORANGE} strokeWidth="1.5"/>
      {[4, 9.5, 15, 20.5, 26].map((x, i) => (
        <rect key={i} x={x} y="9" width="3.5" height="6" fill={ORANGE} fillOpacity={0.8} stroke={ORANGE} strokeWidth="1"/>
      ))}
      <rect x="13" y="21" width="8" height="10" fill={ORANGE} fillOpacity={0.9} stroke={ORANGE} strokeWidth="1"/>
      <polygon points="17,1 19,7 15,7" fill={ORANGE}/>
    </svg>
  );
}

function CastleRoyal({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <polygon points="17,2 30,13 30,31 4,31 4,13" fill={ORANGE} fillOpacity={0.65} stroke={ORANGE} strokeWidth="1.5"/>
      <circle cx="6"  cy="11" r="3.5" fill={ORANGE} fillOpacity={0.75} stroke={ORANGE} strokeWidth="1.2"/>
      <circle cx="28" cy="11" r="3.5" fill={ORANGE} fillOpacity={0.75} stroke={ORANGE} strokeWidth="1.2"/>
      <polygon points="17,2 21,9 13,9" fill={GOLD} stroke={ORANGE} strokeWidth="0.8"/>
      <rect x="13" y="20" width="8" height="11" fill={ORANGE} fillOpacity={0.9} stroke={ORANGE} strokeWidth="1"/>
      <circle cx="17" cy="24" r="1.4" fill={GOLD}/>
    </svg>
  );
}

const CASTLE_COMPONENTS: Record<string, React.FC<{ size?: number }>> = {
  castle_classic:  CastleClassic,
  castle_round:    CastleRound,
  castle_fortress: CastleFortress,
  castle_royal:    CastleRoyal,
};

// ── Pháo (nòng súng xoay khi đã bắn) ─────────────────────────────────────

function CannonBasic({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 1 : 0.55}>
      <circle cx="11" cy="14" r="6" fill={ORANGE} fillOpacity={0.5} stroke={ORANGE} strokeWidth="1.3"/>
      {/* Nòng xoay */}
      <g style={{ transformOrigin: "11px 14px", animation: fired ? "cannon-aim 2.5s ease-in-out infinite" : undefined }}>
        <rect x="9" y="2" width="4" height="12" rx="1.5" fill={ORANGE}/>
        {fired && <circle cx="11" cy="2.5" r="2.2" fill={GOLD} fillOpacity={0.9}/>}
      </g>
    </svg>
  );
}

function CannonDouble({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 1 : 0.55}>
      <circle cx="11" cy="15" r="6" fill={ORANGE} fillOpacity={0.5} stroke={ORANGE} strokeWidth="1.3"/>
      <g style={{ transformOrigin: "11px 15px", animation: fired ? "cannon-aim 3s ease-in-out infinite" : undefined }}>
        <rect x="6"  y="3" width="3" height="12" rx="1.3" fill={ORANGE}/>
        <rect x="13" y="3" width="3" height="12" rx="1.3" fill={ORANGE}/>
        {fired && <>
          <circle cx="7.5"  cy="3.5" r="2" fill={GOLD} fillOpacity={0.9}/>
          <circle cx="14.5" cy="3.5" r="2" fill={GOLD} fillOpacity={0.9}/>
        </>}
      </g>
    </svg>
  );
}

function CannonTurret({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 1 : 0.55}>
      <rect x="3" y="12" width="16" height="7" rx="1.5" fill={ORANGE} fillOpacity={0.5} stroke={ORANGE} strokeWidth="1.3"/>
      <circle cx="11" cy="11" r="5" fill={ORANGE} fillOpacity={0.6} stroke={ORANGE} strokeWidth="1.3"/>
      <g style={{ transformOrigin: "11px 11px", animation: fired ? "cannon-aim 2s ease-in-out infinite" : undefined }}>
        <rect x="9.5" y="1" width="3" height="11" rx="1.3" fill={ORANGE}/>
        {fired && <circle cx="11" cy="2" r="2.2" fill={GOLD} fillOpacity={0.9}/>}
      </g>
    </svg>
  );
}

function CannonMythic({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 1 : 0.55}>
      <circle cx="11" cy="14" r="6.5" fill={ORANGE} fillOpacity={0.45} stroke={GOLD} strokeWidth="1.5"/>
      <g style={{ transformOrigin: "11px 14px", animation: fired ? "cannon-aim 3.5s ease-in-out infinite" : undefined }}>
        <rect x="9" y="1" width="4" height="13" rx="1.8" fill={ORANGE} stroke={GOLD} strokeWidth="0.8"/>
        {fired && <circle cx="11" cy="1.5" r="2.5" fill={GOLD}/>}
      </g>
      <circle cx="11" cy="14" r="2" fill={GOLD}/>
    </svg>
  );
}

const CANNON_COMPONENTS: Record<string, React.FC<{ fired?: boolean; size?: number }>> = {
  cannon_basic:   CannonBasic,
  cannon_double:  CannonDouble,
  cannon_turret:  CannonTurret,
  cannon_mythic:  CannonMythic,
};

// ── Exports ───────────────────────────────────────────────────────────────

/** Icon lâu đài trong War map — màu cam, float animation, TH number ở giữa */
export function CastleIcon({ svgKey, th, size, animate = true }: {
  svgKey?: string | null; th: number; size?: number; animate?: boolean;
}) {
  ensureStyles();
  const Comp = CASTLE_COMPONENTS[svgKey || "castle_classic"] || CastleClassic;
  return (
    <div className="relative inline-block"
      style={{ animation: animate ? "castle-float 3s ease-in-out infinite" : undefined }}>
      <Comp size={size} />
      {/* TH badge — màu thColor để phân biệt cấp */}
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold mt-1.5"
        style={{ color: thColor(th), textShadow: "0 0 4px rgba(0,0,0,0.8)" }}>
        {th}
      </span>
    </div>
  );
}

/** Icon pháo trong War map */
export function CannonIcon({ svgKey, fired, size }: {
  svgKey?: string | null; fired?: boolean; size?: number;
}) {
  ensureStyles();
  const Comp = CANNON_COMPONENTS[svgKey || "cannon_basic"] || CannonBasic;
  return (
    <div style={{ animation: fired ? "cannon-glow 2s ease-in-out infinite" : undefined }}>
      <Comp fired={fired} size={size} />
    </div>
  );
}

/** Preview trong Shop — lớn hơn, luôn orange, luôn animate */
export function CastlePreview({ svgKey, size = 48 }: { svgKey: string; size?: number }) {
  ensureStyles();
  const Comp = CASTLE_COMPONENTS[svgKey] || CastleClassic;
  return (
    <div style={{ animation: "castle-float 3s ease-in-out infinite" }}>
      <Comp size={size} />
    </div>
  );
}

export function CannonPreview({ svgKey, size = 32 }: { svgKey: string; size?: number }) {
  ensureStyles();
  const Comp = CANNON_COMPONENTS[svgKey] || CannonBasic;
  return (
    <div style={{ animation: "cannon-glow 2s ease-in-out infinite" }}>
      <Comp fired size={size} />
    </div>
  );
}
