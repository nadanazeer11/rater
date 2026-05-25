# Campaigns

> **Scope:** the `Campaign` / `CampaignStep` model, the campaigns API module, and the dashboard editor — naming a campaign, editing its email steps, picking one when you create a review request. For the `ReviewRequest` lifecycle and the public rating flow see [docs/review-requests.md](review-requests.md). For the API layering see [docs/architecture.md](architecture.md). The email *scheduler* and *Postmark send* (which is what actually fires the steps and renders `{{...}}`) are not built yet — see "Not done yet".
> **Last updated:** 2026-05-13 (PR — `perf/dashboard-nav-transition`)

## What it is

A campaign is the messaging behind a review request: the email a customer gets (subject + body), plus optional follow-up reminders. Every `ReviewRequest` belongs to exactly one campaign. A location can have several — e.g. a "Restaurant tone" and a "Salon tone" — and you choose which one runs when you create a request (single or bulk). This PR ships the **editor**; it does **not** ship anything that sends those emails or fires the follow-up steps — that's the upcoming Postmark + scheduler work. So today only the *initial* step of the chosen campaign matters in practice.

## How it works

**The model** (`packages/db/prisma/schema.prisma` — unchanged; no migration). `Campaign { id, locationId, name, isActive, timestamps }` — no unique constraint, multiple per location, `isActive: false` = archived. `CampaignStep { campaignId, stepOrder, stepType, delayDays, delayAnchor, requiredState (Json), subjectTemplate, bodyTemplate (@db.Text), … }` — `@@unique([campaignId, stepOrder])`. Vocab the app uses:
- `stepType`: `'initial'` (always the first step, exactly one), `'follow_up_no_rating'`, `'follow_up_no_google_review'`.
- `delayAnchor`: `'request_created'`, `'rating_submitted'`, `'previous_step'`.
- `requiredState`: the JSON predicate a future scheduler will match before sending — `{}` for `initial`, `{ ratingStatus: 'not_rated' }` for the "hasn't rated" follow-up, `{ ratingStatus: 'rated_positive', googleAttributionStatus: 'pending_check' }` for the "rated high, no Google review yet" one. The editor never shows raw JSON — the follow-up trigger is a 2-option dropdown that sets `stepType` + `delayAnchor` + `requiredState` together; the user only also picks `delayDays` and writes the subject/body.

**"Default" = newest active campaign.** There's no `isDefault` column. The location's default is simply `campaign.findFirst({ where: { locationId, isActive: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })` — so creating a new campaign makes *it* the default; editing one (which bumps `updatedAt`, not `createdAt`) doesn't change which is default. The request dropdown pre-selects the default and badges it.

**Seed-on-first-use.** A location starts with no campaigns. `GET /campaigns` (and the first review request) calls `CampaignsRepository.getOrCreateDefault(locationId)` which creates a `Campaign{name:'Review requests'}` + one seed `initial` step (the placeholder template text — `{{location}}` / `{{name}}` / `{{rate_link}}` / `{{business}}`). No unique constraint, so two concurrent first-calls could create two campaigns — harmless; newest wins next time. (This logic moved here from `ReviewRequestsRepository`, which used to own `findDefaultCampaign`/`createDefaultCampaign`.)

**API** (`apps/api/src/campaigns/` — clean-architecture module, all routes `@UseGuards(AuthGuard)`, `assertMember(user, locationId)` guards like the other modules):
- `GET /campaigns?locationId=` → `CampaignSummaryDto[]` (newest first; seeds the default if there are none). Each summary: `name`, `isDefault` (= it's index 0), `stepCount`, `requestCount` (count of `ReviewRequest`s pointing at it), timestamps.
- `GET /campaigns/:id` → `CampaignDetailDto` (= summary + `locationId` + `steps` sorted by `stepOrder`). 404 if not found; 403 if you're not a member of its location.
- `POST /campaigns` `{ locationId, name }` → `CampaignDetailDto` — creates the campaign with one seed `initial` step; being newest, it becomes the default. Returns it so the web navigates straight to the editor.
- `PATCH /campaigns/:id` `{ name?, steps?: CampaignStepDto[] }` → `CampaignDetailDto` — **replaces the whole step set** in a transaction (delete all steps, recreate from the array; `stepOrder` = index + 1). Safe because there are zero `ReviewRequestStepExecution`s yet (the FK has no cascade, but nothing references the rows). Validation in the service: ≥1 step; the first must be `stepType:'initial'` and no other may be; `delayDays ≥ 0` (≤ 365); subject/body non-empty after trim; `stepType`/`delayAnchor` from the vocab above. (The web sends the full step object; the API just validates the vocab and stores `requiredState` as-is.)
- `DELETE /campaigns/:id` → 204, archives (`isActive: false`). 409 if it's the only active campaign for the location. Archived campaigns keep their historical `ReviewRequest`s — they just disappear from the list and the dropdown.
- Review requests gained an optional `campaignId` (`CreateReviewRequestDto`, `ImportReviewRequestsDto`). Given → validated against the location (`findActiveByIdAndLocation`, 404 if it doesn't match). Omitted → `getOrCreateDefault`.

**Web** (under `apps/web/app/dashboard/campaigns/` — inside the dashboard layout, so the sidebar/header stay painted; no full-screen route):
- `page.tsx` — server stub: `<CampaignsList />`. The client list reads the selected location from `useDashboard()` and campaigns via `useCampaigns(locationId)` (TanStack Query, queryKey `['campaigns', locationId]`, inherits the 5-min default `staleTime`, `enabled: !!locationId`) → a bordered `divide-y` list of campaign rows (name, "N steps", "N requests", a "Default" pill on the newest, created date), each a `<Link>` to `[id]?location=…`. "New campaign" button → `<CreateCampaignButton>` (a small dialog: one name field → `useCreateCampaign` → invalidates `['campaigns', locationId]` and navigates to the new editor).
- `[id]/page.tsx` (server, **stays SSR** because it needs a server-side `notFound()` for invalid ids) — `fetchCampaign(id)` (null → `notFound()`); renders `<CampaignEditor campaign={campaign} />`. No `fetchMe` and no `fetchCampaigns` here — the editor reads the location/business from `useDashboard()` and computes `canArchive` from `useCampaigns(campaign.locationId)`.
- `[id]/campaign-editor.tsx` (client) — local `{ name, steps }` seeded from the prop, a JSON-snapshot dirty check, "Save changes" (`useUpdateCampaign`, sends `{ name, steps }`) enabled only when dirty + valid. `useUpdateCampaign.onSuccess` both invalidates `['campaigns']` (so the list page reflects new step/request counts on next visit) and `router.refresh()`es (so the SSR detail page rebinds to fresh server data). Each step is a card: the `initial` one shows just Subject + Body; follow-ups also show the trigger dropdown + a "Days after …" number + a Remove button. Beside each step's fields (stacked below on small screens) a **live preview** — `renderTemplate(tpl, { name:'Layla Haddad', location:<real>, business:<real>, rate_link:<app>/rate/sample })` (a tiny client-side `{{token}}` substitution; unknown tokens left intact). "Add follow-up step" appends a pre-filled "not rated yet / 3 days" step. An `<Alert info>` banner says follow-ups aren't sent yet. "Archive campaign" → `useArchiveCampaign` (invalidates `['campaigns']`) → back to the list (disabled when it's the only campaign; the API also 409s).
- `requests/page.tsx` is also a server stub; `requests-list.tsx` (client) reads campaigns via `useCampaigns(locationId)` and passes them to `<RequestReviewButton>` / `<RequestReviewsCsvButton>`, which render `<CampaignSelect>` (in `requests/campaign-select.tsx`) — a dropdown that **only appears when there's more than one campaign**, pre-selecting the default; the chosen id goes into the mutation input.
- Sidebar: the "Campaigns" item got `path: '/dashboard/campaigns'` (it was a "coming soon" placeholder).

## Key files

- `apps/api/src/campaigns/{campaigns.module,controller,service,repository,mapper}.ts` + `dto/{create-campaign,update-campaign,campaign.response}.ts`. Registered in `apps/api/src/app.module.ts`. `CampaignsModule` `exports: [CampaignsRepository]`.
- `apps/api/src/review-requests/{review-requests.module,service}.ts` — `imports: [CampaignsModule]`; `ReviewRequestsService` injects `CampaignsRepository` and resolves `campaignId` (caller's pick or `getOrCreateDefault`). `dto/{create-review-request,import-review-requests}.dto.ts` — optional `campaignId`.
- `apps/web/app/dashboard/campaigns/{page,loading,campaigns-list}.tsx`, `campaigns/[id]/{page,loading,campaign-editor}.tsx`, `campaigns/create-campaign-dialog.tsx`.
- `apps/web/app/dashboard/requests/campaign-select.tsx` — the shared `<CampaignSelect>` + `defaultCampaignId()`.
- `apps/web/hooks/use-campaigns.ts` (read hook + `campaignsQueryKey`), `{use-create-campaign,use-update-campaign,use-archive-campaign}.ts` (mutations; `onSuccess` invalidates the campaigns query key). `apps/web/lib/api.ts` — `apiGet`/`apiPatch`/`apiDelete`. `apps/web/lib/server-api.ts` — `fetchCampaign` (still server-side for the detail page). `packages/types/src/api.ts` — `CampaignSummary` / `CampaignDetail` / `CampaignStepDetail` / `CampaignStepInput` / `CampaignStepType` / `CampaignDelayAnchor`.

## Conventions / gotchas

- **No migration.** The schema already had `Campaign` + `CampaignStep` with every field — this PR only adds the API + UI on top.
- **Default is implicit (newest active).** If you ever need a pinned default, add an `isDefault` column then; don't infer "default" from anything but recency.
- **PATCH replaces all steps.** The editor is the source of truth for the step set on save — there's no per-step PATCH. Keep that if you touch `CampaignsRepository.update`; it relies on there being no `ReviewRequestStepExecution` rows (true until the scheduler ships — revisit then).
- **`requiredState` is stored verbatim.** The API validates the vocab of `stepType`/`delayAnchor` but trusts the JSON predicate the editor sends (which only ever comes from the fixed presets).
- **The client-side preview shares the same `renderTemplate` as the server send.** Both import from `@rater/types/templates` — the campaign editor's preview is exactly what Postmark renders. Don't fork it; if you change one, change both.
- **`<CampaignSelect>` hides itself** when a location has one campaign — a request just uses it. Don't surface a pointless single-option dropdown.

## Not done yet

- **Only the `initial` step fires.** Creating a review request enqueues a Postmark send of the campaign's initial step — see [docs/sending.md](sending.md). Follow-up steps are saved by the editor but nothing schedules them; a BullMQ scheduler that matches `CampaignStep.requiredState` is a later PR. The editor says so to admins.
- **No campaign duplication / templates gallery / per-step reordering UI** — follow-ups can only be appended/removed, not dragged. Add if it's wanted.
- **Archived campaigns can't be un-archived from the UI** — there's no list of archived ones. (`isActive` flip is the only state; add a UI if needed.)
