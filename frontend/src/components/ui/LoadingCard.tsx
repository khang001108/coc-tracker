export function LoadingCards({ count = 3, height = "h-32" }: { count?: number; height?: string }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`card ${height} animate-pulse bg-gray-800`} />
      ))}
    </div>
  );
}

export function LoadingGrid({ cols = 4, height = "h-28" }: { cols?: number; height?: string }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${cols} gap-4`}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className={`card ${height} animate-pulse bg-gray-800`} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon = "🏰",
  title = "Không có dữ liệu",
  desc,
  action,
}: {
  icon?: string;
  title?: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card text-center py-14">
      <p className="text-5xl mb-3">{icon}</p>
      <p className="text-gray-300 font-semibold">{title}</p>
      {desc && <p className="text-sm text-gray-500 mt-1">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
