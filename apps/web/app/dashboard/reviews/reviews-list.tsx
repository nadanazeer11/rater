'use client';

import { useEffect, useMemo, useState } from 'react';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { GoogleReviewsSort } from '@rater/types';
import { useGoogleReviews } from '@/hooks/use-google-reviews';
import { Stars } from '@/components/star-rating';
import { EmptyState } from '@/components/empty-state';
import { useDashboard } from '../dashboard-context';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_LABELS: Record<GoogleReviewsSort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  highest: 'Highest rated',
  lowest: 'Lowest rated',
};

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

function SkeletonRows() {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface divide-y divide-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-5 py-4">
          <span className="size-9 shrink-0 animate-pulse rounded-full bg-zinc-200/80" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block h-4 w-40 animate-pulse rounded bg-zinc-200/80" />
            <span className="block h-3 w-full animate-pulse rounded bg-zinc-200/80" />
            <span className="block h-3 w-2/3 animate-pulse rounded bg-zinc-200/80" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RatingChips({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const base =
    'tactile rounded-full px-3 py-1 text-xs font-medium transition-colors';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`${base} ${
          value === null
            ? 'bg-accent text-accent-fg'
            : 'border border-border text-muted hover:bg-zinc-50'
        }`}
      >
        All
      </button>
      {[5, 4, 3, 2, 1].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={`${base} inline-flex items-center gap-1 ${
            value === n
              ? 'bg-accent text-accent-fg'
              : 'border border-border text-muted hover:bg-zinc-50'
          }`}
          aria-pressed={value === n}
        >
          <span className="font-mono tabular-nums">{n}</span>
          <span aria-hidden>★</span>
        </button>
      ))}
    </div>
  );
}

export function ReviewsList() {
  const { location } = useDashboard();
  const locationId = location?.id ?? '';

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [sort, setSort] = useState<GoogleReviewsSort>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, rating, sort, locationId]);

  const params = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, search, rating, sort }),
    [page, search, rating, sort],
  );
  const { data, isPending, isFetching, error } = useGoogleReviews(
    locationId,
    params,
  );

  if (!location) return null;

  const baselined = location.baselineScrapedAt !== null;
  const filtered = !!search.trim() || rating !== null;
  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Google reviews
        </h1>
        {total > 0 && (
          <span className="font-mono text-sm text-faint">{total}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        The latest reviews scraped from this location&apos;s Google listing.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TextField
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search reviewer or text…"
          size="small"
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ maxWidth: { sm: 360 } }}
        />
        <TextField
          select
          size="small"
          label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as GoogleReviewsSort)}
          sx={{ minWidth: 160 }}
        >
          {(Object.keys(SORT_LABELS) as GoogleReviewsSort[]).map((k) => (
            <MenuItem key={k} value={k}>
              {SORT_LABELS[k]}
            </MenuItem>
          ))}
        </TextField>
      </div>

      <div className="mt-3">
        <RatingChips value={rating} onChange={setRating} />
      </div>

      <div className="mt-6">
        {error ? (
          <div className="rounded-card border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Couldn&apos;t load reviews. {error.message}
          </div>
        ) : isPending ? (
          <SkeletonRows />
        ) : items.length === 0 ? (
          <EmptyState
            title={
              filtered
                ? 'No matching reviews'
                : baselined
                  ? 'No Google reviews yet'
                  : 'Scraping reviews…'
            }
            description={
              filtered
                ? 'Try clearing the search or rating filter.'
                : baselined
                  ? "We didn't find any reviews on this location's Google listing."
                  : "We're pulling this location's Google reviews. They'll show up here in a minute or two."
            }
          />
        ) : (
          <div
            className={`overflow-hidden rounded-card border border-border bg-surface divide-y divide-border transition-opacity ${
              isFetching ? 'opacity-60' : ''
            }`}
          >
            {items.map((r) => (
              <article key={r.id} className="flex gap-4 px-5 py-4">
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
                >
                  {initials(r.reviewerName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-medium text-ink">
                      {r.reviewerName}
                    </span>
                    <Stars value={r.rating} />
                    <span className="font-mono text-xs text-faint">
                      {dateFmt.format(new Date(r.postedAt))}
                    </span>
                  </div>
                  {r.text && (
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted">
                      {r.text}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {total > 0 && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span className="font-mono text-xs tabular-nums text-faint">
            {rangeStart}–{rangeEnd} of {total}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              className="tactile rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface"
            >
              Prev
            </button>
            <span className="px-2 font-mono text-xs tabular-nums text-faint">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isFetching}
              className="tactile rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
