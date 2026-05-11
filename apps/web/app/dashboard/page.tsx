import { redirect } from 'next/navigation';
import { Chip } from '@mui/material';
import { fetchMe } from '@/lib/server-api';
import { TopBar } from '@/components/top-bar';
import { EmptyState } from '@/components/empty-state';
import { StarRating } from '@/components/star-rating';
import { AddLocationButton } from './add-location-button';
import { InviteTeammateButton } from './invite-teammate-button';
import { OnboardingDialog } from './onboarding-dialog';

const FIVE_MINUTES = 5 * 60_000;

export default async function DashboardPage() {
  const me = await fetchMe();
  if (!me) redirect('/sign-in');

  const locations = me.locations;

  return (
    <div className="min-h-dvh bg-bg">
      <TopBar email={me.email} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              Locations
            </h1>
            {locations.length > 0 && (
              <span className="font-mono text-sm text-faint">
                {locations.length}
              </span>
            )}
          </div>
          {me.onboarded && <AddLocationButton />}
        </div>

        <div className="mt-6">
          {locations.length > 0 ? (
            <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
              {locations.map((loc) => {
                const scraping =
                  loc.baselineScrapedAt === null &&
                  Date.now() - new Date(loc.createdAt).getTime() < FIVE_MINUTES;
                return (
                  <div
                    key={loc.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-[15px] font-medium text-ink">
                        {loc.name}
                      </p>
                      {(loc.googleRating !== null || loc.googleAddress) && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                          {loc.googleRating !== null && (
                            <StarRating
                              rating={loc.googleRating}
                              count={loc.googleReviewsCount}
                            />
                          )}
                          {loc.googleRating !== null && loc.googleAddress && (
                            <span aria-hidden className="text-faint">
                              ·
                            </span>
                          )}
                          {loc.googleAddress && (
                            <span className="truncate">{loc.googleAddress}</span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-faint">{loc.business.name}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {scraping && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                          <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                          Scraping reviews…
                        </span>
                      )}
                      {loc.role === 'admin' && (
                        <InviteTeammateButton
                          locationId={loc.id}
                          locationName={loc.name}
                        />
                      )}
                      <Chip
                        label={loc.role}
                        size="small"
                        color={loc.role === 'admin' ? 'primary' : 'default'}
                        variant={loc.role === 'admin' ? 'filled' : 'outlined'}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No locations yet"
              description="Add your first location to start collecting reviews from customers."
              action={me.onboarded ? <AddLocationButton /> : undefined}
            />
          )}
        </div>
      </main>

      <OnboardingDialog initiallyOpen={!me.onboarded} />
    </div>
  );
}
