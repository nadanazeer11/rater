# <Area name>

> **Scope:** what this doc covers / what it deliberately doesn't. For <X> see [docs/x.md](x.md). For <Y> see [docs/y.md](y.md).
> **Last updated:** YYYY-MM-DD (PR #N)

## What it is

Product-level: what this feature does and who uses it. 2–4 sentences.

## How it works

The flow, end to end. **Lead with the decisions and the *why*** — especially the non-obvious ones,
the trade-offs we took, and anything that would surprise someone reading just the code. Reference
file paths inline. A short numbered flow is fine.

## Key files

- `path/to/file.ts` — one line on what it does
- ...

## Conventions / gotchas

Area-specific rules. Things that bit us. Deliberate constraints (e.g. "we parse CSV client-side, not
via multipart, because …"). Status-string vocabularies. Edge cases the code handles quietly.

## Not done yet

Known gaps and explicitly-deferred bits, so nobody re-discovers them as bugs.
