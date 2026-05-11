# Architecture & conventions

> **Scope:** the cross-cutting stuff most feature docs assume — repo layout, the API clean-architecture pattern, BullMQ wiring, Prisma/DB conventions, Supabase auth, dev quirks. `CLAUDE.md` has the condensed version (Stack / Conventions / Dev environment quirks sections); this is the detail. For the UI side (Iris palette, Geist, MUI+Tailwind split) see `CLAUDE.md` → Brand and (eventually) `docs/design-system.md`.
> **Last updated:** 2026-05-11 (PR #17 — `feat/customers`)

## Monorepo

Turborepo + pnpm. `apps/web` (Next 15, App Router), `apps/api` (NestJS 11 HTTP), `apps/worker` (NestJS 11 standalone — BullMQ consumer, no HTTP), `packages/db` (Prisma client + schema, exported as `@rater/db`), `packages/types` (shared TS types, e.g. the `ApiError` shape), `packages/config`. All workspace packages are scoped `@rater/*`. pnpm is pinned to `10.33.4` in the root `package.json` (the version it self-reports, `10.9.2`, doesn't exist on the registry).

## API — clean-architecture module pattern

Every feature module under `apps/api/src/<name>/` has the same layers; copy an existing one (`locations/`, `invitations/`, `customers/`) when adding a feature:

- **`<name>.module.ts`** — `@Module({ controllers: [...], providers: [Service, Repository] })`. Register it in `apps/api/src/app.module.ts`.
- **`<name>.controller.ts`** — `@Controller('<route>')`, thin: pulls `@CurrentUser()` + `@Body()`/`@Query()`/`@Param()` and delegates to the service. Authed routes: `@UseGuards(AuthGuard)` (on the class or the method). Set explicit `@HttpCode(...)` where it isn't 200/201.
- **`<name>.service.ts`** — the business logic + authorization checks; throws Nest HTTP exceptions (`ForbiddenException`, `ConflictException`, `BadRequestException`, `NotFoundException`, …). Never touches `PrismaService` directly — goes through the repository.
- **`<name>.repository.ts`** — the only place that talks to Prisma. Exposes intention-named methods (`findAdminMembership`, `listActiveByLocation`, …). Multi-write operations go through `runInTransaction<T>(fn)` (`= prisma.$transaction(fn)`); `*InTx` methods take the `Prisma.TransactionClient`.
- **`<name>.mapper.ts`** — `toXResponse(row)` functions that turn Prisma rows into the response DTO shape (so the wire shape is decoupled from the DB shape).
- **`dto/`** — request DTOs are classes with `class-validator` decorators (validated by the global `ValidationPipe`); response DTOs are plain classes used as types only.

Cross-cutting (in `apps/api/src/`):
- **`common/all-exceptions.filter.ts`** — catches everything and emits a uniform body `{ statusCode, code, message, timestamp, path, details? }` (`ApiError` from `@rater/types`). The web side's `lib/api-error.ts` parses this into an `ApiClientError` with a `.code` callers can branch on. So: throw the right Nest exception and the shape is handled for you.
- **`common/logging.interceptor.ts`** — request logging.
- **`auth/auth.guard.ts`** — verifies the Supabase JWT via JWKS using `jose` (lazy-inits `createRemoteJWKSet`). `auth/current-user.decorator.ts` → `@CurrentUser(): AuthUser` (`{ id, email }`).
- **`prisma/prisma.service.ts`** — `extends PrismaClient` with `onModuleInit`/`onModuleDestroy`. `PrismaModule` is global.
- **`@nestjs/config`** — `ConfigModule.forRoot({ isGlobal: true, envFilePath: [<repo-root>/.env, <repo-root>/.env.local] })` (the CLI doesn't auto-load the monorepo-root `.env`, so this is explicit).

## BullMQ (queues / workers)

- **Producer side (`apps/api/src/queue/`):** `QueueModule` is `@Global()` and exports producer classes (e.g. `ScrapeQueue`). A producer wraps a BullMQ `Queue` against `REDIS_URL`; **if `REDIS_URL` is unset it logs a warning and silently no-ops** — the app still runs (degraded), it doesn't crash. Producers are injected wherever work needs enqueuing (e.g. `LocationsService` / `OnboardingService` enqueue a baseline scrape *after* the transaction commits). Job options: a few retry attempts with exponential backoff, bounded retention.
- **Consumer side (`apps/worker/src/<feature>/`):** the worker app boots a NestJS *standalone application context* (no HTTP). Each feature has `<feature>.worker.ts` (registers a BullMQ `Worker` on the queue name, handles SIGINT/SIGTERM for graceful shutdown) + `<feature>.processor.ts` (the actual job logic, talks to Prisma via the worker's own `PrismaModule`). `<feature>.module.ts` wires processor + worker (+ any external-service client).
- **Stub-when-key-missing:** external-API clients degrade gracefully — e.g. `OutscraperService` returns stub data when `OUTSCRAPER_API_KEY` is unset, so the worker is runnable locally without the account. Follow this pattern for new external integrations.
- Queue/job names are constants exported from the producer file (e.g. `BASELINE_SCRAPE_QUEUE`), shared by producer and consumer. BullMQ rejects `:` in custom `jobId`s.

## Prisma / database

- **Status fields are strings, not Prisma enums** — extensibility over rigidity. `ReviewRequest` famously has four *orthogonal* string status tracks (`deliveryStatus`, `engagementStatus`, `ratingStatus`, `googleAttributionStatus`). Validate vocabularies at the app layer.
- **Json columns** for predicates/config: `CampaignStep.requiredState`, `NotificationRule.recipients`, `Event.payload`, `GoogleReviewSnapshot.distribution`.
- **Soft delete only where audit matters:** `Customer`, `ReviewRequest`, `GoogleReview`, `Location` (a `deletedAt` column; queries filter `deletedAt: null`). NOT on `Event` (immutable) or `Campaign`/`CampaignStep` (cascade).
- **Multi-tenancy is app-level**, not Postgres RLS — every tenant-scoped row has an indexed `locationId` and the service guards filter on it. (A missing `locationId` in a Prisma `where` clause is *not* a filter — guard against `undefined`.)
- **Naming:** snake_case in the DB, camelCase in TS, via `@map`/`@@map` on every model/field. `@db.Text` on long strings (templates, review/feedback text, error messages).
- **`DATABASE_URL`** must be the Supabase **Session pooler** URL (port 5432, host `aws-0-eu-west-1.pooler.supabase.com`) — the direct URL is IPv6-only on the free tier.
- **Migrations** — `prisma migrate dev` doesn't work non-interactively. Use the diff-and-deploy recipe (and `set -a && source .env && set +a` first, since the Prisma CLI won't load the monorepo-root `.env`):
  ```bash
  set -a && source /home/nada/personal/rater/.env && set +a
  cd packages/db
  TS=$(date -u +%Y%m%d%H%M%S); MIG="prisma/migrations/${TS}_<name>"; mkdir -p "$MIG"
  npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel ./prisma/schema.prisma --script > "$MIG/migration.sql"
  npx prisma migrate deploy
  ```
  Then commit the generated `migration.sql`. (Many features need *no* migration — the schema already has all 16 models.)

## Auth (Supabase)

Passwordless magic-link. New Supabase key model (`sb_publishable_*` for the browser, `sb_secret_*` server-side). The API verifies the access-token JWT via Supabase's JWKS endpoint (`jose`, in `auth.guard.ts`). On the web side there are **three** Supabase clients for the three Next.js execution contexts — `apps/web/lib/supabase/{server,client,middleware}.ts` — with strict-typed cookie callbacks; `apps/web/middleware.ts` refreshes the session and gates `/dashboard` → `/sign-in`. Auth-related user fields on `LocationUser`: `authUserId` (the Supabase user UUID), `email`, `role` (`'admin' | 'member'`).

## Web app

Next 15 App Router.

**Data fetching — server reads, TanStack mutations.** Reads that belong in the initial HTML stay server-side: `lib/server-api.ts` exposes `fetchMe`, `fetchCustomers`, `fetchReviewRequests`, `fetchReviewRequestByToken`, `fetchInvitation` (server Supabase client + `Bearer` token, `cache: 'no-store'`, a 15 s `AbortSignal.timeout`); `fetchMe` is `cache()`-memoized so a dashboard layout + its page share one round-trip. **Writes** go through TanStack Query (`<Providers>` in `app/providers.tsx`, client factory in `lib/query-client.ts`): one `useMutation` hook per endpoint in `apps/web/hooks/` (`use-create-review-request`, `use-import-review-requests`, `use-add-location`, `use-invite-teammate`, `use-accept-invitation`, `use-onboarding`, `use-rate-submission`) — they own `isPending` / `error`, and `onSuccess` either `router.refresh()`es the server-rendered list or navigates. Components don't hand-roll submit/error state. `lib/api.ts` (`apiGet`/`apiPost`, `Bearer` + timeout) is what those hooks call; `lib/api-error.ts` — `ApiClientError`; wire response shapes live in `@rater/types` (`packages/types/src/api.ts`), shared by `server-api.ts`, the hooks, and the API's response DTOs. Other small hooks: `use-selected-location` (the `?location=<id>` param ↔ a `selectLocation` soft-nav), `use-clipboard`, `use-sign-out`.

**Dashboard shell.** `app/dashboard/layout.tsx` (server) fetches `me` once and renders `app/dashboard/dashboard-shell.tsx` (client: `Sidebar` + `DashboardHeader` + `OnboardingDialog` + `{children}`). Because it's a *layout*, it stays mounted across `/dashboard`, `/dashboard/requests`, `/dashboard/customers` and across location switches — no full-page reload, no white flash; only the content area (`page.tsx` → `loading.tsx` content skeleton) swaps. Pages stay thin server components: resolve the location from `searchParams`, fetch their list, render `<main>`. Switching location is a soft `router.replace` of the current path's `?location=` — never a hard navigation.

UI: MUI v6 styled via `lib/theme.ts` + Tailwind v4 tokens in `app/globals.css` ("Iris" design system); MUI for forms/dialogs/menus, Tailwind for page shells and plain HTML — don't put Tailwind utility classes on MUI components.

## Dev quirks (the ones that bite)

- Ports: api `4000`, web `3000` (override with `PORT=` / `next dev -p 3001` if taken).
- Next doesn't auto-load the monorepo-root `.env` — `apps/web/next.config.ts` loads it explicitly via `dotenv`. The API loads it via `@nestjs/config`'s `envFilePath`. `.env.local` is also honoured (override-style) at the root.
- `pnpm` warnings about ignored build scripts (`@nestjs/core`, `@prisma/client`, `prisma`, `sharp`, `msgpackr-extract`) are expected; pin in root `package.json` `pnpm.onlyBuiltDependencies` to silence.
- CORS in the API allows the origin from `NEXT_PUBLIC_APP_URL` (default `http://localhost:3000`).
- Node 18 locally triggers a Supabase deprecation warning at build/runtime — harmless for now.
