'use client';

import { useState } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Stars } from '@/components/star-rating';
import {
  useConfirmMatch,
  usePendingMatches,
  useRejectMatch,
  useSyncNow,
} from '@/hooks/use-attribution';
import { useDashboard } from '../dashboard-context';

const CONF_TONE: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  low: 'border border-border text-faint',
};

export function PendingMatches() {
  const { location } = useDashboard();
  const locationId = location?.id ?? '';
  const { data: matches } = usePendingMatches(locationId);
  const confirm = useConfirmMatch(locationId);
  const reject = useRejectMatch(locationId);
  const sync = useSyncNow(locationId);
  const [toast, setToast] = useState<string | null>(null);

  if (!location) return null;

  const onSync = async () => {
    try {
      await sync.mutateAsync();
      setToast('Checking Google for new reviews — results appear here shortly.');
    } catch {
      setToast('Could not start a Google check.');
    }
  };

  const hasMatches = matches && matches.length > 0;

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">
          Pending Google matches
          {hasMatches && (
            <span className="ml-2 font-mono text-xs text-faint">{matches.length}</span>
          )}
        </h2>
        <Button
          type="button"
          size="small"
          variant="outlined"
          startIcon={<AutorenewRoundedIcon />}
          onClick={onSync}
          disabled={sync.isPending}
        >
          {sync.isPending ? 'Checking…' : 'Check Google now'}
        </Button>
      </div>

      {hasMatches ? (
        <div className="mt-3 overflow-hidden rounded-card border border-border bg-surface divide-y divide-border">
          {matches.map((m) => (
            <div key={m.reviewId} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{m.reviewerName}</span>
                  <Stars value={m.rating} className="h-3.5 w-3.5" />
                  <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${CONF_TONE[m.confidence] ?? CONF_TONE.low}`}>
                    {m.confidence} confidence
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Possibly from{' '}
                  <span className="font-medium text-ink">
                    {m.request.customerName ?? m.request.customerEmail}
                  </span>
                </p>
                {m.text && (
                  <p className="mt-1 line-clamp-2 text-xs italic text-muted">&ldquo;{m.text}&rdquo;</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<CheckRoundedIcon />}
                  onClick={() => confirm.mutate(m.reviewId)}
                  disabled={confirm.isPending || reject.isPending}
                >
                  It&apos;s them
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<CloseRoundedIcon />}
                  onClick={() => reject.mutate(m.reviewId)}
                  disabled={confirm.isPending || reject.isPending}
                >
                  Not them
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-faint">
          No matches awaiting review. High-confidence matches are confirmed automatically.
        </p>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity="info" onClose={() => setToast(null)} variant="filled">
            {toast}
          </Alert>
        ) : undefined}
      </Snackbar>
    </section>
  );
}
