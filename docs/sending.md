# Sending (Postmark email)

> **Scope:** how the initial review-request email leaves the system — the BullMQ queue, the worker that talks to Postmark, the inbound delivery/open/bounce webhook, and the per-send `ReviewRequestStepExecution` row that anchors them. For follow-up step scheduling see — not built yet (roadmap item #2). For the `ReviewRequest` lifecycle around the rate page see [docs/review-requests.md](review-requests.md). For the campaign template itself see [docs/campaigns.md](campaigns.md).
> **Last updated:** 2026-05-25

## What it is

When an admin creates a review request — via the single dialog or the bulk CSV import — the customer now receives the campaign's **initial** email from Postmark. Webhook events from Postmark (delivery, bounce, open, spam complaint) flow back into the system and update `ReviewRequest.deliveryStatus` / `engagementStatus` and `Customer.emailStatus`. Follow-up steps still don't fire — they're a separate piece of work.

## How it works

End-to-end:

1. **Producer** ([apps/api/src/review-requests/review-requests.service.ts](../apps/api/src/review-requests/review-requests.service.ts)): after `createOne` / `importMany` commits a `ReviewRequest` row, it calls `MailerQueue.enqueueReviewRequestEmail(reviewRequestId)`. The payload carries only the ID — the worker re-reads from the DB so the source of truth never drifts (same principle as `ScrapeQueue`).
2. **Queue** ([apps/api/src/queue/mailer.queue.ts](../apps/api/src/queue/mailer.queue.ts)): a BullMQ producer mirroring `ScrapeQueue` — 3 attempts, exponential 5s backoff, no-op when `REDIS_URL` is unset.
3. **Worker** ([apps/worker/src/mailer/mailer.worker.ts](../apps/worker/src/mailer/mailer.worker.ts)): consumes the `send-review-request-email` queue with concurrency 4. Same no-Redis-no-op pattern as the scrape worker.
4. **Processor** ([apps/worker/src/mailer/mailer.processor.ts](../apps/worker/src/mailer/mailer.processor.ts)) is the meat:
   - Fetches the `ReviewRequest` + `customer` + `location.business` + the campaign's `initial` step. Skips (warn-and-return) when the request is soft-deleted, the customer has no email or is `unsubscribed`/`complained`/`invalid`, or the campaign has no initial step. These aren't retried — they'd just fail forever.
   - Upserts a `ReviewRequestStepExecution` row keyed by `(reviewRequestId, campaignStepId)` so retries don't duplicate it.
   - Renders subject + body via the shared `renderTemplate` helper ([packages/types/src/templates.ts](../packages/types/src/templates.ts)) — the *same* function the campaign editor's client-side preview uses, so what admins see in the preview is what gets sent. Tokens: `{{name}}`, `{{location}}`, `{{business}}`, `{{rate_link}}`.
   - Converts the rendered plain-text body to a minimally-wrapped HTML doc (auto-link http(s) URLs, `\n → <br>`, escape `<`/`>`/`&`).
   - Calls `PostmarkService.sendEmail`. On success, transactionally updates the step execution (`status='executed'`, `postmarkMessageId`), flips `ReviewRequest.deliveryStatus = 'sent'`, and writes `Event { eventType: 'email_sent', payload: { postmarkMessageId, stepExecutionId, stubbed } }`. On error, updates the step execution to `failed` + writes `email_send_failed`, then re-throws so BullMQ retries.
5. **Webhook** ([apps/api/src/webhooks/postmark.controller.ts](../apps/api/src/webhooks/postmark.controller.ts)): `POST /webhooks/postmark`, no auth guard. Postmark calls it with `Delivery` / `Bounce` / `SpamComplaint` / `Open` payloads. Auth is via **HTTP Basic** — configured on the webhook URL in the Postmark dashboard, verified here against `POSTMARK_WEBHOOK_USERNAME` / `POSTMARK_WEBHOOK_PASSWORD`. Lookup is by `ReviewRequestStepExecution.postmarkMessageId` (which has a `@unique` constraint added in migration `20260525160014_step_execution_postmark_unique` so this is a true point lookup, not a scan). Updates `deliveryStatus` / `engagementStatus` on the parent `ReviewRequest`, hard-bounces and spam complaints also flip `Customer.emailStatus` so future requests skip them.

### Stub fallback

`PostmarkService` mirrors `OutscraperService` precisely: if `POSTMARK_SERVER_TOKEN` is empty / `stub` / `placeholder` / `todo`, it logs the email it would have sent and returns a synthetic `stub-<random>` message ID. The processor still writes the step execution, flips `deliveryStatus = 'sent'`, and writes `email_sent { stubbed: true }`. The local dev loop therefore works end-to-end without a Postmark account.

### Why a step execution row from day one

We could have stored `postmarkMessageId` directly on `ReviewRequest`, since today only one email per request goes out. We chose `ReviewRequestStepExecution` instead because the schema is already shaped for multi-step campaigns — when the follow-up scheduler lands, it'll write more executions per request, and the webhook lookup stays unchanged.

## Key files

- `packages/types/src/templates.ts` — shared `renderTemplate` + `TEMPLATE_TOKENS` (used by both the campaign editor preview and the worker)
- `apps/worker/src/mailer/postmark.service.ts` — Postmark SDK wrapper with the stub fallback
- `apps/worker/src/mailer/mailer.processor.ts` — fetch → render → send → write events
- `apps/worker/src/mailer/mailer.worker.ts` — BullMQ worker
- `apps/api/src/queue/mailer.queue.ts` — BullMQ producer
- `apps/api/src/review-requests/review-requests.service.ts` — enqueue hand-off after request create / import
- `apps/api/src/webhooks/{postmark.controller,postmark.service,webhooks.module}.ts` — inbound delivery/bounce/open/complaint
- `packages/db/prisma/migrations/20260525160014_step_execution_postmark_unique/` — the unique index that makes the webhook lookup cheap

## Provisioning the Postmark webhook (one-time)

Postmark needs to know where to POST the `Delivery` / `Bounce` / `SpamComplaint` / `Open` events. We provision the subscription via Postmark's API rather than clicking through the dashboard — the script lives in [scripts/postmark/](../scripts/postmark/) so the setup is reproducible across environments (and re-runnable when the ngrok URL changes in local dev).

### Values we use

Stored in `.env` (gitignored), not committed:

| Env var | What it is | Suggested value |
|---|---|---|
| `POSTMARK_SERVER_TOKEN` | The "Server API token" from the Postmark dashboard → your server → API Tokens. Authorizes the management call to `POST /webhooks` and the `sendEmail` calls. | (from Postmark) |
| `POSTMARK_FROM_EMAIL` | A verified Sender Signature on this server (in test mode, has to be a verified domain — for us, an `@nawy.com` address). | e.g. `noreply@nawy.com` |
| `POSTMARK_MESSAGE_STREAM` | The Postmark message stream. `outbound` is the default transactional stream that every server has. | `outbound` |
| `POSTMARK_WEBHOOK_USERNAME` | HTTP Basic Auth username Postmark will send with each webhook call; we verify it in [postmark.controller.ts](../apps/api/src/webhooks/postmark.controller.ts). Arbitrary, just needs to match. | `rater-webhook` |
| `POSTMARK_WEBHOOK_PASSWORD` | HTTP Basic Auth password — the actual shared secret. Generate with `openssl rand -hex 24`. Same value goes into both `.env` *and* the Postmark webhook config. | 48-char hex |

The username/password are an arbitrary shared secret — Postmark doesn't issue them. They exist so unauthenticated callers can't `POST /webhooks/postmark` and forge delivery events.

### Running the script

```bash
# 1. List existing webhooks on this server (sanity check)
./scripts/postmark/list-webhooks.sh

# 2a. First time: create a webhook pointing at your public URL.
#     Start an ngrok tunnel first: `ngrok http 4000` → grab the https URL.
./scripts/postmark/create-webhook.sh https://abcd1234.ngrok-free.app/webhooks/postmark

# 2b. When the ngrok URL rotates: PUT the new URL in place on the existing webhook.
./scripts/postmark/update-webhook.sh https://NEW-1234.ngrok-free.app/webhooks/postmark
```

All three scripts source `.env` from the repo root. `create-webhook.sh` enables `Delivery`, `Bounce`, `SpamComplaint`, and `Open` — the four event types the controller handles — and leaves `Click` and `SubscriptionChange` off. When the ngrok URL rotates, **`update-webhook.sh <new-url>`** is the fast path: it auto-discovers the existing webhook ID by message stream and PUTs the new URL + re-syncs the `HttpAuth` from `.env` (so a credential rotation is also a one-command operation).

In test mode, Postmark caps you at 100 sends to verified-domain recipients only — sufficient for end-to-end smoke testing against an `@nawy.com` inbox you control.

## Conventions / gotchas

- **Re-fetch in the worker.** Job payload is just `{ reviewRequestId }`. Anything else (email, template text, location name) is fetched fresh — admins can edit the campaign right up to send time and the latest content wins.
- **The processor `await`s the enqueue but doesn't fail the API call if Redis is down** (the producer silently drops jobs when `REDIS_URL` is unset). The review request still gets created. This is intentional — when Redis is missing we want degraded send, not failed creates.
- **The step execution upsert is keyed by `(reviewRequestId, campaignStepId)`**. A retried job updates the same row instead of creating a duplicate execution. The `postmarkMessageId` unique constraint guards against duplicate-write races (e.g. webhook fires for two messages with the same external ID — extremely unlikely, but the unique index would surface the bug).
- **Skip vs. fail.** Soft-deleted requests, missing customer emails, customer-not-`valid`, missing initial step — all log-and-return (no throw). They aren't transient; retrying won't help. Postmark API failures throw — those are transient.
- **The rate link uses `NEXT_PUBLIC_APP_URL`** (worker reads it via `ConfigService`). Comma-separated multi-host values pick the first. Defaults to `http://localhost:3001`.
- **Basic Auth on the webhook is configured in Postmark**, not via headers in code we control. If `POSTMARK_WEBHOOK_USERNAME` / `_PASSWORD` are unset, the controller refuses every webhook with 401 (loud failure beats silent acceptance).

## Not done yet

- **Follow-up steps don't fire.** The campaign editor saves them; nothing executes them. The `requiredState` predicate evaluator + delayed-send scheduler is roadmap item #2 in [CLAUDE.md](../CLAUDE.md).
- **Per-location Postmark config.** Today every location shares the same `POSTMARK_SERVER_TOKEN` + `POSTMARK_FROM_EMAIL`. `Location.postmarkServerToken` / `fromEmailDomain` / `postmarkMessageStream` columns sit unused. Building the per-location Settings UI + `PATCH /locations/:id` endpoint is a separate PR — needed before we exit Postmark test mode with multiple verified sender domains.
- **Token encryption at rest.** When per-location tokens land, they should be encrypted (column-level). Logged in [TODO.md](../TODO.md).
- **Branded magic-link auth emails.** Supabase still sends those.
- **"Send test email" button** on the campaign editor — useful for debugging templates without creating a real request. Out of scope here.
- **HTML template engine.** Body templates are plain-text; the worker auto-wraps them with a minimal HTML shell + auto-linking. No MJML / Postmark template IDs yet.
