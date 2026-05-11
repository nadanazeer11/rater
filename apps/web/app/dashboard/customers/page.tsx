import Link from 'next/link';
import { redirect } from 'next/navigation';
import { fetchCustomers, fetchMe } from '@/lib/server-api';
import type { CustomerSummary } from '@rater/types';
import { EmptyState } from '@/components/empty-state';

type SearchParams = Promise<{ location?: string }>;

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

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const me = await fetchMe();
  if (!me) redirect('/sign-in');
  if (!me.onboarded) redirect('/dashboard');

  const { location: locationParam } = await searchParams;
  const selected =
    me.locations.find((l) => l.id === locationParam) ?? me.locations[0];
  if (!selected) redirect('/dashboard');
  const requestsHref = `/dashboard/requests?location=${selected.id}`;

  const customers: CustomerSummary[] = await fetchCustomers(selected.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Customers</h1>
          {customers.length > 0 && (
            <span className="font-mono text-sm text-faint">{customers.length}</span>
          )}
        </div>
        {customers.length > 0 && (
          <Link
            href={requestsHref}
            className="tactile rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
          >
            Request reviews
          </Link>
        )}
      </div>

      <div className="mt-6">
        {customers.length === 0 ? (
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
