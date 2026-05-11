function Bar({ className }: { className: string }) {
  return <span className={`block animate-pulse rounded bg-zinc-200/80 ${className}`} />;
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 px-5 py-5">
          <div className="space-y-2.5">
            <Bar className="h-4 w-44" />
            <Bar className="h-3 w-60" />
            <Bar className="h-3 w-28" />
          </div>
          <Bar className="h-5 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}
