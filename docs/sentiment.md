# Review sentiment

> **Scope:** how each Google review gets an AI sentiment (positive / neutral / negative), how that's cached + refreshed cheaply, and the sentiment-trend chart on the overview. For the review data + list see [docs/google-reviews.md](google-reviews.md). For the other overview analytics see [docs/analytics.md](analytics.md).
> **Last updated:** 2026-07-01

## What it is

Every review carries a cached `sentiment` (`GoogleReview.sentiment`) classified by Claude from the review text. The overview shows a 6-month **sentiment-trend** chart (stacked positive/neutral/negative per month) — the "how is sentiment moving" view competitors show.

## How it works

- **Cost-bounded classification** (the important part). During the baseline scrape and every incremental sync, `SentimentClassifier.classifyStale(locationId)` picks the location's **100 most recent** reviews where `sentiment IS NULL` **or** `sentimentClassifiedAt` is **older than 15 days**, classifies them, and writes `sentiment` + `sentimentClassifiedAt`. So we never re-score the whole history, and never re-score a fresh row — bounded Anthropic spend.
- **Batched Claude call** (`AnthropicService.classifySentiment`, worker): reviews with text are sent to Claude (Haiku) in chunks of 30, returning a JSON `id → sentiment` map. Reviews **without text**, and the **entire batch when `ANTHROPIC_API_KEY` is unset/stub**, fall back to the **star-rating band** (4–5 positive, 3 neutral, 1–2 negative). A per-chunk failure also falls back to rating bands, so a flaky API never blocks a sync.
- **Trend endpoint:** `GET /analytics/sentiment-trend?locationId=&months=` fetches the location's reviews in the window and buckets them by calendar month → `{ bucket, label, positive, neutral, negative, total, avgRating }[]`. Bucketing is in the mapper (JS), fine at SMB review volumes.
- **Chart:** `SentimentTrendChart` (`@mui/x-charts` stacked `BarChart`) on the location overview (`location-analytics.tsx`), 6 months, emerald/amber/rose.

## Key files

- `packages/db` — `GoogleReview.sentiment` (`ReviewSentiment` enum) + `sentimentClassifiedAt`.
- `apps/worker/src/ai/{anthropic.service,sentiment.classifier,ai.module}.ts` — the classifier (@Global AiModule). Called from `scrape.processor` (baseline) + `attribution.processor` (incremental sync).
- `apps/api/src/analytics/*` — `sentiment-trend` endpoint (repo query + `toSentimentTrend` mapper).
- `apps/web/app/dashboard/sentiment-trend-chart.tsx` + `hooks/use-sentiment-trend.ts`.
- `packages/types` — `ReviewSentiment` enum, `SentimentTrend` / `SentimentTrendPoint`.

## Conventions / gotchas

- **Never re-classify eagerly.** The 15-day + top-100 window is deliberate cost control — don't "helpfully" classify all reviews on every sync.
- **Stub is honest, not fake data.** No key → rating bands (a real, if coarser, signal), same pattern as Postmark/Outscraper. The trend still populates in dev.
- **Sentiment ≠ rating.** With a key, a polite 3-star or a sarcastic 5-star is judged from text — that's the point of using AI over pure rating bands.
- **Unclassified rows are simply absent from the stacks** — an older month with un-refreshed rows may show bars summing to less than its true total. Recent months (the ones people look at) are always classified.

## Not done yet

- **No avg-rating line** on the chart yet (the endpoint returns `avgRating` per bucket; the UI only stacks sentiment). Add a second axis line if wanted.
- **Weekly granularity** — buckets are monthly; add a `granularity` param if a shorter window is needed.
- **No per-review sentiment badge** in the reviews list (the data's there on `GoogleReviewSummary`-adjacent rows; surface it if useful).
