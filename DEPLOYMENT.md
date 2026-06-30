# Rater — Deployment Checklist

> First-time deployment guide for rater. Work top to bottom; each `[ ]` is one action.
> You don't need a DevOps background — every step says **what to do**, **where**, and **why**.
> Keep this open alongside the service dashboards. Rough total: a focused afternoon + DNS propagation waits.

---

## 0. The mental model (read once)

Rater is **3 apps** that you deploy separately, talking to **5 external services**:

```
                         ┌─────────────┐
  browser  ───────────▶  │  WEB        │  Next.js      → Vercel
                         │ (apps/web)  │
                         └──────┬──────┘
                                │ HTTPS (NEXT_PUBLIC_API_URL)
                         ┌──────▼──────┐
                         │  API        │  NestJS HTTP  → Railway (public URL)
                         │ (apps/api)  │
                         └──────┬──────┘
                                │ enqueues jobs (Redis)
                         ┌──────▼──────┐
                         │  WORKER     │  NestJS, no HTTP port → Railway (private)
                         │(apps/worker)│  sends email, scrapes/attributes reviews
                         └─────────────┘

External: Supabase (Postgres + Auth) · Upstash (Redis) · Postmark (email) ·
          Outscraper (Google reviews) · Google Cloud (Places API)
```

**Recommended hosts (simplest for a first deploy):** Web → **Vercel** (native Next.js), API + Worker → **Railway** (easy multi-service from one repo, env groups, no Docker needed). Fly.io also works but is more manual.

**Rough monthly cost to start:** ~$0–25. Domain ~$10/yr. Vercel/Supabase/Upstash have usable free tiers; Railway ~$5/mo hobby; Postmark ~$15/mo (or free 100/day in test). Outscraper ~$1–3/location.

---

## 1. Pre-flight — secrets hygiene (do this FIRST)

- **Rotate the leaked dev secrets** (they were pasted in chat history during setup):
  - Supabase dev DB password → Supabase dashboard → Project Settings → Database → "Reset database password".
  - Upstash Redis token → Upstash → your DB → Reset password. Update local `.env`.
- Confirm `.env` is gitignored (it is) and you have **never committed real secrets**. Prod secrets will live only in the host dashboards, never in the repo.
- Decide now: **prod is a separate world from dev.** Separate Supabase project, separate Redis, separate keys. Don't reuse dev credentials in prod.

---

## 2. Buy a domain

- Buy a domain (e.g. `tryrater.com`) — **Cloudflare Registrar** or **Porkbun** are cheap and have clean DNS UIs. ~$10/yr.
- You'll use these names (pick now, create the DNS records later in step 9):
  - `app.tryrater.com` (or root `tryrater.com`) → the **web** app
  - `api.tryrater.com` → the **api**
  - `send.tryrater.com` → the **email sending** subdomain (for Postmark DKIM)
- Use Cloudflare (or your registrar) as the **DNS host** — this is where you'll paste records in step 9. If you buy elsewhere, you can still point nameservers at Cloudflare (free).

---

## 3. Create the accounts

- **Vercel** (vercel.com) — sign in with GitHub.
- **Railway** (railway.app) — sign in with GitHub.
- **Supabase** (supabase.com) — you have dev; you'll add a **prod project** in step 4.
- **Upstash** (upstash.com) — you have dev; add a prod Redis in step 5.
- **Postmark** (postmarkapp.com) — you have an account in test mode; step 6 takes it live.
- **Outscraper** (outscraper.com) — confirm you have a funded API key.
- **Google Cloud Console** — you have the Places API key; step 7 restricts it for prod.
- **(Recommended) Sentry** (sentry.io) — error tracking; step 11.

---

## 4. Provision the production database + auth (Supabase)

Supabase free tier has **no environments**, so prod = a brand-new project.

- Create a **new Supabase project** ("rater-prod"), region **eu-west-1** (matches dev; keep data near your ME users).
- Set a strong DB password (save it in a password manager).
- Grab these from the project (Settings → Database / API):
  - `**DATABASE_URL`** — use the **Session pooler** URL (port 5432, host like `aws-0-eu-west-1.pooler.supabase.com`). ⚠️ *Not* the "direct" URL — it's IPv6-only and your hosts can't reach it.
  - `**NEXT_PUBLIC_SUPABASE_URL`** = the project URL (`https://<ref>.supabase.co`)
  - `**SUPABASE_URL**` = same value (the api uses it to verify logins)
  - `**NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY**` = the `sb_publishable_…` key
  - `**SUPABASE_SECRET_KEY**` = the `sb_secret_…` key (server-only, never in the browser)
- **Run the database migrations against prod** from your machine (one-off):
  ```bash
  # from the repo root, with prod DATABASE_URL exported (NOT your dev .env)
  cd packages/db
  DATABASE_URL="<prod session pooler url>" npx prisma migrate deploy
  ```
  This applies all 4 migrations cleanly (additive + the enum migration). It's non-interactive and safe.
- **Auth → URL Configuration:** set **Site URL** = `https://app.tryrater.com`; add **Redirect URLs** = `https://app.tryrater.com/auth/callback` (and keep `http://localhost:3001/auth/callback` for local dev).
- **Auth → Email templates:** customize the magic-link email to say "rater" (optional but nicer).
- **Auth → SMTP:** configure **Postmark as the SMTP sender** (step 6 gives you the creds). *Why:* Supabase's built-in email is rate-limited to ~3–4/hour — fine for you alone, useless for real signups.

---

## 5. Provision production Redis (Upstash)

- Create a **new Upstash Redis database** ("rater-prod"), region close to your api host (eu-west).
- Copy the `**REDIS_URL`** (the `rediss://…` connection string). This is the only Redis var the apps need (the `UPSTASH_REDIS_REST_*` vars in your dev `.env` aren't used by the code — you can ignore them).
- Note: the worker's queues (email send, follow-up scheduler, attribution sweep) **only run if `REDIS_URL` is set** — so this is required, not optional, in prod.

---

## 6. Take email live (Postmark) — the real delivery unblock

This is what currently blocks real sending (your test sends fail "sender signature not confirmed").

- **Verify a sending domain** for the shared "via rater" from-address: Postmark → Sender Signatures / Domains → add `**send.tryrater.com`**. Postmark gives you **DKIM** and **Return-Path** records → add them in DNS (step 9).
- Set `**POSTMARK_FROM_EMAIL`** = `reviews@send.tryrater.com` (this is rater's shared sender — businesses send through it with their name; see [docs/sending.md](docs/sending.md)).
- Get `**POSTMARK_SERVER_TOKEN**` (Server → API Tokens) and `**POSTMARK_ACCOUNT_TOKEN**` (Account → API Tokens, for future domain automation).
- **Exit test mode:** submit Postmark's approval request (they review that you're not spamming). Until approved you're capped at 100/day to verified addresses.
- **Configure the inbound webhook** (delivery/bounce/open/spam → updates your funnel): Postmark → Servers → your server → Webhooks → add `https://api.tryrater.com/webhooks/postmark`, enable **Delivery, Bounce, Open, SpamComplaint**. Set **Basic Auth** on the webhook with a username/password you choose, and set the same as `**POSTMARK_WEBHOOK_USERNAME`** / `**POSTMARK_WEBHOOK_PASSWORD**` env vars on the api.
- **Plug Postmark into Supabase SMTP** (from step 4): use the Postmark SMTP host/credentials so magic-link emails actually send at volume.

---

## 7. External API keys

- `**OUTSCRAPER_API_KEY`** — confirm it's funded (review syncs cost ~$1–3/location/month). The worker stubs reviews if this is unset, so prod needs a real key.
- `**NEXT_PUBLIC_GOOGLE_PLACES_API_KEY**` — in Google Cloud Console, **restrict it**: Application restriction → HTTP referrers → `https://app.tryrater.com/*`. *Why:* this key ships to the browser; restricting referrers stops others from using your quota.

---

## 8. Deploy the WEB app (Vercel)

- Vercel → **Add New Project** → import the `rater` GitHub repo.
- **Root Directory:** `apps/web`. Vercel detects Next.js. (It builds within the monorepo; the repo's turbo/pnpm setup handles workspace deps.)
- **Install Command:** leave default (`pnpm install`) — Vercel reads `packageManager` (`pnpm@10.33.4`).
- If the build fails on workspace packages, set **Build Command** to `cd ../.. && pnpm --filter @rater/web build` and **Install Command** to `cd ../.. && pnpm install`.
- **Environment Variables** (Production) — add the web vars (table in §13):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` (= `https://api.tryrater.com`), `NEXT_PUBLIC_APP_URL` (= `https://app.tryrater.com`), `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`.
- Deploy. Then **Settings → Domains** → add `app.tryrater.com` (Vercel shows the CNAME/A record to add in DNS — step 9).

---

## 9. Deploy the API (Railway)

- Railway → **New Project → Deploy from GitHub repo** → pick `rater`.
- Create a service named **api**. Settings:
  - **Root Directory:** `/` (monorepo root — the build needs all workspaces).
  - **Install:** `pnpm install --frozen-lockfile`
  - **Build:** `pnpm --filter @rater/db run db:generate && pnpm --filter @rater/api build` (Prisma client must be generated — the postinstall can't find the schema on its own).
  - **Start:** `node apps/api/dist/main.js`
  - `**PORT`:** Railway sets `$PORT` automatically; the api reads it (defaults 4000 locally).
- **Variables** — add the backend vars (§13): `DATABASE_URL`, `REDIS_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `POSTMARK_SERVER_TOKEN`, `POSTMARK_ACCOUNT_TOKEN`, `POSTMARK_FROM_EMAIL`, `POSTMARK_MESSAGE_STREAM=outbound`, `POSTMARK_WEBHOOK_USERNAME`, `POSTMARK_WEBHOOK_PASSWORD`, `OUTSCRAPER_API_KEY`, and `**NEXT_PUBLIC_APP_URL`** (= web URL — the api uses it for CORS + to build rate links).
- **Networking → Generate Domain**, then map a custom domain `**api.tryrater.com`** (Railway shows the CNAME for DNS — step 9 below... this step).
- Verify: open `https://api.tryrater.com/health` → should return a DB-ping OK.

---

## 10. Deploy the WORKER (Railway)

The worker is a **background process — no public URL, no port**. It just connects to Redis + Postgres and runs jobs.

- In the same Railway project → **New Service** → same `rater` repo.
- Settings: **Root Directory** `/`, **Install** `pnpm install --frozen-lockfile`, **Build** `pnpm --filter @rater/db run db:generate && pnpm --filter @rater/worker build`, **Start** `node apps/worker/dist/main.js`.
- **Do NOT** generate a public domain for it.
- **Variables:** same backend set as the api (it needs `DATABASE_URL`, `REDIS_URL`, all `POSTMARK_*`, `OUTSCRAPER_API_KEY`, `NEXT_PUBLIC_APP_URL`). Tip: Railway **shared variables / variable groups** let you set these once and reference them in both services.
- Deploy. Check the logs — you should see `BullMQ worker ready on queue "..."` for send/scheduler/scrape/attribution, plus "sweep scheduled". No errors = Redis reachable.

---

## 11. DNS records — add them all in one place

In your DNS host (Cloudflare/registrar), add (exact values come from each service's dashboard):

- **Web:** the record Vercel shows for `app.tryrater.com` (usually a CNAME to `cname.vercel-dns.com`).
- **API:** the CNAME Railway shows for `api.tryrater.com`.
- **Email (from Postmark, for `send.tryrater.com`):**
  - DKIM record (CNAME or TXT)
  - Return-Path / custom bounce (CNAME)
  - **SPF** (TXT on `send.tryrater.com`): `v=spf1 include:spf.mtasts.net ~all` (Postmark shows the exact include)
  - **DMARC** (TXT on `_dmarc.tryrater.com`): start with `v=DMARC1; p=none; rua=mailto:you@tryrater.com`
- If using Cloudflare, set the **app/api records to "DNS only" (grey cloud)** first to avoid proxy/SSL quirks during setup; you can enable proxy later.
- Wait for propagation (minutes–hours). Re-click "Verify" in Vercel/Railway/Postmark until each goes green.

---

## 12. Cross-wiring check (the #1 source of "it deployed but doesn't work")

These URLs reference each other — get them consistent:

- Web `NEXT_PUBLIC_API_URL` == the api's real URL (`https://api.tryrater.com`).
- Web `NEXT_PUBLIC_APP_URL` == the web's real URL (`https://app.tryrater.com`).
- API `NEXT_PUBLIC_APP_URL` == the web URL (the api's CORS allows exactly this origin — a mismatch = browser CORS errors).
- Worker `NEXT_PUBLIC_APP_URL` == the web URL (it builds `{{rate_link}}` into emails — wrong value = emails link to localhost).
- Supabase Site URL + Redirect URL == the web URL (wrong = magic-link login bounces to the wrong place).
- Postmark webhook URL == `https://api.tryrater.com/webhooks/postmark` with matching Basic Auth env.

---

## 13. Environment variable reference

**Web (Vercel)** — all are `NEXT_PUBLIC_*` (shipped to the browser, so no secrets here):


| Var                                    | Value / where                      |
| -------------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase `sb_publishable_…`        |
| `NEXT_PUBLIC_API_URL`                  | `https://api.tryrater.com`         |
| `NEXT_PUBLIC_APP_URL`                  | `https://app.tryrater.com`         |
| `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`    | Google Cloud (referrer-restricted) |


**API + Worker (Railway)** — secrets; set on both services:


| Var                         | Value / where                                           |
| --------------------------- | ------------------------------------------------------- |
| `DATABASE_URL`              | Supabase **Session pooler** URL                         |
| `REDIS_URL`                 | Upstash `rediss://…`                                    |
| `SUPABASE_URL`              | Supabase project URL (api verifies logins via its JWKS) |
| `SUPABASE_SECRET_KEY`       | Supabase `sb_secret_…`                                  |
| `POSTMARK_SERVER_TOKEN`     | Postmark server token                                   |
| `POSTMARK_ACCOUNT_TOKEN`    | Postmark account token                                  |
| `POSTMARK_FROM_EMAIL`       | `reviews@send.tryrater.com`                             |
| `POSTMARK_MESSAGE_STREAM`   | `outbound`                                              |
| `POSTMARK_WEBHOOK_USERNAME` | you choose (match the webhook)                          |
| `POSTMARK_WEBHOOK_PASSWORD` | you choose (match the webhook)                          |
| `OUTSCRAPER_API_KEY`        | Outscraper                                              |
| `NEXT_PUBLIC_APP_URL`       | `https://app.tryrater.com` (CORS + rate links)          |


---

## 14. Verify in production (smoke test)

- `https://api.tryrater.com/health` → OK (DB reachable).
- Open `https://app.tryrater.com` → sign in with magic link → email arrives (Postmark/Supabase SMTP working).
- Onboard a business + location (Google Places picker works → Google key OK).
- Create a review request → the customer email arrives **from `reviews@send.tryrater.com` with the business name** (worker + Postmark + sender domain all wired).
- Open the rate link → submit a 5-star rating → you get routed to Google; the **funnel** on the overview updates (Sent→…→Rated→Clicked).
- Worker logs show the follow-up scheduler + attribution sweep scheduled, no errors.

---

## 15. Observability & ongoing ops (do soon after launch)

- **Sentry:** add `@sentry/nextjs` to web and `@sentry/node` to api + worker, set a `SENTRY_DSN` per app. (Small code change — ask Claude to scaffold it.)
- **Uptime monitor:** point a free monitor (BetterStack / UptimeRobot) at `https://api.tryrater.com/health`.
- **Backups:** Supabase auto-backups come with paid tiers — upgrade before you have real customer data.
- **2FA** on Vercel, Railway, Supabase, Postmark, Outscraper, GitHub.
- **CI deploy:** the repo already runs typecheck+build on every PR (`.github/workflows/ci.yml`). Vercel/Railway auto-deploy on push to `main` — confirm both are set to deploy from `main` only.

---

## Common first-deploy pitfalls (rater-specific)

- **"Can't reach database"** → you used the *direct* Supabase URL (IPv6-only). Use the **Session pooler** URL.
- **API build fails on `@prisma/client` types** → the build must run `prisma generate` first (the start commands above do; the postinstall alone can't find `packages/db/prisma/schema.prisma`).
- **CORS errors in the browser** → api's `NEXT_PUBLIC_APP_URL` doesn't exactly match the web origin.
- **Emails link to `localhost:3001`** → worker's `NEXT_PUBLIC_APP_URL` not set to the prod web URL.
- **Magic link goes nowhere / rate-limited** → Supabase Site/Redirect URLs wrong, or Supabase SMTP not pointed at Postmark.
- **Jobs never run (no emails, no follow-ups, no attribution)** → worker has no `REDIS_URL`, or the worker service isn't actually running (check its Railway logs for "worker ready").
- `**pnpm@10.9.2` not found** → already handled; the repo pins `pnpm@10.33.4`.

