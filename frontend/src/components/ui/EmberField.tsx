"use client";

/** Hiệu ứng tia lửa bay lên — trang trí nền, không cần ảnh, dùng chung cho các
 * trang muốn không khí "chiến trường" (Đăng nhập, Cửa hàng, War...). */
export function EmberField({
  count = 18,
  speed = 1,
  distributed = false,   // true = xuất phát từ nhiều độ cao (dùng cho card dài)
}: {
  count?: number;
  speed?: number;
  distributed?: boolean;
}) {
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
            ["--ember-drift" as any]: `${p.drift}px`,
          }} />
      ))}
    </div>
  );
}
