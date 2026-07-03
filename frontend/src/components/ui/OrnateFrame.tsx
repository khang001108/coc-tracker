/**
 * Khung viền hoa văn vàng kiểu cổ điển (góc uốn lượn) — dùng cho các khung
 * đặc biệt (mô tả clan, banner sự kiện...) để trông sang trọng hơn viền
 * thường. Vẽ bằng SVG (không dùng ảnh raster) nên luôn nét dù phóng to.
 */
function Corner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={`absolute w-8 h-8 md:w-10 md:h-10 pointer-events-none ${className || ""}`}>
      <defs>
        <linearGradient id="ornateGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="45%" stopColor="#F4A130" />
          <stop offset="100%" stopColor="#B8731A" />
        </linearGradient>
      </defs>
      <path d="M2 2 H30 M2 2 V30" stroke="url(#ornateGold)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M2 14 C 2 6, 6 2, 14 2" stroke="url(#ornateGold)" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity={0.85} />
      <path d="M2 22 C 10 22, 14 18, 14 10 C 14 18, 18 22, 26 22" stroke="url(#ornateGold)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity={0.75} />
      <circle cx="14" cy="10" r="1.8" fill="#FFD700" />
      <circle cx="2" cy="2" r="2.2" fill="#FFD700" />
    </svg>
  );
}

export function OrnateFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Corner className="-top-1.5 -left-1.5" />
      <Corner className="-top-1.5 -right-1.5 -scale-x-100" />
      <Corner className="-bottom-1.5 -left-1.5 -scale-y-100" />
      <Corner className="-bottom-1.5 -right-1.5 -scale-x-100 -scale-y-100" />
      {children}
    </div>
  );
}
