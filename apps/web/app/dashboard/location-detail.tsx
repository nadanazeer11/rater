import type { ReactNode } from 'react';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import type { LocationSummary } from '@rater/types';
import { InviteTeammateButton } from './invite-teammate-button';
import { LocationAnalytics } from './location-analytics';

const FIVE_MINUTES = 5 * 60_000;

function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'accent' | 'neutral' | 'amber' | 'emerald';
}) {
  const tones = {
    accent: 'bg-accent text-accent-fg',
    neutral: 'border border-border text-muted',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function LocationDetail({ location }: { location: LocationSummary }) {
  const isAdmin = location.role === 'admin';
  const scraping =
    location.baselineScrapedAt === null &&
    Date.now() - new Date(location.createdAt).getTime() < FIVE_MINUTES;
  const mapsQuery = encodeURIComponent(
    [location.name, location.googleAddress].filter(Boolean).join(' '),
  );

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-border bg-linear-to-br from-accent-soft to-surface p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill tone="accent">{location.business.name}</Pill>
              <Pill tone="neutral">{location.role}</Pill>
              {scraping && <Pill tone="amber">Scraping reviews…</Pill>}
              {location.baselineScrapedAt && (
                <Pill tone="emerald">Baseline captured</Pill>
              )}
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-ink">
                {location.name}
              </h1>
            </div>

            {location.googleAddress && (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <PlaceRoundedIcon sx={{ fontSize: 16 }} />
                {location.googleAddress}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 inline-flex items-center gap-0.5 text-xs font-medium text-accent hover:underline"
                >
                  Maps <LaunchRoundedIcon sx={{ fontSize: 13 }} />
                </a>
              </p>
            )}

            {location.googleRating !== null && (
              <div className="flex items-center gap-3 pt-1">
                <span className="flex items-center gap-1">
                  <StarRoundedIcon sx={{ fontSize: 22, color: '#F59E0B' }} />
                  <span className="font-mono text-lg font-semibold tabular-nums text-ink">
                    {location.googleRating.toFixed(1)}
                  </span>
                </span>
                {location.googleReviewsCount !== null && (
                  <span className="text-sm text-muted">
                    <span className="font-mono tabular-nums">
                      {location.googleReviewsCount.toLocaleString()}
                    </span>{' '}
                    Google reviews
                  </span>
                )}
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="shrink-0">
              <InviteTeammateButton
                locationId={location.id}
                locationName={location.name}
              />
            </div>
          )}
        </div>
      </section>

      <LocationAnalytics locationId={location.id} />
    </div>
  );
}
