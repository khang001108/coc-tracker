/**
 * HeroArt — SVG minh hoạ trang trí cho các hero section
 * Thiết kế CoC-inspired, dùng màu cam/vàng hoà với theme.
 */

/** Hai cây kiếm chéo (War) — lưỡi kiếm nhọn, chắn tay chữ thập, cán nắm */
export function SwordsArt({ size = 120, opacity = 0.18 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity }} aria-hidden>
      {/* ── Kiếm trái (xoay -38°) ── */}
      <g transform="rotate(-38 50 50)">
        {/* Lưỡi kiếm — nhọn ở đầu */}
        <polygon points="50,4 53,62 50,65 47,62" fill="#F4A130"/>
        <polygon points="50,4 52,40 50,44 48,40" fill="#FFD700" opacity={0.7}/>
        {/* Chắn tay chữ thập */}
        <rect x="38" y="62" width="24" height="5" rx="2.5" fill="#B8731A"/>
        <rect x="48" y="57" width="4" height="14" rx="2" fill="#B8731A"/>
        {/* Cán nắm */}
        <rect x="47" y="67" width="6" height="16" rx="3" fill="#8B5A1E"/>
        {/* Đầu cán */}
        <ellipse cx="50" cy="84" rx="5" ry="3.5" fill="#B8731A"/>
      </g>
      {/* ── Kiếm phải (xoay +38°) ── */}
      <g transform="rotate(38 50 50)">
        <polygon points="50,4 53,62 50,65 47,62" fill="#F4A130"/>
        <polygon points="50,4 52,40 50,44 48,40" fill="#FFD700" opacity={0.7}/>
        <rect x="38" y="62" width="24" height="5" rx="2.5" fill="#B8731A"/>
        <rect x="48" y="57" width="4" height="14" rx="2" fill="#B8731A"/>
        <rect x="47" y="67" width="6" height="16" rx="3" fill="#8B5A1E"/>
        <ellipse cx="50" cy="84" rx="5" ry="3.5" fill="#B8731A"/>
      </g>
      {/* Sao vàng trung tâm */}
      <polygon points="50,39 51.8,44.5 57.5,44.5 53,48 54.8,53.5 50,50 45.2,53.5 47,48 42.5,44.5 48.2,44.5"
        fill="#FFD700" opacity={0.95}/>
    </svg>
  );
}

/** Khiên chiến (War/Clan) */
export function ShieldArt({ size = 110, opacity = 0.18 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity }} aria-hidden>
      <path d="M50 8 L85 22 L85 55 Q85 78 50 92 Q15 78 15 55 L15 22 Z"
        fill="#F4A130" stroke="#FFD700" strokeWidth="2"/>
      <path d="M50 16 L78 27 L78 54 Q78 73 50 84 Q22 73 22 54 L22 27 Z"
        fill="#B8731A" opacity={0.6}/>
      {/* Chữ thập */}
      <rect x="46" y="28" width="8" height="36" rx="2" fill="#FFD700" opacity={0.85}/>
      <rect x="30" y="44" width="40" height="8" rx="2" fill="#FFD700" opacity={0.85}/>
    </svg>
  );
}

/** Cúp vàng (Sự kiện) */
export function TrophyArt({ size = 110, opacity = 0.18 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity }} aria-hidden>
      {/* Thân cúp */}
      <path d="M32 18 L68 18 L62 58 Q55 70 50 72 Q45 70 38 58 Z"
        fill="#F4A130"/>
      {/* Tay cầm trái */}
      <path d="M32 22 Q18 22 18 38 Q18 50 32 50" fill="none" stroke="#F4A130" strokeWidth="6" strokeLinecap="round"/>
      {/* Tay cầm phải */}
      <path d="M68 22 Q82 22 82 38 Q82 50 68 50" fill="none" stroke="#F4A130" strokeWidth="6" strokeLinecap="round"/>
      {/* Đế */}
      <rect x="40" y="72" width="20" height="6" rx="2" fill="#B8731A"/>
      <rect x="34" y="78" width="32" height="6" rx="3" fill="#8B5A1E"/>
      {/* Sao */}
      <polygon points="50,28 52.5,35 60,35 54,39.5 56,46 50,42 44,46 46,39.5 40,35 47.5,35"
        fill="#FFD700"/>
      {/* Shine */}
      <ellipse cx="42" cy="30" rx="3" ry="6" fill="white" opacity={0.2} transform="rotate(-20 42 30)"/>
    </svg>
  );
}

/** Lâu đài (Shop) */
export function CastleArt({ size = 120, opacity = 0.18 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity }} aria-hidden>
      {/* Tường chính */}
      <rect x="15" y="45" width="70" height="45" rx="2" fill="#F4A130"/>
      {/* Tháp trái */}
      <rect x="12" y="30" width="22" height="60" rx="2" fill="#D4821A"/>
      {/* Tháp phải */}
      <rect x="66" y="30" width="22" height="60" rx="2" fill="#D4821A"/>
      {/* Cổng */}
      <path d="M42 90 L42 65 Q50 58 58 65 L58 90 Z" fill="#1A0A00" opacity={0.6}/>
      {/* Răng cưa tháp trái */}
      {[12,17,22,27].map((x,i) => <rect key={i} x={x} y="22" width="3" height="10" rx="1" fill="#B8731A"/>)}
      {/* Răng cưa tháp phải */}
      {[66,71,76,81].map((x,i) => <rect key={i} x={x} y="22" width="3" height="10" rx="1" fill="#B8731A"/>)}
      {/* Cờ */}
      <line x1="23" y1="22" x2="23" y2="8" stroke="#8B5A1E" strokeWidth="1.5"/>
      <polygon points="23,8 32,12 23,16" fill="#F4A130"/>
      <line x1="77" y1="22" x2="77" y2="8" stroke="#8B5A1E" strokeWidth="1.5"/>
      <polygon points="77,8 68,12 77,16" fill="#F4A130"/>
      {/* Cửa sổ */}
      <rect x="20" y="38" width="8" height="8" rx="1" fill="#FFD700" opacity={0.5}/>
      <rect x="72" y="38" width="8" height="8" rx="1" fill="#FFD700" opacity={0.5}/>
      <rect x="30" y="52" width="8" height="8" rx="1" fill="#FFD700" opacity={0.4}/>
      <rect x="62" y="52" width="8" height="8" rx="1" fill="#FFD700" opacity={0.4}/>
    </svg>
  );
}

/** Huy hiệu clan / khiên thành viên */
export function ClanBadgeArt({ size = 110, opacity = 0.18 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity }} aria-hidden>
      {/* Khiên ngoài */}
      <path d="M50 6 L88 20 L88 52 Q88 78 50 94 Q12 78 12 52 L12 20 Z"
        fill="#F4A130" stroke="#FFD700" strokeWidth="1.5"/>
      <path d="M50 14 L80 25 L80 51 Q80 72 50 86 Q20 72 20 51 L20 25 Z"
        fill="#D4821A" opacity={0.7}/>
      {/* 2 kiếm chéo nhỏ */}
      <g transform="translate(50,50) rotate(-30)">
        <rect x="-2" y="-22" width="4" height="28" rx="1.5" fill="#FFD700"/>
        <rect x="-6" y="5" width="12" height="3" rx="1" fill="#B8731A"/>
      </g>
      <g transform="translate(50,50) rotate(30)">
        <rect x="-2" y="-22" width="4" height="28" rx="1.5" fill="#FFD700"/>
        <rect x="-6" y="5" width="12" height="3" rx="1" fill="#B8731A"/>
      </g>
      {/* Sao giữa */}
      <polygon points="50,40 51.8,45.5 57.5,45.5 53,49 54.8,54.5 50,51 45.2,54.5 47,49 42.5,45.5 48.2,45.5"
        fill="#FFD700"/>
    </svg>
  );
}

/** Gold coin / Raid */
export function GoldCoinArt({ size = 110, opacity = 0.18 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity }} aria-hidden>
      {/* Đồng xu chính */}
      <circle cx="50" cy="46" r="34" fill="#F4A130" stroke="#FFD700" strokeWidth="3"/>
      <circle cx="50" cy="46" r="27" fill="#D4821A" opacity={0.6}/>
      <text x="50" y="53" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#FFD700" fontFamily="serif">G</text>
      {/* Shine */}
      <ellipse cx="38" cy="33" rx="5" ry="9" fill="white" opacity={0.15} transform="rotate(-25 38 33)"/>
      {/* Đồng xu phụ phía sau */}
      <ellipse cx="68" cy="64" rx="16" ry="16" fill="#B8731A" stroke="#F4A130" strokeWidth="2"/>
      <ellipse cx="33" cy="68" rx="12" ry="12" fill="#C8851A" stroke="#F4A130" strokeWidth="1.5"/>
      {/* Tia sáng */}
      {[0,45,90,135,180,225,270,315].map((angle, i) => {
        const r = Math.PI * angle / 180;
        const x1 = 50 + Math.cos(r) * 36;
        const y1 = 46 + Math.sin(r) * 36;
        const x2 = 50 + Math.cos(r) * 42;
        const y2 = 46 + Math.sin(r) * 42;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFD700" strokeWidth="1.5" opacity={0.6}/>;
      })}
    </svg>
  );
}
