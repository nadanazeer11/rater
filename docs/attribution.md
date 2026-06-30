# Google-review attribution

> **Scope:** matching a posted Google review back to the review request that produced it — the scorer, the worker matcher + incremental sync, the manual-confirm queue, and how this makes the funnel's "Posted" stage real. For the raw Google-review data + list see [docs/google-reviews.md](google-reviews.md). For the funnel see [docs/analytics.md](analytics.md).
> **Last updated:** 2026-06-30

## What it is

When a customer rates positively and clicks through to Google, the request sits at `googleAttributionStatus = pending_check`. This feature closes the loop: it watches the location's Google reviews and decides whether that customer actually posted one — auto-confirming obvious matches, queuing uncertain ones for a human, and giving up (`not_posted`) on requests that wait too long with no match.

## How it works

**Scoring** ([packages/types/src/attribution.ts](../packages/types/src/attribution.ts), pure + unit-tested). `scoreAttribution` gates on **timing** (the review must be posted at/after the request — minus tz slack — and within ~45 days) and discriminates on **name**: exact full-name → `high`, shared first name → `medium`, any shared token → `low`, otherwise `null` (don't attribute). No customer name → `null` (we won't guess).

**Matcher** ([apps/worker/src/attribution/attribution.matcher.ts](../apps/worker/src/attribution/attribution.matcher.ts)). For a location: load `pending_check` requests + unattributed reviews, score each request against each unclaimed review, take the best:
- `high` → **auto-attribute**: review gets `attributedReviewRequestId` + `attributionConfidence` + `attributionConfirmedManually = true`; request → `confirmed_posted`; `Customer.hasAttributedGoogleReview = true`; `google_review_attributed` event.
- `medium`/`low` → **tentative**: same attribution but `attributionConfirmedManually = false`; request → `posted_low_confidence`; `google_review_match_pending` event. Lands in the manual queue.
- no match + waited > 30 days past the expected time → request → `not_posted`.
- A review is claimed at most once — the matcher tracks claimed ids and the `attributedReviewRequestId @unique` constraint is the backstop (P2002 → skip).

**Incremental sync** ([attribution.processor.ts](../apps/worker/src/attribution/attribution.processor.ts)). Reuses the baseline `OutscraperService.fetchAllReviews` + diff-by-`externalId` (`createMany skipDuplicates`), records a `ReviewSync(incremental)`, then runs the matcher. Triggered by a **daily sweep** (repeatable BullMQ job that enqueues a sync per location with pending requests) and by an on-demand **"Check Google now"** from the UI (`POST /attribution/sync`). No-ops without Redis.

**Manual-confirm queue.** `GET /attribution/pending?locationId=` lists tentative matches (review + the customer it might be from + confidence). `POST /attribution/:reviewId/confirm` → `confirmed_posted` + customer flag; `POST /attribution/:reviewId/reject` → unattributes the review and marks the request `not_posted`. UI is the "Pending Google matches" panel on `/dashboard/reviews` (`pending-matches.tsx`) with "It's them" / "Not them" + the sync button.

**The funnel "Posted" stage is now real** — it counts `googleAttributionStatus = confirmed_posted`, which only the matcher (or a manual confirm) sets, so the stage no longer renders as `pending` ([docs/analytics.md](analytics.md)).

## Key files

- `packages/types/src/attribution.ts` — `scoreAttribution` (shared, pure).
- `apps/worker/src/attribution/{attribution.matcher,attribution.processor,attribution.producer,attribution.worker,attribution.module}.ts` — matcher + incremental sync + queue + daily sweep. Reuses `OutscraperService` (now exported from `ScrapeModule`).
- `apps/api/src/attribution/*` + `apps/api/src/queue/attribution.queue.ts` — `GET /attribution/pending`, `POST /attribution/:id/{confirm,reject}`, `POST /attribution/sync`.
- `apps/web/hooks/use-attribution.ts` + `apps/web/app/dashboard/reviews/pending-matches.tsx` — the manual queue UI.

## Conventions / gotchas

- **Why match on name, not email?** Google never exposes the reviewer's email — not via Outscraper, not via the official Business Profile API. A review carries only a display name, avatar, rating, text, and timestamp. So even though we know the customer's email, there's nothing on the review side to key off; name + timing is the best available signal (every competitor matches this way too).
- **Name is the discriminator, timing is the gate.** Without a customer name we don't auto-attribute — better a missed match than a wrong one.
- **One review ↔ one request** (`attributedReviewRequestId @unique`). The matcher claims within a run and relies on the constraint across concurrent runs.
- **Outscraper is stubbed locally** — the stub returns deterministic fake reviews ("Stub Reviewer N") that won't match real customers, so local syncs are safe.
- **Reuse the daily sweep, not per-request triggers** — a review is usually posted *after* the redirect, so matching is inherently delayed; immediate syncs would waste Outscraper calls.

## Not done yet

- **Reject is terminal for that request** (`not_posted`) — a genuinely-later review won't re-attribute to a rejected request. Acceptable for the MVP; revisit if it bites.
- **Sweep is coarse** (all locations with pending requests, daily) — fine at current volume; no per-review re-check cadence.
- **No removed-review handling for attributed reviews** — if Google removes an attributed review, `removedAt` is set by a future sync but the request stays `confirmed_posted` (no down-grade yet).
- **`low`-confidence matches are queued the same as `medium`** — no separate auto-expiry; an admin clears them via confirm/reject.
- **"Sign in with Google" on the rate page (future)** — would capture the customer's exact Google *display name* (what appears on their review), sharpening the name match. It would NOT enable email matching — reviews still carry no email. Distinct from the Phase 5 Gmail-*send* idea.
