import { Logo } from '@/components/logo';
import { SkeletonRows } from '@/components/skeleton-rows';

export default function DashboardLoading() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo className="text-base text-ink" />
          <span className="size-6 animate-pulse rounded-full bg-zinc-200" />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <span className="block h-8 w-40 animate-pulse rounded bg-zinc-200/80" />
        <div className="mt-6">
          <SkeletonRows count={3} />
        </div>
      </main>
    </div>
  );
}
