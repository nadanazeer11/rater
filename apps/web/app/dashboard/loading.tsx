function Bar({ className }: { className: string }) {
  return <span className={`block animate-pulse rounded bg-zinc-200/80 ${className}`} />;
}

/** Content-area fallback. The persistent dashboard layout (sidebar + header)
 *  stays painted around this while a sub-page loads — no full-page flash. */
export default function DashboardContentLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <Bar className="h-8 w-48" />
      <div className="overflow-hidden rounded-card border border-border bg-surface divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-5 py-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Bar className="h-4 w-40" />
              <Bar className="h-3 w-56" />
            </div>
            <Bar className="hidden h-4 w-24 sm:block" />
            <Bar className="hidden h-7 w-7 rounded-full sm:block" />
          </div>
        ))}
      </div>
    </main>
  );
}
