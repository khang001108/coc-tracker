"use client";

/** Hiệu ứng tia lửa bay lên — trang trí nền, không cần ảnh, dùng chung cho các
 * trang muốn không khí "chiến trường" (Đăng nhập, Cửa hàng, War...). */
export function EmberField({ count = 18 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => {
    const left = ((i * 53) % 100);
    const delay = (i % 9) * 0.6;
    const duration = 4 + (i % 5) * 0.8;
    const drift = (i % 2 === 0 ? 1 : -1) * (8 + (i % 4) * 6);
    const size = 3 + (i % 3);
    return { left, delay, duration, drift, size, key: i };
  });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {particles.map(p => (
        <span key={p.key} className="ember-particle"
          style={{
            left: `${p.left}%`,
            width: p.size, height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--ember-drift" as any]: `${p.drift}px`,
          }} />
      ))}
    </div>
  );
}
