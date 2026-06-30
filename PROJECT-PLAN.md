# Rater — Phased Implementation Plan (finish the product)

> Cross-module, dependency-ordered plan to take rater from "core loop works" to "shippable product." Input: [PROJECT-BRIEF.md](PROJECT-BRIEF.md). Generated 2026-06-30. Planning step only — no code yet.

> **Delivery: ONE PR, one commit per phase.** Per user decision, the entire plan ships on a single branch as one pull request, and **each phase below is exactly one commit** on that branch (8 phases → 8 commits, in the order listed). Every phase-commit must independently `typecheck`/`build`/smoke green and carry its own `docs/<area>.md` update in the same commit, so the history is bisectable and reviewable commit-by-commit. Commit messages follow the project convention (imperative, explain the *why*, list smoke results, `Co-Authored-By` trailer). Trade-off accepted: one large review, no incremental merges to `main`, revert granularity is per-commit (a phase) rather than per-PR. Mitigation: keep each phase-commit self-contained and green; run the full verification gate at every commit, not just at branch tip.

---

## 1. UNDERSTANDING

**Goal.** rater already has a working single-pass review loop (request → Postmark send → public rate page → Google/feedback routing) and read-only dashboards. To "finish the website" we must: (A) harden the data model (strings → Prisma enums), (B) make the product *observable* (per-request communication timeline + real funnel/overview analytics — today's overview cards are hardcoded `0`), (C) make campaigns *actually multi-step* (the follow-up scheduler that fires configured steps), (D) make sending *multi-tenant* (per-location Postmark domains so we can exit test mode), and (E) close the loop with *Google-review attribution* (prove a sent request became a posted review). Then production-readiness (CI, secrets, hosting, error tracking).

**Explicit assumptions** (proceeding on these; flagged, not blocking):
- A1. Full Prisma enums DB-side is confirmed (user decision), with **`Event.eventType` kept a `String`** as the one deliberate exception (append-only log; new event types shouldn't need a migration).
- A2. `CampaignStepType` enum ships with the **3 implemented values** (`initial`, `follow_up_no_rating`, `follow_up_no_google_review`). The schema comment's `*_thank_you` types are dropped unless product wants them (Open Q1).
- A3. The funnel's terminal "Posted" stage shows click-through (`redirectedToGoogleAt`) as the honest metric until attribution (Phase 6) lands, then upgrades to `googleAttributionStatus = confirmed_posted`.
- A4. ✅ Resolved — `feat/postmark-send` is merged to `main` (HEAD `7b738dd`); the Postmark send pipeline is the live substrate the scheduler builds on.
- A5. BullMQ + Upstash Redis is the scheduler backend (already the chosen stack; the API producer currently no-ops when `REDIS_URL` is unset — the scheduler hard-requires it).
- A6. No automated test suite exists yet; "verify" below means typecheck + build + `curl` smoke + manual dev-loop, matching current project discipline. A minimal test harness is added opportunistically in Phase 1, not as a blocking gate.

**Genuinely blocking unknowns:** none. Open decisions are collected in §7 with recommended defaults; all have a safe default to proceed on.

---

## 2. MODULE MAP

Dependency direction: **A → B** means A depends on B.

| Module | Responsibility (one line) | Depends on |
|---|---|---|
| `packages/db` (Prisma schema + migrations) | Source of truth for models + the new enums | — |
| `@rater/types` | Shared wire types + **shared enum literals** (api/web/worker) | `packages/db` (enum names mirror schema) |
| `api/campaigns` | Campaign + step CRUD, step vocab validation | `@rater/types` |
| `api/review-requests` | Request creation, public rate page backing, status transitions, **timeline read** | `campaigns`, `customers`, `@rater/types` |
| `api/customers` | Customer upsert/list | `@rater/types` |
| `api/google-reviews` | Read-only Google review list | `@rater/types` |
| `api/analytics` (**new**) | Funnel + overview aggregates (read-only) | `review-requests`, `google-reviews` data; `@rater/types` |
| `api/locations` | Location read; **new** `PATCH` for Postmark settings | `@rater/types` |
| `api/webhooks` (Postmark) | Inbound delivery/engagement events → status + `Event` writes | `review-requests`, `customers` |
| `worker/mailer` | Renders + sends the initial email, writes `StepExecution` + `Event` | `campaigns`, `review-requests` |
| `worker/scheduler` (**new**) | Evaluates `CampaignStep.requiredState` predicates, enqueues due step sends | `campaigns`, `review-requests`, `worker/mailer` |
| `worker/review-sync` (**partial**) | Outscraper incremental syncs; **new** attribution matcher | `google-reviews`, `review-requests` |
| `web/dashboard` (shell, lists) | All dashboard UIs | api modules via TanStack Query, `@rater/types` |
| `web` request-timeline UI (**new**) | Drawer rendering merged `Event`/`StepExecution` activity | `api/review-requests` timeline |
| `web` analytics UI (**new**) | Funnel + real overview cards | `api/analytics` |
| `web/settings` (**new**) | Admin Postmark-settings page | `api/locations` PATCH |
| infra (CI, hosting, Sentry) | Pipelines + deploy + error tracking | all apps |

---

## 3. PHASES (summary)

| Phase | Goal | Modules touched | Depends on | Effort |
|---|---|---|---|---|
| **0** | CI gate; secrets rotation (postmark already merged) | infra, all | — | S |
| **1** | Strings → Prisma enums (full), shared in `@rater/types` | `packages/db`, `@rater/types`, all api/web/worker | 0 | M |
| **2** | Per-request **communication timeline drawer** + richer requests table | `api/review-requests`, `web` | 1 | M |
| **3** | **Analytics**: funnel endpoint + real overview cards | `api/analytics` (new), `web` | 1 | M |
| **4** | **Follow-up step scheduler** (BullMQ) — campaigns become multi-step | `worker/scheduler` (new), `api/campaigns`, `review-requests` | 1 | L |
| **5** | **Per-location Postmark settings** UI + `PATCH /locations/:id` | `api/locations`, `web/settings`, `worker/mailer` | 1 | M |
| **6** | **Google-review attribution** — close the loop | `worker/review-sync`, `api/google-reviews`, `review-requests`; upgrades Phase 3 funnel | 1, 3 | L |
| **7** | Production readiness: exit Postmark test mode, hosting, prod Supabase, Sentry | infra | 2–6 | M |

Phases 2 and 3 are read-only and can run **in parallel** after Phase 1. Phase 4 is the **critical path / riskiest** — start its spike early (in parallel with 2/3). Phase 6 upgrades Phase 3's terminal funnel stage.

---

## 4. PHASE DETAIL

### Phase 0 — CI gate + secrets (S)
**Objective / done:** Every PR runs `pnpm -r typecheck` + `pnpm -r build` in GitHub Actions and blocks on red; the leaked dev secrets (DB password, Redis token — see `TODO.md`) are rotated and `.env` updated. *(`feat/postmark-send` already merged — HEAD `7b738dd`.)*
**Tasks:**
- Add `.github/workflows/ci.yml`: pnpm + node setup, `pnpm install --frozen-lockfile`, `pnpm -r typecheck`, `pnpm -r build`. (Resolves the deferred CI item in `TODO.md`.)
- Rotate Supabase DB password + Upstash Redis token; update local `.env`; confirm dev loop still boots.
- Pin `pnpm.onlyBuiltDependencies` to silence the postinstall warnings (already documented).
**Contracts:** none new.
**Risks:** CI flakiness on the monorepo build → *mitigation:* cache pnpm store + turbo; start with typecheck+build only, no tests gate. Rotation breaks local env → *mitigation:* rotate one secret at a time, verify `/health` DB ping between each.

---

### Phase 1 — Strings → Prisma enums (full) (M)
**Objective / done:** All 18 status/category columns are Postgres enums; the API uses generated Prisma enum types (no more `@IsIn([...])` string sets); web badges/filters/sort consume shared enum literals from `@rater/types`; `pnpm -r typecheck && pnpm -r build` green; existing rows preserved (labels map 1:1).
**Task breakdown:**
1. Add `enum` blocks to `schema.prisma` for the 18 fields in [PROJECT-BRIEF.md §3](PROJECT-BRIEF.md). Keep literal labels identical to today's strings so no data backfill is needed. **Exceptions:** `Event.eventType` stays `String` (A1); `CampaignStepType` ships the 3 real values (A2).
2. Change each column type to its enum; regenerate via the repo's **diff-and-deploy** pattern (migrate-dev is broken non-interactively here):
   `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel ./prisma/schema.prisma --script` → **inspect** the emitted `CREATE TYPE` + `ALTER ... USING (col::text::enum)` casts cover every existing value → `prisma migrate deploy`.
3. Export the enums from `@rater/types` (single source for web/api/worker); replace the hand-rolled unions (`CampaignStepType`, the status unions) + the `STEP_TYPES`/`DELAY_ANCHORS` `Set` validators in `campaigns.service.ts` with enum-derived checks.
4. Sweep api DTOs: swap `@IsIn([...])` / `@IsString()` for `@IsEnum(...)`. Sweep web: badge/filter/sort maps now key off the enum.
**Contracts:** the enum literal set in `@rater/types` becomes the cross-app contract — web/worker must import, never re-declare.
**Prereqs/risks:**
- **All 18 fields in this single phase-commit** (one migration covering both the rarely-changing closed sets and the high-churn `ReviewRequest` lifecycle tracks). The earlier 2-PR split recommendation is dropped per the one-PR/one-commit-per-phase decision — keep the migration atomic and verify the whole cast in one pass.
- Risk: a stray DB value not in the enum aborts the cast → *mitigation:* before deploy, `SELECT DISTINCT <col>` each column against the enum set; the dev DB is small.
- Risk: `ALTER TYPE ... ADD VALUE` can't run in a txn with other DDL later → *mitigation:* documented in `docs/architecture.md` as the accepted cost; future status additions get their own isolated migration.

---

### Phase 2 — Per-request communication timeline drawer (M)
**Objective / done:** Clicking a request row opens a drawer showing a single time-ordered activity log (sent → delivered → opened → bounced/failed → rated → routed → feedback) with exact timestamps; the flat requests table gains delivery + engagement badges and a campaign column; (optionally) search/filter/sort/pagination to match the reviews list.
**Task breakdown:**
1. **Backend** `GET /review-requests/:id/timeline` (tenancy-guarded by `locationId`). Primary source = the **`Event` log** (already populated with the 10 event types verified above) sorted by `occurredAt`; enrich with `RatingSubmission` (rating, `routedTo`, `submittedAt`), `FeedbackSubmission` (text, `submittedAt`), and `ReviewRequestStepExecution` (`scheduledFor`/`executedAt`/`status`/`errorMessage`) so future scheduled-but-not-yet-sent steps also render. Normalize in the mapper to `TimelineEntry[] = { at, kind, label, meta }`. Add the type to `@rater/types`.
2. **Frontend** MUI `Drawer` + vertical timeline; icon per `kind`, Geist-Mono timestamps, detail rows (rating value, feedback text, bounce reason from `errorMessage`). Header = customer + campaign + current status chips. Wire row click in `requests-list.tsx`; keep the copy-link action.
3. Enrich the table: delivery badge + engagement badge + campaign name columns; add `use-request-timeline.ts` read hook (`enabled` on open).
4. (Per brief) add search/filter/sort/pagination to requests list for parity with reviews.
**Contracts:** `TimelineEntry` shape in `@rater/types`; `kind` is a closed enum of activity kinds (sent/delivered/opened/clicked/landing/rated/feedback/routed/bounced/complained/failed/scheduled).
**Risks:** `Event.payload` is loosely typed → *mitigation:* the drawer reads only known keys per `eventType`, falls back to a generic label. Event ordering ties (same `occurredAt`) → *mitigation:* secondary sort by a kind-priority rank.

---

### Phase 3 — Analytics: funnel + real overview cards (M)
**Objective / done:** The 3 hardcoded `0` overview cards in `location-detail.tsx` show real counts; a funnel component shows Sent→Delivered→Opened→Rated→Routed→Posted with per-stage counts + conversion %, filterable by date range and campaign; all numbers are plain Prisma aggregates (no analytics service).
**Task breakdown:**
1. **New `api/analytics` module** (controller/service/repository/mapper/dto). `GET /analytics/overview?locationId=` → the 3 card counts. `GET /analytics/funnel?locationId=&from=&to=&campaignId=` → stage counts via `groupBy`/`count` over `ReviewRequest` (stage predicates in brief §4). Tenancy-guarded; `@UseGuards(AuthGuard)`.
2. Map stages to status enums (now real enums after Phase 1): Sent/Delivered off `deliveryStatus`; Opened off `engagementStatus`; Rated off `ratingStatus`; Routed off `redirectedToGoogleAt != null`; **Posted off `googleAttributionStatus = confirmed_posted`** — until Phase 6, this is 0/“pending”, so the card surfaces Routed (click-through) as the honest terminal metric (A3).
3. **Frontend** horizontal funnel/bar component on the location overview; wire the 3 cards; `use-analytics.ts` read hook keyed by `locationId`+filters, `staleTime` 5 min (not-a-live-ticker convention), `enabled: !!locationId`. MUI for date-range/campaign inputs, Tailwind for bars.
4. (Open Q5) optional table aggregates: "requests sent"/"last request" on customers list (from `Customer.lastReviewRequestSentAt`); response-rate/avg-rating columns on campaigns list.
**Contracts:** `FunnelResponse = { stages: { key, label, count, pctOfPrev, pctOfStart }[], range }`; `OverviewResponse = { requestsSent, awaitingResponse, newGoogleReviews }` in `@rater/types`.
**Risks:** queries scan all requests per location → *mitigation:* lean on existing `locationId` index + add a partial index on `(locationId, deletedAt)` if needed; results cached 5 min client-side. "New Google reviews" depends on `baselineScrapedAt` → *mitigation:* card already has a "baseline not captured" empty state to reuse.

---

### Phase 4 — Follow-up step scheduler (L) — *critical path*
**Objective / done:** A configured follow-up step actually fires: when a `CampaignStep.requiredState` predicate matches a request after its `delayDays`/`delayAnchor`, the worker creates a `ReviewRequestStepExecution` and sends the email through the existing mailer; non-matching requests are skipped (status `skipped`); the whole thing is idempotent (the `@@unique(reviewRequestId, campaignStepId)` guards double-sends). Demonstrable end-to-end in the dev loop with a short delay.
**Task breakdown:**
1. **Scheduling model:** on request creation (and on relevant status transitions), enqueue BullMQ **delayed jobs** per downstream step, delay computed from `delayAnchor` (`request_created` / `previous_step` / `rating_submitted`) + `delayDays`. Alternative: a single periodic sweep worker that scans due requests. *Recommendation:* delayed-jobs primary + a low-frequency reconciliation sweep as backstop for missed/失败 enqueues.
2. **Predicate evaluation:** at fire time, re-read the request's current status enums and evaluate `requiredState` (the `Json` predicate, e.g. `{ ratingStatus: 'not_rated', deliveryStatus: 'delivered' }`). Match → create `StepExecution(status=executed)` + reuse `mailer` send path. No-match → `StepExecution(status=skipped)`. Error → `status=failed` + `errorMessage`.
3. Reuse the existing `renderTemplate` + Postmark send + `Event` writes from `worker/mailer` — the scheduler should *enqueue into the same send job*, not duplicate sending.
4. Cancellation: when a request reaches a terminal state (rated positive + routed, or feedback submitted), cancel/skip its still-pending downstream jobs.
**Contracts:** the predicate vocabulary (`requiredState` keys = status enum field names; values = enum literals) is the contract between the campaign editor and the scheduler — validate editor input against it. BullMQ job payload `{ reviewRequestId, campaignStepId }`.
**Prereqs/risks:**
- Requires `REDIS_URL` (Upstash) — *prereq*, not a no-op anymore.
- **Riskiest work in the project** (timing correctness, idempotency, race with inbound webhooks flipping status) → *mitigation:* spike this first (in parallel with Phases 2/3); rely on the unique constraint for idempotency; re-read status *inside* the job at fire time (never trust enqueue-time state); add the reconciliation sweep so a dropped Redis job self-heals.
- Predicate could match stale state if a webhook lands mid-job → *mitigation:* evaluate in a short transaction reading fresh status.

---

### Phase 5 — Per-location Postmark settings UI (M)
**Objective / done:** An admin-only `/dashboard/settings` page edits `Location.fromEmailDomain` / `postmarkServerToken` / message stream; `PATCH /locations/:id` persists them (admin role enforced); the mailer uses the **per-location** token/from-domain instead of the env-only fallback. Unblocks serving multiple verified sender domains and exiting Postmark test mode.
**Task breakdown:**
1. `PATCH /locations/:id` in `api/locations` (DTO + `@IsEnum`/validation; admin guard via `LocationUser.role`). Persist the columns that already exist but are unused (`postmarkServerToken`, `fromEmailDomain`, message stream).
2. `worker/mailer`: resolve token/from-domain from the request's `Location` first, fall back to env/stub (preserve the stub path for local dev).
3. **Frontend** `/dashboard/settings` (admin-only; member sees read-only/empty state). MUI form, `flex flex-col gap` spacing (not `space-y`), Snackbar success/error (the long-form-editor feedback pattern), `use-update-location.ts` mutation hook invalidating the location key.
4. Surface domain-auth status hint (SPF/DKIM pending) — copy only; the DNS wizard is out of scope.
**Contracts:** `PATCH /locations/:id` body = `{ fromEmailDomain?, postmarkServerToken?, postmarkMessageStream? }`; response = updated `LocationSummary`.
**Risks:** storing a Postmark server token in DB = secret at rest → *mitigation:* document it; consider column-level handling later; never return the token to the browser (write-only field, show "configured ✓").

---

### Phase 6 — Google-review attribution (L)
**Objective / done:** Incremental Outscraper syncs run; a newly-seen `GoogleReview` is matched back to a candidate `ReviewRequest` (name/timing/heuristics) and writes `attributedReviewRequestId` + `attributionConfidence`; high-confidence auto-confirms (`googleAttributionStatus = confirmed_posted`), low-confidence lands in a manual-confirm queue; the Phase 3 funnel's terminal "Posted" stage + the "New Google reviews" card now reflect real attribution.
**Task breakdown:**
1. `worker/review-sync`: incremental sync job (the `ReviewSync` machinery + `syncType=incremental` enum exist) on a schedule; diff against existing `GoogleReview` rows.
2. **Matcher:** for each new review, score candidate requests for the location (recent `redirectedToGoogleAt`, reviewer-name similarity to `Customer.name`, timing window). Write `attributionConfidence` enum (high/medium/low) + `attributedReviewRequestId`; set request `googleAttributionStatus`.
3. **Manual-confirm queue UI:** admin reviews low-confidence matches, confirms/rejects (`attributionConfirmedManually`).
4. Flip the funnel/overview to use `confirmed_posted` for the terminal stage (replaces the A3 click-through placeholder).
**Contracts:** matcher output `{ reviewId, reviewRequestId, confidence }`; the confirm endpoint mutates `GoogleReview.attributionConfirmedManually` + request status.
**Risks:** fuzzy matching false-positives inflate "Posted" → *mitigation:* only auto-confirm high-confidence; everything else is manual; never delete/alter the Google review itself. Outscraper cost/rate → *mitigation:* incremental (not full) syncs, scheduled, stubbed locally.

---

### Phase 7 — Production readiness (M)
**Objective / done:** Postmark out of test mode (approval submitted, domain auth done); web on Vercel, api + worker on Railway/Fly with platform env vars; a separate **prod** Supabase project; Sentry on all three apps. App serves real external users.
**Tasks:** exit Postmark test mode + per-customer DNS (SPF/DKIM/DMARC); Supabase Auth SMTP via Postmark (bypass dev rate limit); deploy pipelines (extend Phase 0 CI with a deploy job); prod Supabase + migrate; Sentry SDK + DSN per app; set Supabase Site/Redirect URLs for prod. (All itemized in `TODO.md`.)
**Risks:** prod/dev share one Supabase free project today → *mitigation:* stand up the second project before any public traffic (already flagged in `TODO.md` security section).

---

## 5. INTEGRATION & CONTRACTS (where modules meet)

- **Enum literals (`@rater/types`)** — the spine. Schema defines them; `@rater/types` re-exports; web/api/worker import. Rule: never re-declare a status union in an app (the `campaigns.service.ts` `STEP_TYPES` Set and the `api.ts` unions get deleted in Phase 1).
- **`Event` log** — the cross-cutting activity stream. Writers: `webhooks/postmark.service`, `review-requests.repository`, `worker/mailer`, (new) `worker/scheduler`. Reader: the timeline endpoint (Phase 2) and, indirectly, analytics. Contract: every new side-effect writes a typed `Event` (`eventType` string + `payload` Json) — this is *how* features stay observable without schema changes.
- **`ReviewRequestStepExecution`** — the contract between `worker/scheduler` (writer, Phase 4) and the timeline drawer (reader, Phase 2). Unique `(reviewRequestId, campaignStepId)` = idempotency boundary.
- **`requiredState` predicate** — contract between the campaign editor (writes the `Json`) and the scheduler (evaluates it). Keys must be status-enum field names; values must be enum literals — validated at write time.
- **Mailer send job `{ reviewRequestId, campaignStepId }`** — single send path shared by initial send (today) and scheduled follow-ups (Phase 4). The scheduler enqueues into it; it must not be duplicated.
- **`PATCH /locations/:id`** — contract between settings UI (Phase 5) and the mailer's per-location token/domain resolution.
- **Attribution write** (`attributedReviewRequestId`, `attributionConfidence`, `googleAttributionStatus`) — contract between `worker/review-sync` (Phase 6) and the analytics funnel terminal stage (Phase 3).

---

## 6. SEQUENCING

**Critical path:** Phase 0 → Phase 1 → **Phase 4 (scheduler)** → Phase 5 → Phase 7. Phase 4 is the longest pole and the riskiest; everything user-visible about "automated multi-step campaigns" depends on it.

**Independent after Phase 1** (all read-only off existing data, no mutual conflicts): Phases 2 (timeline) and 3 (analytics) touch different modules (`review-requests` read vs new `analytics`), so they can be built in either order — but since it's one branch, they land as **two sequential commits**, not parallel branches. Do the **Phase 4 spike** (BullMQ delayed-job timing + idempotency proof) on a throwaway scratch before committing Phase 4, so its uncertainty is retired without polluting the branch history.

**Tackle-first (most uncertain):**
1. Phase 4 scheduler timing/idempotency/race-with-webhooks — spike immediately after Phase 1.
2. Phase 6 attribution matching accuracy — second-most-uncertain; its quality gates the "Posted" metric's trustworthiness.
3. Phase 1 enum migration cast-safety — low uncertainty but high blast radius; the `SELECT DISTINCT` pre-check + 2-PR split de-risk it.

**Commit order on the single branch:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 (one commit each), with Phase 4's spike done on scratch before its commit. Phases 2 and 3 are the fastest wins (read-only, high user-visible value) and good momentum right after the enum slog. The whole branch opens as one PR once Phase 7 is committed (or earlier as a draft PR for visibility).

---

## 7. OPEN QUESTIONS (recommended defaults)

1. **`CampaignStepType` values** — ship the 3 implemented types only, or also add `feedback_thank_you` / `google_review_thank_you` now? *Default: 3 only* — add thank-you steps when the scheduler exists to fire them (don't enum dead values).
2. **Funnel terminal metric pre-attribution** — show click-through (`redirectedToGoogleAt`) as terminal until Phase 6, labeling true "Posted" as pending? *Default: yes* — never show an unverifiable "Posted" number.
3. **Scheduler design** — delayed-jobs + reconciliation sweep, or pure periodic sweep? *Default: delayed-jobs primary + low-freq sweep backstop* — better latency, sweep covers dropped jobs.
4. ~~**Enum PR granularity**~~ — *resolved:* one PR / one commit per phase, so all 18 enum fields land in the single Phase 1 commit (no split).
5. **Campaign-performance table aggregates (Phase 3 B3)** — this iteration or a later campaign-analytics PR? *Default: defer the per-campaign leaderboard*; ship only the location overview + funnel now.
6. **Requests-list UX (Phase 2)** — add search/filter/sort/pagination now (parity with reviews) or drawer + columns only? *Default: drawer + richer columns first*; add list controls if the list grows past ~1 page in practice.
7. **Test harness** — introduce Jest/RTL in Phase 1, or stay typecheck+build+curl? *Default: add a thin Jest setup for the scheduler's predicate logic in Phase 4* (the one piece where unit tests pay for themselves), keep the rest manual for now.

---

*Approve, adjust phase scope, or answer §7 and I'll start Phase 0. **Delivery: one branch, one PR, one commit per phase** (8 commits) — each commit self-contained, green, and carrying its `docs/<area>.md` update.*
