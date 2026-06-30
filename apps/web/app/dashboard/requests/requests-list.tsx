'use client';

import { useState, type ReactNode } from 'react';
import type { DeliveryStatus, EngagementStatus, RequestSummary } from '@rater/types';
import { useRequests } from '@/hooks/use-requests';
import { useCampaigns } from '@/hooks/use-campaigns';
import { EmptyState } from '@/components/empty-state';
import { Stars } from '@/components/star-rating';
import { useDashboard } from '../dashboard-context';
import { RequestReviewButton } from './request-review-button';
import { RequestReviewsCsvButton } from './request-reviews-csv-button';
import { CopyLinkButton } from './copy-link-button';
import { RequestTimelineDrawer } from './request-timeline-drawer';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const EMERALD = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
const AMBER = 'bg-amber-50 text-amber-700 border border-amber-200';
const ROSE = 'bg-rose-50 text-rose-700 border border-rose-200';
const NEUTRAL = 'border border-border text-faint';

const DELIVERY_TONE: Record<DeliveryStatus, string> = {
  pending: NEUTRAL,
  sent: NEUTRAL,
  delivered: EMERALD,
  bounced: ROSE,
  complained: ROSE,
  failed: ROSE,
};

const ENGAGED: EngagementStatus[] = ['opened', 'link_clicked', 'landing_viewed'];

function Tag({ cls, children }: { cls: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

function StatusTags({ r }: { r: RequestSummary }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-faint">{r.campaignName}</span>
      <Tag cls={DELIVERY_TONE[r.deliveryStatus]}>{r.deliveryStatus.replace(/_/g, ' ')}</Tag>
      {ENGAGED.includes(r.engagementStatus) && (
        <Tag cls={EMERALD}>{r.engagementStatus.replace(/_/g, ' ')}</Tag>
      )}
    </div>
  );
}

function RatingCell({ r }: { r: RequestSummary }) {
  if (r.rating == null) {
    return <span className="text-xs text-faint">awaiting rating</span>;
  }
  const wentNegative =
    r.ratingStatus === 'rated_negative' || r.ratingStatus === 'feedback_submitted';
  return (
    <span className="inline-flex items-center gap-2">
      <Stars value={r.rating} className="h-4 w-4" />
      {wentNegative ? (
        <Tag cls={AMBER}>feedback</Tag>
      ) : (
        <Tag cls={r.redirectedToGoogle ? EMERALD : NEUTRAL}>
          {r.redirectedToGoogle ? 'went to Google' : 'sent to Google'}
        </Tag>
      )}
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
          <span className="hidden h-4 w-32 animate-pulse rounded bg-zinc-200/80 sm:block" />
          <span className="hidden h-7 w-7 animate-pulse rounded-full bg-zinc-200/80 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function RequestsList() {
  const { location } = useDashboard();
  const locationId = location?.id ?? '';
  const { data: requests, isPending, error } = useRequests(locationId);
  const { data: campaigns = [] } = useCampaigns(locationId);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!location) return null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Requests</h1>
          {requests && requests.length > 0 && (
            <span className="font-mono text-sm text-faint">{requests.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RequestReviewsCsvButton locationId={locationId} campaigns={campaigns} />
          <RequestReviewButton locationId={locationId} campaigns={campaigns} />
        </div>
      </div>

      <div className="mt-6">
        {error ? (
          <div className="rounded-card border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Couldn&apos;t load requests. {error.message}
          </div>
        ) : isPending ? (
          <SkeletonRows />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No review requests yet"
            description="Request a review from a customer and we'll generate a rating link to send them. A customer record is created automatically."
            action={
              <div className="flex items-center gap-2">
                <RequestReviewsCsvButton locationId={locationId} campaigns={campaigns} />
                <RequestReviewButton locationId={locationId} campaigns={campaigns} />
              </div>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-card border border-border bg-surface divide-y divide-border">
            {requests.map((r) => (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => setOpenId(r.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenId(r.id);
                  }
                }}
                className="flex cursor-pointer flex-col gap-2 px-5 py-3.5 text-left transition-colors hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-ink">
                    {r.customer.name ?? r.customer.email}
                  </p>
                  {r.customer.name && (
                    <p className="truncate font-mono text-sm text-muted">{r.customer.email}</p>
                  )}
                  <StatusTags r={r} />
                  {r.feedback && (
                    <p
                      title={r.feedback}
                      className="mt-1 line-clamp-2 text-xs italic leading-relaxed text-muted"
                    >
                      &ldquo;{r.feedback}&rdquo;
                    </p>
                  )}
                </div>
                <div className="sm:w-56 sm:shrink-0">
                  <RatingCell r={r} />
                </div>
                <div className="hidden text-xs text-faint sm:block sm:w-28 sm:shrink-0">
                  {dateFmt.format(new Date(r.createdAt))}
                </div>
                <div className="sm:shrink-0" onClick={(e) => e.stopPropagation()}>
                  <CopyLinkButton rateUrl={r.rateUrl} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RequestTimelineDrawer requestId={openId} onClose={() => setOpenId(null)} />
    </main>
  );
}
