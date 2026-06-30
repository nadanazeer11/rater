'use client';

import type { FunnelStage } from '@rater/types';
import { useFunnel, useOverview } from '@/hooks/use-analytics';

export function LocationAnalytics({ locationId }: { locationId: string }) {
  const { data: overview, isPending: overviewPending } = useOverview(locationId);
  const { data: funnel, isPending: funnelPending } = useFunnel(locationId);

  const num = (v: number | undefined) => (v === undefined ? '—' : v.toLocaleString());

  return (
    <section className="space-y-6">
      <div className="space-y-0.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
          This location
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-ink">Overview</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          accent="bg-accent"
          label="Review requests sent"
          value={overviewPending ? null : num(overview?.requestsSent)}
          hint="Emails that have left the system"
        />
        <StatCard
          accent="bg-amber-500"
          label="Awaiting response"
          value={overviewPending ? null : num(overview?.awaitingResponse)}
          hint="Emailed customers who haven't rated yet"
        />
        <StatCard
          accent="bg-emerald-500"
          label="New Google reviews"
          value={overviewPending ? null : num(overview?.newGoogleReviews)}
          hint={
            overview?.baselineCaptured
              ? 'Since baseline was captured'
              : 'Baseline not yet captured'
          }
        />
      </div>

      <Funnel
        stages={funnel?.stages ?? null}
        pending={funnelPending}
      />
    </section>
  );
}

function StatCard({
  accent,
  label,
  value,
  hint,
}: {
  accent: string;
  label: string;
  value: string | null;
  hint: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(24,24,27,0.08)]">
      <div className={`h-[3px] ${accent}`} />
      <div className="space-y-2 p-5">
        <p className="text-xs font-medium text-muted">{label}</p>
        {value === null ? (
          <span className="block h-8 w-12 animate-pulse rounded bg-zinc-200/80" />
        ) : (
          <p className="font-mono text-3xl font-semibold tabular-nums leading-none text-ink">
            {value}
          </p>
        )}
        <p className="text-xs leading-relaxed text-faint">{hint}</p>
      </div>
    </div>
  );
}

function Funnel({
  stages,
  pending,
}: {
  stages: FunnelStage[] | null;
  pending: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">Conversion funnel</h3>
        <span className="text-[11px] text-faint">All time</span>
      </div>

      {pending ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 animate-pulse rounded bg-zinc-200/70" />
          ))}
        </div>
      ) : !stages || stages.every((s) => s.count === 0) ? (
        <p className="py-4 text-sm text-faint">
          No requests sent yet — the funnel fills in once you send your first review request.
        </p>
      ) : (
        <ol className="space-y-2">
          {stages.map((s) => (
            <FunnelBar key={s.key} stage={s} />
          ))}
        </ol>
      )}
    </div>
  );
}

function FunnelBar({ stage }: { stage: FunnelStage }) {
  // Width relative to the first stage so the funnel visibly narrows.
  const width = Math.max(stage.pctOfStart, stage.count > 0 ? 4 : 0);
  return (
    <li className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-xs text-muted">{stage.label}</span>
      <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-zinc-100">
        <div
          className={`h-full rounded-md ${stage.pending ? 'bg-zinc-300' : 'bg-accent/85'}`}
          style={{ width: `${width}%` }}
        />
        <span className="absolute inset-y-0 left-2 flex items-center gap-2 text-[11px] font-medium text-ink">
          <span className="font-mono tabular-nums">{stage.count.toLocaleString()}</span>
          <span className="text-faint">{stage.pctOfStart}%</span>
          {stage.pending && <span className="text-faint">· pending attribution</span>}
        </span>
      </div>
    </li>
  );
}
