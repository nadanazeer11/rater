# Rater — context for Claude

> Read this first. Auto-loaded by Claude Code and Cursor's Claude extension. Self-contained — everything you need to be useful in this repo.

## What this is

`rater` is a B2B-SMB review collection platform targeting the **Middle East** market — Prosperly/Birdeye/Podium-style. Built solo by Nada (mid software engineer). The flow: business uploads customer CSV → platform sends a campaign email (from the business's own domain) → follow-ups for non-responders → high ratings routed to Google review, low ratings routed to a private feedback form.

The user has chosen to ship rating-based review gating despite Google's policy. Don't re-litigate this. Only flag the *downstream* risk to *their customers'* Google listings (de-ranking/removal) when relevant.

## Feature docs

Detailed per-feature reference docs live in `docs/` (how *and why* things are built — the stuff you can't recover from the code). **Read the relevant one before working in that area**, and **update it in the same PR that changes the feature** (same discipline as tests). New feature → new `docs/<area>.md` copied from `docs/_template.md` + a line in the index below. Read on demand, not all at once. How the system works: [docs/README.md](docs/README.md).

Index:
- [docs/architecture.md](docs/architecture.md) — repo layout, the API clean-architecture module pattern, BullMQ wiring, Prisma/DB conventions, Supabase auth, dev quirks. *Read this once; most feature docs assume it.*
- [docs/review-requests.md](docs/review-requests.md) — the `ReviewRequest` lifecycle: single + bulk "Request a review" (the `Customer` is upserted in the background), the lazily-created default campaign, the public `/rate/[token]` page, routing a rating to Google vs a private feedback form, the cooldown.
- [docs/customers.md](docs/customers.md) — Customers: the `Customer` model, the `CustomersRepository` (consumed by review-requests to upsert/look up customers), the read-only `/dashboard/customers` list. Customers are created via review requests, not directly.
- [docs/campaigns.md](docs/campaigns.md) — Campaigns: the `Campaign`/`CampaignStep` model, the `/dashboard/campaigns` editor (name + email steps + follow-up triggers, live `{{token}}` preview), "newest active = default", the campaign picker on review requests. Nothing sends/schedules yet — editor only.
- [docs/google-reviews.md](docs/google-reviews.md) — Google reviews: the read-only `/dashboard/reviews` list backed by the `GoogleReview` table the scrape worker populates. No mutations — purely a window onto the scrape output.
- [docs/sending.md](docs/sending.md) — Sending: how the initial review-request email leaves the system (Postmark queue + worker + webhook), the `ReviewRequestStepExecution` row that anchors webhook updates, the `POSTMARK_SERVER_TOKEN` stub fallback. Follow-up step scheduling is not built yet.
- [docs/analytics.md](docs/analytics.md) — Analytics: the read-only `analytics` API module (`/analytics/overview` + `/analytics/funnel`) powering the location overview cards + the Sent→…→Posted conversion funnel; all plain Prisma counts over the status tracks, no new schema. "Posted" is a placeholder stage until attribution lands.
- [docs/scheduler.md](docs/scheduler.md) — Follow-up scheduler: the BullMQ evaluator that fires configured follow-up `CampaignStep`s (delayed jobs + 15-min reconciliation sweep), the due-time anchors, and the **send-time predicate re-check** (a follow-up is skipped, not sent, if its condition no longer holds). Default campaign now seeds 2 follow-ups.
- [docs/attribution.md](docs/attribution.md) — Google-review attribution: matches a posted Google review back to the request that produced it (name + timing scorer — Google never exposes reviewer email), auto-confirms high confidence, queues the rest for a manual "It's them / Not them" review, and makes the funnel's "Posted" stage real. Incremental Outscraper sync + daily sweep.

## Stack

- **Backend:** NestJS 11 (`apps/api` + `apps/worker`)
- **Frontend:** Next.js 15 (App Router) + MUI v6 + Tailwind v4 (`apps/web`)
- **DB + Auth:** Supabase. Project URL `https://fflwyvqvhxsoccynskjq.supabase.co`, region `eu-west-1`. Use the **Session pooler URL** (port 5432, host `aws-0-eu-west-1.pooler.supabase.com`) — direct URL is IPv6-only on free tier.
- **ORM:** Prisma 6
- **Auth:** Supabase Auth, magic-link (passwordless). New publishable/secret key model (`sb_publishable_*`, `sb_secret_*`). JWT verified via JWKS using `jose` in api.
- **Jobs:** BullMQ + Upstash Redis (planned, not yet wired)
- **Email:** Postmark (worker sends the initial review-request email; webhook updates `deliveryStatus`/`engagementStatus`)
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
- **Styling split:** MUI for forms / inputs / dialogs / menus / autocomplete (styled via the theme + `sx`); Tailwind utilities for page shells, layouts, and plain HTML elements. Don't put Tailwind utility classes on MUI components — `enableCssLayer` puts MUI in a later cascade layer so it'd win anyway. **Same trap on parents:** to space MUI siblings (TextField, Alert, Button…) use `flex flex-col gap-N` — `space-y-N` adds `margin-top` to children and MUI's cascade-layer reset wipes it, so the inputs end up flush.
- **Reusable bits:** `apps/web/components/` — `logo`, `star-rating` (`StarRating`/`Stars`), `brand-panel` + `auth-shell` (split-screen for sign-in / auth-error / invite), `empty-state`. The dashboard's own chrome lives in `apps/web/app/dashboard/`: `sidebar.tsx` (nav + locations switcher + add-location), `dashboard-header.tsx` (in-main top bar + account menu, owns sign-out), `location-detail.tsx`, `add-location-dialog.tsx` (controlled; `add-location-button.tsx` is a thin trigger wrapper).

## Repo + git/SSH setup (important)

- Local checkout: `/home/nada/personal/rater`
- GitHub: `git@github.com:nadanazeer11/rater.git` (personal account, NOT the work `nada-nazeer`/Nawy account)
- **SSH host alias `github-nadanazeer11`** is configured in `~/.ssh/config` and uses `~/.ssh/id_ed25519_nadanazeer11`. The repo's remote URL uses this alias: `git@github-nadanazeer11:nadanazeer11/rater.git`
- **Local git config (per-repo only, NEVER global):** `Nada Nazeer <nadanazeer11@gmail.com>`
- **`gh` CLI is NOT installed.** Push branches and provide the auto-returned `https://github.com/nadanazeer11/rater/pull/new/<branch>` URL — user opens PRs manually
- **Default git's user identity is the work account** — every new branch needs the personal local config. Already set on this repo.

## Running locally

From the monorepo root (`/home/nada/personal/rater`):

```bash
pnpm dev                       # everything (turbo runs all apps in parallel)
pnpm --filter @rater/web dev   # frontend only — http://localhost:3001
pnpm --filter @rater/api dev   # backend only — http://localhost:4000
pnpm --filter @rater/worker dev  # worker only
```

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
- **Default ports:** api 4000, web 3001 (3000 is often taken by other projects locally). Override with `PORT=` env var if needed.
- **CORS** in api allows the origin from `NEXT_PUBLIC_APP_URL` (defaults to `http://localhost:3001`)
- **pnpm warnings about ignored build scripts** (`@nestjs/core`, `@prisma/client`, `prisma`, `sharp`) are expected. Pin in root `package.json`'s `pnpm.onlyBuiltDependencies` if you want them silenced — see `TODO.md`

## Conventions

- **Status/category fields are Prisma enums.** `ReviewRequest` keeps its four orthogonal status tracks (`deliveryStatus`, `engagementStatus`, `ratingStatus`, `googleAttributionStatus`), now enum-typed. Vocabularies are a single cross-app source in `packages/types/src/enums.ts` (mirrors the Prisma enums; web/api/worker import from `@rater/types`, never re-declare). DTOs validate via `@IsIn(...)`. Adding a value is now a migration. **Exception:** `Event.eventType` stays a `String` (append-only log accepts new types without a migration).
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
12. **Dashboard shell + location selector**: sidebar-driven layout — left rail (nav, "coming soon" sections, switchable locations list with colored dots, add-location, promo) + in-main header (account menu, sign-out) + per-location detail view (hero with rating/address/role/scraping-baseline pills + 3 placeholder "Overview" stat cards). Selected location via `?location=<id>` searchParam (defaults to first). Backend: rejects adding a Location whose `googlePlaceId` already exists in the business, and rejects duplicate place ids within a single onboarding payload.
13. **"Iris" design system**: see the Brand section — indigo-violet accent, Geist, crisp/flat surfaces; MUI restyled via theme + Tailwind v4 tokens. The API was also moved to a repository/mapper/DTO clean-architecture layout in the same pass.
14. **Customers** (read-only list at `/dashboard/customers`) — customers are created as a side effect of review requests, not added directly; `GET /customers` + `CustomersRepository`. See [docs/customers.md](docs/customers.md).
15. **Review requests** — single + bulk "Request a review" (the `Customer` is upserted in the background; single = dialog, bulk = CSV); a default campaign is auto-created lazily; the public `/rate/[token]` page (rating ≥ `positiveRatingThreshold` → the Google review link, below → a private feedback form → `FeedbackSubmission`); a requests list; `customerCooldownDays` guard. **No email send yet** — the dashboard hands you the rate link to share. See [docs/review-requests.md](docs/review-requests.md).
16. **Web data-layer cleanup** — `apps/web/app/dashboard/layout.tsx` + `dashboard-shell.tsx` make the sidebar/header a persistent shell (no more full-page reload / white flash when switching tabs or locations — location switch is now a soft `router.replace` of `?location=`). TanStack Query for mutations (one `useMutation` hook per write endpoint in `apps/web/hooks/`), reads stay server-rendered. Shared wire types in `@rater/types`. Request timeouts in the fetch helpers. See [docs/architecture.md](docs/architecture.md) → Web app.
17. **Campaigns** — a `campaigns` API module (`GET`/`POST`/`PATCH`/`DELETE`, no migration — the schema already had `Campaign`/`CampaignStep`) + the `/dashboard/campaigns` tab: a list, and a per-campaign editor for the name, the initial email, and follow-up steps (preset triggers + a "send after N days"), with a live client-side `{{token}}` preview. "Default" = the location's newest active campaign; review-request creation takes an optional `campaignId` (the dialogs show a picker when there's more than one). **Nothing sends or schedules the steps yet** — editor only; the seed-campaign lazy-create moved from `ReviewRequestsRepository` to `CampaignsRepository.getOrCreateDefault`. See [docs/campaigns.md](docs/campaigns.md).
18. **Reviews tab** — `/dashboard/reviews`, a read-only list of the `GoogleReview` rows the baseline scrape writes. New `google-reviews` API module with offset pagination (page/pageSize, capped at 100), case-insensitive search across reviewer name + text, a rating filter (1–5), and 4-way sort (newest / oldest / highest / lowest) — all on the backend via Prisma `$transaction(findMany + count)`. Frontend has a debounced search input, rating chips, sort dropdown, and Prev/Next footer; TanStack Query uses `keepPreviousData` so paging doesn't flash a skeleton. Empty state distinguishes "baseline still running" / "baseline done, zero reviews" / "no matches for current filter". No new schema. See [docs/google-reviews.md](docs/google-reviews.md).
19. **Postmark email send (initial step)** — creating a review request (single or bulk) now enqueues a `send-review-request-email` job; the worker fetches the request + customer + location + business + the campaign's `initial` step, renders subject/body via the shared `renderTemplate` (the same helper the editor preview uses, moved to `packages/types/src/templates.ts`), and sends via Postmark. Per send writes a `ReviewRequestStepExecution` row (with a new `@unique` constraint on `postmarkMessageId` so the webhook lookup is a point read) and flips `ReviewRequest.deliveryStatus`. New `WebhooksModule` at `POST /webhooks/postmark` (HTTP Basic auth via env) consumes Postmark's Delivery/Bounce/Open/SpamComplaint events and updates `deliveryStatus` / `engagementStatus` + `Customer.emailStatus`. The request dialogs drop the copy-link UI for a "Sent ✓" confirmation; the per-row copy-link button on the requests list stays for ops debugging. Postmark token + from-email + webhook Basic Auth are env-only for now (no per-location Settings UI yet — `Location.postmarkServerToken` / `fromEmailDomain` columns stay unused). Stub fallback: missing/`stub` `POSTMARK_SERVER_TOKEN` → emails logged not sent, `deliveryStatus` still flips, dev loop works end-to-end. **Follow-up steps still don't fire.** See [docs/sending.md](docs/sending.md).

## File patterns to know

- `apps/api/src/auth/auth.guard.ts` — JWT verification via JWKS; lazy-init the `createRemoteJWKSet`
- `apps/api/src/prisma/prisma.service.ts` — extends `PrismaClient` + `onModuleInit`/`onModuleDestroy`
- `apps/api/src/{onboarding,locations,invitations,customers,campaigns,review-requests,google-reviews}/` — module/controller/service/repository/mapper/dto pattern. All use `class-validator` DTOs and the global `ValidationPipe`. All authed routes use `@UseGuards(AuthGuard)`. `campaigns` exports `CampaignsRepository` (consumed by `review-requests` to resolve a request's campaign).
- `apps/api/src/me/me.controller.ts` — single fetch returns `{ id, email, onboarded, locations[] }` for the dashboard
- `apps/web/lib/supabase/{server,client,middleware}.ts` — three Supabase clients for the three Next.js contexts. Strict-typed cookie callbacks.
- `apps/web/middleware.ts` — gates `/dashboard`, redirects to `/sign-in`. Calls `updateSession`.
- `apps/web/lib/api.ts` — `apiGet`/`apiPost`/`apiPatch`/`apiDelete` browser helpers, attach Bearer from current Supabase session, 15s timeout. `apps/web/lib/server-api.ts` — minimal server-only fetchers (`fetchCampaign` for the SSR editor's `notFound()`, public-token lookups for `/rate` + `/invite`). Wire response shapes are shared types in `@rater/types` (`packages/types/src/api.ts`) — don't re-declare API response shapes in the web app.
- `apps/web/app/providers.tsx` + `apps/web/lib/query-client.ts` — TanStack Query, used for **both reads and mutations**. Default `staleTime: 5 * 60_000` (rater isn't a live ticker — mutations invalidate the keys they touch; external changes accept the 5-min staleness window). Read hooks in `apps/web/hooks/use-{me,customers,campaigns,requests}.ts` (each exports a `<resource>QueryKey` helper for invalidation, guarded by `enabled: !!locationId`); mutation hooks (`use-*.ts`) call `invalidateQueries` in `onSuccess`, not `router.refresh()`. Don't hand-roll `useState(submitting)`/`useState(error)` — use a hook.
- `apps/web/app/dashboard/layout.tsx` + `dashboard-context.tsx` + `dashboard-shell.tsx` — layout verifies the session via cookie (no `/me` round-trip per nav). `DashboardProvider` owns `me` (via `useMe()`) and the resolved selected `location` (from `?location=`); shell + pages read `{ me, location, locations, canAddLocation, selectLocation }` via `useDashboard()` — no prop drilling, no `fetchMe` in pages. List pages (`customers/page.tsx`, `campaigns/page.tsx`, `requests/page.tsx`) are server stubs that just render the client list component; data flows through TanStack Query. `loading.tsx` for the list routes was deliberately removed (the cache makes them harmful skeleton flashes on every nav); the SSR `/dashboard/campaigns/[id]` editor keeps its `loading.tsx`. Location switch = soft `router.replace` of `?location=`, never a hard nav.
- `apps/web/app/onboarding/{location-step,google-maps-loader,business-step,onboarding-wizard}.tsx` — reusable wizard pieces. Used by both onboarding modal and add-location dialog and (eventually) anywhere we pick a Google place.

## What's next

The core review-request loop is in (single + bulk request creation, the public rating page — see [docs/review-requests.md](docs/review-requests.md)). Roughly in order, each its own PR + `docs/*.md`:

1. **Follow-up step scheduler** — the campaign editor lets you *configure* follow-up steps; now make them fire: a BullMQ scheduler that runs a step when the `CampaignStep.requiredState` predicate matches (e.g. "not rated after N days", "rated positive but no Google review yet"). The send pipeline + `ReviewRequestStepExecution` are already wired by the Postmark PR — this PR adds the scheduler that creates the executions on time.
2. **Per-location Postmark settings UI** — a `/dashboard/settings` page (admin-only) for `Location.fromEmailDomain` / `postmarkServerToken` / `postmarkMessageStream`, plus `PATCH /locations/:id`. Needed before we exit Postmark test mode and serve multiple verified sender domains.
3. **Dashboard wiring** — turn the three "Overview" stat cards into real counts; a fuller requests table (filters, engagement timeline).
4. **Google-review attribution** — incremental review syncs (the `ReviewSync` machinery exists), matching a posted Google review back to a request, a manual-confirmation queue for low-confidence matches.

## Required external services (status)

| Service | Status | Where used |
|---|---|---|
| Supabase | ✅ wired | DB + Auth |
| Google Places API | ✅ wired | Onboarding location picker (`NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`) |
| Outscraper | ✅ wired (stubbed locally if `OUTSCRAPER_API_KEY` unset) | Baseline scrape + future Google review syncs |
| Upstash Redis | ✅ wired (`REDIS_URL`; the API producer no-ops if unset) | BullMQ queue backend |
| Postmark | ✅ wired (stubbed locally if `POSTMARK_SERVER_TOKEN` unset) | Email delivery (initial review-request email; later: follow-ups, branded magic-link) |
| Sentry / BetterStack | ⏳ deferred | Observability |

## TODO.md

Project-level non-code work (external setup, security tasks, deferred tech debt, future roadmap items) lives in `TODO.md` at repo root. Update it when something deferred ships, when a new account/dashboard config is needed, or when a "later" item is identified. Code-level TODOs go inline as `// TODO:` comments, NOT in this file.

## Working conventions

- **PR-per-feature.** Push to GitHub, give the auto-returned `pull/new/<branch>` URL.
- **Every PR before push:** `pnpm -r typecheck` + `pnpm -r build`. Smoke-test endpoints with `curl` (401 without auth, 403 without role, etc.). **Update/add the relevant `docs/<area>.md`** (and its index line in the Feature docs section above).
- **Auto mode is on by default.** Execute, don't ask routine questions. Make reasonable assumptions and proceed on low-risk work. Real architectural forks deserve a brief check-in.
- **Commit messages:** imperative mood, explain the *why*, list smoke results, end with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **Don't write *ad-hoc* docs files** unless asked. The two doc surfaces that *are* maintained: this `CLAUDE.md`, and the per-feature `docs/` (see the "Feature docs" section near the top) — a feature PR updates its `docs/<area>.md`. Nothing else (no scattered READMEs, no design notes).
- **No comments in code** unless the *why* is non-obvious. Don't explain what well-named code already says.
- **Don't add backward-compat shims**, dead-code re-exports, or "removed in PR #X" comments. Just delete cleanly.
