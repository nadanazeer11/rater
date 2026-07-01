'use client';

import Link from 'next/link';
import { useCampaigns } from '@/hooks/use-campaigns';
import { EmptyState } from '@/components/empty-state';
import { useDashboard } from '../dashboard-context';
import { CreateCampaignButton } from './create-campaign-dialog';
import { CampaignPerformance } from './campaign-performance';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function DefaultPill() {
  return (
    <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">
      Default
    </span>
  );
}

function SkeletonRows() {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface divide-y divide-border">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-4">
          <span className="block h-4 w-40 flex-1 animate-pulse rounded bg-zinc-200/80" />
          <span className="hidden h-4 w-16 animate-pulse rounded bg-zinc-200/80 sm:block" />
          <span className="hidden h-4 w-24 animate-pulse rounded bg-zinc-200/80 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function CampaignsList() {
  const { location } = useDashboard();
  const locationId = location?.id ?? '';
  const { data: campaigns, isPending, error } = useCampaigns(locationId);

  if (!location) return null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Campaigns</h1>
          {campaigns && campaigns.length > 0 && (
            <span className="font-mono text-sm text-faint">{campaigns.length}</span>
          )}
        </div>
        <CreateCampaignButton locationId={locationId} />
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        A campaign is the email a customer gets when you request a review — its
        wording, plus any follow-up reminders. New requests use your most recently
        created campaign by default; you can pick a different one when you create a
        request.
      </p>

      <div className="mt-6">
        {error ? (
          <div className="rounded-card border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Couldn&apos;t load campaigns. {error.message}
          </div>
        ) : isPending ? (
          <SkeletonRows />
        ) : campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="Create one to set the wording of your review-request emails."
            action={<CreateCampaignButton locationId={locationId} />}
          />
        ) : (
          <div className="overflow-hidden rounded-card border border-border bg-surface divide-y divide-border">
            {campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/campaigns/${c.id}?location=${locationId}`}
                className="flex flex-col gap-2 px-5 py-3.5 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <p className="truncate text-[15px] font-medium text-ink">{c.name}</p>
                  {c.isDefault && <DefaultPill />}
                </div>
                <div className="text-sm text-muted sm:w-24 sm:shrink-0">
                  {c.stepCount} {c.stepCount === 1 ? 'step' : 'steps'}
                </div>
                <div className="text-sm text-muted sm:w-32 sm:shrink-0">
                  {c.requestCount} {c.requestCount === 1 ? 'request' : 'requests'}
                </div>
                <div className="hidden text-xs text-faint sm:block sm:w-28 sm:shrink-0">
                  {dateFmt.format(new Date(c.createdAt))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {campaigns && campaigns.length > 0 && <CampaignPerformance />}
    </main>
  );
}
