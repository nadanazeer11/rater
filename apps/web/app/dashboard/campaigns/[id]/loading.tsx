function Bar({ className }: { className: string }) {
  return <span className={`block animate-pulse rounded bg-zinc-200/80 ${className}`} />;
}

export default function CampaignEditorLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <Bar className="h-3 w-24" />
      <Bar className="h-10 w-80 max-w-full" />
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-card border border-border bg-surface p-5">
            <Bar className="h-4 w-32" />
            <Bar className="h-10 w-full" />
            <Bar className="h-28 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
