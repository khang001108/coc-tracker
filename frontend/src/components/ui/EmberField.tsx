"use client";

/** Hiệu ứng tia lửa bay lên — trang trí nền, không cần ảnh, dùng chung cho các
 * trang muốn không khí "chiến trường" (Đăng nhập, Cửa hàng, War...). */
export function EmberField({ count = 18, speed = 1 }: { count?: number; speed?: number }) {
  const particles = Array.from({ length: count }, (_, i) => {
    const left = ((i * 37 + 13) % 100);
    const delay = (i % 11) * (0.45 / speed);
    const duration = (3.5 + (i % 4) * 0.7) / speed;
    const drift = (i % 2 === 0 ? 1 : -1) * (6 + (i % 5) * 7);
    const size = 2.5 + (i % 4) * 0.8;
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
