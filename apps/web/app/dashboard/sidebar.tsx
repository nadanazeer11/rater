'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import type { LocationSummary } from '@/lib/server-api';
import { AddLocationDialog } from './add-location-dialog';

type Props = {
  locations: LocationSummary[];
  currentLocationId: string | null;
  canAddLocation: boolean;
};

const NAV_ITEMS: { label: string; icon: SvgIconComponent; active?: boolean }[] =
  [
    { label: 'Dashboard', icon: HomeRoundedIcon, active: true },
    { label: 'Customers', icon: GroupsRoundedIcon },
    { label: 'Campaigns', icon: CampaignRoundedIcon },
    { label: 'Reviews', icon: RateReviewRoundedIcon },
    { label: 'Settings', icon: SettingsRoundedIcon },
  ];

const DOT_COLORS = [
  'bg-accent',
  'bg-amber-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-sky-500',
];

const FIVE_MINUTES = 5 * 60_000;

export function Sidebar({
  locations,
  currentLocationId,
  canAddLocation,
}: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-8 place-items-center rounded-lg bg-accent text-base font-bold text-accent-fg">
          r
        </span>
        <span className="text-lg font-semibold tracking-tight text-ink">
          rater
        </span>
      </div>

      <nav className="space-y-0.5 px-3">
        {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            title={active ? undefined : 'Coming soon'}
            aria-disabled={!active}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? 'bg-accent-soft font-semibold text-accent'
                : 'cursor-not-allowed font-medium text-faint'
            }`}
          >
            <Icon fontSize="small" />
            {label}
          </div>
        ))}
      </nav>

      <div className="mx-5 my-4 border-t border-border" />

      <div className="px-3">
        <div className="flex items-center justify-between px-3 pb-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
            Locations
          </span>
          {canAddLocation && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              title="Add location"
              aria-label="Add location"
              className="tactile grid size-6 place-items-center rounded-md bg-accent-soft text-accent transition-colors hover:bg-accent hover:text-accent-fg"
            >
              <AddRoundedIcon sx={{ fontSize: 16 }} />
            </button>
          )}
        </div>

        {locations.length === 0 ? (
          <p className="px-3 py-2 text-xs text-faint">No locations yet.</p>
        ) : (
          <div className="space-y-0.5">
            {locations.map((loc, i) => {
              const active = loc.id === currentLocationId;
              const scraping =
                loc.baselineScrapedAt === null &&
                Date.now() - new Date(loc.createdAt).getTime() < FIVE_MINUTES;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => router.push(`/dashboard?location=${loc.id}`)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                    active ? 'bg-accent-soft' : 'hover:bg-zinc-50'
                  }`}
                >
                  <span className="relative flex shrink-0 items-center justify-center">
                    <span
                      className={`size-2 rounded-full ${DOT_COLORS[i % DOT_COLORS.length]}`}
                    />
                    {scraping && (
                      <span className="absolute size-3.5 animate-pulse rounded-full ring-2 ring-amber-400" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm ${
                        active
                          ? 'font-semibold text-accent'
                          : 'font-medium text-ink'
                      }`}
                    >
                      {loc.name}
                    </span>
                    {loc.googleAddress && (
                      <span
                        className={`block truncate text-xs ${
                          active ? 'text-accent/70' : 'text-faint'
                        }`}
                      >
                        {loc.googleAddress}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="p-4">
        <div className="rounded-xl border border-accent/20 bg-accent-soft p-4 text-center">
          <StorefrontRoundedIcon sx={{ fontSize: 26, color: 'primary.main' }} />
          <p className="mt-1.5 text-sm font-semibold text-accent">
            Bring in reviews
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Upload a customer list and we&apos;ll do the rest. Coming soon.
          </p>
        </div>
      </div>

      <AddLocationDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </aside>
  );
}
