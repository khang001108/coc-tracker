"use client";

const EMBER_COLORS: Record<string, { grad: string; shadow: string }> = {
  gold:   { grad: "radial-gradient(circle, #FFED8A, #F4A130 55%, #FF6A00 100%)", shadow: "0 0 8px 2px rgba(255,140,0,0.9), 0 0 3px 1px #FFD700" },
  blue:   { grad: "radial-gradient(circle, #C9F0FF, #4FC3F7 55%, #0288D1 100%)", shadow: "0 0 8px 2px rgba(79,195,247,0.9), 0 0 3px 1px #B3E5FC" },
  purple: { grad: "radial-gradient(circle, #E9D5FF, #A855F7 55%, #6D28D9 100%)", shadow: "0 0 8px 2px rgba(168,85,247,0.9), 0 0 3px 1px #D8B4FE" },
  pink:   { grad: "radial-gradient(circle, #FFD6EC, #EC4899 55%, #BE185D 100%)", shadow: "0 0 8px 2px rgba(236,72,153,0.9), 0 0 3px 1px #FBCFE8" },
};

/** Hiệu ứng tia lửa bay lên — trang trí nền, không cần ảnh, dùng chung cho các
 * trang muốn không khí "chiến trường" (Đăng nhập, Cửa hàng, War...). Màu tia
 * lửa đổi được trong Cài đặt (vàng/xanh/tím/hồng), mặc định vàng lửa. */
export function EmberField({
  count = 18,
  speed = 1,
  distributed = false,   // true = xuất phát từ nhiều độ cao (dùng cho card dài)
  color = "gold",
}: {
  count?: number;
  speed?: number;
  distributed?: boolean;
  color?: "gold" | "blue" | "purple" | "pink";
}) {
  const c = EMBER_COLORS[color] || EMBER_COLORS.gold;
  const particles = Array.from({ length: count }, (_, i) => {
    const left     = ((i * 37 + 13) % 100);
    const delay    = (i % 11) * (0.5 / speed);
    const duration = (3.8 + (i % 5) * 0.6) / speed;
    const drift    = (i % 2 === 0 ? 1 : -1) * (6 + (i % 5) * 7);
    const size     = 2.5 + (i % 4) * 0.8;
    // distributed: một nửa xuất phát từ giữa card (bottom 30-70%), nửa còn lại từ cuối
    const bottom   = distributed ? `${(i % 3 === 0 ? 0 : i % 3 === 1 ? 30 : 55)}%` : "0";
    return { left, delay, duration, drift, size, key: i, bottom };
  });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {particles.map(p => (
        <span key={p.key} className="ember-particle"
          style={{
            left: `${p.left}%`,
            bottom: p.bottom,
            width: p.size, height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            background: c.grad,
            boxShadow: c.shadow,
            ["--ember-drift" as any]: `${p.drift}px`,
          }} />
      ))}
    </div>
  );
}
