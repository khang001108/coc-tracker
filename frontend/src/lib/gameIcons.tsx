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
      {/* Thân lâu đài — đá be tròn trịa kiểu chibi */}
      <rect x="6" y="15" width="22" height="16" rx="3" fill="#E8C88A" stroke="#A9752F" strokeWidth="1.2" />
      <rect x="6" y="15" width="22" height="5" rx="2.5" fill="#F5DFAE" />
      {/* 2 tháp tròn 2 bên */}
      <circle cx="8" cy="13" r="4.2" fill="#D9A85C" stroke="#A9752F" strokeWidth="1.1" />
      <circle cx="26" cy="13" r="4.2" fill="#D9A85C" stroke="#A9752F" strokeWidth="1.1" />
      <path d="M8 6 L10.4 10.5 L5.6 10.5 Z" fill="#4C7FE0" stroke="#2E56A8" strokeWidth="0.8" />
      <path d="M26 6 L28.4 10.5 L23.6 10.5 Z" fill="#4C7FE0" stroke="#2E56A8" strokeWidth="0.8" />
      {/* Nóc chóp chính giữa */}
      <path d="M17 2 L22 11 L12 11 Z" fill="#6B93F0" stroke="#2E56A8" strokeWidth="1" />
      <circle cx="17" cy="4.2" r="1.2" fill="#FFD700" />
      {/* Cửa sổ tròn dễ thương */}
      <circle cx="11" cy="21" r="2" fill="#2B3A55" />
      <circle cx="11.7" cy="20.3" r="0.6" fill="#8FB4FF" />
      <circle cx="23" cy="21" r="2" fill="#2B3A55" />
      <circle cx="23.7" cy="20.3" r="0.6" fill="#8FB4FF" />
      {/* Cổng chính bo tròn */}
      <path d="M13 31 L13 25 C13 22.2 21 22.2 21 25 L21 31 Z" fill="#8B5A2B" stroke="#5C3A1A" strokeWidth="1" />
      <rect x="16.2" y="26.5" width="1.6" height="2.2" rx="0.8" fill="#FFD700" />
    </svg>
  );
}

/** Khung lâu đài chibi dùng chung — mỗi biến thể chỉ đổi màu + phụ kiện
 * riêng (sừng, băng, ngôi sao...) để nhìn đồng bộ phong cách tròn trịa dễ
 * thương, thay vì mỗi cái 1 kiểu hình đa giác góc cạnh như trước. */
function ChibiCastleBase({ wall, wallLight, wallDark, roof, roofDark, accent, door, decoration }: {
  wall: string; wallLight: string; wallDark: string; roof: string; roofDark: string; accent: string; door: string; decoration?: React.ReactNode;
}) {
  return (
    <>
      <rect x="6" y="15" width="22" height="16" rx="3" fill={wall} stroke={wallDark} strokeWidth="1.2" />
      <rect x="6" y="15" width="22" height="5" rx="2.5" fill={wallLight} />
      <circle cx="8" cy="13" r="4.2" fill={wall} stroke={wallDark} strokeWidth="1.1" />
      <circle cx="26" cy="13" r="4.2" fill={wall} stroke={wallDark} strokeWidth="1.1" />
      <path d="M8 6 L10.4 10.5 L5.6 10.5 Z" fill={roof} stroke={roofDark} strokeWidth="0.8" />
      <path d="M26 6 L28.4 10.5 L23.6 10.5 Z" fill={roof} stroke={roofDark} strokeWidth="0.8" />
      <path d="M17 2 L22 11 L12 11 Z" fill={roof} stroke={roofDark} strokeWidth="1" />
      <circle cx="17" cy="4.2" r="1.2" fill={accent} />
      <circle cx="11" cy="21" r="2" fill="#2B3A55" />
      <circle cx="11.7" cy="20.3" r="0.6" fill={accent} opacity={0.85} />
      <circle cx="23" cy="21" r="2" fill="#2B3A55" />
      <circle cx="23.7" cy="20.3" r="0.6" fill={accent} opacity={0.85} />
      <path d="M13 31 L13 25 C13 22.2 21 22.2 21 25 L21 31 Z" fill={door} stroke={wallDark} strokeWidth="1" />
      <rect x="16.2" y="26.5" width="1.6" height="2.2" rx="0.8" fill={accent} />
      {decoration}
    </>
  );
}

function CastleRound({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <ChibiCastleBase wall="#D9A85C" wallLight="#F5DFAE" wallDark="#A9752F" roof="#7ED0A0" roofDark="#3E9C6A" accent="#FFD700" door="#8B5A2B"
        decoration={<>
          <circle cx="8" cy="6.5" r="1.6" fill="#7ED0A0" stroke="#3E9C6A" strokeWidth="0.6" />
          <circle cx="26" cy="6.5" r="1.6" fill="#7ED0A0" stroke="#3E9C6A" strokeWidth="0.6" />
        </>} />
    </svg>
  );
}

function CastleFortress({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <ChibiCastleBase wall="#B0B8C4" wallLight="#DDE3EA" wallDark="#6B7684" roof="#7A8698" roofDark="#4A5563" accent="#FFD700" door="#5C4A32"
        decoration={
          [4, 9, 14, 19, 24, 29].map((x, i) => (
            <rect key={i} x={x - 3} y="1" width="3.6" height="4" fill="#8A96A6" stroke="#4A5563" strokeWidth="0.5" />
          ))
        } />
    </svg>
  );
}

function CastleRoyal({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <ChibiCastleBase wall="#F0DDB0" wallLight="#FFF3D6" wallDark="#C7A24E" roof="#6B93F0" roofDark="#2E56A8" accent="#FFD700" door="#8B5A2B"
        decoration={<path d="M14 0 L15.5 3 L17 0.5 L18.5 3 L20 0 L19.3 4.2 L14.7 4.2 Z" fill="#FFD700" stroke="#C7961F" strokeWidth="0.4" />} />
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
  castle_grand:     CastleGrand,
  castle_ruins:     CastleRuins,   // không bán trong Shop nữa — chỉ dùng để hiện "vỡ vụn" khi phòng thủ mất trọn 3 sao
  castle_straw:     CastleStraw,
  castle_shack:     CastleShack,
};

// ── Pháo (nòng súng xoay khi đã bắn) ─────────────────────────────────────

function CannonBasic({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.6 : 1}>
      {/* Bệ pháo tròn trịa */}
      <ellipse cx="11" cy="17.5" rx="7" ry="3" fill={fired ? "#5C5C5C" : "#6B4A21"} />
      <circle cx="11" cy="14.5" r="6.4" fill={fired ? "#8A8A8A" : "#D9A85C"} stroke={fired ? "#4A4A4A" : "#A9752F"} strokeWidth="1.1" />
      <circle cx="9" cy="12.5" r="2" fill={fired ? "#9A9A9A" : "#F5DFAE"} opacity={0.7} />
      <g className={fired ? undefined : "cannon-spin-fast"} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        {/* Nòng pháo mập mạp, đầu nòng tròn */}
        <rect x="8" y="1.5" width="6" height="11" rx="3" fill={fired ? "#5C5C5C" : "#3B4B63"} stroke={fired ? "#3A3A3A" : "#1F2937"} strokeWidth="0.8" />
        <circle cx="11" cy="3" r="3.4" fill={fired ? "#4A4A4A" : "#2B3A55"} stroke={fired ? "#2A2A2A" : "#111827"} strokeWidth="0.8" />
        <circle cx="11" cy="3" r="1.6" fill={fired ? "#2A2A2A" : "#0B0F19"} />
        {!fired && <circle cx="9.8" cy="1.9" r="0.8" fill="#8FB4FF" opacity={0.8} />}
      </g>
    </svg>
  );
}

/** Khung pháo chibi dùng chung — mập mạp tròn trịa, chỉ đổi màu theo biến thể. */
function ChibiCannonBase({ fired, base, baseDark, body, bodyDark, barrel, barrelDark, muzzle, decoration }: {
  fired?: boolean; base: string; baseDark: string; body: string; bodyDark: string; barrel: string; barrelDark: string; muzzle: string; decoration?: React.ReactNode;
}) {
  return (
    <>
      <ellipse cx="11" cy="17.5" rx="7" ry="3" fill={fired ? "#5C5C5C" : baseDark} />
      <circle cx="11" cy="14.5" r="6.4" fill={fired ? "#8A8A8A" : body} stroke={fired ? "#4A4A4A" : bodyDark} strokeWidth="1.1" />
      <circle cx="9" cy="12.5" r="2" fill={fired ? "#9A9A9A" : base} opacity={0.7} />
      <g className={fired ? undefined : "cannon-spin-fast"} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        <rect x="8" y="1.5" width="6" height="11" rx="3" fill={fired ? "#5C5C5C" : barrel} stroke={fired ? "#3A3A3A" : barrelDark} strokeWidth="0.8" />
        <circle cx="11" cy="3" r="3.4" fill={fired ? "#4A4A4A" : barrelDark} stroke={fired ? "#2A2A2A" : "#111827"} strokeWidth="0.8" />
        <circle cx="11" cy="3" r="1.6" fill={fired ? "#2A2A2A" : "#0B0F19"} />
        {!fired && <circle cx="9.8" cy="1.9" r="0.8" fill={muzzle} opacity={0.85} />}
        {!fired && decoration}
      </g>
    </>
  );
}

function CannonDouble({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.6 : 1}>
      <ellipse cx="11" cy="17.5" rx="8" ry="3" fill={fired ? "#5C5C5C" : "#6B4A21"} />
      <circle cx="11" cy="14.5" r="6.6" fill={fired ? "#8A8A8A" : "#E4A857"} stroke={fired ? "#4A4A4A" : "#A9752F"} strokeWidth="1.1" />
      <g className={fired ? undefined : "cannon-spin-fast"} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        <rect x="4.5" y="2" width="4.5" height="11" rx="2.2" fill={fired ? "#5C5C5C" : "#3B4B63"} stroke={fired ? "#3A3A3A" : "#1F2937"} strokeWidth="0.7" />
        <rect x="13" y="2" width="4.5" height="11" rx="2.2" fill={fired ? "#5C5C5C" : "#3B4B63"} stroke={fired ? "#3A3A3A" : "#1F2937"} strokeWidth="0.7" />
        <circle cx="6.75" cy="3" r="2.5" fill={fired ? "#4A4A4A" : "#2B3A55"} />
        <circle cx="15.25" cy="3" r="2.5" fill={fired ? "#4A4A4A" : "#2B3A55"} />
        {!fired && <><circle cx="6" cy="2.2" r="0.6" fill="#8FB4FF" /><circle cx="14.5" cy="2.2" r="0.6" fill="#8FB4FF" /></>}
      </g>
    </svg>
  );
}
function CannonTurret({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.6 : 1}>
      <rect x="2.5" y="13" width="17" height="6.5" rx="2.5" fill={fired ? "#8A8A8A" : "#8B93A3"} stroke={fired ? "#4A4A4A" : "#525C6B"} strokeWidth="1" />
      <ChibiCannonBase fired={fired} base="#F5DFAE" baseDark="#6B4A21" body="#D9A85C" bodyDark="#A9752F" barrel="#3B4B63" barrelDark="#2B3A55" muzzle="#8FB4FF" />
    </svg>
  );
}
function CannonMythic({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.6 : 1}>
      <ChibiCannonBase fired={fired} base="#FFF3D0" baseDark="#8B5A0F" body="#FFD700" bodyDark="#C7961F" barrel="#B8860B" barrelDark="#7A5A0A" muzzle="#FFF3D0"
        decoration={<circle cx="11" cy="-1.5" r="1.4" fill="#FFF3D0" />} />
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
      <ChibiCastleBase wall="#E8A87C" wallLight="#F7D3B8" wallDark="#A85C2E" roof="#E4482E" roofDark="#9C2A16" accent="#FFD700" door="#7A3A1A"
        decoration={<>
          <path d="M6 6 L4 1 L8 5 Z" fill="#FFD700" />
          <path d="M28 6 L30 1 L26 5 Z" fill="#FFD700" />
          <path d="M4 20 Q1 25 4 28" stroke="#FFD700" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M30 20 Q33 25 30 28" stroke="#FFD700" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </>} />
    </svg>
  );
}

function CastleIce({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <ChibiCastleBase wall="#BFE3FF" wallLight="#EAF7FF" wallDark="#5FA8D9" roof="#8FCFFF" roofDark="#3E8FC7" accent="#E0F4FF" door="#4A7FA8"
        decoration={<>
          <path d="M11 15 L9.5 19 L12.5 19 Z" fill="#EAF7FF" opacity={0.9} />
          <path d="M23 15 L21.5 19 L24.5 19 Z" fill="#EAF7FF" opacity={0.9} />
          <path d="M17 11 L15.6 15 L18.4 15 Z" fill="#EAF7FF" opacity={0.9} />
        </>} />
    </svg>
  );
}

function CastleShadow({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <ChibiCastleBase wall="#7C3FA8" wallLight="#B885E0" wallDark="#4A1F6B" roof="#3A1854" roofDark="#1F0D30" accent="#C8A2FF" door="#2E1440"
        decoration={<>
          <circle cx="17" cy="4.2" r="2.4" fill="#C8A2FF" opacity={0.35} />
          <circle cx="8" cy="21" r="0.9" fill="#C8A2FF" opacity={0.7} />
          <circle cx="26" cy="21" r="0.9" fill="#C8A2FF" opacity={0.7} />
        </>} />
    </svg>
  );
}

function CastleCelestial({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <ChibiCastleBase wall="#FFEBB0" wallLight="#FFFAE8" wallDark="#D9A83C" roof="#FFD700" roofDark="#C7961F" accent="#FFFFFF" door="#B8860B"
        decoration={<>
          <path d="M17 -1 L18 2 L21 2.3 L18.6 4 L19.4 7 L17 5.3 L14.6 7 L15.4 4 L13 2.3 L16 2 Z" fill="#FFFFFF" opacity={0.9} />
          <circle cx="4" cy="18" r="0.7" fill="#FFFFFF" opacity={0.8} />
          <circle cx="30" cy="18" r="0.7" fill="#FFFFFF" opacity={0.8} />
        </>} />
    </svg>
  );
}

/** Đại Thành Đồ Sộ — 5 tháp, thân rộng hơn hẳn, viewBox rộng hơn để nhồi
 * thêm chi tiết, tạo cảm giác hoành tráng khác biệt hẳn các lâu đài kia. */
function CastleGrand({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 34">
      <rect x="3" y="16" width="34" height="16" rx="2.5" fill="#D9A85C" stroke="#8B5A2B" strokeWidth="1.2" />
      <rect x="3" y="16" width="34" height="4.5" rx="2" fill="#F5DFAE" />
      {[5, 13.5, 20, 26.5, 33].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={i === 2 ? 8 : 13} r={i === 2 ? 5.4 : 4} fill="#C48A4D" stroke="#8B5A2B" strokeWidth="1" />
          <path d={`M${x} ${i === 2 ? 0 : 6} L${x + (i === 2 ? 3.4 : 2.6)} ${i === 2 ? 8 : 13} L${x - (i === 2 ? 3.4 : 2.6)} ${i === 2 ? 8 : 13} Z`}
            fill={i === 2 ? "#4C7FE0" : "#6B93F0"} stroke="#2E56A8" strokeWidth="0.7" />
          <circle cx={x} cy={i === 2 ? 1.5 : 7} r="0.9" fill="#FFD700" />
          <rect x={x - (i === 2 ? 3 : 1.5)} y={i === 2 ? -3.5 : -1} width="0.8" height={i === 2 ? 4 : 2.5} fill="#B71C1C" opacity={i % 2 === 0 ? 1 : 0} />
        </g>
      ))}
      <circle cx="14" cy="21.5" r="1.8" fill="#2B3A55" />
      <circle cx="26" cy="21.5" r="1.8" fill="#2B3A55" />
      <path d="M17 32 L17 25 C17 22 23 22 23 25 L23 32 Z" fill="#8B5A2B" stroke="#5C3A1A" strokeWidth="1" />
      <rect x="19.3" y="27" width="1.4" height="2" rx="0.6" fill="#FFD700" />
    </svg>
  );
}

/** Phế Tích Cổ — tường vỡ lởm chởm, thiếu mái, dây leo xanh mọc lên,
 * màu đá xám rêu mốc thay vì tường vàng nguyên vẹn. */
function CastleRuins({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <path d="M6 15 L28 15 L27 21 L30 22 L29 31 L5 31 L6 21 L4 20 Z" fill="#9CA3AF" stroke="#5B6472" strokeWidth="1.1" />
      <path d="M6 15 L10 11 L9 16 L14 12 L13 16 L19 10 L18 16 L23 12 L22 16 L28 15 L27 18 L6 18 Z" fill="#B0B8C4" />
      <circle cx="8" cy="14" r="3.2" fill="#8B93A3" stroke="#5B6472" strokeWidth="1" opacity={0.9} />
      <path d="M11 9 L11 13" stroke="#5B6472" strokeWidth="1" />
      <circle cx="11" cy="20.5" r="1.7" fill="#1F2937" />
      <path d="M3 19 C2 23 3.5 26 3 30" stroke="#4ADE80" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M3 19 C4.5 22 2.5 25 4 28" stroke="#4ADE80" strokeWidth="1" fill="none" strokeLinecap="round" opacity={0.8} />
      <circle cx="3" cy="19.5" r="0.9" fill="#4ADE80" />
      <path d="M14 31 L15 24 C15 22 20 22 20 24 L20.5 31 Z" fill="#7A8698" stroke="#4A5563" strokeWidth="1" />
      <path d="M15.5 24 L19.5 27" stroke="#4A5563" strokeWidth="0.6" />
    </svg>
  );
}

/** Nhà Tranh Mộc — nhà gỗ nhỏ mái rơm mộc mạc, hoàn toàn khác kiểu lâu đài
 * đá — rẻ nhất, hợp làm lựa chọn "khởi đầu" giá phải chăng. */
function CastleStraw({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <rect x="7" y="17" width="20" height="14" rx="1.5" fill="#B8895A" stroke="#7A5230" strokeWidth="1.1" />
      {[19, 22, 25, 28].map((y, i) => <line key={i} x1="7" y1={y} x2="27" y2={y} stroke="#7A5230" strokeWidth="0.5" opacity={0.6} />)}
      <path d="M4 17 L17 6 L30 17 Z" fill="#E3B84A" stroke="#A9752F" strokeWidth="1.1" />
      {[0,1,2,3,4,5,6].map(i => (
        <line key={i} x1={6 + i * 3.6} y1={16.4 - Math.abs(i - 3) * 1.6} x2={5 + i * 3.6} y2="17.6" stroke="#C89638" strokeWidth="1" strokeLinecap="round" />
      ))}
      <rect x="20" y="8" width="2.4" height="5" fill="#8B93A3" />
      <ellipse cx="21.2" cy="6.5" rx="1.6" ry="1" fill="#D9D9D9" opacity={0.7} />
      <circle cx="12" cy="22" r="1.9" fill="#4A3520" />
      <circle cx="12.6" cy="21.3" r="0.5" fill="#FFE8B8" />
      <path d="M18 31 L18 25.5 C18 23.5 24 23.5 24 25.5 L24 31 Z" fill="#7A5230" stroke="#4A3520" strokeWidth="1" />
    </svg>
  );
}

/** Túp Lều Xiêu Vẹo — nhà gỗ tồi tàn, xiêu vẹo, vá chằng vá đụp — khác hẳn
 * Nhà Tranh Mộc (còn nguyên vẹn, mái rơm gọn gàng): cái này méo mó, ọp ẹp. */
function CastleShack({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <path d="M6 30 L7 17 L26 15.5 L27 30 Z" fill="#8B7355" stroke="#5B4A2A" strokeWidth="1" />
      <rect x="12" y="19" width="4" height="3.4" fill="#6B5A3A" opacity={0.7} />
      <rect x="19" y="21" width="3.6" height="3" fill="#6B5A3A" opacity={0.6} />
      <path d="M4 17.5 L16.5 8 L29 16 L28.6 18.5 L16.3 11 L5 19.5 Z" fill="#9C8A6A" stroke="#5B4A2A" strokeWidth="0.9" />
      <line x1="9" y1="15.3" x2="10.5" y2="17.6" stroke="#5B4A2A" strokeWidth="0.6" />
      <line x1="20" y1="13.5" x2="21.5" y2="16" stroke="#5B4A2A" strokeWidth="0.6" />
      <circle cx="11" cy="24.5" r="1.7" fill="#2B2118" />
      <path d="M11 22.8 L11 26.2 M9.4 24.5 L12.6 24.5" stroke="#5B4A2A" strokeWidth="0.4" opacity={0.6} />
      <path d="M18 30 L18.4 24.5 C18.4 23 22.6 23 22.6 24.5 L23 30 Z" fill="#5B4A2A" stroke="#3A2E18" strokeWidth="0.8" />
    </svg>
  );
}

// ── Pháo Mới ─────────────────────────────────────────────────────────────

function CannonLaser({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.6 : 1}>
      <ChibiCannonBase fired={fired} base="#CFF7FF" baseDark="#0E7FA8" body="#3FD4FF" bodyDark="#0E9FCC" barrel="#0E6E8F" barrelDark="#063E52" muzzle="#CFF7FF" />
    </svg>
  );
}

function CannonStorm({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.6 : 1}>
      <ChibiCannonBase fired={fired} base="#E8D4FF" baseDark="#5B2D8A" body="#A855F7" bodyDark="#6B21A8" barrel="#4A1F6B" barrelDark="#2E1447" muzzle="#E8D4FF"
        decoration={<>
          {!fired && <path d="M3 8 L1 6.5 L3.4 6.2 Z" fill="#E8D4FF" />}
          {!fired && <path d="M19 8 L21 6.5 L18.6 6.2 Z" fill="#E8D4FF" />}
        </>} />
    </svg>
  );
}

function CannonDragon({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.6 : 1}>
      <ChibiCannonBase fired={fired} base="#FFD9BF" baseDark="#9C2A16" body="#FF6B35" bodyDark="#C7451F" barrel="#B7391A" barrelDark="#7A2410" muzzle="#FFD700"
        decoration={<>
          <path d="M8 2.5 L6.5 -1 L9.5 1.5 Z" fill="#FFD700" />
          <path d="M14 2.5 L15.5 -1 L12.5 1.5 Z" fill="#FFD700" />
        </>} />
    </svg>
  );
}

function CannonCelestial({ fired, size = 22 }: { fired?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" opacity={fired ? 0.6 : 1}>
      <ChibiCannonBase fired={fired} base="#FFFAE8" baseDark="#C7961F" body="#FFD700" bodyDark="#D9A83C" barrel="#F4A130" barrelDark="#B8730F" muzzle="#FFFFFF"
        decoration={<path d="M11 -2 L11.6 -0.4 L13.2 -0.2 L12 0.9 L12.4 2.5 L11 1.7 L9.6 2.5 L10 0.9 L8.8 -0.2 L10.4 -0.4 Z" fill="#FFFFFF" />} />
    </svg>
  );
}

// ── Exports ───────────────────────────────────────────────────────────────

/** Icon lâu đài trong War map — màu cam, float animation, TH number ở giữa */
/* ── Pháo Đài Di Động (Mortal Engines) ─────────────────────────────────────
 * Thay vì lâu đài + pháo tách rời, đây là 1 KHỐI DUY NHẤT: thân bọc giáp có
 * bánh xích di chuyển, 2 pháo tháp gắn LIỀN 2 bên hông (không phải icon nổi
 * rời), cầu chỉ huy + ăng-ten + ống khói ở giữa — đúng kiểu thành phố di
 * động bọc thép. Palette màu theo lâu đài đã trang bị để vẫn phân biệt được
 * các loại, nhưng cấu trúc cơ khí dùng chung 1 khung cho đồng bộ. */
const MECH_PALETTES: Record<string, { hull: string; hullDark: string; plate: string; accent: string; light: string }> = {
  castle_classic:   { hull: "#C9A876", hullDark: "#7A5A32", plate: "#A9865A", accent: "#FFD700", light: "#FFF3D0" },
  castle_round:     { hull: "#8FBFA0", hullDark: "#4A7A5C", plate: "#6FA080", accent: "#FFD700", light: "#E8FFF0" },
  castle_fortress:  { hull: "#9AA3B0", hullDark: "#4A5563", plate: "#7A8494", accent: "#FFD700", light: "#DDE3EA" },
  castle_royal:     { hull: "#D9C48A", hullDark: "#8A6A2E", plate: "#B89A5C", accent: "#4C7FE0", light: "#FFF8E0" },
  castle_dragon:    { hull: "#C9705A", hullDark: "#7A2E1A", plate: "#A85238", accent: "#FFD700", light: "#FFD9C4" },
  castle_ice:       { hull: "#8FCBE8", hullDark: "#3E7A9C", plate: "#6FAECC", accent: "#E0F4FF", light: "#EAF7FF" },
  castle_shadow:    { hull: "#6B4A8C", hullDark: "#2E1747", plate: "#523A6E", accent: "#C8A2FF", light: "#D9C2FF" },
  castle_celestial: { hull: "#E0C458", hullDark: "#8A6A1E", plate: "#C7A83C", accent: "#FFFFFF", light: "#FFFAE0" },
  castle_cat:       { hull: "#E8B87A", hullDark: "#8A5A2E", plate: "#C99A5C", accent: "#FF6B9C", light: "#FFE8D0" },
  castle_tiger:     { hull: "#E89A4A", hullDark: "#8A4A0E", plate: "#C97A2C", accent: "#2B2118", light: "#FFE8C0" },
  castle_panda:     { hull: "#D9D9D9", hullDark: "#5B5B5B", plate: "#B0B0B0", accent: "#2B2118", light: "#F5F5F5" },
  castle_grand:     { hull: "#C9A876", hullDark: "#7A5A32", plate: "#A9865A", accent: "#B71C1C", light: "#FFF3D0" },
  castle_straw:     { hull: "#B8895A", hullDark: "#5B3A1A", plate: "#96723F", accent: "#E3B84A", light: "#F0D9AE" },
  castle_shack:     { hull: "#8B7355", hullDark: "#3A2E18", plate: "#6B5A3A", accent: "#5B4A2A", light: "#B8A488" },
};

/** 1 tháp pháo gắn liền vào thân — sáng/hoạt động hoặc xám xịt/hỏng tuỳ theo
 * số sao đã bị mất khi phòng thủ. */
function MechTurret({ x, damaged, accent }: { x: number; damaged: boolean; accent: string }) {
  const barrelColor = damaged ? "#4A4A4A" : "#2B3A55";
  const capColor = damaged ? "#6B6B6B" : accent;
  return (
    <g transform={`translate(${x} 0)`} opacity={damaged ? 0.55 : 1}>
      <rect x="-3.2" y="-2" width="6.4" height="6" rx="1.4" fill={damaged ? "#8A8A8A" : "#5B6472"} stroke={damaged ? "#4A4A4A" : "#2B3A55"} strokeWidth="0.6" />
      <rect x="-1.4" y="-7" width="2.8" height="6" rx="1.2" fill={barrelColor} stroke="#111827" strokeWidth="0.5" />
      <circle cx="0" cy="-7" r="1.5" fill={capColor} opacity={damaged ? 0.6 : 0.95} />
      {damaged && <path d="M-2 1 L1 -1.5 M-1 2 L2 0" stroke="#2B2118" strokeWidth="0.5" opacity={0.6} />}
    </g>
  );
}

export function MechFortress({ svgKey, cannon1Damaged, cannon2Damaged, wrecked, size = 46 }: {
  svgKey?: string | null; cannon1Damaged?: boolean; cannon2Damaged?: boolean; wrecked?: boolean; size?: number;
}) {
  const p = MECH_PALETTES[svgKey || "castle_classic"] || MECH_PALETTES.castle_classic;
  if (wrecked) {
    return (
      <svg width={size} height={size * 0.74} viewBox="0 0 46 34">
        {/* Bánh xích */}
        <rect x="4" y="27" width="38" height="5" rx="2" fill="#3A3A3E" />
        {[8, 15, 22, 29, 36].map((x, i) => <circle key={i} cx={x} cy="29.5" r="2.1" fill="#1F1F22" />)}
        {/* Thân đổ nát, mảng giáp vỡ lệch */}
        <path d="M8 27 L7 17 L18 15 L17 22 L26 13 L27 20 L38 17 L37 27 Z" fill="#6B6B6B" stroke="#3A3A3E" strokeWidth="1" />
        <path d="M18 15 L20 10 L23 14" fill="none" stroke="#4A4A4A" strokeWidth="1" />
        <circle cx="20" cy="20" r="1.6" fill="#1F2937" />
        <path d="M4 20 C2 24 3.5 27 3 30" stroke="#4ADE80" strokeWidth="1" fill="none" strokeLinecap="round" opacity={0.7} />
        {/* Pháo gãy rơi 2 bên */}
        <rect x="4" y="24" width="4" height="1.8" rx="0.6" fill="#4A4A4A" transform="rotate(25 4 24)" />
        <rect x="38" y="25" width="4" height="1.8" rx="0.6" fill="#4A4A4A" transform="rotate(-20 38 25)" />
        {/* Khói */}
        <circle cx="22" cy="9" r="2.6" fill="#8A8A8A" opacity={0.5} />
        <circle cx="25" cy="6" r="2" fill="#9A9A9A" opacity={0.4} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size * 0.74} viewBox="0 0 46 34">
      {/* Bánh xích di chuyển ở đáy */}
      <rect x="4" y="27" width="38" height="5" rx="2" fill="#3A3A3E" stroke="#1F1F22" strokeWidth="0.6" />
      {[8, 15, 22, 29, 36].map((x, i) => <circle key={i} cx={x} cy="29.5" r="2.1" fill="#1F1F22" stroke="#0D0D0F" strokeWidth="0.4" />)}

      {/* Thân bọc giáp chính */}
      <path d="M7 27 L7 17 C7 15.5 9 15 10.5 15 L35.5 15 C37 15 39 15.5 39 17 L39 27 Z" fill={p.hull} stroke={p.hullDark} strokeWidth="1.1" />
      {/* Mảng giáp + đinh tán */}
      <rect x="10" y="18" width="8" height="6" rx="0.8" fill={p.plate} opacity={0.8} />
      <rect x="28" y="18" width="8" height="6" rx="0.8" fill={p.plate} opacity={0.8} />
      {[11, 17.5, 28.5, 35].map((x, i) => <circle key={i} cx={x} cy="19" r="0.5" fill={p.hullDark} />)}

      {/* Cầu chỉ huy giữa */}
      <path d="M17 15 L19 9 L27 9 L29 15 Z" fill={p.plate} stroke={p.hullDark} strokeWidth="0.9" />
      <rect x="20.5" y="10.5" width="5" height="3" fill="#0B0F19" opacity={0.85} />
      <rect x="21.3" y="11" width="1.4" height="1.4" fill={p.light} opacity={0.8} />

      {/* Ăng-ten + đèn nháy */}
      <line x1="23" y1="9" x2="23" y2="4" stroke={p.hullDark} strokeWidth="0.8" />
      <circle cx="23" cy="3.2" r="1.1" fill={p.accent} />

      {/* Ống khói nhỏ bên phải cầu chỉ huy */}
      <rect x="30.5" y="10" width="2.4" height="5" rx="0.6" fill={p.hullDark} />
      <ellipse cx="31.7" cy="9" rx="1.6" ry="1" fill="#B0B0B0" opacity={0.6} />

      {/* Cửa/khe nhỏ trên thân */}
      <rect x="20" y="21" width="6" height="4" rx="1" fill="#1F2937" />
      <rect x="21.2" y="21.8" width="1.2" height="1.2" fill={p.light} opacity={0.8} />

      {/* 2 tháp pháo gắn liền 2 bên hông — tối màu nếu mất sao phòng thủ */}
      <MechTurret x={4.5} damaged={!!cannon1Damaged} accent={p.accent} />
      <MechTurret x={41.5} damaged={!!cannon2Damaged} accent={p.accent} />
    </svg>
  );
}

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
export function CannonIcon({ svgKey, fired, broken, size }: {
  svgKey?: string | null; fired?: boolean; broken?: boolean; size?: number;
}) {
  ensureStyles();
  const Comp = CANNON_COMPONENTS[svgKey || "cannon_basic"] || CannonBasic;
  return (
    <div style={{ position: "relative", animation: fired || broken ? undefined : "cannon-glow 2s ease-in-out infinite" }}>
      <Comp fired={fired || broken} size={size} />
      {broken && size && (
        <svg width={size} height={size} viewBox="0 0 22 22" style={{ position: "absolute", inset: 0 }}>
          {/* Vết nứt + khói — báo hiệu pháo phòng thủ này đã "hỏng" vì mất sao, rõ ràng hơn hẳn chỉ tối màu */}
          <path d="M7 8 L10 12 L8 14 L11 17" stroke="#1F2937" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity={0.85} />
          <circle cx="14" cy="5" r="2" fill="#6B6B6B" opacity={0.7} />
          <circle cx="16.5" cy="2.5" r="1.4" fill="#8A8A8A" opacity={0.55} />
        </svg>
      )}
    </div>
  );
}

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
  proj_throwdart:  { rotate: "spin",   trail: 2, spark: "#FF5A5A", coreScale: 1,   label: "Phi Tiêu" },
  proj_pan:        { rotate: "spin",   trail: 2, spark: "#9AA5B1", coreScale: 1.2, label: "Chảo Bay" },
  proj_bread:      { rotate: "wobble", trail: 2, spark: "#E3A857", coreScale: 1.2, label: "Bánh Mì" },
  proj_lollipop:   { rotate: "wobble", trail: 3, spark: "#FF5A8A", coreScale: 1.1, label: "Kẹo Mút" },
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
      {/* Mũi hướng +X (phải) — để rotate="auto" tự xoay đúng theo hướng bay */}
      <path d="M9 0 C6 -3 1 -3.5 -4 -2.5 L-4 2.5 C1 3.5 6 3 9 0 Z" fill="#E7E9EE" stroke="#8B93A3" strokeWidth="0.6" />
      <path d="M9 0 C6.5 -1.6 3.5 -2 1 -1.6 L1 1.6 C3.5 2 6.5 1.6 9 0 Z" fill="#FF5A36" />
      <circle cx="2.5" cy="0" r="1.3" fill="#7DD3FC" stroke="#38BDF8" strokeWidth="0.5" />
      <path d="M-2 -2.5 L-5.5 -5 L-4.3 -2 Z" fill="#FF5A36" />
      <path d="M-2 2.5 L-5.5 5 L-4.3 2 Z" fill="#FF5A36" />
      <path d="M-4 -1.6 C-6.5 -1.2 -8.5 0 -8.5 0 C-8.5 0 -6.5 1.2 -4 1.6 Z" fill="#FFB300" />
    </g>
  );
}
function ShapeDragon() {
  const bodyA = "M -13 0 C -9.5 -4 -6 4 -2.5 0 C 0.5 -4 4 4 7.5 0 C 9.5 -2.4 11 -1 12.5 0";
  const bodyB = "M -13 0 C -9.5 4 -6 -4 -2.5 0 C 0.5 4 4 -4 7.5 0 C 9.5 2.4 11 1 12.5 0";
  return (
    <g>
      {/* Thân rồng dài uốn lượn kiểu rồng châu Á — nhấp nháy giữa 2 dáng sóng để tạo cảm giác uốn éo khi bay */}
      <path d={bodyA} fill="none" stroke="#B71C1C" strokeWidth="3.8" strokeLinecap="round">
        <animate attributeName="d" values={`${bodyA};${bodyB};${bodyA}`} dur="0.6s" repeatCount="indefinite" />
      </path>
      <path d={bodyA} fill="none" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round" opacity={0.8}>
        <animate attributeName="d" values={`${bodyA};${bodyB};${bodyA}`} dur="0.6s" repeatCount="indefinite" />
      </path>
      {/* Vảy vàng dọc thân */}
      {[-9, -5, -1, 3, 7].map((x, i) => (
        <circle key={i} cx={x} cy={i % 2 === 0 ? -1.5 : 1.5} r="0.9" fill="#FFD700" opacity={0.85} />
      ))}
      {/* Đầu rồng ở đầu +X (theo hướng bay) */}
      <g>
        <ellipse cx="13.5" cy="0" rx="2.8" ry="2.2" fill="#B71C1C" />
        <path d="M15 -1.6 L17.8 -3.4 L15.8 -0.6 Z" fill="#FFD700" />
        <path d="M15 1.6 L17.8 3.4 L15.8 0.6 Z" fill="#FFD700" />
        <circle cx="14.4" cy="-0.7" r="0.55" fill="#FFEB3B" />
        <path d="M12.6 1.2 C11 1.8 9.8 1.2 9.2 0.8" stroke="#FFD700" strokeWidth="0.4" fill="none" strokeLinecap="round" />
        {/* Lửa phun ra từ miệng */}
        <path d="M16.2 0.6 L20.5 1.8 L17 0.9 Z" fill="#FFB300" opacity={0.9} />
        <path d="M16.2 -0.2 L21.5 0 L17 0.3 Z" fill="#FF5A36" opacity={0.9} />
      </g>
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
      {/* Lưỡi dao mảnh, nhọn 2 cạnh */}
      <path d="M0 -10 L1.6 -1 L0 3 L-1.6 -1 Z" fill="#D9E2EC" stroke="#52606D" strokeWidth="0.5" />
      <path d="M0 -10 L0.5 -1 L0 2 Z" fill="#F0F4F8" />
      <line x1="0" y1="-8" x2="0" y2="-1.5" stroke="#9AA5B1" strokeWidth="0.35" />
      {/* Chắn tay (crossguard) */}
      <rect x="-3.4" y="3" width="6.8" height="1.3" rx="0.5" fill="#B8860B" stroke="#6B4A00" strokeWidth="0.3" />
      {/* Chuôi cầm */}
      <rect x="-1" y="4.3" width="2" height="5" rx="0.9" fill="#5C3A21" />
      <circle cx="0" cy="9.5" r="1.2" fill="#B8860B" />
    </g>
  );
}
function ShapeArrow() {
  return (
    <g>
      <path d="M9 0 L3.5 -2.6 L5 0 L3.5 2.6 Z" fill="#8BE28B" stroke="#166534" strokeWidth="0.4" />
      <rect x="-6" y="-0.6" width="10" height="1.2" fill="#B45309" />
      <path d="M-6 -0.6 L-9 -3 L-7.2 -0.6 Z" fill="#8BE28B" />
      <path d="M-6 0.6 L-9 3 L-7.2 0.6 Z" fill="#8BE28B" />
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

function ShapeThrowingDart() {
  return (
    <g>
      {/* Mũi kim loại nhọn hướng +X */}
      <path d="M9 0 L3 -1.3 L3 1.3 Z" fill="#9AA5B1" stroke="#52606D" strokeWidth="0.3" />
      <rect x="-3" y="-0.7" width="6" height="1.4" rx="0.6" fill="#374151" />
      {/* Cánh đuôi phi tiêu */}
      <path d="M-3 0 L-8 -3.4 L-4.5 -0.6 Z" fill="#FF5A5A" />
      <path d="M-3 0 L-8 3.4 L-4.5 0.6 Z" fill="#38BDF8" />
      <path d="M-3 0 L-9 0 L-4.5 0 Z" fill="#FFD700" />
    </g>
  );
}
function ShapePan() {
  return (
    <g>
      <circle cx="-1" cy="0" r="6.4" fill="#3A3A3E" stroke="#1C1C1E" strokeWidth="0.7" />
      <circle cx="-1" cy="0" r="4.6" fill="#57575C" />
      <ellipse cx="-2.6" cy="-2" rx="2" ry="1.1" fill="#7A7A80" opacity={0.7} />
      <rect x="5" y="-1" width="8.5" height="2" rx="1" fill="#6B4A21" />
      <circle cx="13" cy="0" r="1.1" fill="#3A2410" />
    </g>
  );
}
function ShapeBread() {
  return (
    <g>
      <path d="M-10 0 C-10 -3.6 -5 -5 0 -5 C6 -5 10 -3.4 10 0 C10 3.4 6 5 0 5 C-5 5 -10 3.6 -10 0 Z"
        fill="#E3A857" stroke="#A9682B" strokeWidth="0.6" />
      <path d="M-10 0 C-10 -3.6 -5 -5 0 -5 C6 -5 10 -3.4 10 0 C10 1 9.5 1.8 8.5 2.4 C7 -1.5 3 -3.6 0 -3.6 C-4 -3.6 -8 -1.6 -9.4 1.6 C-9.8 1 -10 0.6 -10 0 Z"
        fill="#F0C378" />
      {[-5, -1.5, 2, 5.5].map((x, i) => (
        <path key={i} d={`M${x} -4 C${x + 1.4} -2 ${x + 1.4} 2 ${x} 4`} stroke="#A9682B" strokeWidth="0.6" fill="none" strokeLinecap="round" />
      ))}
    </g>
  );
}
function ShapeLollipop() {
  return (
    <g>
      <rect x="-1" y="1" width="2" height="9" rx="1" fill="#F5F5F5" />
      <circle cx="0" cy="-3" r="6.5" fill="#FF5A8A" />
      <path d="M0 -3 m-6.5 0 A6.5 6.5 0 0 1 0 -9.5" fill="none" stroke="#FFD1DE" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="0" cy="-3" r="6.5" fill="none" stroke="#C2185B" strokeWidth="0.6" />
      <path d="M0 -3 C2 -5.5 4 -5.5 4.5 -3 C5 -0.8 3 1 0 -3" fill="#FFEB3B" opacity={0.9} />
      <path d="M-3.5 -6 C-1.5 -7 1 -6.5 2 -4.5" fill="none" stroke="#FF8FAB" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

const PROJECTILE_SHAPES: Record<string, () => JSX.Element> = {
  proj_rocket: ShapeRocket, proj_dragon: ShapeDragon, proj_cannonball: ShapeCannonball,
  proj_dart: ShapeDart, proj_arrow: ShapeArrow, proj_poop: ShapePoop,
  proj_fridge: ShapeFridge, proj_hammer: ShapeHammer, proj_scissors: ShapeScissors,
  proj_throwdart: ShapeThrowingDart, proj_pan: ShapePan, proj_bread: ShapeBread, proj_lollipop: ShapeLollipop,
};

/** Tia đạn dạng SPRITE THẬT (Craftpix, nhiều khung hình vẽ tay) — khác với
 * các Shape vẽ vector ở trên. Value = số khung hình trong sprite sheet. */
export const SPRITE_PROJECTILE_FRAMES: Record<string, number> = {
  proj_craft_waterball: 12, proj_craft_waterspell: 8, proj_craft_firespell: 8,
  proj_craft_waterarrow: 8, proj_craft_fireball: 8, proj_craft_firearrow: 8,
};

/** Icon tia đạn TĨNH, nhỏ — dùng làm biểu tượng "lượt đánh" (sáng = đã đánh,
 * mờ = chưa đánh) thay cho pháo trước đây — pháo giờ chuyển sang trang trí
 * lâu đài đại diện cho PHÒNG THỦ. */
export function ProjectileMiniIcon({ svgKey, fired, size = 14 }: { svgKey?: string; fired?: boolean; size?: number }) {
  const key = svgKey || "proj_classic";
  if (SPRITE_PROJECTILE_FRAMES[key]) {
    const frames = SPRITE_PROJECTILE_FRAMES[key];
    return (
      <div style={{
        width: size, height: size, overflow: "hidden", position: "relative",
        backgroundImage: `url(/art/projectiles/${key}.png)`,
        backgroundSize: `${frames * 100}% 100%`,
        opacity: fired ? 0.35 : 1,
        imageRendering: "pixelated",
        transform: "rotate(180deg)",
      }} />
    );
  }
  const ShapeComp = PROJECTILE_SHAPES[key];
  const skin = PROJECTILE_SKINS[key] || PROJECTILE_SKINS.proj_classic;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" opacity={fired ? 0.35 : 1}>
      <g transform="translate(10 10)">
        {ShapeComp ? (
          <g transform={`scale(${skin.coreScale * 0.85})`}><ShapeComp /></g>
        ) : (
          <circle r="4.5" fill={fired ? "#6B7280" : "#F4A130"} stroke="#8B5A0F" strokeWidth="0.6" />
        )}
      </g>
    </svg>
  );
}

export function ProjectileBall({ svgKey, pathD, teamColor, dur = PROJECTILE_DUR, begin = 0 }: {
  svgKey: string; pathD: string; teamColor?: string; dur?: number; begin?: number;
}) {
  // Tia đạn SPRITE THẬT (nhiều khung hình vẽ tay) — bay theo path như bình
  // thường nhưng thay vì Shape vector, dùng <image> đổi khung hình liên tục.
  // Ảnh gốc Craftpix vẽ mặc định hướng NGƯỢC (quay về bên trái) nên phải
  // xoay 180° cho quay đầu về phía trước, rồi dùng rotate="auto" để luôn
  // chỉa đúng theo hướng đang bay (path cong lên rồi xuống).
  if (SPRITE_PROJECTILE_FRAMES[svgKey]) {
    const frames = SPRITE_PROJECTILE_FRAMES[svgKey];
    const FRAME = 64, DISPLAY = 22;
    const xs = Array.from({ length: frames }, (_, i) => -FRAME * i);
    xs.push(0); // quay lại khung đầu để loop mượt
    const kt = Array.from({ length: frames + 1 }, (_, i) => (i / frames).toFixed(3)).join(";");
    return (
      <g opacity={0}>
        <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${begin}s`} path={pathD} rotate="auto" />
        <animate attributeName="opacity" from="0" to="1" dur="0.01s" begin={`${begin}s`} fill="freeze" />
        <svg x={-DISPLAY / 2} y={-DISPLAY / 2} width={DISPLAY} height={DISPLAY} viewBox={`0 0 ${FRAME} ${FRAME}`}
          style={{ overflow: "hidden" }} transform={`rotate(180 ${DISPLAY / 2} ${DISPLAY / 2})`}>
          <image href={`/art/projectiles/${svgKey}.png`} y="0" width={FRAME * frames} height={FRAME}>
            <animate attributeName="x" values={xs.join(";")} keyTimes={kt} calcMode="discrete" dur="0.6s" repeatCount="indefinite" begin={`${begin}s`} />
          </image>
        </svg>
      </g>
    );
  }

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
        const myBegin = begin + delay;
        const targetOpacity = 0.85 - di * 0.12;
        return (
          <circle key={di} r={(2.6 - di * 0.35) * skin.coreScale} fill={trailColor} opacity={0}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${myBegin}s`} path={pathD} />
            <animate attributeName="opacity" from="0" to={targetOpacity} dur="0.01s" begin={`${myBegin}s`} fill="freeze" />
          </circle>
        );
      })}

      {ShapeComp ? (
        <g opacity={0}>
          <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${begin}s`} path={pathD} rotate={skin.rotate === "point" ? "auto" : undefined} />
          <animate attributeName="opacity" from="0" to="1" dur="0.01s" begin={`${begin}s`} fill="freeze" />
          <g transform={`scale(${skin.coreScale * 0.85})`}>
            {skin.rotate === "spin" && (
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.45s" begin={`${begin}s`} repeatCount="indefinite" additive="sum" />
            )}
            {skin.rotate === "wobble" && (
              <animateTransform attributeName="transform" type="rotate" values="-22;22;-22" dur="0.35s" begin={`${begin}s`} repeatCount="indefinite" additive="sum" />
            )}
            <ShapeComp />
          </g>
        </g>
      ) : (
        <>
          <circle r={7 * skin.coreScale} fill={`url(#${glowId})`} opacity={0}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${begin}s`} path={pathD} />
            <animate attributeName="opacity" from="0" to="1" dur="0.01s" begin={`${begin}s`} fill="freeze" />
          </circle>
          <circle r={3 * skin.coreScale} fill="#fff" opacity={0}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${begin}s`} path={pathD} />
            <animate attributeName="opacity" from="0" to="0.9" dur="0.01s" begin={`${begin}s`} fill="freeze" />
          </circle>
        </>
      )}
    </>
  );
}

/* ── Hiệu ứng nổ khi đạn chạm đích (Cửa hàng) ──────────────────────────────
 * Miễn phí = nổ nhỏ, nhanh, gọn. Trả phí = nổ TO hơn, LÂU hơn, nhiều mảnh
 * hơn — đồng bộ đúng lúc đạn tới đích (dùng chung begin/dur với ProjectileBall). */
export const EXPLOSION_SKINS: Record<string, {
  label: string; colors: string[]; particles: number; shape: "circle" | "square" | "star" | "drop";
  burstDur: number; // thời gian nổ (giây) — ĐỘC LẬP với vòng lặp bay của đạn, để nổ đủ lâu nhìn thấy rõ
  scale: number; // độ toé xa/to của mảnh vỡ
}> = {
  exp_classic:    { label: "Nổ Cổ Điển",    colors: ["#FFD27A", "#FF5A36"],                                 particles: 6,  shape: "circle", burstDur: 0.6, scale: 1 },
  exp_fireworks:  { label: "Pháo Hoa",      colors: ["#FF5A5A", "#FFD700", "#4ADE80", "#38BDF8", "#A78BFA"], particles: 16, shape: "star",   burstDur: 1.5, scale: 1.6 },
  exp_trash:      { label: "Nổ Bãi Rác",    colors: ["#8B7355", "#6B4A21", "#9CA3AF", "#5B4A2A"],           particles: 10, shape: "square", burstDur: 1.0, scale: 1.3 },
  exp_snowflake:  { label: "Nổ Bông Tuyết", colors: ["#DFF6FF", "#BFE3FF", "#FFFFFF"],                       particles: 12, shape: "star",   burstDur: 1.2, scale: 1.3 },
  exp_splash:     { label: "Nổ Toé Nước",   colors: ["#38BDF8", "#7DD3FC", "#BFE3FF"],                       particles: 10, shape: "drop",   burstDur: 1.3, scale: 1.4 },
  exp_nuclear:    { label: "Nổ Hạt Nhân",   colors: ["#FFD700", "#FF8C00", "#FF3D00", "#6B7280"],           particles: 14, shape: "circle", burstDur: 1.9, scale: 2 },
  // Hiệu ứng nổ dạng SPRITE THẬT (10 khung hình vẽ tay, không phải mảnh vỡ SVG
  // ghép lại như trên) — cao cấp hơn, do Craftpix vẽ sẵn từng khung.
  exp_craft_fireball:   { label: "Nổ Cầu Lửa (Sprite)",  colors: [], particles: 0, shape: "circle", burstDur: 1.0, scale: 1 },
  exp_craft_smoke:      { label: "Nổ Khói (Sprite)",     colors: [], particles: 0, shape: "circle", burstDur: 1.0, scale: 1 },
  exp_craft_burst:      { label: "Nổ Bùng Nổ (Sprite)",  colors: [], particles: 0, shape: "circle", burstDur: 1.0, scale: 1 },
  exp_craft_shockwave:  { label: "Nổ Sóng Xung Kích (Sprite)", colors: [], particles: 0, shape: "circle", burstDur: 1.0, scale: 1 },
  exp_craft_inferno:    { label: "Nổ Địa Ngục Hoả (Sprite)",   colors: [], particles: 0, shape: "circle", burstDur: 1.0, scale: 1 },
};

const SPRITE_EXPLOSION_KEYS = new Set([
  "exp_craft_fireball", "exp_craft_smoke", "exp_craft_burst", "exp_craft_shockwave", "exp_craft_inferno",
]);

function ExplosionParticle({ shape, color, size }: { shape: string; color: string; size: number }) {
  if (shape === "square") return <rect x={-size / 2} y={-size / 2} width={size} height={size} fill={color} />;
  if (shape === "drop") return <path d={`M0 ${-size} C${size * 0.6} ${-size * 0.2} ${size * 0.4} ${size * 0.7} 0 ${size} C${-size * 0.4} ${size * 0.7} ${-size * 0.6} ${-size * 0.2} 0 ${-size}`} fill={color} />;
  if (shape === "star") return <path d={`M0 ${-size} L${size * 0.28} ${-size * 0.28} L${size} 0 L${size * 0.28} ${size * 0.28} L0 ${size} L${-size * 0.28} ${size * 0.28} L${-size} 0 L${-size * 0.28} ${-size * 0.28} Z`} fill={color} />;
  return <circle r={size} fill={color} />;
}

/** Tạo danh sách các mốc "begin" lặp lại cách nhau đúng 1 vòng bay của đạn
 * (cycleDur) — để hiệu ứng nổ tự có 1 vòng thời gian RIÊNG, không bị gò ép
 * nhét vừa vào phần đuôi của vòng bay đạn nữa (đây là lý do trước đây nổ
 * xong biến mất chỉ trong tích tắc, gần như không kịp nhìn thấy). */
function repeatBegins(begin: number, cycleDur: number, count = 120): string {
  const arr: string[] = [];
  for (let i = 0; i < count; i++) arr.push(`${(begin + i * cycleDur).toFixed(3)}s`);
  return arr.join(";");
}

/** Hiệu ứng nổ ở đúng điểm đạn chạm đích — bắt đầu đúng lúc đạn tới nơi (cuối
 * vòng bay), nhưng có THỜI LƯỢNG NỔ RIÊNG (burstDur) để đủ lâu nhìn thấy rõ,
 * không phụ thuộc vào việc vòng bay của đạn dài hay ngắn. Nuclear/Splash có
 * hình riêng (nấm/giọt nước), còn lại dùng chùm mảnh vỡ toé ra chung. */
export function ImpactExplosion({ svgKey, x, y, dur = PROJECTILE_DUR, begin = 0, burstDurOverride, firstBurstAtOverride }: {
  svgKey: string; x: number; y: number; dur?: number; begin?: number; burstDurOverride?: number; firstBurstAtOverride?: number;
}) {
  const exp = EXPLOSION_SKINS[svgKey] || EXPLOSION_SKINS.exp_classic;
  const burstDur = burstDurOverride ?? exp.burstDur;
  // Đạn chạm đích ngay khi vòng bay (dur) kết thúc — bắt đầu nổ đúng lúc đó,
  // rồi lặp lại đúng mỗi chu kỳ dur tiếp theo.
  const beginList = repeatBegins(begin + dur * (firstBurstAtOverride ?? 0.97), dur);
  const keyTimes = "0;0.06;0.5;1";

  // Nổ dạng SPRITE THẬT (10 khung hình vẽ tay ghép thành 1 dải ảnh ngang) —
  // dùng <image> SVG + animate "x" theo kiểu discrete để nhảy khung chính
  // xác, không mờ/nhoè như animate liên tục thông thường.
  if (SPRITE_EXPLOSION_KEYS.has(svgKey)) {
    const FRAME = 96, FRAMES = 10, DISPLAY = 34;
    const xs = Array.from({ length: FRAMES + 1 }, (_, i) => -FRAME * Math.min(i, FRAMES - 1));
    const kt = Array.from({ length: FRAMES + 1 }, (_, i) => (i / FRAMES).toFixed(3)).join(";");
    return (
      <g transform={`translate(${x} ${y})`}>
        <svg x={-DISPLAY / 2} y={-DISPLAY / 2} width={DISPLAY} height={DISPLAY} viewBox={`0 0 ${FRAME} ${FRAME}`} style={{ overflow: "hidden" }}>
          <image href={`/art/explosions/${svgKey}.png`} y="0" width={FRAME * FRAMES} height={FRAME} opacity={0}>
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.04;0.9;1" dur={`${burstDur}s`} begin={beginList} fill="freeze" />
            <animate attributeName="x" values={xs.join(";")} keyTimes={kt} calcMode="discrete" dur={`${burstDur}s`} begin={beginList} fill="freeze" />
          </image>
        </svg>
      </g>
    );
  }

  if (svgKey === "exp_nuclear") {
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle r="4" fill="none" stroke="#FF8C00" strokeWidth="1.4" opacity={0}>
          <animate attributeName="opacity" values="0;0.8;0.4;0" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
          <animate attributeName="r" values="2;20;26;26" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
        </circle>
        <rect x="-2.5" y="-14" width="5" height="14" opacity={0} fill="#8A8A8A">
          <animate attributeName="opacity" values="0;0.9;0.6;0" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
        </rect>
        <ellipse cx="0" cy="-15" rx="9" ry="6" opacity={0} fill="#FF8C00">
          <animate attributeName="opacity" values="0;0.95;0.7;0" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
          <animate attributeName="ry" values="1;6;7;7" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
        </ellipse>
        <ellipse cx="0" cy="-16" rx="6" ry="4" opacity={0} fill="#FFD700">
          <animate attributeName="opacity" values="0;0.95;0.6;0" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
        </ellipse>
        <circle r="8" fill="#FFD700" opacity={0}>
          <animate attributeName="opacity" values="0;1;0.5;0" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
          <animate attributeName="r" values="2;12;14;14" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
        </circle>
      </g>
    );
  }

  if (svgKey === "exp_splash") {
    const drops = Array.from({ length: exp.particles }, (_, i) => (360 / exp.particles) * i);
    return (
      <g transform={`translate(${x} ${y})`}>
        <ellipse rx="3" ry="1.5" fill="none" stroke="#38BDF8" strokeWidth="1.2" opacity={0}>
          <animate attributeName="opacity" values="0;0.8;0.3;0" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
          <animate attributeName="rx" values="2;16;20;20" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
          <animate attributeName="ry" values="1;7;9;9" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
        </ellipse>
        {drops.map((deg, i) => {
          const color = exp.colors[i % exp.colors.length];
          const dist = (10 + (i % 3) * 4) * exp.scale;
          const dx = Math.cos((deg * Math.PI) / 180) * dist * 0.6;
          const riseY = -dist * 0.9;
          const fallY = dist * 0.3;
          return (
            <g key={i} opacity={0}>
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.7;1" dur={`${burstDur}s`} begin={beginList} fill="freeze" />
              <animateTransform attributeName="transform" type="translate" values={`0 0;${dx} ${riseY};${dx * 1.3} ${fallY};${dx * 1.3} ${fallY}`} keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
              <ExplosionParticle shape="drop" color={color} size={2 - (i % 3) * 0.3} />
            </g>
          );
        })}
        <circle r="6" fill="#7DD3FC" opacity={0}>
          <animate attributeName="opacity" values="0;0.85;0.3;0" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
          <animate attributeName="r" values="2;8;3;3" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
        </circle>
      </g>
    );
  }

  const angles = Array.from({ length: exp.particles }, (_, i) => (360 / exp.particles) * i + (svgKey.length % 30));
  return (
    <g transform={`translate(${x} ${y})`}>
      {angles.map((deg, i) => {
        const color = exp.colors[i % exp.colors.length];
        const dist = (9 + (i % 3) * 3) * exp.scale;
        const dx = Math.cos((deg * Math.PI) / 180) * dist;
        const dy = Math.sin((deg * Math.PI) / 180) * dist;
        return (
          <g key={i} opacity={0}>
            <animate attributeName="opacity" values="0;1;0.5;0" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
            <animateTransform attributeName="transform" type="translate" values={`0 0;${dx} ${dy};${dx * 1.4} ${dy * 1.4};${dx * 1.4} ${dy * 1.4}`} keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
            <ExplosionParticle shape={exp.shape} color={color} size={(2.4 - (i % 3) * 0.4) * Math.min(exp.scale, 1.4)} />
          </g>
        );
      })}
      {/* Chớp sáng trung tâm */}
      <circle r="7" fill={exp.colors[0]} opacity={0}>
        <animate attributeName="opacity" values="0;0.9;0.4;0" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
        <animate attributeName="r" values="3;10;6;3" keyTimes={keyTimes} dur={`${burstDur}s`} begin={beginList} fill="freeze" />
      </circle>
    </g>
  );
}

export function ExplosionPreview({ svgKey, size = 64 }: { svgKey: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <ImpactExplosion svgKey={svgKey} x={size / 2} y={size / 2 + 10} dur={1.6} begin={0} firstBurstAtOverride={0.05} />
    </svg>
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
