function Bar({ className }: { className: string }) {
  return <span className={`block animate-pulse rounded bg-zinc-200/80 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="hidden h-dvh w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface p-3 md:flex">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <span className="size-8 animate-pulse rounded-lg bg-zinc-200" />
          <Bar className="h-4 w-20" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Bar key={i} className="h-9 w-full" />
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <span className="size-7 animate-pulse rounded-full bg-zinc-200" />
          <Bar className="hidden h-4 w-40 sm:block" />
        </header>
        <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-8 sm:py-10">
          <div className="h-44 animate-pulse rounded-2xl bg-zinc-200/60" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-zinc-200/60" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
