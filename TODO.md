# TODO

Things outside the codebase that need attention. Not exhaustive — kept current as we go.

---

## External services to provision

| Service | Why | When | Notes |
|---|---|---|---|
| **Postmark** account | Sending review-request emails to customers | Before first campaign send | One server per customer eventually (Message Streams). Domain auth (SPF/DKIM/DMARC) via per-customer DNS wizard. |
| **Postmark** as Supabase Auth SMTP | Magic-link delivery for sign-in/sign-up | Before inviting anyone outside yourself to test | Bypasses Supabase's dev SMTP rate limit (~3-4/hour). Configure in Supabase dashboard → Authentication → SMTP Settings. |
| **Outscraper** account + API key | Pulling Google reviews for baseline + attribution + dedup | Before location onboarding feature | `OUTSCRAPER_API_KEY` in `.env`. ~$1–3/location/month. |
| **Google Cloud Console** project + Places API | Location picker UI (search Google Place by name) | PR with location creation | `GOOGLE_PLACES_API_KEY` in `.env`. Restrict the key to your dashboard origins. |
| **Google OAuth client** in Google Cloud Console | "Sign in with Google" button | When you're ready to enable Google sign-in | Then enable Google provider in Supabase → Authentication → Providers. |
| **Upstash Redis** | BullMQ job queue (campaign step scheduler, Outscraper polls, attribution) | Before worker/scheduling features land | `REDIS_URL` in `.env`. Free tier covers MVP. |
| **Sentry** | Error tracking on web + api + worker | Before any real users | Add SDK + DSN per app. |
| **BetterStack** (or Logtail) | Log aggregation | Before production | Optional in dev. |

## Hosting (do when ready to ship)

| What | Where | Notes |
|---|---|---|
| `apps/web` | Vercel | Connect GitHub repo, set env vars, auto-deploys on push to main. |
| `apps/api` | Railway or Fly.io | Set env vars, point at the same Supabase. Single Dockerfile or buildpack. |
| `apps/worker` | Railway or Fly.io (separate service) | Same code, different bootstrap. Same env vars. |

## Supabase dashboard configuration

- **Site URL** (Authentication → URL Configuration) → set to `http://localhost:3000` for dev. Add the deployed URL when you ship.
- **Redirect URLs** → add `http://localhost:3000/auth/callback` and the production equivalent.
- **Email templates** → eventually customize the magic-link email subject/body to say "rater" instead of generic.
- **Custom SMTP** → configure Postmark once you have it (see above).
- **Google provider** → enable when ready (needs Google OAuth client first).

---

## Security / pre-production

- **Rotate the dev DB password.** The current one (`Mawsouq_1234`) was pasted in chat history. Reset via Supabase dashboard → Project Settings → Database → "Reset database password" before deploying anything public.
- **Separate prod project from dev.** Supabase free tier has no environments. Create a second project for prod when you're ready.
- **Move secrets to platform env vars.** `.env` is local-only. Vercel and Railway/Fly each have their own env-var UIs — use those, never commit secrets.
- **Enable 2FA** on Supabase, GitHub, Postmark, Outscraper.
- **Review which keys are public vs server-only.** `NEXT_PUBLIC_*` is exposed to the browser by design. `SUPABASE_SECRET_KEY` (and any others without `NEXT_PUBLIC_`) must never be referenced in client components.

---

## Tech debt (deferred from earlier PRs to keep scope tight)

- **ESLint across the monorepo.** Skipped in PR #1 (scaffold) — cross-stack flat-config setup deserves its own PR. Each app uses `tsc --noEmit` for now.
- **GitHub Actions CI.** Run `pnpm -r typecheck` + `pnpm -r build` on every PR. Add a deploy job once hosting is set up.
- **Husky + lint-staged + commitlint.** Pre-commit hooks for formatting and conventional-commit messages. Optional but nice.
- **Approve pnpm build scripts.** Currently `@nestjs/core`, `@prisma/client`, `@prisma/engines`, `prisma`, `sharp` postinstall scripts are ignored (warning on every `pnpm install`). Run `pnpm approve-builds` once, or pin in root `package.json`:
  ```json
  "pnpm": {
    "onlyBuiltDependencies": [
      "@nestjs/core", "@prisma/client", "@prisma/engines", "prisma", "sharp"
    ]
  }
  ```
- **`DIRECT_URL` in `prisma/schema.prisma`.** Currently we use the Supabase Session pooler for both migrations and runtime (single `DATABASE_URL`). For more headroom on connection-heavy operations, add `directUrl = env("DIRECT_URL")` and point it at the direct connection (when on a network with IPv6, or a Supabase Pro IPv4 add-on).
- **Test infrastructure.** No tests yet. NestJS uses Jest by default; React side could use Vitest + Testing Library. Add when first non-trivial business logic lands.
- **Replace `cuid()` IDs with `cuid2()` or UUID.** `cuid()` is deprecated upstream. Tradeoffs: cuid2 is shorter and unguessable, UUID v7 is sortable. Schema-wide change — do it before there's real data.
- **Branded magic-link email** (Supabase Auth → Email Templates). Replace generic copy with rater-branded subject + body matching the dashboard look. Wire in once Postmark is configured as Supabase's custom SMTP.
- **Branded review-request email template** for Postmark — same visual identity as the dashboard. Used for outbound campaign emails. Build when Postmark wiring lands.

---

## Feature roadmap (intentionally deferred from MVP)

- **`pg_trgm` Postgres extension** — for fuzzy reviewer-name matching during Google review attribution. Add when implementing the attribution algorithm.
- **Manual confirmation queue** for low/medium-confidence Google review attributions (admin clicks "yes this matches" / "no it doesn't"). MVP only treats `high` confidence as confirmed; medium/low stored but ignored.
- **"Happy customer, no Google review" follow-up email step.** Slots into the existing CampaignStep model with `required_state: { rating_status: rated_positive, google_attribution_status: not_posted }` once the Outscraper attribution loop is live.
- **Google Business Profile API** as an alternative to Outscraper. Cheaper + more reliable when the customer connects their GBP, but the `business.manage` scope is restricted and requires Google's CASA security assessment ($15K–$75K, 2–4 months) to avoid the unverified-app warning at scale. Outscraper wins for MVP; GBP becomes the preferred path when connected.
- **WhatsApp Business API** as a notification channel. Strong upsell in the ME (open rates 5–10× email). Adds Twilio or 360dialog cost + Meta Business verification. Slot it into the existing `NotificationRule.channel` field.
- **API / webhook customer ingestion.** MVP is CSV + single-customer form. Plug in Zapier/Make or a direct webhook from POS/booking systems later.
- **`BusinessCustomer` aggregate** — dedupe a customer across multiple Locations of the same Business. Skipped for MVP (most businesses are single-location). Add when the multi-location use case becomes real.
- **Per-customer / per-location custom landing-page domains.** Currently the landing page lives on `*.yourapp.com`. Custom domains add real complexity (DNS verification, TLS via Vercel, branding) and aren't needed for MVP.

---

## How to use this file

- Cross items off (delete the line) as you complete them.
- Add new items as they come up — keep this file authoritative for non-code work.
- Items here should be **outside the normal PR flow**: things you do in dashboards, accounts, infrastructure, or that are explicitly "later." Code-level TODOs should live as `TODO:` comments at the relevant line, not here.
