# Follow-up scheduler

> **Scope:** how configured follow-up `CampaignStep`s actually fire — the BullMQ evaluator, due-time anchors, the send-time predicate re-check, and the reconciliation sweep. For how an email physically leaves the system see [docs/sending.md](sending.md). For the step model + editor see [docs/campaigns.md](campaigns.md).
> **Last updated:** 2026-06-30

## What it is

Campaigns are step-based: an `initial` email plus follow-ups, each with a `delayDays`/`delayAnchor` (when) and a `requiredState` predicate (whether it still applies). This is the piece that makes the follow-ups *fire*. The default campaign now seeds two follow-ups (a "still haven't rated?" nudge at 3 days, a "share it on Google?" nudge at 7 days); users can edit/remove them in the campaign editor.

## How it works

**The golden rule:** a follow-up is **re-checked against fresh status at send time, not enqueue time** — if its condition no longer holds (the customer rated after the job was queued), it's recorded `skipped` and never sent. The authoritative gate lives in the mailer (`runSendStepEmail`), not just the scheduler.

The pipeline (chosen design: **delayed jobs + a reconciliation sweep**):

1. **Kick.** The api enqueues an `evaluate` job (`SchedulerQueue.enqueueEvaluate`) on every status change that could matter: request created, rating submitted, feedback submitted. Idempotent — over-kicking is harmless.
2. **Evaluate** (`SchedulerProcessor.runEvaluate`, worker). Loads the request's fresh status + ordered steps + existing executions. For each follow-up step without an execution row:
   - Compute `dueAt` from the anchor (`request_created` → `createdAt + delay`; `rating_submitted` → `ratingSubmission.submittedAt + delay`, or null/"wait" if unrated; `previous_step` → prior step's exec time + delay).
   - **Not due yet** → track the earliest pending `dueAt`; at the end, enqueue one *delayed* `evaluate` job for that time (precise self-rescheduling).
   - **Due now** → pre-check the predicate + deliverability and **claim the step by `create`-ing its execution row** — the `@@unique(reviewRequestId, campaignStepId)` constraint is the lock that stops a concurrent run from double-enqueuing (a P2002 just means "already claimed", skip). Sendable → row `scheduled` + enqueue a `send-step` job; not sendable → row `skipped`.
3. **Send** (`MailerProcessor.runSendStepEmail`, worker). Re-reads fresh status and **re-evaluates `requiredState` one last time** (`matchesRequiredState`). Still matches + deliverable → render + Postmark + row `executed` + `email_sent`. No longer matches (or bad email) → row `skipped`, no send, no throw. Already `executed` → no-op (idempotent). On Postmark error → row `failed` + `email_send_failed` + throw (BullMQ retries).
4. **Reconciliation sweep** (`runSweep`, repeatable every 15m). Re-enqueues `evaluate` for recent non-deleted requests so a stalled chain (dropped job, worker restart) self-heals. Bounded to 500/run; logs when it hits the cap (no silent truncation).

**Why this shape:** delayed jobs give precise, low-latency firing; the sweep is the safety net; the unique-constraint claim makes the whole thing idempotent under retries and concurrency. The predicate is defined once (`matchesRequiredState` in `@rater/types`) and evaluated in both the scheduler (to avoid enqueuing doomed sends) and the mailer (the authoritative gate).

## Key files

- `packages/types/src/predicates.ts` — `matchesRequiredState(status, requiredState)`; fail-closed on unknown keys; `{}` matches (the initial step).
- `apps/api/src/queue/scheduler.queue.ts` — `SchedulerQueue.enqueueEvaluate` (api producer). Wired into `ReviewRequestsService` (create/import/rate/feedback).
- `apps/worker/src/scheduler/{scheduler.processor,scheduler.producer,scheduler.worker,scheduler.module}.ts` — evaluator + sweep, the worker-side producer (owns the `campaign-scheduler` queue + the repeatable sweep, enqueues `send-step` onto the mailer queue), and the worker.
- `apps/worker/src/mailer/mailer.processor.ts` — `runSendStepEmail` (general, with the send-time re-check) + `runSendInitialEmail` (resolves the initial step). `mailer.worker.ts` dispatches by payload (`send-step` vs `send-initial`).
- `apps/api/src/campaigns/campaigns.repository.ts` — `SEED_STEPS` (initial + 2 default follow-ups).

## Conventions / gotchas

- **Predicate re-check at send time is non-negotiable** — never gate a follow-up purely on enqueue-time state.
- **The unique execution row is the idempotency lock.** Claim by `create` (catch P2002), not `upsert`, in the scheduler; the mailer `upsert`s + short-circuits on `executed`.
- **`REDIS_URL` unset → graceful no-op.** The api producer and the worker producer/workers all log-and-skip without Redis, so api/worker still boot (and CI builds) without it. The sweep won't run, so follow-ups won't fire — that's expected with no queue backend.
- **Skips are recorded, not silent** — a `skipped` `ReviewRequestStepExecution` shows up in the request timeline drawer (see [docs/review-requests.md](review-requests.md)).
- **`step_skipped` has no Event** — the skipped execution row *is* the record (avoids a duplicate timeline entry).

## Not done yet

- **No quiet-hours / send-time window** — a due follow-up fires immediately, any time of day (deferred; would need per-location timezone + window config).
- **`previous_step` anchor uses an approximation** in the same evaluate pass (prior step's `scheduledFor` when `executedAt` isn't set yet). Fine for the request_created-anchored seed; revisit if real campaigns lean on `previous_step` chains.
- **Sweep is coarse** (recent non-deleted requests, 500 cap) — fine at current volume; add a "has unprocessed steps" filter when it matters.
- **No cancel UI** — there's no explicit "stop follow-ups" button; predicates naturally skip terminal states (feedback submitted, bad email), and a soft-deleted request is ignored.
