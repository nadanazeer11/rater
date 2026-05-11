# rater — feature docs

These are the reference docs for how this codebase actually works and *why* it's built the way it
is — the stuff you can't recover by reading the code alone. They exist so a fresh Claude session (or
a human) can get up to speed on an area without spelunking.

## How this works

- **The index lives in `CLAUDE.md` → "## Feature docs"** — that file is always in context, so every
  session knows these docs exist. `docs/README.md` (this file) is just the how-to; it does *not*
  keep its own copy of the index.
- **Read on demand, not always.** Before working in an area, open its doc. Don't read all of `docs/`
  up front.
- **One doc per domain** — a domain = a model (or cluster of models) + its API module + its UI.
  Examples: `customers.md`, `campaigns.md`, `auth.md`, `google-reviews.md`. Plus a few **flow docs**
  for cross-cutting journeys that span domains (e.g. a future `review-request-flow.md`) — those stay
  high-level and link *down* into the domain docs.
- **State scope at the top of every doc** so intersections become links, not copy-paste. If two docs
  would say the same thing, one of them says it and the other links.
- **`architecture.md` is the cross-cutting one** — repo layout, the API clean-architecture pattern,
  BullMQ wiring, Prisma conventions, Supabase auth. Read it once; most feature docs assume it.

## The rule (also in CLAUDE.md and the PR checklist)

**When a PR changes a feature, it updates that feature's doc in the same PR — same discipline as
updating tests.** A new feature ships a new `docs/<area>.md`. Bump the `Last updated` line.

## Adding a doc

1. `cp docs/_template.md docs/<area>.md` and fill it in. Keep it tight — this is a reference, not an
   essay; lead with the decisions and the *why*.
2. Add a one-line entry to the "## Feature docs" index in `CLAUDE.md`.
