# Rater — Status & Improvement Brief

> Handoff document for the cross-module phased planner. Captures current status, remaining roadmap, and three requested improvement tracks: (A) strings → Prisma enums, (B) richer analytics in dashboard tables, (C) per-review-request communication/timeline view. Generated 2026-06-30.

---

## PROJECT BRIEF

**What we're building:** `rater` is a B2B-SMB review-collection platform for the Middle East market (Birdeye/Podium/Prosperly-style). A business uploads a customer list → rater emails a branded review request from the business's own domain → follows up with non-responders → routes high ratings to the business's Google listing and low ratings to a private feedback form. Built solo by Nada (mid-level engineer). The single most important outcome: **convert a sent review request into a posted Google review, and prove that conversion with per-request, per-campaign, per-location analytics.**

This iteration is not new-feature greenfield — it's a **hardening + observability pass** over a working core loop. Three goals: (1) replace string-typed status fields with real Prisma enums for type/DB safety, (2) surface the engagement funnel and real per-location overview numbers (today they are hardcoded `0`), (3) give each review request a full communication timeline (every step execution + timestamp + delivery/engagement event) via a detail drawer.

### CONSTRAINTS
- **Stack (fixed):** NestJS 11 (`apps/api` + `apps/worker`), Next.js 15 App Router + MUI v6 + Tailwind v4 (`apps/web`), Prisma 6, Supabase (Postgres + Auth/magic-link), BullMQ + Upstash Redis, Postmark (email), Outscraper (Google reviews). Turborepo + pnpm monorepo, packages scoped `@rater/*`.
- **Team:** solo dev. Favor incremental, PR-per-feature, low-migration-risk sequencing. Each PR ships with its `docs/<area>.md`.
- **Multi-tenancy is app-level** (every tenant row has indexed `locationId`; no Postgres RLS). Any new query path must keep the `locationId` guard.
- **DB conventions:** snake_case in DB / camelCase in TS via `@map`; `@db.Text` on long strings; soft-delete only on `Location`, `Customer`, `ReviewRequest`; append-only `Event` log; predicates/config in `Json` columns.
- **Cost:** stay on free/cheap tiers (Supabase free, Upstash free, Postmark test mode). Analytics must be plain Prisma aggregates — no new data-warehouse/analytics service.
- **Enum decision (user-confirmed):** go to **full Prisma enums** DB-side for status/category fields. This deliberately reverses the earlier "strings for extensibility" convention — see Track A for the migration cost this accepts.
- **Brand:** "Iris" palette (indigo-violet `#4F46E5` single accent, zinc neutrals, Geist font, flat/crisp surfaces). MUI for forms/dialogs/menus, Tailwind for page shells. Two token sources kept in sync: `lib/theme.ts` + `globals.css @theme`.

### MVP SCOPE (this iteration)
- Strings → Prisma enums migration across the ~18 identified fields (Track A).
- Engagement-funnel analytics endpoint + per-location overview cards wired to real counts (Track B).
- Per-request communication timeline drawer (Track C).

### OUT OF SCOPE (this iteration)
- Follow-up step **scheduler** (configured but doesn't fire) — large enough to be its own iteration; analytics/timeline should *display* step executions even before the scheduler creates future ones.
- Per-location Postmark settings UI; Google-review attribution matching pipeline; time-series/trend charts; campaign-performance leaderboard (all deferred — see Open Questions for whether to fold campaign-perf into Track B).
- WhatsApp, API/webhook ingestion, in-app notifications, observability (Sentry/BetterStack).

### TOP OPEN QUESTIONS
1. Enum rollout: one big migration, or per-domain (lifecycle tracks last)? See Track A risk note.
2. Funnel definition: is "converted" = `googleAttributionStatus = confirmed_posted`, or = `redirectedToGoogleAt != null` (click-through) given attribution isn't wired yet? Affects which number the overview card can honestly show today.
3. Where do funnel aggregates live — a new `analytics` API module, or extend each resource module? (Recommendation: new `analytics` module.)
4. Does the timeline drawer read from the `Event` log, from `ReviewRequestStepExecution` + status fields, or both merged? (Recommendation: merge — see Track C.)

---

## 1. CURRENT STATUS (what's done — all in `main` except the open `feat/postmark-send` branch)

**Foundation**
- Monorepo scaffold (Turborepo + pnpm). 16 Prisma models, init migration applied to Supabase.
- API clean-architecture per module (controller / service / repository / mapper / DTO), `class-validator` + global `ValidationPipe`, `AuthGuard` (JWT via JWKS + `jose`), `@CurrentUser()`.
- Supabase magic-link auth wired through Next.js (3 client contexts, middleware-gated `/dashboard`).
- "Iris" design system (MUI theme + Tailwind v4 tokens, Geist, flat surfaces).

**Tenancy & onboarding**
- Onboarding wizard (business + 1–3 locations + Google Places picker), add-location dialog, team invitations (tokenized link; email delivery deferred — "copy link" UI), dashboard shell with persistent sidebar + location switcher (`?location=` soft nav).

**Core review loop**
- **Customers** — read-only `/dashboard/customers` list; customers are created as a side effect of review requests.
- **Review requests** — single (dialog) + bulk (CSV) creation; lazy default campaign; public `/rate/[token]` page (rating ≥ `positiveRatingThreshold` → Google link, below → private feedback → `FeedbackSubmission`); `customerCooldownDays` guard; requests list shows stars + feedback excerpt.
- **Campaigns** — `/dashboard/campaigns` list + editor (name, initial email, follow-up steps with preset triggers + "send after N days", live `{{token}}` preview). "Default" = newest active. **Editor only — nothing schedules/sends the follow-up steps yet.**
- **Google reviews** — `/dashboard/reviews` read-only list (search + rating filter + 4-way sort + offset pagination), backed by the `GoogleReview` table the baseline scrape populates.
- **Postmark send (initial step)** — creating a request enqueues `send-review-request-email`; worker renders subject/body via shared `renderTemplate` and sends via Postmark; writes a `ReviewRequestStepExecution` (unique `postmarkMessageId`) and flips `deliveryStatus`. `POST /webhooks/postmark` (HTTP Basic auth) consumes Delivery/Bounce/Open/SpamComplaint → updates `deliveryStatus`/`engagementStatus` + `Customer.emailStatus`. Stub fallback when `POSTMARK_SERVER_TOKEN` unset. *(on `feat/postmark-send`)*

**Web data layer** — persistent dashboard shell (no white-flash nav), TanStack Query for reads + mutations (one hook per endpoint, `staleTime` 5 min, mutations invalidate keys), shared wire types in `@rater/types`.

---

## 2. WHAT'S LEFT (roadmap, roughly ordered — each its own PR + `docs/`)

| # | Item | State | Notes |
|---|---|---|---|
| 1 | **Follow-up step scheduler** | not built | BullMQ scheduler fires a `CampaignStep` when its `requiredState` predicate matches (e.g. "not rated after N days"). Send pipeline + `ReviewRequestStepExecution` already exist; this adds the scheduler that creates executions on time. **Biggest remaining core piece.** |
| 2 | **Per-location Postmark settings UI** | not built | Admin `/dashboard/settings` for `Location.fromEmailDomain` / `postmarkServerToken` / message stream + `PATCH /locations/:id`. Needed to exit Postmark test mode & serve multiple verified domains. |
| 3 | **Dashboard analytics wiring** | placeholder | The 3 overview cards are hardcoded `0`. → **Track B below.** |
| 4 | **Per-request communication view** | missing | No drill-down today. → **Track C below.** |
| 5 | **Google-review attribution** | machinery only | Incremental syncs (`ReviewSync`), match a posted Google review back to a request, manual-confirm queue for low-confidence matches. |
| 6 | **Enum hardening** | strings today | → **Track A below.** |

**Cross-cutting tech debt** (from `TODO.md`): no ESLint/CI/pre-commit hooks yet; secrets rotation pending (dev DB password, Redis token leaked in chat history — rotate before any public deploy); separate prod Supabase project; exit Postmark test mode.

---

## 3. TRACK A — Strings → Prisma enums (user choice: **full enums everywhere**)

**Context / trade-off being accepted.** The original convention was *strings, validate at app layer, "extensibility over rigidity"* — adding a new status value was a code change, never a migration. Going to full Prisma enums buys: compile-time exhaustiveness in TS, DB-level rejection of bad values, and self-documenting schema. It costs: **every new status value is now a migration** (`ALTER TYPE ... ADD VALUE`, which in Postgres can't run inside a transaction with other DDL and can't be removed/reordered easily), and the orthogonal-status-track flexibility gets more rigid. Given the lifecycle tracks are the *most likely to gain values* (e.g. new `engagementStatus` stages), see the risk note on sequencing.

### Full field → enum inventory (all confirmed from `schema.prisma`)

| Model.field | Current default | Enum name | Values |
|---|---|---|---|
| `LocationUser.role` | — | `Role` | `admin`, `member` |
| `Invitation.role` | — | `Role` (shared) | `admin`, `member` |
| `Invitation.status` | — | `InvitationStatus` | `pending`, `accepted`, `revoked`, `expired` |
| `Customer.emailStatus` | `valid` | `EmailStatus` | `valid`, `invalid`, `unsubscribed`, `complained` |
| `Customer.importSource` | `manual` | `ImportSource` | `csv`, `manual`, `api` |
| `CampaignStep.stepType` | — | `StepType` | `initial`, `follow_up_no_rating`, `follow_up_no_google_review`, `feedback_thank_you`, `google_review_thank_you` *(verify full set in schema — source had an ellipsis)* |
| `CampaignStep.delayAnchor` | — | `DelayAnchor` | `request_created`, `previous_step`, `rating_submitted` |
| `ReviewRequest.deliveryStatus` | `pending` | `DeliveryStatus` | `pending`, `sent`, `delivered`, `bounced`, `complained`, `failed` |
| `ReviewRequest.engagementStatus` | `not_opened` | `EngagementStatus` | `not_opened`, `opened`, `link_clicked`, `landing_viewed` |
| `ReviewRequest.ratingStatus` | `not_rated` | `RatingStatus` | `not_rated`, `rated_positive`, `rated_negative`, `feedback_submitted` |
| `ReviewRequest.googleAttributionStatus` | `not_applicable` | `GoogleAttributionStatus` | `not_applicable`, `pending_check`, `confirmed_posted`, `posted_low_confidence`, `not_posted` |
| `ReviewRequestStepExecution.status` | `scheduled` | `StepExecutionStatus` | `scheduled`, `executed`, `skipped`, `failed` |
| `RatingSubmission.routedTo` | — | `RoutedTo` | `google`, `feedback` |
| `GoogleReview.attributionConfidence` | null | `AttributionConfidence` | `high`, `medium`, `low` |
| `ReviewSync.status` | — | `SyncStatus` | `running`, `completed`, `failed` |
| `ReviewSync.syncType` | — | `SyncType` | `baseline`, `incremental`, `full`, `targeted` |
| `ReviewSync.triggeredBy` | — | `SyncTrigger` | `cron`, `on_demand`, `request_completed` |
| `NotificationRule.channel` | — | `NotificationChannel` | `email`, `in_app`, `whatsapp`, `slack` |

**Note:** `Json` predicate columns (`CampaignStep.requiredState`, `NotificationRule.recipients`, `Event.payload`, `GoogleReviewSnapshot.distribution`) **stay `Json`** — they hold open-ended shapes, not closed sets. `Event.eventType` is *intentionally open* (append-only log, new event types should not require a migration) — **recommend keeping it a `String`** even under the "full enums" decision, and flagging it as the one deliberate exception.

### Migration approach (Prisma 6 / Postgres)
1. Define enums in `schema.prisma`; change each column type. Keep the same string literals as enum members so existing row values map 1:1 (Postgres enum labels == current strings — no data backfill needed if labels match exactly).
2. Generate SQL via the repo's **diff-and-deploy** pattern (migrate-dev is non-interactive-broken here): `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel ./prisma/schema.prisma --script`. **Inspect the generated SQL** — Prisma emits `CREATE TYPE` + `ALTER TABLE ... ALTER COLUMN ... TYPE ... USING (col::text::enum)`. Verify the `USING` cast covers every existing value or the deploy aborts.
3. Update the API: replace the hand-rolled string union types / `class-validator` `@IsIn([...])` with the generated Prisma enum types; export shared enums from `@rater/types` so web + api + worker share them. Web badges/filters switch to the enum.
4. **Risk / sequencing recommendation:** do it in **two PRs** — (1) the genuinely-closed sets that rarely change (`Role`, `InvitationStatus`, `RoutedTo`, `SyncStatus/Type/Trigger`, `AttributionConfidence`, `NotificationChannel`, `ImportSource`, `EmailStatus`, `DelayAnchor`), then (2) the four `ReviewRequest` lifecycle tracks + `StepType` + `StepExecutionStatus`, which are the most likely to gain values later — isolating them makes the "this one needs an `ALTER TYPE` migration to extend" cost explicit and easy to revert if it bites. Even though the decision is "full enums," splitting the PR de-risks the high-churn fields.

---

## 4. TRACK B — Analytics: engagement funnel + per-location overview cards

The data to compute every number below **already exists** — no new columns. It's all derivable from `ReviewRequest`'s four status tracks + timestamps + related submissions.

### B1. Per-location overview cards (replace the hardcoded `0`s in `location-detail.tsx`)
The 3 cards are placeholders. Wire to real counts, scoped by `locationId` + `deletedAt IS NULL`:
- **Review requests sent** → `count(ReviewRequest where deliveryStatus in (sent, delivered, opened-states…))` — i.e. left the system.
- **Awaiting response** → `count(ratingStatus = not_rated AND deliveryStatus in (sent, delivered))`.
- **New Google reviews** → `count(GoogleReview where postedAt > Location.baselineScrapedAt)` (or attributed count once attribution lands).

### B2. Engagement funnel (new `analytics` API module)
A single endpoint `GET /analytics/funnel?locationId=&from=&to=&campaignId=` returning stage counts + conversion rates, computed via Prisma `groupBy`/`count` over `ReviewRequest`:

```
Sent        → deliveryStatus in (sent, delivered, bounced, complained, failed)   [left system]
Delivered   → deliveryStatus = delivered
Opened      → engagementStatus in (opened, link_clicked, landing_viewed)
Rated       → ratingStatus in (rated_positive, rated_negative, feedback_submitted)
Routed→GBP  → redirectedToGoogleAt != null  (click-through to Google)
Posted      → googleAttributionStatus = confirmed_posted   [needs attribution pipeline — show as “pending” until #5 ships]
```
Each stage shows count + % of previous + % of Sent. Filterable by date range, campaign, location. **Honesty note:** the final "Posted" stage can't be real until Google-review attribution (roadmap #5) is wired — until then show `redirectedToGoogleAt` (click-through) as the terminal honest metric and label "Posted" as estimated/pending. (See Open Question 2.)

**Frontend:** a horizontal funnel/bar component on the location overview (and optionally a compact version per campaign). MUI for any inputs (date range, campaign picker), Tailwind for the funnel bars. TanStack Query read hook (`use-analytics.ts`) keyed by `locationId`+filters, `enabled: !!locationId`, 5-min `staleTime` per the project's not-a-live-ticker convention.

### B3. (Optional, see Open Q) Table-level aggregates
- **Customers list:** add "requests sent" + "last request date" per row (already have `Customer.lastReviewRequestSentAt`).
- **Campaigns list:** add response-rate / avg-rating / Google-attribution columns per campaign (these are the campaign-performance metrics — confirm whether in-scope this iteration).

---

## 5. TRACK C — Per-request communication timeline (full drawer)

**Today:** the requests list shows only the *final outcome* (stars + a status badge + created date). There is **no way to see the journey** — when it was sent, delivered, opened, bounced; which step ran; when the rating came in. This is the highest-value observability gap.

**Recommendation: a side drawer** (click a request row → MUI `Drawer`) that renders a **unified, time-ordered activity log** merging three sources that already exist:
1. `ReviewRequestStepExecution[]` — each step: `scheduledFor`, `executedAt`, `status`, `postmarkMessageId`, `errorMessage`. (Initial step exists today; future follow-ups appear here once the scheduler ships — the drawer is forward-compatible.)
2. The four `ReviewRequest` status tracks + their timestamps: `createdAt`, `redirectedToGoogleAt`, plus `RatingSubmission.submittedAt` (+ rating, `routedTo`) and `FeedbackSubmission.submittedAt` (+ text).
3. The append-only **`Event` log** (`reviewRequestId`-scoped rows: `eventType` + `payload` + `occurredAt`) — the finest-grained, future-proof source (Postmark Delivery/Open/Bounce events should already be writing here or should be made to).

**Backend:** `GET /review-requests/:id/timeline` (or `?include=timeline`) — fetch the request with `stepExecutions`, `ratingSubmission`, `feedbackSubmission`, `events`, normalize into a single sorted `{ at, kind, label, meta }[]` in the mapper, return via `@rater/types`. Keep the `locationId` tenancy guard.

**Frontend:** MUI `Drawer` + a vertical timeline; each entry: icon by kind (sent/delivered/opened/clicked/rated/feedback/routed/bounced/failed), human label, exact timestamp (Geist Mono per brand), and detail (rating value, feedback text, bounce reason from `errorMessage`). Header shows customer + campaign + current status chips. Row click in `requests-list.tsx` opens it; the existing "copy link" stays.

**Also surface more columns on the flat table** (per your ask): add `sentAt`/`deliveredAt`-style status with a delivery badge and an engagement badge, plus campaign name — so the table itself is richer even before opening the drawer. Consider adding search/filter/sort + pagination to the requests list (currently it has none — unlike the reviews list which already has all four).

---

## 6. CONSOLIDATED OPEN QUESTIONS (resolve before/within planning)
1. **Enum PR split:** ship all ~18 fields in one migration, or split closed-sets vs lifecycle-tracks into two PRs (recommended)?
2. **Funnel terminal metric:** before attribution (#5) lands, is the honest "converted" number `redirectedToGoogleAt` (click-through), and do we label the true "Posted" stage as pending? Confirm.
3. **`Event.eventType` exception:** keep it a `String` (append-only log shouldn't need a migration per new type) even under "full enums"? (Recommended.)
4. **Timeline source of truth:** merge `Event` + `StepExecution` + status tracks (recommended), and are Postmark webhook events currently written to `Event`? (Verify — if not, add it so the timeline is complete.)
5. **Scope of campaign-performance metrics** (B3): in this iteration or deferred to a later campaign-analytics PR?
6. **Requests list UX:** add search/filter/sort/pagination now (parity with reviews list) or just the drawer + extra columns?

---

*Feed §PROJECT BRIEF (constraints + scope) plus Tracks A/B/C into the cross-module phased planner. The planner should treat A, B, C as three dependency-light parallel tracks, with Track B's "Posted" stage and Track C's completeness both soft-depending on the attribution pipeline (#5) and the follow-up scheduler (#1).*
