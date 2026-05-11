import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { fetchMe, fetchReviewRequests } from '@/lib/server-api';
import type { RequestSummary } from '@rater/types';
import { EmptyState } from '@/components/empty-state';
import { Stars } from '@/components/star-rating';
import { RequestReviewButton } from './request-review-button';
import { RequestReviewsCsvButton } from './request-reviews-csv-button';
import { CopyLinkButton } from './copy-link-button';

type SearchParams = Promise<{ location?: string }>;

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const EMERALD = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
const AMBER = 'bg-amber-50 text-amber-700 border border-amber-200';
const NEUTRAL = 'border border-border text-faint';

function Tag({ cls, children }: { cls: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
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

export default async function RequestsPage({
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

  const requests: RequestSummary[] = await fetchReviewRequests(selected.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Requests</h1>
          {requests.length > 0 && (
            <span className="font-mono text-sm text-faint">{requests.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RequestReviewsCsvButton locationId={selected.id} />
          <RequestReviewButton locationId={selected.id} />
        </div>
      </div>

      <div className="mt-6">
        {requests.length === 0 ? (
          <EmptyState
            title="No review requests yet"
            description="Request a review from a customer and we'll generate a rating link to send them. A customer record is created automatically."
            action={
              <div className="flex items-center gap-2">
                <RequestReviewsCsvButton locationId={selected.id} />
                <RequestReviewButton locationId={selected.id} />
              </div>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-card border border-border bg-surface divide-y divide-border">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-ink">
                    {r.customer.name ?? r.customer.email}
                  </p>
                  {r.customer.name && (
                    <p className="truncate font-mono text-sm text-muted">{r.customer.email}</p>
                  )}
                  {r.feedback && (
                    <p
                      title={r.feedback}
                      className="mt-1 line-clamp-2 text-xs italic leading-relaxed text-muted"
                    >
                      “{r.feedback}”
                    </p>
                  )}
                </div>
                <div className="sm:w-56 sm:shrink-0">
                  <RatingCell r={r} />
                </div>
                <div className="hidden text-xs text-faint sm:block sm:w-28 sm:shrink-0">
                  {dateFmt.format(new Date(r.createdAt))}
                </div>
                <div className="sm:shrink-0">
                  <CopyLinkButton rateUrl={r.rateUrl} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
