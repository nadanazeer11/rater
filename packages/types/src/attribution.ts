/**
 * Pure scoring for matching a posted Google review back to the review request
 * that likely produced it. Kept here (shared + dependency-free) so it's unit-
 * testable and the worker's matcher has one definition of "how confident".
 */

import type { AttributionConfidence } from './enums';

const DAY_MS = 86_400_000;
/** A review posted within this window after the request counts; outside → no match. */
const DEFAULT_WINDOW_DAYS = 45;
/** Allow a little slack for timezones — a review stamped slightly before the request. */
const BACKDATE_SLACK_MS = 1.5 * DAY_MS;

function tokens(name: string | null | undefined): string[] {
  if (!name) return [];
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

export interface ScoreAttributionInput {
  customerName: string | null;
  reviewerName: string;
  /** When the request "expects" a review from (redirect / rating time). */
  requestAt: Date | number;
  reviewPostedAt: Date | number;
  windowDays?: number;
}

export interface AttributionScore {
  confidence: AttributionConfidence | null;
  score: number;
}

/**
 * Returns a confidence band (or null = don't attribute). Requires both a timing
 * fit and a name signal — name is the discriminator, timing is the gate. With
 * no customer name we can't responsibly auto-match, so return null.
 */
export function scoreAttribution(input: ScoreAttributionInput): AttributionScore {
  const requestMs = +new Date(input.requestAt);
  const postedMs = +new Date(input.reviewPostedAt);
  const windowMs = (input.windowDays ?? DEFAULT_WINDOW_DAYS) * DAY_MS;

  // Timing gate: posted at/after the request (minus slack), within the window.
  if (postedMs < requestMs - BACKDATE_SLACK_MS) return { confidence: null, score: 0 };
  if (postedMs > requestMs + windowMs) return { confidence: null, score: 0 };

  const cust = tokens(input.customerName);
  const rev = tokens(input.reviewerName);
  if (cust.length === 0 || rev.length === 0) return { confidence: null, score: 0 };

  const custSet = new Set(cust);
  const revSet = new Set(rev);
  const shared = cust.filter((t) => revSet.has(t));

  const sameFullName =
    cust.length === rev.length && cust.every((t) => revSet.has(t));
  const sameFirst = cust[0] !== undefined && cust[0] === rev[0];
  const anyShared = shared.length > 0;

  // Recency nudge within a band — sooner after the request is marginally likelier.
  const recency = Math.max(0, 1 - (postedMs - requestMs) / windowMs);

  if (sameFullName) return { confidence: 'high', score: 0.9 + 0.1 * recency };
  if (sameFirst && (custSet.size > 1 || revSet.size > 1))
    return { confidence: 'medium', score: 0.55 + 0.1 * recency };
  if (anyShared) return { confidence: 'low', score: 0.35 + 0.1 * recency };
  return { confidence: null, score: 0 };
}
