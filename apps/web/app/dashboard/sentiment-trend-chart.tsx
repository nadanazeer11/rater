'use client';

import { BarChart } from '@mui/x-charts/BarChart';
import { useSentimentTrend } from '@/hooks/use-sentiment-trend';

const POSITIVE = '#059669';
const NEUTRAL = '#F59E0B';
const NEGATIVE = '#E11D48';

export function SentimentTrendChart({ locationId }: { locationId: string }) {
  const { data, isPending } = useSentimentTrend(locationId, 6);

  const points = data?.points ?? [];
  const hasData = points.some((p) => p.total > 0);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">Review sentiment</h3>
        <span className="text-[11px] text-faint">Last 6 months</span>
      </div>

      {isPending ? (
        <div className="h-[260px] animate-pulse rounded bg-zinc-100" />
      ) : !hasData ? (
        <p className="py-10 text-center text-sm text-faint">
          No reviews yet — sentiment appears here once this location has Google reviews.
        </p>
      ) : (
        <BarChart
          height={260}
          xAxis={[{ scaleType: 'band', data: points.map((p) => p.label) }]}
          series={[
            { data: points.map((p) => p.positive), label: 'Positive', stack: 's', color: POSITIVE },
            { data: points.map((p) => p.neutral), label: 'Neutral', stack: 's', color: NEUTRAL },
            { data: points.map((p) => p.negative), label: 'Negative', stack: 's', color: NEGATIVE },
          ]}
          slotProps={{ legend: { direction: 'horizontal', position: { vertical: 'bottom', horizontal: 'center' } } }}
          margin={{ top: 10, right: 10, bottom: 40, left: 30 }}
        />
      )}
    </div>
  );
}
