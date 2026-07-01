'use client';

import type { CampaignPerformance as Perf } from '@rater/types';
import { useCampaignPerformance } from '@/hooks/use-campaign-performance';
import { useDashboard } from '../dashboard-context';

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

const STEPS: { key: keyof Pick<Perf, 'sent' | 'delivered' | 'opened' | 'rated' | 'posted'>; label: string }[] = [
  { key: 'sent', label: 'Sent' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'opened', label: 'Opened' },
  { key: 'rated', label: 'Rated' },
  { key: 'posted', label: 'Posted' },
];

function Row({ c }: { c: Perf }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="text-[15px] font-medium text-ink">{c.campaignName}</span>
        {c.isDefault && (
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">
            Default
          </span>
        )}
        <span className="ml-auto text-xs text-faint">
          {pct(c.rated, c.sent)}% rated · {pct(c.posted, c.sent)}% posted
        </span>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {STEPS.map((s) => (
          <div key={s.key} className="rounded-lg border border-border bg-bg px-2.5 py-2">
            <p className="font-mono text-lg font-semibold tabular-nums leading-none text-ink">
              {c[s.key].toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-faint">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Conversion bar: how far requests get, relative to Sent. */}
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div className="bg-accent/85" style={{ width: `${pct(c.rated, c.sent)}%` }} />
        <div className="bg-emerald-500" style={{ width: `${pct(c.posted, c.sent)}%` }} />
      </div>
    </div>
  );
}

export function CampaignPerformance() {
  const { location } = useDashboard();
  const locationId = location?.id ?? '';
  const { data, isPending } = useCampaignPerformance(locationId);

  if (!location) return null;
  const campaigns = data?.campaigns ?? [];
  const anySent = campaigns.some((c) => c.sent > 0);

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight text-ink">Campaign performance</h2>
      <p className="mt-1 text-sm text-muted">
        How each campaign&apos;s requests convert — sent → delivered → opened → rated → posted on Google.
      </p>

      <div className="mt-4">
        {isPending ? (
          <div className="h-28 animate-pulse rounded-card bg-zinc-100" />
        ) : !anySent ? (
          <p className="rounded-card border border-border bg-surface px-5 py-6 text-sm text-faint">
            No sends yet — performance appears once a campaign has sent its first requests.
          </p>
        ) : (
          <div className="overflow-hidden rounded-card border border-border bg-surface divide-y divide-border">
            {campaigns.map((c) => (
              <Row key={c.campaignId} c={c} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
