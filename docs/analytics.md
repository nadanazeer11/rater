# Analytics

> **Scope:** the read-only `analytics` API module + the location-overview cards and conversion funnel on the dashboard. For the per-request activity log see [docs/review-requests.md](review-requests.md) → Communication timeline. For the underlying Google-review data see [docs/google-reviews.md](google-reviews.md).
> **Last updated:** 2026-06-30

## What it is

A thin analytics layer over the existing `ReviewRequest` status tracks — no new tables, no warehouse. Two endpoints power the location's **Overview**: three headline counts (requests sent, awaiting response, new Google reviews) and a six-stage **conversion funnel** (Sent → Delivered → Opened → Rated → Clicked to Google → Posted on Google). Every number is a plain Prisma `count` over the orthogonal enum status tracks added in the enum migration.

## How it works

- **`GET /analytics/overview?locationId=`** → `OverviewStats`. `requestsSent` = requests whose `deliveryStatus` left `pending`; `awaitingResponse` = `ratingStatus = not_rated` AND `deliveryStatus in (sent, delivered)`; `newGoogleReviews` = `GoogleReview` rows `postedAt > Location.baselineScrapedAt` (or **0** — not "all" — when no baseline exists). `baselineCaptured` lets the card tell "0 new" apart from "no baseline yet".
- **`GET /analytics/funnel?locationId=&from=&to=&campaignId=`** → `FunnelResponse`. Six counts over one shared `where` (location + `deletedAt: null` + optional `createdAt` range + optional `campaignId`), run in a single `$transaction`. The mapper turns counts into stages with `pctOfStart` (vs the first stage) and `pctOfPrev`.
- **The "Posted on Google" stage is now real.** It counts `googleAttributionStatus = confirmed_posted`, which the attribution pipeline sets (auto for high-confidence matches, manual-confirm for the rest — see [docs/attribution.md](attribution.md)). The stage no longer carries `pending`. "Clicked to Google" (`redirectedToGoogleAt`) remains the upstream stage.
- **Stages are "reached at least this far" measures**, computed independently off the four orthogonal tracks — they are *not* a strict state machine. A bounced request never reaches Delivered; a request can be Rated without having a recorded Open (e.g. the link was opened directly). The UI gives every non-zero stage a small min-width bar so downstream activity stays visible even when an upstream count is lower.

## Key files

- `apps/api/src/analytics/{analytics.module,analytics.controller,analytics.service,analytics.repository,analytics.mapper}.ts` + `dto/analytics.query.dto.ts`. Registered in `app.module.ts`. Controller is `@UseGuards(AuthGuard)`; the service `assertMember`-guards every call on `locationId`.
- `apps/web/hooks/use-analytics.ts` — `useOverview` + `useFunnel` (both `enabled` on `locationId`, default 5-min `staleTime`).
- `apps/web/app/dashboard/location-analytics.tsx` — `'use client'` Overview section: the three `StatCard`s + the `Funnel`. Embedded by the server component `location-detail.tsx`.
- `packages/types/src/api.ts` — `OverviewStats`, `FunnelResponse`, `FunnelStage`, `FunnelStageKey`.

## Conventions / gotchas

- **Pass `locationId`** — same tenancy rule as everywhere; a missing `locationId` in a Prisma `where` is "no filter" and would leak tenants. The service rejects empty `locationId`.
- **No new schema.** If a metric needs a column that doesn't exist, that's a different PR — keep this module pure aggregation.
- **`newGoogleReviews` is 0 without a baseline** by design (the absence of a baseline is surfaced separately via `baselineCaptured`), so don't "fix" it to count all reviews.

## Not done yet

- **Funnel filter UI.** The endpoint accepts `from` / `to` / `campaignId`, but the dashboard renders the all-time funnel with no date-range / campaign picker yet — wire the inputs when needed.
- **No time-series / trends** (requests-over-time, rating distribution over time) and **no per-campaign performance leaderboard** — both deferred.
