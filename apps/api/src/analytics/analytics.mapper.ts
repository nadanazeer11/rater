import type { FunnelResponse, FunnelStage, FunnelStageKey } from '@rater/types';
import type { FunnelCounts } from './analytics.repository';

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
