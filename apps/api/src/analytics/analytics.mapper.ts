import type {
  CampaignPerformance,
  DeliveryStatus,
  EngagementStatus,
  FunnelResponse,
  FunnelStage,
  FunnelStageKey,
  GoogleAttributionStatus,
  RatingStatus,
  ReviewSentiment,
  SentimentTrend,
} from '@rater/types';
import type { FunnelCounts } from './analytics.repository';

interface RequestStatusRow {
  campaignId: string;
  deliveryStatus: DeliveryStatus;
  engagementStatus: EngagementStatus;
  ratingStatus: RatingStatus;
  googleAttributionStatus: GoogleAttributionStatus;
}

const OPENED: EngagementStatus[] = ['opened', 'link_clicked', 'landing_viewed'];
const RATED: RatingStatus[] = ['rated_positive', 'rated_negative', 'feedback_submitted'];

export function toCampaignPerformance(
  campaigns: { id: string; name: string }[],
  rows: RequestStatusRow[],
): CampaignPerformance[] {
  const byId = new Map<string, CampaignPerformance>();
  // First (newest active) campaign is the location's default.
  campaigns.forEach((c, i) => {
    byId.set(c.id, {
      campaignId: c.id,
      campaignName: c.name,
      isDefault: i === 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      rated: 0,
      posted: 0,
    });
  });

  for (const r of rows) {
    const perf = byId.get(r.campaignId);
    if (!perf) continue; // request on an archived campaign — skip
    if (r.deliveryStatus !== 'pending') perf.sent += 1;
    if (r.deliveryStatus === 'delivered') perf.delivered += 1;
    if (OPENED.includes(r.engagementStatus)) perf.opened += 1;
    if (RATED.includes(r.ratingStatus)) perf.rated += 1;
    if (r.googleAttributionStatus === 'confirmed_posted') perf.posted += 1;
  }

  return campaigns.map((c) => byId.get(c.id)!);
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function toSentimentTrend(
  rows: { postedAt: Date; sentiment: ReviewSentiment | null; rating: number }[],
  months: number,
): SentimentTrend {
  const now = new Date();
  const buckets = new Map<
    string,
    { label: string; positive: number; neutral: number; negative: number; total: number; ratingSum: number }
  >();
  const order: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    order.push(key);
    buckets.set(key, {
      label: MONTH_LABELS[d.getMonth()] ?? '',
      positive: 0,
      neutral: 0,
      negative: 0,
      total: 0,
      ratingSum: 0,
    });
  }

  for (const r of rows) {
    const b = buckets.get(monthKey(r.postedAt));
    if (!b) continue;
    b.total += 1;
    b.ratingSum += r.rating;
    if (r.sentiment === 'positive') b.positive += 1;
    else if (r.sentiment === 'neutral') b.neutral += 1;
    else if (r.sentiment === 'negative') b.negative += 1;
  }

  return {
    points: order.map((key) => {
      const b = buckets.get(key)!;
      return {
        bucket: key,
        label: b.label,
        positive: b.positive,
        neutral: b.neutral,
        negative: b.negative,
        total: b.total,
        avgRating: b.total > 0 ? Math.round((b.ratingSum / b.total) * 10) / 10 : null,
      };
    }),
  };
}

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

const STAGE_ORDER: { key: FunnelStageKey; label: string; pending: boolean }[] = [
  { key: 'sent', label: 'Sent', pending: false },
  { key: 'delivered', label: 'Delivered', pending: false },
  { key: 'opened', label: 'Opened', pending: false },
  { key: 'rated', label: 'Rated', pending: false },
  { key: 'routed', label: 'Clicked to Google', pending: false },
  // Real now that the attribution pipeline sets googleAttributionStatus to
  // confirmed_posted (auto for high-confidence, manual-confirm for the rest).
  { key: 'posted', label: 'Posted on Google', pending: false },
];

export function toFunnel(
  counts: FunnelCounts,
  from: string | null,
  to: string | null,
): FunnelResponse {
  const start = counts.sent;
  let prevCount = start;
  const stages: FunnelStage[] = STAGE_ORDER.map((s, i) => {
    const count = counts[s.key];
    const stage: FunnelStage = {
      key: s.key,
      label: s.label,
      count,
      pctOfStart: pct(count, start),
      pctOfPrev: i === 0 ? 100 : pct(count, prevCount),
      pending: s.pending,
    };
    prevCount = count;
    return stage;
  });
  return { stages, from, to };
}
