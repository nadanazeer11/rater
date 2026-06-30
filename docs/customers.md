# Customers

> **Scope:** the `Customer` model, the `CustomersRepository` (the engine other modules call to upsert/look up customers), and the read-only `/dashboard/customers` list page. **Customers are created as a side effect of review requests, not here** — see [docs/review-requests.md](review-requests.md) for the create path. For the API layering see [docs/architecture.md](architecture.md).
> **Last updated:** 2026-05-25

## What it is

The people a location has requested reviews from. A `Customer` row appears the first time you request a review from an email (single or via CSV); the Customers page is a read-only roster of them (name, email, phone, `emailStatus`, `importSource`, when they were added). There is **no "add customer" / "import customers" UI** — that was removed when the product moved to the single-entry-point model (you create a *review request*, the customer is upserted in the background).

## How it works

**Model** (`packages/db/prisma/schema.prisma` → `Customer`): per-location (`@@unique([locationId, email])` — the same person can be a customer of multiple businesses), soft-deleted (`deletedAt`, because `ReviewRequest`s reference them), plus lifecycle fields (`hasAttributedGoogleReview` / `lastReviewRequestSentAt` not used yet; `emailStatus` / `importSource` / `importedAt` actively used). `emailStatus` / `importSource` are **strings, not enums** — `emailStatus ∈ {valid, invalid, unsubscribed, complained}` (default `valid`; the Postmark webhook in [docs/sending.md](sending.md) flips it to `invalid` on hard bounce and `complained` on spam complaint; the mailer worker's send guard skips any customer not `valid` so a bounced/complained address never gets another request), `importSource ∈ {manual, csv, api}` (set by the review-request create path — `manual` for the single dialog, `csv` for the bulk import; `api` is unused).

**API** — `apps/api/src/customers/` (standard module pattern; see architecture.md):
- `GET /customers?locationId=` — list non-deleted customers, newest first. That's the only endpoint. Authz: `CustomersService.assertMember` requires the caller to be a `LocationUser` of that location (any role) and rejects an empty `locationId` (a missing `locationId` in a Prisma `where` is "not filtered" → would leak other locations' customers, so the guard is load-bearing).
- **`CustomersRepository`** is exported from `CustomersModule` and injected by `ReviewRequestsService`: `findActiveByEmail(locationId, email)` (does this email already exist? — used for the single-request upsert), `findManyByEmails(locationId, emails[])` (batch existence check for the bulk import), `create(data)` (insert a customer), `findMembership(authUserId, locationId)` (the authz lookup), `listActiveByLocation(locationId)` (the list). Email is normalized (trim+lowercase) by the *caller* (`ReviewRequestsService`) before it reaches the repo, so stored emails are lowercase and the `@@unique` constraint dedups reliably.

**Web** — `apps/web/app/dashboard/customers/page.tsx` is a one-liner server stub: `<CustomersList />`. The list itself (`customers-list.tsx`, client) reads the selected location from `useDashboard()` (the dashboard context — see [architecture.md](architecture.md)) and the customer data via `useCustomers(locationId)` (TanStack Query, queryKey `['customers', locationId]`, inherits the 5-min default `staleTime`, guarded by `enabled: !!locationId`). First paint shows an inline skeleton, revisits within `staleTime` hit the cache (zero network, instant tab swap). Renders the same `divide-y` rows with `emailStatus` pill, or an `<EmptyState>` ("Customers show up here once you've requested a review from them" → links to `/dashboard/requests`). The `apiGet` client lives in `apps/web/lib/api.ts`; the wire type `CustomerSummary` is shared via `@rater/types`.

## Conventions / gotchas

- **Read-only here, created in `review-requests`.** Don't add a `POST /customers` back — the single entry point is deliberate. If you need customer-mutation (edit, revive a soft-deleted one), think about whether it belongs on this page or on the review-request flow.
- **`papaparse`** is still a dependency — the CSV parsing now lives in `apps/web/app/dashboard/requests/request-reviews-csv-button.tsx` (it creates review requests, upserting customers along the way).
- **Soft delete** (`deletedAt`) is the only delete; nothing in the app sets it currently. Lists filter `deletedAt: null`.

## Not done yet

- No customer **edit** (name/phone), no search/filter, no pagination.
- No **unsubscribe** flow yet — `emailStatus = 'unsubscribed'` is reserved but never written. A one-click unsubscribe link in the email + a public token endpoint is a follow-up.
- No **revive** of a soft-deleted customer (and nothing soft-deletes them anyway right now).
- No **API-source ingestion** (`importSource: 'api'`) — POS/booking webhooks are a parked roadmap item.
- No **status columns** (last request, rating outcome) on the list yet — planned once the requests data is richer.
