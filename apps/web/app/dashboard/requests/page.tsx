import { redirect } from 'next/navigation';
import { fetchMe, fetchReviewRequests, type RequestSummary } from '@/lib/server-api';
import { EmptyState } from '@/components/empty-state';
import { Sidebar } from '../sidebar';
import { DashboardHeader } from '../dashboard-header';
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

function RatingPill({
  status,
  redirectedToGoogle,
}: {
  status: string;
  redirectedToGoogle: boolean;
}) {
  let label: string;
  let cls: string;
  if (status === 'rated_positive') {
    label = redirectedToGoogle ? 'rated · went to Google' : 'rated · sent to Google';
    cls = redirectedToGoogle ? EMERALD : NEUTRAL;
  } else if (status === 'rated_negative') {
    label = 'rated · feedback';
    cls = AMBER;
  } else if (status === 'feedback_submitted') {
    label = 'feedback received';
    cls = AMBER;
  } else if (status === 'not_rated') {
    label = 'awaiting rating';
    cls = NEUTRAL;
  } else {
    label = status;
    cls = NEUTRAL;
  }
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
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
  const canAddLocation = me.locations.some((l) => l.role === 'admin');

  const requests: RequestSummary[] = await fetchReviewRequests(selected.id);

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar
        locations={me.locations}
        currentLocationId={selected.id}
        canAddLocation={canAddLocation}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader email={me.email} businessName={selected.business.name} />

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
                    </div>
                    <div className="sm:w-52 sm:shrink-0">
                      <RatingPill status={r.ratingStatus} redirectedToGoogle={r.redirectedToGoogle} />
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
      </div>
    </div>
  );
}
