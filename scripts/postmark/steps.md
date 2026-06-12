# Postmark — end-to-end setup (from zero)

Walk-through to get the campaign email send loop working locally. Three terminals total. Plain shell commands, copy-paste.

---

## Prerequisites (one-time)

### A. `ngrok` for the public webhook URL

Postmark needs to reach your API on `localhost:4000`. ngrok punches a public HTTPS URL through to it.

```bash
# Install
sudo snap install ngrok
# or: brew install ngrok / scoop install ngrok

# Sign up at https://dashboard.ngrok.com (free) (nadanazeer11@gmail.com), grab your authtoken, then:
ngrok config add-authtoken <your-token-from-the-dashboard>
```

You only do this once per machine.

### B. `jq` (optional but recommended)

The webhook-creation script uses `jq` for safe JSON construction. Falls back to `printf` if missing, but `jq` is nicer.

```bash
sudo apt install jq    # ubuntu/debian
# or: brew install jq
```

### C. `.env` values

Open [.env](../../.env) and confirm these are set (all of them, not just the token):

```
POSTMARK_SERVER_TOKEN=<from Postmark → your server → API Tokens>
POSTMARK_FROM_EMAIL=<a verified sender signature, e.g. you@nawy.com>
POSTMARK_MESSAGE_STREAM=outbound

POSTMARK_WEBHOOK_USERNAME=rater-webhook
POSTMARK_WEBHOOK_PASSWORD=<generate with: openssl rand -hex 24>
```

If `POSTMARK_FROM_EMAIL` isn't verified yet, in the Postmark dashboard:
**Sender Signatures → Add Sender Signature → enter your nawy.com address → confirm via email**.

In test mode you can only send TO verified domains (nawy.com, since you verified that). So pick a real nawy.com inbox you own for testing — that's the address you'll send a request to.

---

## Steps

### Terminal 1 — start the tunnel

```bash
ngrok http 4000
```

You'll see something like:

```
Session Status                online
Forwarding                    https://abc1-23-45-678-901.ngrok-free.app -> http://localhost:4000
```

**Copy that `https://…ngrok-free.app` URL.** You'll use it in the next step. Leave this terminal running — closing it kills the tunnel.

> Heads up: free ngrok gives a new URL every restart. If you stop ngrok and start it again, you'll get a different URL and have to re-create the webhook (steps 3 below).

---

### Terminal 2 — provision the Postmark webhook

From the repo root:

```bash
cd ~/personal/rater

# 1. See what's already on this Postmark server
./scripts/postmark/list-webhooks.sh
```

If anything is listed pointing at an old ngrok URL, delete it in the Postmark dashboard (Server → Webhooks → click the row → Delete) so you don't have two stale ones firing into nothing.

```bash
# 2. Create a new webhook at your current ngrok URL.
#    NOTE the path: /webhooks/postmark — that's the route the API listens on.
./scripts/postmark/create-webhook.sh https://abc1-23-45-678-901.ngrok-free.app/webhooks/postmark
```

On success you'll see JSON with an `"ID"` (the webhook's Postmark ID — save it for reference), the URL, and the four enabled triggers (Delivery, Bounce, SpamComplaint, Open). If you see `422` / `400` from the API, the script's last `curl` line will print the error — usually means a missing env var or an unverified sender signature.

---

### Terminal 3 — run the stack

```bash
cd ~/personal/rater
pnpm dev
```

Three apps come up:

- `@rater/api` on `http://localhost:4000` (this is what ngrok forwards to)
- `@rater/worker` (background — drains the BullMQ queues)
- `@rater/web` on `http://localhost:3001`

Watch the worker logs as the apps boot. You should see:

```
[BullMQ worker ready on queue "baseline-scrape"]
[BullMQ worker ready on queue "send-review-request-email"]
```

If you see "REDIS_URL not set — worker will not consume any jobs" — fix `REDIS_URL` in `.env` (Upstash) before going further. Without Redis the producer silently drops every send job.

---

### Test the send loop

1. Open [http://localhost:3001/dashboard](http://localhost:3001/dashboard) in your browser, sign in.
2. Pick a location (or add one if needed).
3. Go to **Requests** → click **Request a review**.
4. Fill in any name, an email at your nawy.com inbox (e.g. `you@nawy.com`), submit.
5. Dialog flips to **Sent ✓ — email on its way to ****.**

Now check three places:


| Where                                                             | What to look for                                                                                                                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Your nawy.com inbox                                               | The campaign's initial email arrives within seconds with `{{name}}`, `{{location}}`, `{{business}}` rendered and a working rate link.                          |
| Worker terminal (T3)                                              | A `MailerProcessor` log line: `Sent initial email for request <id> -> <email> (messageId=<id>)`.                                                               |
| ngrok inspector at [http://localhost:4040](http://localhost:4040) | Within ~10s of the email arriving, you'll see a `POST /webhooks/postmark` from Postmark. Then more on Open. Each one returns `200 {"ok":true,"matched":true}`. |


After the webhook fires, refresh `/dashboard/requests` — the row's `deliveryStatus` should read `delivered` and (after you open the email) `engagementStatus` should be `opened`.

---

## When things go wrong

- **Email doesn't arrive at all.** Check the worker terminal — if the log says `[STUB] would send …`, your `POSTMARK_SERVER_TOKEN` is empty/stub. Set it in `.env` and restart `pnpm dev`. If the log says `Skip send: customer ... emailStatus=…`, your customer's `Customer.emailStatus` isn't `valid` (probably from a previous bounce). Reset it in the DB.
- **Postmark returns `422 - You are not allowed to send to this recipient`.** You're in test mode — recipient domain isn't verified. Send to `*@nawy.com` only, or verify another sender domain in the Postmark dashboard.
- **Webhook never fires.** Check ngrok inspector at `localhost:4040`. If there's no incoming request at all, the URL in the Postmark webhook config is wrong — re-run `list-webhooks.sh` and confirm the `Url` matches your current ngrok URL exactly, ending in `/webhooks/postmark`.
- **Webhook fires but returns `401`.** Basic Auth mismatch. The username/password in `.env` must match what the create script sent to Postmark. Easiest fix: delete the webhook in the Postmark dashboard, double-check `.env`, and re-run `create-webhook.sh`.
- `**deliveryStatus` doesn't flip after a successful webhook 200.** The webhook arrived but couldn't find a matching `ReviewRequestStepExecution`. Most likely the request was created BEFORE you ran the migration that added the unique index on `postmarkMessageId` (`20260525160014_step_execution_postmark_unique`). Run a fresh send.

---

## Cleanup / repeat runs

- When you stop ngrok and start it again, you'll get a new URL. Delete the old webhook in the Postmark dashboard (or via `DELETE https://api.postmarkapp.com/webhooks/{id}` with the server token) and re-run `create-webhook.sh` with the new URL.
- A paid ngrok plan gives a static subdomain — set it once in `create-webhook.sh` and you stop having to re-create.
- Production: this whole flow is replaced by a hosted API URL + Postmark webhook pointing at it. Same script works against the prod token by swapping `.env`.

