# Rater — context for Claude

> Read this first. Auto-loaded by Claude Code and Cursor's Claude extension. Self-contained — everything you need to be useful in this repo.

## What this is

`rater` is a B2B-SMB review collection platform targeting the **Middle East** market — Prosperly/Birdeye/Podium-style. Built solo by Nada (mid software engineer). The flow: business uploads customer CSV → platform sends a campaign email (from the business's own domain) → follow-ups for non-responders → high ratings routed to Google review, low ratings routed to a private feedback form.

The user has chosen to ship rating-based review gating despite Google's policy. Don't re-litigate this. Only flag the *downstream* risk to *their customers'* Google listings (de-ranking/removal) when relevant.

## Stack

- **Backend:** NestJS 11 (`apps/api` + `apps/worker`)
- **Frontend:** Next.js 15 (App Router) + MUI v6 + Tailwind v4 (`apps/web`)
- **DB + Auth:** Supabase. Project URL `https://fflwyvqvhxsoccynskjq.supabase.co`, region `eu-west-1`. Use the **Session pooler URL** (port 5432, host `aws-0-eu-west-1.pooler.supabase.com`) — direct URL is IPv6-only on free tier.
- **ORM:** Prisma 6
- **Auth:** Supabase Auth, magic-link (passwordless). New publishable/secret key model (`sb_publishable_*`, `sb_secret_*`). JWT verified via JWKS using `jose` in api.
- **Jobs:** BullMQ + Upstash Redis (planned, not yet wired)
- **Email:** Postmark (planned, not yet wired)
- **Reviews data:** Outscraper (planned, not yet wired)
- **Hosting target:** Vercel (web) + Railway/Fly (api + worker)
- **Monorepo:** Turborepo + pnpm. `apps/web`, `apps/api`, `apps/worker`, `packages/db`, `packages/types`, `packages/config`. All workspace packages scoped `@rater/*`.

## Brand — "Iris" palette (redesigned)

- **Accent (single accent — keep it single):** `#4F46E5` indigo-violet, hover `#4338CA`, soft `#EEF2FF`. This is `palette.primary` in MUI.
- **Neutrals:** cool zinc — bg `#FAFAFA`, surface `#FFFFFF`, border `#E4E4E7`, ink `#18181B`, muted `#52525B`, faint `#A1A1AA`
- **Semantic:** star/amber `#F59E0B` (Google ratings + MUI `Rating`), danger/rose `#E11D48`, positive/emerald `#059669`
- **Typography:** **Geist** Sans (everything) + Geist Mono (numerals, IDs, share-links) via the `geist` npm package, wired in `apps/web/app/layout.tsx` as `--font-geist-sans` / `--font-geist-mono`. **No Inter.**
- **Surfaces:** crisp & flat — 1px hairline borders, near-zero tinted shadow, 12px card / 16px dialog radius. Dashboard lists use one bordered surface with `divide-y` rows, not stacked boxed cards.
- **Two sources of truth, kept in sync:** `apps/web/lib/theme.ts` (MUI theme + component overrides) and the `@theme` block in `apps/web/app/globals.css` (Tailwind v4 tokens → `bg-accent`, `text-ink`, `border-border`, `rounded-card`, `font-mono`, `.tactile`, etc.). Change both.
- **Styling split:** MUI for forms / inputs / dialogs / menus / autocomplete (styled via the theme + `sx`); Tailwind utilities for page shells, layouts, and plain HTML elements. Don't put Tailwind utility classes on MUI components — `enableCssLayer` puts MUI in a later cascade layer so it'd win anyway.
- **Reusable bits:** `apps/web/components/` — `logo`, `star-rating` (`StarRating`/`Stars`), `brand-panel` + `auth-shell` (split-screen for sign-in / auth-error / invite), `empty-state`, `skeleton-rows`, `top-bar` (dashboard sticky header + account menu, owns sign-out).

## Repo + git/SSH setup (important)

- Local checkout: `/home/nada/personal/rater`
- GitHub: `git@github.com:nadanazeer11/rater.git` (personal account, NOT the work `nada-nazeer`/Nawy account)
- **SSH host alias `github-nadanazeer11`** is configured in `~/.ssh/config` and uses `~/.ssh/id_ed25519_nadanazeer11`. The repo's remote URL uses this alias: `git@github-nadanazeer11:nadanazeer11/rater.git`
- **Local git config (per-repo only, NEVER global):** `Nada Nazeer <nadanazeer11@gmail.com>`
- **`gh` CLI is NOT installed.** Push branches and provide the auto-returned `https://github.com/nadanazeer11/rater/pull/new/<branch>` URL — user opens PRs manually
- **Default git's user identity is the work account** — every new branch needs the personal local config. Already set on this repo.

## Dev environment quirks

- **pnpm `10.9.2` doesn't exist on the npm registry** even though it reports as the local version. Use `pnpm@10.33.4` in `packageManager` field (already pinned in root `package.json`)
- **Prisma `migrate dev` doesn't work non-interactively.** Use the diff-and-deploy pattern (see existing migrations):
  ```bash
  set -a && source /home/nada/personal/rater/.env && set +a
  cd packages/db
  TIMESTAMP=$(date -u +%Y%m%d%H%M%S)
  MIG_DIR="prisma/migrations/${TIMESTAMP}_<name>"
  mkdir -p "$MIG_DIR"
  npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel ./prisma/schema.prisma --script > "$MIG_DIR/migration.sql"
  npx prisma migrate deploy
  ```
- **Always `set -a && source .env && set +a`** before any `prisma` command — the CLI doesn't auto-load `.env` from the monorepo root
- **Next.js doesn't auto-load monorepo-root `.env`** — `apps/web/next.config.ts` loads it explicitly via `dotenv`
- **API loads `.env` from monorepo root** via `@nestjs/config` `envFilePath: [join(__dirname, '../../../.env')]`
- **`.env.local` is also supported** at the monorepo root, override-style
- **Default ports:** api 4000, web 3000. May be in use locally — override with `PORT=` env var or `next dev -p 3001`
- **CORS** in api allows the origin from `NEXT_PUBLIC_APP_URL` (defaults to `http://localhost:3000`)
- **pnpm warnings about ignored build scripts** (`@nestjs/core`, `@prisma/client`, `prisma`, `sharp`) are expected. Pin in root `package.json`'s `pnpm.onlyBuiltDependencies` if you want them silenced — see `TODO.md`

## Conventions

- **Status fields are strings, not Prisma enums** — extensibility over rigidity. `ReviewRequest` has four orthogonal string-typed status tracks: `deliveryStatus`, `engagementStatus`, `ratingStatus`, `googleAttributionStatus`. Validate at the app layer.
- **Predicates and config use `Json` columns** (`CampaignStep.requiredState`, `NotificationRule.recipients`, `Event.payload`, `GoogleReviewSnapshot.distribution`)
- **Soft delete only where audit matters:** `Customer`, `ReviewRequest`, `GoogleReview`, `Location`. NOT on Event log (immutable), Campaign/CampaignStep (cascade)
- **Multi-tenancy is app-level**, not Postgres RLS. Every tenant-scoped row has `locationId` indexed; app guards filter
- **Customer email unique per-location** (`@@unique([locationId, email])`) — same person can be a customer of multiple businesses
- **`@db.Text`** on long string columns (templates, feedback text, review text, error messages)
- **Snake_case in DB, camelCase in TS** via `@map`/`@@map` on every model
- **Roles:** `'admin'` or `'member'` strings on `LocationUser`. Self-onboarders get `admin` on their own locations. Invited users get the role from the invite (default `member`).

## Architectural principles (user-stated)

- **Build for extensibility from day one.** Orthogonal status tracks > one mega-state. Step-based campaigns with trigger predicates > hardcoded "initial + 2 follow-ups." Append-only `Event` log so new features = new event types, not migrations.
- **Notifications:** email-only for MVP. No in-app — users see status in a request table. Hardcode default rules but keep `NotificationRule` table from day one for future configurability.
- **MVP scope:** CSV upload + single-customer form for ingestion. API/webhook ingestion deferred. WhatsApp deferred (parked as ME upsell).

## What's done so far

All in main:

1. Monorepo scaffold (Turborepo + pnpm)
2. Full Prisma schema (15 models): `Business`, `Location`, `LocationUser`, `Customer`, `Campaign`, `CampaignStep`, `ReviewRequest`, `ReviewRequestStepExecution`, `RatingSubmission`, `FeedbackSubmission`, `Event`, `GoogleReview`, `GoogleReviewSnapshot`, `ReviewSync`, `NotificationRule`, plus `Invitation`
3. Init migration applied to Supabase
4. Auth field rename (`clerkUserId` → `authUserId` UUID; dropped `clerkOrganizationId`)
5. API wiring: `PrismaModule` (extends `PrismaClient` with lifecycle hooks), `/health` does real DB ping
6. Frontend Supabase Auth: `@supabase/ssr` cookies, magic-link sign-in at `/sign-in`, protected `/dashboard`, middleware refreshes session + redirects
7. MUI theme — "Iris" indigo-violet accent over zinc neutrals, Geist font, flat/crisp surfaces (see Brand section)
8. JWT verification guard (`apps/api/src/auth/auth.guard.ts`) using `jose` + JWKS, `@CurrentUser()` decorator, `GET /me`
9. **Onboarding flow** as a dialog forced open on `/dashboard` when `me.onboarded === false`. 2-step wizard: business name + 1/2/3 locations toggle, then Google Places picker per location. POST `/onboarding` creates `Business` + `Location[]` + `LocationUser[]` (admin) atomically.
10. **Add-location dialog** on dashboard for existing admins. Reuses the same `LocationStep` + `GoogleMapsLoader`.
11. **Team invitations** (`feat/team-invitations`, just merged): admin generates a tokenized link from a per-location button, recipient opens link → magic-link sent inline → bounces back to `/invite/[token]` signed in → auto-accepts → `/dashboard`. **Email delivery deferred** — admin gets a "Copy link" UI for now.

## File patterns to know

- `apps/api/src/auth/auth.guard.ts` — JWT verification via JWKS; lazy-init the `createRemoteJWKSet`
- `apps/api/src/prisma/prisma.service.ts` — extends `PrismaClient` + `onModuleInit`/`onModuleDestroy`
- `apps/api/src/{onboarding,locations,invitations}/` — module/controller/service/dto pattern. All use `class-validator` DTOs and the global `ValidationPipe`. All authed routes use `@UseGuards(AuthGuard)`.
- `apps/api/src/me/me.controller.ts` — single fetch returns `{ id, email, onboarded, locations[] }` for the dashboard
- `apps/web/lib/supabase/{server,client,middleware}.ts` — three Supabase clients for the three Next.js contexts. Strict-typed cookie callbacks.
- `apps/web/middleware.ts` — gates `/dashboard`, redirects to `/sign-in`. Calls `updateSession`.
- `apps/web/lib/api.ts` — `apiPost`/`apiGet` browser helpers, attaches Bearer from current Supabase session
- `apps/web/lib/server-api.ts` — `fetchMe()` and `fetchInvitation()` server-side helpers
- `apps/web/app/onboarding/{location-step,google-maps-loader,business-step,onboarding-wizard}.tsx` — reusable wizard pieces. Used by both onboarding modal and add-location dialog and (eventually) anywhere we pick a Google place.

## What's next: Path A (real Google data on the dashboard)

### PR #11 — persist Google rating + reviews count + address on Location (~1 hour)

**Goal:** Every location card shows live Google ★ rating + review count + address. No background jobs, no Outscraper. We already fetch these in the onboarding Places picker — just save them.

**Schema:** add to `Location`:
```prisma
googleRating       Float?  @map("google_rating")
googleReviewsCount Int?    @map("google_reviews_count")
googleAddress      String? @map("google_address")
```
Migration name: `add_google_metadata`. Use the diff-and-deploy pattern.

**Backend:**
- Extend `OnboardingDto` and `CreateLocationDto` with the new optional fields
- Update `OnboardingService` and `LocationsService` to persist them
- Extend `/me` location summary in `apps/api/src/me/me.controller.ts` to include them

**Frontend:**
- `apps/web/app/onboarding/location-step.tsx` already pulls rating/total/address from Places `getDetails`. Plumb them through `LocationDraft` (`onboarding-wizard.tsx`) and `add-location-button.tsx` to the POST body
- Extend `LocationSummary` in `apps/web/lib/server-api.ts`
- `apps/web/app/dashboard/page.tsx` — render under the location name (small ★/count/address row)

**Verify:** new locations show the data; existing ones don't (acceptable, no backfill)

### PR #12 — Outscraper baseline scrape via BullMQ (~half day)

**Goal:** When a Location is created with a `googlePlaceId`, queue a worker job that pulls the full Google review history into `GoogleReview` + `GoogleReviewSnapshot` (with `is_baseline: true`). Foundation for attribution later.

**External setup the user must do first:**
1. **Outscraper** — sign up at outscraper.com (free $25 credit). Get API key from Profile → API and Integrations. `OUTSCRAPER_API_KEY=` in `.env`.
2. **Upstash Redis** — sign up at upstash.com, create DB in `eu-west-1`. `REDIS_URL=` in `.env` (looks like `rediss://default:<token>@<host>.upstash.io:6379`).

**Schema:** add `Location.baselineScrapedAt DateTime? @map("baseline_scraped_at")` as completion marker.

**Backend (`apps/api`):**
- Install `bullmq`
- `apps/api/src/queue/queue.module.ts` — global BullMQ wiring against `REDIS_URL`
- `apps/api/src/queue/scrape.queue.ts` — producer that adds `baseline-scrape` jobs `{ locationId }`
- Call from `OnboardingService.run` and `LocationsService.createForCurrentBusiness` after the transaction commits

**Worker (`apps/worker`):**
- Install `bullmq`, `axios`, add `@rater/db` workspace dep
- Bootstrap NestJS standalone, register a BullMQ Worker on `baseline-scrape`
- `apps/worker/src/scrape/outscraper.service.ts` — wraps Outscraper Google Maps Reviews API (`POST https://api.app.outscraper.com/maps/reviews-v3?query=<place_id>&reviewsLimit=0&async=true`). For MVP: synchronous polling on the results endpoint until done.
- `apps/worker/src/scrape/scrape.processor.ts`:
  1. Open `ReviewSync` row (`syncType: 'baseline'`)
  2. Call Outscraper, fetch all reviews
  3. Compute aggregate (count, average, distribution)
  4. Insert `GoogleReviewSnapshot` (`is_baseline: true`)
  5. Bulk insert `GoogleReview` rows. For `external_id`: use Google's `review_id` if returned, fallback to `sha256(reviewer_name + text + posted_at)`. Set `firstSeenInSyncId` to this sync's id.
  6. `Location.baselineScrapedAt = now()`
  7. Close `ReviewSync`: `status: 'completed'`, `completedAt`, counts
  8. **No side effects:** baseline scrape MUST NOT trigger attribution, notifications, or events on `review_requests` — purely inventory

**Frontend:** show `baselineScrapedAt`-aware state on dashboard cards (e.g., "X reviews when you joined" line). Optional: small "Scraping reviews…" indicator on cards <60s old without a baseline yet.

**Verify:** new location → BullMQ job queued → worker (`pnpm --filter @rater/worker dev`) processes → `GoogleReviewSnapshot` (`is_baseline: true`) and `GoogleReview` rows in Supabase. Outscraper dashboard shows the API call. Re-running scrape doesn't dupe rows (the `(locationId, externalId)` unique constraint on `GoogleReview` enforces this).

## Required external services (status)

| Service | Status | Where used |
|---|---|---|
| Supabase | ✅ wired | DB + Auth |
| Google Places API | ✅ wired | Onboarding location picker (`NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`) |
| Outscraper | ⏳ needed for PR #12 | Baseline + future Google review syncs |
| Upstash Redis | ⏳ needed for PR #12 | BullMQ queue backend |
| Postmark | ⏳ deferred | Email delivery (invitations + review-request emails) |
| Sentry / BetterStack | ⏳ deferred | Observability |

## TODO.md

Project-level non-code work (external setup, security tasks, deferred tech debt, future roadmap items) lives in `TODO.md` at repo root. Update it when something deferred ships, when a new account/dashboard config is needed, or when a "later" item is identified. Code-level TODOs go inline as `// TODO:` comments, NOT in this file.

## Working conventions

- **PR-per-feature.** Push to GitHub, give the auto-returned `pull/new/<branch>` URL.
- **Every PR before push:** `pnpm -r typecheck` + `pnpm -r build`. Smoke-test endpoints with `curl` (401 without auth, 403 without role, etc.).
- **Auto mode is on by default.** Execute, don't ask routine questions. Make reasonable assumptions and proceed on low-risk work. Real architectural forks deserve a brief check-in.
- **Commit messages:** imperative mood, explain the *why*, list smoke results, end with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **Don't write docs files** (README, *.md) unless explicitly asked. (This `CLAUDE.md` is the exception — it's the one Claude-context file.)
- **No comments in code** unless the *why* is non-obvious. Don't explain what well-named code already says.
- **Don't add backward-compat shims**, dead-code re-exports, or "removed in PR #X" comments. Just delete cleanly.
