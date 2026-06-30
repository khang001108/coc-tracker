"use client";

/** Hiệu ứng pháo hoa nổ — nhiều cụm tia bắn toả tròn rồi mờ dần, lặp lại.
 * Dùng cho banner trang Sự kiện. */
export function FireworkField({ bursts = 3 }: { bursts?: number }) {
  const colors = ["#F4A130", "#ec4899", "#22c55e", "#3b82f6", "#FFD700", "#a855f7"];

  function Burst({ cx, cy, delay, scale }: { cx: number; cy: number; delay: number; scale: number }) {
    const rays = Array.from({ length: 10 });
    return (
      <>
        <span className="absolute rounded-full" style={{
          left: `${cx}%`, top: `${cy}%`, width: 6, height: 6,
          background: "#fff", animation: `firework-flash 2.8s ease-out infinite`, animationDelay: `${delay}s`,
        }} />
        {rays.map((_, i) => {
          const angle = (i / rays.length) * Math.PI * 2;
          const dist = 26 * scale;
          const dx = Math.cos(angle) * dist;
          const dy = Math.sin(angle) * dist;
          return (
            <span key={i} className="absolute rounded-full"
              style={{
                left: `${cx}%`, top: `${cy}%`, width: 3, height: 3,
                background: colors[i % colors.length],
                boxShadow: `0 0 4px 1px ${colors[i % colors.length]}aa`,
                animation: "firework-burst 2.8s ease-out infinite",
                animationDelay: `${delay}s`,
                ["--fw-x" as any]: `${dx}px`,
                ["--fw-y" as any]: `${dy}px`,
              }} />
          );
        })}
      </>
    );
  }

  const positions = Array.from({ length: bursts }, (_, i) => ({
    cx: 15 + ((i * 67) % 70),
    cy: 20 + ((i * 41) % 50),
    delay: i * 1.1,
    scale: 0.8 + (i % 3) * 0.3,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {positions.map((p, i) => <Burst key={i} {...p} />)}
    </div>
  );
}
