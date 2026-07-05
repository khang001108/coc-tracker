/**
 * Icon đồng Coin vàng lấp lánh — vẽ bằng SVG (không dùng emoji 🪙 vì mỗi máy/
 * font hiển thị khác nhau, có máy ra hình huy chương, có máy ra đồng xu, rất
 * lộn xộn). Dùng icon này thống nhất ở MỌI nơi hiển thị Coins trong app.
 */
export function CoinIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  const id = "coinGrad";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={{ display: "inline-block", verticalAlign: "-3px" }}>
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFF6D0" />
          <stop offset="45%" stopColor="#FFD700" />
          <stop offset="80%" stopColor="#F4A130" />
          <stop offset="100%" stopColor="#B8731A" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill={`url(#${id})`} stroke="#8B5A0F" strokeWidth="0.6" />
      <circle cx="12" cy="12" r="7.6" fill="none" stroke="#B8731A" strokeWidth="0.8" opacity={0.55} />
      <text x="12" y="16.2" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#8B5A0F" fontFamily="Arial, sans-serif">₵</text>
      {/* Lấp lánh */}
      <path d="M6.5 6.2 L7.3 8 L9 8.3 L7.3 8.6 L6.5 10.4 L5.8 8.6 L4.1 8.3 L5.8 8 Z" fill="#FFFDE8" opacity={0.9} />
      <circle cx="17" cy="7.3" r="0.9" fill="#FFFDE8" opacity={0.85} />
    </svg>
  );
}
