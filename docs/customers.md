# Customers

> **Scope:** the `Customer` model, the `customers` API module, and the `/dashboard/customers` page (CSV import + manual add + list + remove). For who-they-receive (the review-request lifecycle) see the future `review-request-flow.md`. For the API layering this module follows, see [docs/architecture.md](architecture.md).
> **Last updated:** 2026-05-11 (PR #17 — `feat/customers`)

## What it is

Customers are the people a location sends review requests to. A location admin or member loads them
in two ways: paste a CSV export (the common case — past customers) or add one by hand. They show up
as a list on `/dashboard/customers` and can be removed. Nothing sends yet — this is the recipient
side of the loop only; campaigns + sending + the public rating page come in later PRs.

## How it works

**Model** (`packages/db/prisma/schema.prisma` → `Customer`): per-location (`@@unique([locationId, email])` — the same person can be a customer of multiple businesses), soft-deleted (`deletedAt`, because past `ReviewRequest`s reference them and we want the audit trail), plus dedup/lifecycle fields not used yet (`hasAttributedGoogleReview`, `lastReviewRequestSentAt`, `emailStatus`, `importSource`, `importedAt`). `emailStatus` and `importSource` are **strings, not enums** (project convention) — `emailStatus ∈ {valid, invalid, unsubscribed, complained}`, `importSource ∈ {csv, manual, api}`.

**API** — `apps/api/src/customers/` (standard module → controller → service → repository → mapper → `dto/` shape; see architecture.md):
- `GET /customers?locationId=` — list non-deleted customers, newest first.
- `POST /customers` — add one (`importSource: 'manual'`).
- `POST /customers/import` — bulk; body is `{ locationId, rows: [{ email, name?, phone? }] }` (pre-parsed rows, **not** a file — see below). Returns `{ received, imported, skippedDuplicates, skippedInvalid }`.
- `DELETE /customers/:id` — soft delete.
- **Authz:** every route is location-scoped. `CustomersService.assertMember` requires the caller to be a `LocationUser` of that location — *any* role (admins and members both manage customers). It also rejects an empty `locationId` (important: a missing `locationId` in a Prisma `where` is treated as "not filtered", which would leak other locations' customers — so the guard is load-bearing, not cosmetic).

**Dedup** happens at three layers, all keyed on the trimmed-lowercased email:
1. Within the import payload itself (a Set of seen emails).
2. Against existing non-deleted customers for the location (`repo.findActiveEmails`, one query).
3. The DB `@@unique([locationId, email])` + `createMany({ skipDuplicates: true })` as the backstop for a concurrent insert — any rows it silently skips get folded into `skippedDuplicates` so `received === imported + skippedDuplicates + skippedInvalid` always holds.
A row with a malformed email (`!/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) is `skippedInvalid`. `addOne` returns 409 if the email already exists.

**CSV is parsed on the client**, with `papaparse` in `import-customers-button.tsx` (`header: true`, `skipEmptyLines: 'greedy'`, `transformHeader` → lowercase+trim). We read the `email` (required), `name`, `phone` columns case-insensitively; missing `email` column → error before anything is sent. *Why client-side:* it avoids adding multipart/file-upload plumbing to NestJS (this codebase has never done it), and it gives an instant in-dialog preview ("Found N rows" + first 5) before the user commits. The API's import DTO is therefore loose on row content (`email` is just `@IsString`, not `@IsEmail`) — the service does per-row validation so one junk row doesn't 400 the whole import. Cap is 5000 rows/import (`@ArrayMaxSize` + a client-side check).

**Web** — `apps/web/app/dashboard/customers/`:
- `page.tsx` (server) — `fetchMe()` (Next dedupes the fetch within a request, so calling it here *and* in `dashboard/page.tsx` is one HTTP call); redirects to `/sign-in` if no session, to `/dashboard` if not onboarded / no locations; resolves the selected location from `?location=` exactly like `dashboard/page.tsx`; `fetchCustomers(selected.id)`; renders the shared shell (`<Sidebar>` + `<DashboardHeader>` — same components the dashboard uses) + a `divide-y` row list or an `<EmptyState>`.
- `add-customer-button.tsx`, `import-customers-button.tsx`, `customer-row-actions.tsx` — client; MUI `Dialog`s styled by the theme, `apiPost` / `apiDelete` from `lib/api.ts`, `router.refresh()` on success.
- `sidebar.tsx` — the "Customers" nav item is now a real `<Link href="/dashboard/customers?location=…">`; active state is `usePathname()`-driven (no more hardcoded `active: true`); Campaigns/Reviews/Settings stay disabled "coming soon" items.
- `lib/server-api.ts` — `CustomerSummary` type + `fetchCustomers(locationId)`. `lib/api.ts` — added `apiDelete(path)`.

## Key files

- `packages/db/prisma/schema.prisma` → `Customer` — the model (already existed; no migration in this PR).
- `apps/api/src/customers/{customers.module,customers.controller,customers.service,customers.repository,customers.mapper}.ts` + `dto/{create-customer,import-customers,customer.response,import-result.response}.ts`.
- `apps/api/src/app.module.ts` — registers `CustomersModule`.
- `apps/web/app/dashboard/customers/{page,add-customer-button,import-customers-button,customer-row-actions}.tsx`.
- `apps/web/app/dashboard/sidebar.tsx` — nav links + active state.
- `apps/web/lib/{server-api,api}.ts` — `fetchCustomers` / `CustomerSummary` / `apiDelete`.

## Conventions / gotchas

- **Always pass `locationId`.** A `findFirst({ where: { locationId: undefined } })` matches *anything* — the `assertMember` empty-check is what stops cross-tenant leakage on `GET /customers`.
- **Soft delete only.** "Remove" sets `deletedAt`; the row (and its `ReviewRequest`s) survive. Lists filter `deletedAt: null`. A re-add of a soft-deleted email currently hits the `@@unique` constraint → 409 ("already a customer"); un-deleting/reviving isn't implemented (see below).
- **The import counts always sum to `received`** — keep that invariant if you touch `CustomersService.import`.
- **Member vs admin:** customers are managed by *any* location member, unlike adding a location (admin-only).

## Not done yet

- No customer **edit** (name/phone), no search/filter, no pagination (fine until lists get big).
- No **email-status** handling — `emailStatus` is always `valid`; bounce/unsubscribe/complaint updates will land with Postmark webhooks.
- No **un-delete / revive** — a soft-deleted email can't be re-added (409); would need an explicit revive path.
- No **API-source ingestion** (`importSource: 'api'`) — POS/booking webhooks are a parked roadmap item.
- CSV column **mapping is fixed** (`email`/`name`/`phone`) — no UI to map arbitrary headers.
