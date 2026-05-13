function Bar({ className }: { className: string }) {
  return <span className={`block animate-pulse rounded bg-zinc-200/80 ${className}`} />;
}

export default function CampaignsLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <Bar className="h-8 w-44" />
      <Bar className="h-4 w-96 max-w-full" />
      <div className="overflow-hidden rounded-card border border-border bg-surface divide-y divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-5 py-4">
            <Bar className="h-4 w-44 flex-1" />
            <Bar className="hidden h-4 w-16 sm:block" />
            <Bar className="hidden h-4 w-20 sm:block" />
            <Bar className="hidden h-3 w-24 sm:block" />
          </div>
        ))}
      </div>
    </main>
  );
}
