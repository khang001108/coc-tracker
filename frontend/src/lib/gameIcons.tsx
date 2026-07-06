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


// ── Animal Castles ───────────────────────────────────────────────────────────

function CastleCat({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      {/* Body */}
      <polygon points="17,6 30,18 30,32 4,32 4,18" fill="#F4A130" fillOpacity={0.75} stroke="#FFD700" strokeWidth={1.5}/>
      {/* Cat ears */}
      <polygon points="6,18 4,8 12,14" fill="#F4A130" stroke="#FFD700" strokeWidth={1}/>
      <polygon points="28,18 30,8 22,14" fill="#F4A130" stroke="#FFD700" strokeWidth={1}/>
      <polygon points="7,17 5.5,10 11,14" fill="#FFD700" fillOpacity={0.5}/>
      <polygon points="27,17 28.5,10 23,14" fill="#FFD700" fillOpacity={0.5}/>
      {/* Cat face */}
      <circle cx="17" cy="21" r="7" fill="#FFE8B8" fillOpacity={0.9}/>
      <ellipse cx="14" cy="20" rx="1.5" ry="2" fill="#1A0A00"/>
      <ellipse cx="20" cy="20" rx="1.5" ry="2" fill="#1A0A00"/>
      <circle cx="14.5" cy="19.5" r="0.5" fill="white"/>
      <circle cx="20.5" cy="19.5" r="0.5" fill="white"/>
      <polygon points="17,22.5 15.5,24 18.5,24" fill="#FFB0B0"/>
      <line x1="11" y1="22" x2="14.5" y2="23" stroke="#8B6530" strokeWidth="0.6"/>
      <line x1="23" y1="22" x2="19.5" y2="23" stroke="#8B6530" strokeWidth="0.6"/>
      <line x1="11" y1="23.5" x2="14.5" y2="23.5" stroke="#8B6530" strokeWidth="0.6"/>
      <line x1="23" y1="23.5" x2="19.5" y2="23.5" stroke="#8B6530" strokeWidth="0.6"/>
      {/* Gate */}
      <rect x="14" y="27" width="6" height="5" rx="3" fill="#1A0A00" fillOpacity={0.6}/>
    </svg>
  );
}

function CastleTiger({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <polygon points="17,5 31,17 31,32 3,32 3,17" fill="#FF8C35" fillOpacity={0.75} stroke="#FFD700" strokeWidth={1.5}/>
      {/* Tiger stripes */}
      <line x1="3" y1="22" x2="9" y2="20" stroke="#8B4010" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="31" y1="22" x2="25" y2="20" stroke="#8B4010" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="3" y1="26" x2="8" y2="25" stroke="#8B4010" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="31" y1="26" x2="26" y2="25" stroke="#8B4010" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Tiger face */}
      <circle cx="17" cy="20" r="8" fill="#FFD080" fillOpacity={0.9}/>
      <circle cx="14" cy="14" r="3" fill="#FF8C35" fillOpacity={0.8}/>
      <circle cx="20" cy="14" r="3" fill="#FF8C35" fillOpacity={0.8}/>
      <line x1="15" y1="14" x2="17" y2="12" stroke="#8B4010" strokeWidth="0.8"/>
      <line x1="17" y1="14" x2="19" y2="12" stroke="#8B4010" strokeWidth="0.8"/>
      <ellipse cx="13.5" cy="19.5" rx="2" ry="2.5" fill="#1A0A00"/>
      <ellipse cx="20.5" cy="19.5" rx="2" ry="2.5" fill="#1A0A00"/>
      <polygon points="17,22 15.5,24 18.5,24" fill="#FF8080"/>
      <rect x="14" y="28" width="6" height="4" rx="2" fill="#1A0A00" fillOpacity={0.6}/>
    </svg>
  );
}

function CastlePanda({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <polygon points="17,5 31,17 31,32 3,32 3,17" fill="#F0F0F0" fillOpacity={0.85} stroke="#C8C8C8" strokeWidth={1.5}/>
      {/* Panda ears */}
      <circle cx="7"  cy="15" r="4" fill="#2A2A2A"/>
      <circle cx="27" cy="15" r="4" fill="#2A2A2A"/>
      {/* Panda face */}
      <circle cx="17" cy="20" r="8" fill="white" fillOpacity={0.95}/>
      <ellipse cx="13" cy="19" rx="3" ry="2.5" fill="#2A2A2A" fillOpacity={0.85}/>
      <ellipse cx="21" cy="19" rx="3" ry="2.5" fill="#2A2A2A" fillOpacity={0.85}/>
      <circle cx="13" cy="18.5" r="1.5" fill="white"/>
      <circle cx="21" cy="18.5" r="1.5" fill="white"/>
      <circle cx="13.7" cy="19.2" r="0.8" fill="#1A1A1A"/>
      <circle cx="21.7" cy="19.2" r="0.8" fill="#1A1A1A"/>
      <ellipse cx="17" cy="22.5" rx="2" ry="1.2" fill="#FFB0B0"/>
      <rect x="14" y="28" width="6" height="4" rx="2" fill="#2A2A2A" fillOpacity={0.6}/>
    </svg>
  );
}

// ── Animal Cannons ────────────────────────────────────────────────────────────

function CannonCat({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.55 : 1}>
      <circle cx="11" cy="14" r="7" fill="#F4A130" fillOpacity={0.5} stroke={fired ? "#7A4810" : "#F4A130"} strokeWidth="1.3"/>
      {/* Cat ears on top */}
      <polygon points="7,8 5,3 10,7" fill={fired ? "#7A4810" : "#F4A130"}/>
      <polygon points="15,8 17,3 12,7" fill={fired ? "#7A4810" : "#F4A130"}/>
      {/* Cat face */}
      <circle cx="11" cy="13" r="5" fill={fired ? "#7A4810" : "#FFE8B8"} fillOpacity={0.9}/>
      <ellipse cx="9"  cy="12" rx="1.2" ry="1.5" fill="#1A0A00"/>
      <ellipse cx="13" cy="12" rx="1.2" ry="1.5" fill="#1A0A00"/>
      <polygon points="11,14 10,15.5 12,15.5" fill="#FFB0B0"/>
      <g className={fired ? undefined : "cannon-spin-fast"} style={{ transformBox:"fill-box", transformOrigin:"50% 100%" }}>
        <rect x="10.5" y="2" width="1" height="6" rx="0.5" fill={fired ? "#7A4810" : "#F4A130"}/>
      </g>
    </svg>
  );
}

function CannonTiger({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.55 : 1}>
      <circle cx="11" cy="14" r="7" fill="#FF8C35" fillOpacity={0.5} stroke={fired ? "#7A4810" : "#FF8C35"} strokeWidth="1.3"/>
      {/* Stripes */}
      <line x1="6" y1="11" x2="9" y2="13" stroke={fired ? "#5A2A0A" : "#8B4010"} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="16" y1="11" x2="13" y2="13" stroke={fired ? "#5A2A0A" : "#8B4010"} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Tiger face */}
      <circle cx="11" cy="13.5" r="5" fill={fired ? "#7A4810" : "#FFD080"} fillOpacity={0.9}/>
      <ellipse cx="9"  cy="12.5" rx="1.3" ry="1.6" fill="#1A0A00"/>
      <ellipse cx="13" cy="12.5" rx="1.3" ry="1.6" fill="#1A0A00"/>
      <polygon points="11,14.5 10,16 12,16" fill="#FF8080"/>
      <g className={fired ? undefined : "cannon-spin-fast"} style={{ transformBox:"fill-box", transformOrigin:"50% 100%" }}>
        <rect x="10.5" y="1" width="1" height="7" rx="0.5" fill={fired ? "#7A4810" : "#FF8C35"}/>
      </g>
    </svg>
  );
}

function CannonPanda({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.55 : 1}>
      <circle cx="11" cy="14" r="7" fill={fired ? "#555" : "#F0F0F0"} fillOpacity={0.6} stroke={fired ? "#333" : "#C0C0C0"} strokeWidth="1.3"/>
      {/* Panda ears */}
      <circle cx="7"  cy="9" r="2.5" fill={fired ? "#333" : "#2A2A2A"}/>
      <circle cx="15" cy="9" r="2.5" fill={fired ? "#333" : "#2A2A2A"}/>
      {/* Face */}
      <circle cx="11" cy="14" r="5" fill={fired ? "#555" : "white"} fillOpacity={0.9}/>
      <ellipse cx="9"  cy="13" rx="1.8" ry="1.5" fill={fired ? "#333" : "#2A2A2A"} fillOpacity={0.85}/>
      <ellipse cx="13" cy="13" rx="1.8" ry="1.5" fill={fired ? "#333" : "#2A2A2A"} fillOpacity={0.85}/>
      <circle cx="9.7" cy="12.5" r="0.7" fill="white"/>
      <circle cx="13.7" cy="12.5" r="0.7" fill="white"/>
      <ellipse cx="11" cy="15.5" rx="1.5" ry="1" fill="#FFB0B0"/>
      <g className={fired ? undefined : "cannon-spin-fast"} style={{ transformBox:"fill-box", transformOrigin:"50% 100%" }}>
        <rect x="10.5" y="1" width="1" height="7" rx="0.5" fill={fired ? "#444" : "#D0D0D0"}/>
      </g>
    </svg>
  );
}

function CannonDragonFace({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.55 : 1}>
      {/* Dragon horns */}
      <polygon points="8,7 6,1 10,6"  fill={fired ? "#5A1A00" : "#FF6B35"}/>
      <polygon points="14,7 16,1 12,6" fill={fired ? "#5A1A00" : "#FF6B35"}/>
      <circle cx="11" cy="14" r="7" fill="#FF6B35" fillOpacity={fired ? 0.4 : 0.65} stroke={fired ? "#5A1A00" : "#FF8C35"} strokeWidth="1.3"/>
      {/* Scales */}
      {[[9,11],[12,11],[10.5,9]].map(([x,y],i) => (
        <ellipse key={i} cx={x} cy={y} rx="1.5" ry="1" fill={fired ? "#5A1A00" : "#F4A130"} fillOpacity={0.6}/>
      ))}
      {/* Dragon eyes */}
      <ellipse cx="9"  cy="13" rx="1.5" ry="1.8" fill={fired ? "#3A0A00" : "#FFD700"}/>
      <ellipse cx="13" cy="13" rx="1.5" ry="1.8" fill={fired ? "#3A0A00" : "#FFD700"}/>
      <ellipse cx="9"  cy="13" rx="0.6" ry="1.2" fill="#1A0A00"/>
      <ellipse cx="13" cy="13" rx="0.6" ry="1.2" fill="#1A0A00"/>
      {/* Fire breath (unfired only) */}
      {!fired && <ellipse cx="11" cy="17" rx="2" ry="1" fill="#FFD700" fillOpacity={0.8}/>}
      <g className={fired ? undefined : "cannon-spin-fast"} style={{ transformBox:"fill-box", transformOrigin:"50% 100%" }}>
        <rect x="10.5" y="0" width="1" height="7" rx="0.5" fill={fired ? "#5A1A00" : "#FF6B35"}/>
      </g>
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
  castle_cat:       CastleCat,
  castle_tiger:     CastleTiger,
  castle_panda:     CastlePanda,
};

// ── Pháo (nòng súng xoay khi đã bắn) ─────────────────────────────────────

function CannonBasic({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.55 : 1}>
      <circle cx="11" cy="14" r="6" fill={ORANGE} fillOpacity={0.5} stroke={ORANGE} strokeWidth="1.3"/>
      <g className={fired ? undefined : "cannon-spin-fast"}>
        <rect x="9" y="2" width="4" height="12" rx="1.5" fill={fired ? "#7A4810" : ORANGE}/>
        {!fired && <circle cx="11" cy="2.5" r="2.2" fill={GOLD} fillOpacity={0.9}/>}
      </g>
    </svg>
  );
}

function CannonDouble({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.55 : 1}>
      <circle cx="11" cy="15" r="6" fill={ORANGE} fillOpacity={0.5} stroke={ORANGE} strokeWidth="1.3"/>
      <g className={fired ? undefined : "cannon-spin-fast"}>
        <rect x="6"  y="3" width="3" height="12" rx="1.3" fill={fired ? "#7A4810" : ORANGE}/>
        <rect x="13" y="3" width="3" height="12" rx="1.3" fill={fired ? "#7A4810" : ORANGE}/>
        {!fired && <><circle cx="7.5"  cy="3.5" r="2" fill={GOLD} fillOpacity={0.9}/><circle cx="14.5" cy="3.5" r="2" fill={GOLD} fillOpacity={0.9}/></>}
      </g>
    </svg>
  );
}
function CannonTurret({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.55 : 1}>
      <rect x="3" y="12" width="16" height="7" rx="1.5" fill={ORANGE} fillOpacity={0.5} stroke={ORANGE} strokeWidth="1.3"/>
      <circle cx="11" cy="11" r="5" fill={ORANGE} fillOpacity={0.6} stroke={ORANGE} strokeWidth="1.3"/>
      <g className={fired ? undefined : "cannon-spin-fast"}>
        <rect x="9.5" y="1" width="3" height="11" rx="1.3" fill={fired ? "#7A4810" : ORANGE}/>
        {!fired && <circle cx="11" cy="2" r="2.2" fill={GOLD} fillOpacity={0.9}/>}
      </g>
    </svg>
  );
}
function CannonMythic({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.55 : 1}>
      <circle cx="11" cy="14" r="6.5" fill={ORANGE} fillOpacity={0.45} stroke={GOLD} strokeWidth="1.5"/>
      <g className={fired ? undefined : "cannon-spin-fast"}>
        <rect x="9" y="1" width="4" height="13" rx="1.8" fill={fired ? "#7A4810" : ORANGE} stroke={GOLD} strokeWidth="0.8"/>
        {!fired && <circle cx="11" cy="1.5" r="2.5" fill={GOLD}/>}
      </g>
      <circle cx="11" cy="14" r="2" fill={GOLD}/>
    </svg>
  );
}

const CANNON_COMPONENTS: Record<string, React.FC<{ fired?: boolean; size?: number }>> = {
  cannon_basic:       CannonBasic,
  cannon_double:      CannonDouble,
  cannon_turret:      CannonTurret,
  cannon_mythic:      CannonMythic,
  cannon_laser:       CannonLaser,
  cannon_storm:       CannonStorm,
  cannon_dragon:      CannonDragon,
  cannon_celestial:   CannonCelestial,
  cannon_cat:         CannonCat,
  cannon_tiger:       CannonTiger,
  cannon_panda:       CannonPanda,
  cannon_dragon_face: CannonDragonFace,
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
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.55 : 1}>
      <circle cx="11" cy="14" r="6" fill="#00BFFF" fillOpacity={0.5} stroke="#00BFFF" strokeWidth="1.3"/>
      <g className={fired ? undefined : "cannon-spin-fast"}>
        <rect x="10" y="1" width="2" height="13" rx="1" fill="#00BFFF"/>
        <rect x="9.5" y="1" width="3" height="8" rx="0.5" fill="white" fillOpacity={0.4}/>
        {fired && <circle cx="11" cy="1.5" r="2.5" fill="#00FFFF" opacity={0.9}/>}
      </g>
    </svg>
  );
}

function CannonStorm({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.55 : 1}>
      <circle cx="11" cy="14" r="6.5" fill="#6B21A8" fillOpacity={0.5} stroke="#A855F7" strokeWidth="1.3"/>
      <g className={fired ? undefined : "cannon-spin-fast"}>
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
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.55 : 1}>
      <circle cx="11" cy="14" r="6.5" fill="#FF6B35" fillOpacity={0.5} stroke="#FF8C35" strokeWidth="1.3"/>
      <g className={fired ? undefined : "cannon-spin-fast"}>
        <polygon points="11,1 14,13 11,14 8,13" fill={fired ? "#7A2A10" : "#FF6B35"}/>
        <polygon points="11,1 13,8 11,10 9,8" fill="#FFD700" opacity={0.7}/>
        {fired && <circle cx="11" cy="1" r="3" fill="#FFD700"/>}
      </g>
    </svg>
  );
}

function CannonCelestial({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.55 : 1}>
      <circle cx="11" cy="14" r="7" fill="#F4A130" fillOpacity={0.45} stroke="#FFD700" strokeWidth="2"/>
      <g className={fired ? undefined : "cannon-spin-fast"}>
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
    <div style={{ animation: fired ? undefined : "cannon-glow 2s ease-in-out infinite" }}>
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
  // fired=false → sáng + spin-fast (trạng thái "sẵn sàng" = đẹp nhất để preview)
  return (
    <div style={{ animation: "cannon-glow 2s ease-in-out infinite" }}>
      <Comp fired={false} size={size} />
    </div>
  );
}

/* ── Tia đạn (Chiến trường War) ──────────────────────────────────────────── */
/* Nguồn dùng chung — WarBattlefieldMap.tsx import từ đây để không lặp code.
 * Lõi đạn theo màu PHE (xanh=mình, đỏ=địch, xử lý riêng ở nơi dùng) CHỈ với
 * skin dùng chấm tròn cổ điển — các skin có emoji (tên lửa, phi đao...) thì
 * bản thân hình dạng đã đủ nhận diện, không cần phủ màu phe lên trên nữa.
 * rotate: "point" = tự xoay theo hướng bay (như tên lửa/mũi tên thật),
 * "spin" = tự xoay tít không ngừng (phi đao/búa/kéo), "wobble" = lắc nghiêng
 * ngả hài hước (bom thối/tủ lạnh), "none" = không xoay (đại bác/cổ điển). */
export type ProjectileRotate = "none" | "spin" | "wobble" | "point";
export const PROJECTILE_SKINS: Record<string, {
  rotate: ProjectileRotate; trail: number; spark?: string; coreScale: number; label: string;
}> = {
  proj_classic:    { rotate: "none",  trail: 3, coreScale: 1,    label: "Đạn Cổ Điển" },
  proj_rocket:     { rotate: "point",  trail: 5, spark: "#FF6B00", coreScale: 1.3, label: "Hoả Tiễn" },
  proj_dragon:     { rotate: "point",  trail: 6, spark: "#FF3D00", coreScale: 1.3, label: "Long Hoả" },
  proj_cannonball: { rotate: "none",   trail: 4, spark: "#FFA500", coreScale: 1.2, label: "Đại Bác" },
  proj_dart:       { rotate: "spin",   trail: 2, spark: "#CBD5E1", coreScale: 1.1, label: "Phi Đao" },
  proj_arrow:      { rotate: "point",  trail: 3, spark: "#8BE28B", coreScale: 1.1, label: "Thần Tiễn" },
  proj_poop:       { rotate: "wobble", trail: 0, coreScale: 1.3, label: "Bom Thối" },
  proj_fridge:     { rotate: "wobble", trail: 3, spark: "#7DD3FC", coreScale: 1.3, label: "Tủ Lạnh" },
  proj_hammer:     { rotate: "spin",   trail: 2, spark: "#FFD700", coreScale: 1.2, label: "Búa Thần" },
  proj_scissors:   { rotate: "spin",   trail: 2, spark: "#E5E7EB", coreScale: 1.1, label: "Lưỡi Kéo" },
};
export const PROJECTILE_RAINBOW = ["#FF5A5A", "#FFB300", "#FFEB3B", "#4ADE80", "#38BDF8", "#A78BFA"];
// Tốc độ bay = đúng nhịp xoay nòng pháo (.cannon-spin-fast trong globals.css: 2s/vòng)
export const PROJECTILE_DUR = 2;

/** 1 viên đạn hoàn chỉnh (đầu đạn + đuôi vệt) bay theo pathD, dùng chung cho
 * cả bản đồ chiến trường thật (nhiều màu phe) và preview trong Cửa hàng. */
/* ── Hình dạng tia đạn tự vẽ (không dùng emoji — mỗi máy hiện khác nhau) ──
 * Mỗi shape vẽ trong khung 20x20, canh giữa tại gốc toạ độ để dễ ghép vào
 * <g> đang animate xoay/di chuyển. */
function ShapeRocket() {
  return (
    <g>
      <path d="M0 -9 C3 -6 3.5 -1 2.5 4 L-2.5 4 C-3.5 -1 -3 -6 0 -9 Z" fill="#E7E9EE" stroke="#8B93A3" strokeWidth="0.6" />
      <path d="M0 -9 C1.6 -6.5 2 -3.5 1.6 -1 L-1.6 -1 C-2 -3.5 -1.6 -6.5 0 -9 Z" fill="#FF5A36" />
      <circle cx="0" cy="-2.5" r="1.3" fill="#7DD3FC" stroke="#38BDF8" strokeWidth="0.5" />
      <path d="M-2.5 2 L-5 5.5 L-2 4.3 Z" fill="#FF5A36" />
      <path d="M2.5 2 L5 5.5 L2 4.3 Z" fill="#FF5A36" />
      <path d="M-1.6 4 C-1.2 6.5 0 8.5 0 8.5 C0 8.5 1.2 6.5 1.6 4 Z" fill="#FFB300" />
    </g>
  );
}
function ShapeDragon() {
  return (
    <g>
      <circle cx="0" cy="0" r="6" fill="#FF3D00" />
      <circle cx="0" cy="0" r="3.6" fill="#FFB300" />
      <circle cx="0" cy="0" r="1.6" fill="#FFF3D0" />
      {[0, 60, 120, 180, 240, 300].map(deg => (
        <path key={deg} d="M0 -6 C1.5 -8.5 1 -10.5 0 -12 C-1 -10.5 -1.5 -8.5 0 -6 Z" fill="#FF6B1A"
          transform={`rotate(${deg})`} opacity={0.85} />
      ))}
    </g>
  );
}
function ShapeCannonball() {
  return (
    <g>
      <circle cx="0" cy="1" r="6.5" fill="#2B2B2E" stroke="#111" strokeWidth="0.6" />
      <ellipse cx="-2" cy="-1.5" rx="2" ry="1.2" fill="#5A5A5E" opacity={0.6} />
      <path d="M0 -5.5 L1 -9 L-0.6 -8.6 Z" fill="#8B5A0F" />
      <circle cx="1" cy="-9" r="1.1" fill="#FFD700" />
      <circle cx="1" cy="-9" r="0.5" fill="#FFF3D0" />
    </g>
  );
}
function ShapeDart() {
  return (
    <g>
      <path d="M0 -9 L2 2 L0 5 L-2 2 Z" fill="#CBD5E1" stroke="#64748B" strokeWidth="0.5" />
      <path d="M0 -9 L0.8 1.5 L0 4 Z" fill="#EDF2F7" />
      <rect x="-2.6" y="2" width="5.2" height="1.4" rx="0.6" fill="#8B93A3" />
      <path d="M-2.6 3.4 L-4.5 7 L-1.8 5.2 Z" fill="#374151" />
      <path d="M2.6 3.4 L4.5 7 L1.8 5.2 Z" fill="#374151" />
    </g>
  );
}
function ShapeArrow() {
  return (
    <g>
      <path d="M0 -9 L-2.6 -3.5 L0 -5 L2.6 -3.5 Z" fill="#8BE28B" stroke="#166534" strokeWidth="0.4" />
      <rect x="-0.6" y="-4" width="1.2" height="10" fill="#B45309" />
      <path d="M-0.6 6 L-3 9 L-0.6 7.2 Z" fill="#8BE28B" />
      <path d="M0.6 6 L3 9 L0.6 7.2 Z" fill="#8BE28B" />
    </g>
  );
}
function ShapePoop() {
  return (
    <g>
      <ellipse cx="0" cy="6" rx="6.5" ry="2.6" fill="#8B5A2B" />
      <ellipse cx="0" cy="2.5" rx="5" ry="2.6" fill="#A0692F" />
      <ellipse cx="0" cy="-1.5" rx="3.6" ry="2.4" fill="#B47A3C" />
      <ellipse cx="0" cy="-4.6" rx="2.2" ry="1.8" fill="#C48A4D" />
      <circle cx="-2" cy="1" r="0.8" fill="#fff" />
      <circle cx="2" cy="1" r="0.8" fill="#fff" />
      <circle cx="-2" cy="1.2" r="0.4" fill="#222" />
      <circle cx="2" cy="1.2" r="0.4" fill="#222" />
    </g>
  );
}
function ShapeFridge() {
  return (
    <g>
      <rect x="-5" y="-9" width="10" height="18" rx="1.6" fill="#EAF6FF" stroke="#8FC7E8" strokeWidth="0.7" />
      <line x1="-5" y1="-2.5" x2="5" y2="-2.5" stroke="#8FC7E8" strokeWidth="0.7" />
      <rect x="2.6" y="-7" width="1.1" height="3" rx="0.5" fill="#7DD3FC" />
      <rect x="2.6" y="-0.5" width="1.1" height="3" rx="0.5" fill="#7DD3FC" />
      <path d="M-3 -6 L-1 -4" stroke="#C7EAFB" strokeWidth="0.8" strokeLinecap="round" />
    </g>
  );
}
function ShapeHammer() {
  return (
    <g>
      <rect x="-1" y="-2" width="2" height="11" rx="0.8" fill="#B45309" />
      <rect x="-5.5" y="-9" width="11" height="6" rx="1.2" fill="#8B93A3" stroke="#4B5563" strokeWidth="0.6" />
      <rect x="-5.5" y="-9" width="11" height="2" rx="1" fill="#CBD5E1" />
    </g>
  );
}
function ShapeScissors() {
  return (
    <g>
      <path d="M-1 0 L-6 -8 L-4.3 -8.6 L1 -0.8 Z" fill="#CBD5E1" stroke="#64748B" strokeWidth="0.4" />
      <path d="M1 0 L6 -8 L4.3 -8.6 L-1 -0.8 Z" fill="#CBD5E1" stroke="#64748B" strokeWidth="0.4" />
      <circle cx="0" cy="0" r="1.3" fill="#F4A130" />
      <circle cx="-5" cy="6.5" r="2.6" fill="none" stroke="#374151" strokeWidth="1.3" />
      <circle cx="5" cy="6.5" r="2.6" fill="none" stroke="#374151" strokeWidth="1.3" />
      <path d="M-1 0 L-5 6.5" stroke="#374151" strokeWidth="1.1" />
      <path d="M1 0 L5 6.5" stroke="#374151" strokeWidth="1.1" />
    </g>
  );
}

const PROJECTILE_SHAPES: Record<string, () => JSX.Element> = {
  proj_rocket: ShapeRocket, proj_dragon: ShapeDragon, proj_cannonball: ShapeCannonball,
  proj_dart: ShapeDart, proj_arrow: ShapeArrow, proj_poop: ShapePoop,
  proj_fridge: ShapeFridge, proj_hammer: ShapeHammer, proj_scissors: ShapeScissors,
};

export function ProjectileBall({ svgKey, pathD, teamColor, dur = PROJECTILE_DUR }: {
  svgKey: string; pathD: string; teamColor?: string; dur?: number;
}) {
  const skin = PROJECTILE_SKINS[svgKey] || PROJECTILE_SKINS.proj_classic;
  const color = skin.spark || teamColor || "#F4A130";
  const trailDelays = Array.from({ length: skin.trail }, (_, i) => (skin.trail - 1 - i) * (0.16 / Math.max(1, skin.trail - 1)));
  const glowId = `projGlow-${svgKey}-${teamColor ? teamColor.replace("#", "") : "x"}`;
  const ShapeComp = PROJECTILE_SHAPES[svgKey];

  return (
    <>
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor={teamColor || "#F4A130"} />
          <stop offset="100%" stopColor={teamColor || "#F4A130"} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Đuôi vệt — số lượng/màu theo skin */}
      {trailDelays.map((delay, di) => {
        const trailColor = skin.spark === "rainbow" ? PROJECTILE_RAINBOW[di % PROJECTILE_RAINBOW.length] : color;
        return (
          <circle key={di} r={(2.6 - di * 0.35) * skin.coreScale} fill={trailColor} opacity={0.85 - di * 0.12}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${delay}s`} path={pathD} />
          </circle>
        );
      })}

      {ShapeComp ? (
        <g>
          <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={pathD} rotate={skin.rotate === "point" ? "auto" : undefined} />
          <g transform={`scale(${skin.coreScale * 0.55})`}>
            {skin.rotate === "spin" && (
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.45s" repeatCount="indefinite" additive="sum" />
            )}
            {skin.rotate === "wobble" && (
              <animateTransform attributeName="transform" type="rotate" values="-22;22;-22" dur="0.35s" repeatCount="indefinite" additive="sum" />
            )}
            <ShapeComp />
          </g>
        </g>
      ) : (
        <>
          <circle r={5.5 * skin.coreScale} fill={`url(#${glowId})`}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={pathD} />
          </circle>
          <circle r={2.4 * skin.coreScale} fill="#fff" opacity={0.9}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={pathD} />
          </circle>
        </>
      )}
    </>
  );
}

export function ProjectilePreview({ svgKey, size = 64 }: { svgKey: string; size?: number }) {
  const pathD = `M 4 ${size - 8} Q ${size / 2} 4 ${size - 4} ${size - 8}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={pathD} fill="none" stroke="#F4A130" strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="3 4" />
      <ProjectileBall svgKey={svgKey} pathD={pathD} teamColor="#F4A130" dur={1.4} />
    </svg>
  );
}
