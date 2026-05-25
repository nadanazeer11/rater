# Google reviews

> **Scope:** the read-only list of Google reviews scraped from a location's public Google listing, surfaced at `/dashboard/reviews`. For the scrape pipeline itself (baseline triggers, BullMQ worker, Outscraper client) see [docs/architecture.md](architecture.md). For attribution (matching a posted Google review back to a `ReviewRequest`) see — not built yet, listed in the "What's next" section of [CLAUDE.md](../CLAUDE.md).
> **Last updated:** 2026-05-25

## What it is

A read-only browser of the `GoogleReview` rows that the baseline scrape (and, eventually, incremental syncs) writes to the database. Admins use it to see what their customers are publicly saying on Google, alongside the requests they've been sending. Nothing here mutates anything — it's a window onto the scrape output.

## How it works

The data was already there. The baseline scrape — triggered on every Location create from [apps/api/src/locations/locations.service.ts](../apps/api/src/locations/locations.service.ts) and [apps/api/src/onboarding/onboarding.service.ts](../apps/api/src/onboarding/onboarding.service.ts) — enqueues a job that the worker drains via [apps/worker/src/scrape/scrape.processor.ts](../apps/worker/src/scrape/scrape.processor.ts), which calls Outscraper and bulk-inserts `GoogleReview` rows. Before this tab existed, those rows were invisible to admins.

The Reviews tab is intentionally a thin read surface:

1. The dashboard sidebar's "Reviews" item points at `/dashboard/reviews` (was a "coming soon" placeholder before).
2. `GET /google-reviews?locationId=…&page=…&pageSize=…&search=…&rating=…&sort=…` ([apps/api/src/google-reviews/](../apps/api/src/google-reviews/)) returns a paginated page `{ items, total, page, pageSize }` of active reviews (`removedAt: null`). Same membership-guard pattern as `customers`. The repo runs `findMany + count` inside a Prisma `$transaction` so totals stay consistent with the page. Search is a single `OR` on `reviewerName` / `text` with `mode: 'insensitive'` (plain Postgres `ILIKE` via Prisma — no `pg_trgm` yet; that's a TODO when result quality matters).
3. The client list ([apps/web/app/dashboard/reviews/reviews-list.tsx](../apps/web/app/dashboard/reviews/reviews-list.tsx)) uses TanStack Query via [apps/web/hooks/use-google-reviews.ts](../apps/web/hooks/use-google-reviews.ts), driven by local state — a debounced search input (300ms), rating-chip filter (All / 5 / 4 / 3 / 2 / 1), a sort dropdown, and Prev/Next pagination. The hook uses `keepPreviousData` so paging/filtering doesn't flash the skeleton between pages.

The empty state distinguishes "baseline hasn't finished" (`Location.baselineScrapedAt === null`) from "baseline done, zero reviews" — because in the first case the rows are *about to* appear, and in the second they really won't.

## Key files

- `apps/api/src/google-reviews/google-reviews.controller.ts` — `GET /google-reviews?locationId=…`
- `apps/api/src/google-reviews/google-reviews.service.ts` — membership guard, calls the repo
- `apps/api/src/google-reviews/google-reviews.repository.ts` — `findMany({ locationId, removedAt: null }, orderBy postedAt desc)`
- `apps/api/src/google-reviews/google-reviews.mapper.ts` + `dto/google-review.response.ts` — wire shape
- `apps/web/app/dashboard/reviews/page.tsx` + `reviews-list.tsx` — the route + the client list
- `apps/web/hooks/use-google-reviews.ts` — TanStack Query read hook
- `packages/types/src/api.ts` — `GoogleReviewSummary` shared type

## Conventions / gotchas

- **Active only.** The list filters `removedAt: null`. When incremental syncs land, a review that disappears from Google gets `removedAt` set but is kept in the DB for audit — the UI just won't show it.
- **No avatars.** `GoogleReview.reviewerAvatarUrl` is in the schema and the wire shape, but the UI shows initials instead. Outscraper avatar URLs are inconsistent (sometimes expired googleusercontent links), and pulling them through `next/image` would mean configuring remote patterns for `*.googleusercontent.com`. Initials are fine until that's worth doing.
- **Offset pagination, not cursor.** Page size 20, capped at 100 via DTO. Offset is fine at SMB review counts and lets the UI show "page X of Y". If we ever support sites with thousands of reviews and the deep-page `count()` cost stings, swap to keyset on `(postedAt, id)`.
- **Filter / search / sort state is local, not in the URL.** It's not bookmarked or restored on refresh. Matches the other dashboard list pages today; revisit if we need shareable filtered views.

## Not done yet

- **Attribution UI.** The wire shape exposes `attributedReviewRequestId` and `attributionConfidence`, but the matching logic that populates them isn't built (it's roadmap item #4 in [CLAUDE.md](../CLAUDE.md)). When it lands, this list should grow an "Attributed to <customer>" pill on matched rows, and the filter bar should grow an "Attributed only" toggle.
- **Sentiment / tags.** Out of scope for now.
- **Incremental syncs.** Only the baseline runs today. New reviews posted after onboarding won't appear here until incremental sync is built.
