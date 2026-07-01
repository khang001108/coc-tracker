"use client";
import { thColor } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════════════════
   Thư viện icon Lâu Đài & Pháo — CoC Tracker
   - Màu cam #F4A130 nhất quán (dễ đọc trên cả theme sáng/tối)
   - Castle: animation float lên xuống
   - Cannon: animation nòng súng xoay quét (khi đã bắn)
   ════════════════════════════════════════════════════════════════════════ */

export const CASTLE_KEYS = ["castle_classic", "castle_round", "castle_fortress", "castle_royal", "castle_dragon", "castle_ice", "castle_shadow", "castle_celestial"] as const;
export const CANNON_KEYS = ["cannon_basic", "cannon_double", "cannon_turret", "cannon_mythic", "cannon_laser", "cannon_storm", "cannon_dragon", "cannon_celestial"] as const;

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
/* Barrel class: transform-box+origin cần tách ra khỏi keyframe */
.cannon-barrel {
  transform-box: fill-box;
  transform-origin: 50% 100%;
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
  castle_classic:   CastleClassic,
  castle_round:     CastleRound,
  castle_fortress:  CastleFortress,
  castle_royal:     CastleRoyal,
  castle_dragon:    CastleDragon,
  castle_ice:       CastleIce,
  castle_shadow:    CastleShadow,
  castle_celestial: CastleCelestial,
};

// ── Pháo (nòng súng xoay khi đã bắn) ─────────────────────────────────────

function CannonBasic({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 1 : 0.55}>
      <circle cx="11" cy="14" r="6" fill={ORANGE} fillOpacity={0.5} stroke={ORANGE} strokeWidth="1.3"/>
      {/* Nòng xoay */}
      <g className={fired ? "cannon-barrel" : undefined} style={{ animation: fired ? "cannon-aim 2.5s ease-in-out infinite" : undefined }}>
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
      <g className={fired ? "cannon-barrel" : undefined} style={{ animation: fired ? "cannon-aim 3s ease-in-out infinite" : undefined }}>
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
      <g className={fired ? "cannon-barrel" : undefined} style={{ animation: fired ? "cannon-aim 2s ease-in-out infinite" : undefined }}>
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
      <g className={fired ? "cannon-barrel" : undefined} style={{ animation: fired ? "cannon-aim 3.5s ease-in-out infinite" : undefined }}>
        <rect x="9" y="1" width="4" height="13" rx="1.8" fill={ORANGE} stroke={GOLD} strokeWidth="0.8"/>
        {fired && <circle cx="11" cy="1.5" r="2.5" fill={GOLD}/>}
      </g>
      <circle cx="11" cy="14" r="2" fill={GOLD}/>
    </svg>
  );
}

const CANNON_COMPONENTS: Record<string, React.FC<{ fired?: boolean; size?: number }>> = {
  cannon_basic:      CannonBasic,
  cannon_double:     CannonDouble,
  cannon_turret:     CannonTurret,
  cannon_mythic:     CannonMythic,
  cannon_laser:      CannonLaser,
  cannon_storm:      CannonStorm,
  cannon_dragon:     CannonDragon,
  cannon_celestial:  CannonCelestial,
};


// ── Lâu Đài Mới ──────────────────────────────────────────────────────────

function CastleDragon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <polygon points="17,2 31,13 31,31 3,31 3,13" fill="#FF6B35" fillOpacity={0.7} stroke="#FF6B35" strokeWidth={1.5}/>
      <polygon points="17,2 21,9 13,9" fill="#FFD700"/>
      <circle cx="6" cy="11" r="3" fill="#FF6B35" stroke="#FFD700" strokeWidth="1"/>
      <circle cx="28" cy="11" r="3" fill="#FF6B35" stroke="#FFD700" strokeWidth="1"/>
      <rect x="13" y="20" width="8" height="11" fill="#FF6B35" fillOpacity={0.9} stroke="#FF8C35" strokeWidth="1"/>
      <path d="M3 20 Q1 25 3 28" stroke="#FFD700" strokeWidth="1.5" fill="none"/>
      <path d="M31 20 Q33 25 31 28" stroke="#FFD700" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

function CastleIce({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <polygon points="17,2 31,13 31,31 3,31 3,13" fill="#60B8FF" fillOpacity={0.65} stroke="#A0D8FF" strokeWidth={1.5}/>
      <polygon points="17,2 20,9 14,9" fill="#E0F4FF"/>
      <rect x="8" y="16" width="4" height="4" fill="#A0D8FF" fillOpacity={0.6}/>
      <rect x="22" y="16" width="4" height="4" fill="#A0D8FF" fillOpacity={0.6}/>
      <rect x="13" y="20" width="8" height="11" fill="#60B8FF" fillOpacity={0.9} stroke="#A0D8FF" strokeWidth="1"/>
      <line x1="3" y1="13" x2="17" y2="2" stroke="#E0F4FF" strokeWidth="0.8" opacity={0.5}/>
      <line x1="31" y1="13" x2="17" y2="2" stroke="#E0F4FF" strokeWidth="0.8" opacity={0.5}/>
    </svg>
  );
}

function CastleShadow({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <polygon points="17,2 31,13 31,31 3,31 3,13" fill="#6B21A8" fillOpacity={0.75} stroke="#A855F7" strokeWidth={1.5}/>
      {[4,9,14,19,24,29].map((x,i) => <rect key={i} x={x} y="8" width="3.5" height="6" fill="#A855F7" fillOpacity={0.7}/>)}
      <rect x="13" y="20" width="8" height="11" fill="#6B21A8" fillOpacity={0.9} stroke="#A855F7" strokeWidth="1"/>
      <circle cx="17" cy="25" r="1.5" fill="#A855F7"/>
      <ellipse cx="17" cy="2" rx="3" ry="2" fill="#FFD700"/>
    </svg>
  );
}

function CastleCelestial({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <polygon points="17,1 32,13 32,31 2,31 2,13" fill="#F4A130" fillOpacity={0.75} stroke="#FFD700" strokeWidth={2}/>
      {[3,8,13,18,23,28].map((x,i) => <rect key={i} x={x} y="6" width="3.5" height="8" fill="#FFD700" fillOpacity={0.8}/>)}
      <rect x="12" y="19" width="10" height="12" fill="#F4A130" fillOpacity={0.95} stroke="#FFD700" strokeWidth="1.2"/>
      <polygon points="17,0 19.5,5 25,4 21,8 23,13 17,10 11,13 13,8 9,4 14.5,5" fill="#FFD700"/>
      <circle cx="17" cy="25" r="2" fill="#FFD700"/>
    </svg>
  );
}

// ── Pháo Mới ─────────────────────────────────────────────────────────────

function CannonLaser({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 1 : 0.6}>
      <circle cx="11" cy="14" r="6" fill="#00BFFF" fillOpacity={0.5} stroke="#00BFFF" strokeWidth="1.3"/>
      <g className={fired ? "cannon-barrel" : undefined} style={{ animation: fired ? "cannon-aim 2s ease-in-out infinite" : undefined }}>
        <rect x="10" y="1" width="2" height="13" rx="1" fill="#00BFFF"/>
        <rect x="9.5" y="1" width="3" height="8" rx="0.5" fill="white" fillOpacity={0.4}/>
        {fired && <circle cx="11" cy="1.5" r="2.5" fill="#00FFFF" opacity={0.9}/>}
      </g>
    </svg>
  );
}

function CannonStorm({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 1 : 0.6}>
      <circle cx="11" cy="14" r="6.5" fill="#6B21A8" fillOpacity={0.5} stroke="#A855F7" strokeWidth="1.3"/>
      <g className={fired ? "cannon-barrel" : undefined} style={{ animation: fired ? "cannon-aim 2.8s ease-in-out infinite" : undefined }}>
        <rect x="9.5" y="1" width="3" height="13" rx="1.5" fill="#A855F7"/>
        {fired && <ellipse cx="11" cy="1" rx="3" ry="2" fill="#FFD700"/>}
      </g>
      {fired && <line x1="7" y1="12" x2="4" y2="10" stroke="#A855F7" strokeWidth="1.5"/>}
      {fired && <line x1="15" y1="12" x2="18" y2="10" stroke="#A855F7" strokeWidth="1.5"/>}
    </svg>
  );
}

function CannonDragon({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 1 : 0.6}>
      <circle cx="11" cy="14" r="6.5" fill="#FF6B35" fillOpacity={0.5} stroke="#FF8C35" strokeWidth="1.3"/>
      <g className={fired ? "cannon-barrel" : undefined} style={{ animation: fired ? "cannon-aim 2.5s ease-in-out infinite" : undefined }}>
        <polygon points="11,1 14,13 11,14 8,13" fill="#FF6B35"/>
        <polygon points="11,1 13,8 11,10 9,8" fill="#FFD700" opacity={0.7}/>
        {fired && <circle cx="11" cy="1" r="3" fill="#FFD700"/>}
      </g>
    </svg>
  );
}

function CannonCelestial({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 1 : 0.6}>
      <circle cx="11" cy="14" r="7" fill="#F4A130" fillOpacity={0.45} stroke="#FFD700" strokeWidth="2"/>
      <g className={fired ? "cannon-barrel" : undefined} style={{ animation: fired ? "cannon-aim 3s ease-in-out infinite" : undefined }}>
        <rect x="9.5" y="1" width="3" height="13" rx="1.5" fill="#FFD700" stroke="#F4A130" strokeWidth="0.8"/>
        {fired && <polygon points="11,0 13,4 11,3 9,4" fill="#fff"/>}
      </g>
      <circle cx="11" cy="14" r="2.5" fill="#FFD700"/>
    </svg>
  );
}

// ── Exports ───────────────────────────────────────────────────────────────

/** Icon lâu đài trong War map — màu cam, float animation, TH number ở giữa */
export function CastleIcon({ svgKey, th, size, animate = true, showTh = true }: {
  svgKey?: string | null; th: number; size?: number; animate?: boolean; showTh?: boolean;
}) {
  ensureStyles();
  const Comp = CASTLE_COMPONENTS[svgKey || "castle_classic"] || CastleClassic;
  return (
    <div className="relative inline-block"
      style={{ animation: animate ? "castle-float 3s ease-in-out infinite" : undefined }}>
      <Comp size={size} />
      {/* TH badge — màu thColor để phân biệt cấp */}
      {showTh && (
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold mt-1.5"
          style={{ color: thColor(th), textShadow: "0 0 4px rgba(0,0,0,0.8)" }}>
          {th}
        </span>
      )}
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
