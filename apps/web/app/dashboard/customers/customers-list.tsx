'use client';

import Link from 'next/link';
import { useCustomers } from '@/hooks/use-customers';
import { EmptyState } from '@/components/empty-state';
import { useDashboard } from '../dashboard-context';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const EMAIL_STATUS_STYLES: Record<string, string> = {
  valid: 'border border-border text-muted',
  invalid: 'bg-rose-50 text-rose-700 border border-rose-200',
  complained: 'bg-rose-50 text-rose-700 border border-rose-200',
  unsubscribed: 'bg-amber-50 text-amber-700 border border-amber-200',
};

function StatusPill({ status }: { status: string }) {
  const cls = EMAIL_STATUS_STYLES[status] ?? 'border border-border text-muted';
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {status}
    </span>
  );
}

function SkeletonRows() {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block h-4 w-40 animate-pulse rounded bg-zinc-200/80" />
            <span className="block h-3 w-56 animate-pulse rounded bg-zinc-200/80" />
          </div>
          <span className="hidden h-4 w-24 animate-pulse rounded bg-zinc-200/80 sm:block" />
          <span className="hidden h-5 w-16 animate-pulse rounded bg-zinc-200/80 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function CustomersList() {
  const { location } = useDashboard();
  const locationId = location?.id ?? '';
  const { data: customers, isPending, error } = useCustomers(locationId);
  const requestsHref = `/dashboard/requests?location=${locationId}`;

  if (!location) return null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Customers</h1>
          {customers && customers.length > 0 && (
            <span className="font-mono text-sm text-faint">{customers.length}</span>
          )}
        </div>
        {customers && customers.length > 0 && (
          <Link
            href={requestsHref}
            className="tactile rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
          >
            Request reviews
          </Link>
        )}
      </div>

      <div className="mt-6">
        {error ? (
          <div className="rounded-card border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Couldn&apos;t load customers. {error.message}
          </div>
        ) : isPending ? (
          <SkeletonRows />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers yet"
            description="Customers show up here once you've requested a review from them."
            action={
              <Link
                href={requestsHref}
                className="tactile rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
              >
                Request a review
              </Link>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-card border border-border bg-surface divide-y divide-border">
            {customers.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-ink">{c.name ?? '—'}</p>
                  <p className="truncate font-mono text-sm text-muted">{c.email}</p>
                </div>
                <div className="text-sm text-muted sm:w-40 sm:shrink-0">
                  {c.phone ?? <span className="text-faint">—</span>}
                </div>
                <div className="sm:w-24 sm:shrink-0">
                  <StatusPill status={c.emailStatus} />
                </div>
                <div className="hidden text-xs text-faint sm:block sm:w-20 sm:shrink-0">
                  {c.importSource}
                </div>
                <div className="hidden text-xs text-faint sm:block sm:w-28 sm:shrink-0">
                  {dateFmt.format(new Date(c.importedAt))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
