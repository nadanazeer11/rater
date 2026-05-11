'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { Alert, Button, Dialog, DialogContent } from '@mui/material';
import { apiPost } from '@/lib/api';

const MAX_ROWS = 5000;

type Row = { email: string; name?: string; phone?: string };
type ImportResult = {
  received: number;
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
};
type Stage =
  | { kind: 'pick' }
  | { kind: 'preview'; fileName: string; rows: Row[] }
  | { kind: 'done'; result: ImportResult };

function summarize(r: ImportResult): string {
  const parts: string[] = [`${r.imported} added`];
  if (r.skippedDuplicates > 0) parts.push(`${r.skippedDuplicates} already existed`);
  if (r.skippedInvalid > 0) parts.push(`${r.skippedInvalid} skipped (bad email)`);
  return parts.join(' · ');
}

export function ImportCustomersButton({ locationId }: { locationId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'pick' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStage({ kind: 'pick' });
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }
  function handleClose() {
    if (submitting) return;
    setOpen(false);
    setTimeout(reset, 200);
  }

  function handleFile(file: File) {
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const fields = res.meta.fields ?? [];
        if (!fields.includes('email')) {
          setError('No "email" column found. Add a header row with at least an "email" column.');
          return;
        }
        const rows: Row[] = res.data
          .map((r) => ({
            email: (r.email ?? '').trim(),
            name: (r.name ?? '').trim() || undefined,
            phone: (r.phone ?? '').trim() || undefined,
          }))
          .filter((r) => r.email.length > 0 || r.name || r.phone);
        if (rows.length === 0) {
          setError('That file has no data rows.');
          return;
        }
        if (rows.length > MAX_ROWS) {
          setError(`That file has ${rows.length.toLocaleString()} rows — the limit is ${MAX_ROWS.toLocaleString()} per import.`);
          return;
        }
        setStage({ kind: 'preview', fileName: file.name, rows });
      },
      error: () => setError('Could not read that file. Make sure it is a .csv.'),
    });
  }

  async function handleImport(rows: Row[]) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiPost<ImportResult>('/customers/import', { locationId, rows });
      setStage({ kind: 'done', result });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outlined" onClick={() => setOpen(true)}>
        Import CSV
      </Button>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogContent sx={{ p: { xs: 3, sm: 5 } }}>
          <div className="space-y-6">
            <div className="space-y-1.5">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                Import customers
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-ink">
                {stage.kind === 'done' ? 'Import complete' : 'Upload a CSV'}
              </h2>
              {stage.kind !== 'done' && (
                <p className="text-sm leading-relaxed text-muted">
                  Headers we read: <span className="font-mono text-ink">email</span> (required),{' '}
                  <span className="font-mono text-ink">name</span>,{' '}
                  <span className="font-mono text-ink">phone</span> — case-insensitive. Duplicates
                  and bad emails are skipped automatically.
                </p>
              )}
            </div>

            {stage.kind === 'pick' && (
              <label className="tactile flex cursor-pointer flex-col items-center gap-2 rounded-card border border-dashed border-border bg-bg px-6 py-10 text-center transition-colors hover:bg-zinc-50">
                <span className="text-sm font-medium text-ink">Choose a .csv file</span>
                <span className="text-xs text-faint">or drag it here</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>
            )}

            {stage.kind === 'preview' && (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  <span className="font-mono text-ink">{stage.fileName}</span> —{' '}
                  <span className="font-medium text-ink">{stage.rows.length.toLocaleString()}</span>{' '}
                  {stage.rows.length === 1 ? 'row' : 'rows'}.
                </p>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bg text-faint">
                      <tr>
                        <th className="px-3 py-2 font-medium">email</th>
                        <th className="px-3 py-2 font-medium">name</th>
                        <th className="px-3 py-2 font-medium">phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stage.rows.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-mono text-ink">{r.email || '—'}</td>
                          <td className="px-3 py-2 text-muted">{r.name || '—'}</td>
                          <td className="px-3 py-2 text-muted">{r.phone || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {stage.rows.length > 5 && (
                  <p className="text-xs text-faint">…and {(stage.rows.length - 5).toLocaleString()} more.</p>
                )}
              </div>
            )}

            {stage.kind === 'done' && (
              <Alert severity={stage.result.imported > 0 ? 'success' : 'info'}>
                {summarize(stage.result)}.
              </Alert>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            <div className="flex items-center justify-between gap-3">
              {stage.kind === 'done' ? (
                <>
                  <Button variant="text" onClick={reset}>
                    Import another
                  </Button>
                  <Button variant="contained" onClick={handleClose}>
                    Done
                  </Button>
                </>
              ) : stage.kind === 'preview' ? (
                <>
                  <Button variant="text" onClick={reset} disabled={submitting}>
                    Choose another
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => handleImport(stage.rows)}
                    disabled={submitting}
                  >
                    {submitting
                      ? 'Importing…'
                      : `Import ${stage.rows.length.toLocaleString()} ${stage.rows.length === 1 ? 'customer' : 'customers'}`}
                  </Button>
                </>
              ) : (
                <>
                  <span />
                  <Button variant="text" onClick={handleClose}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
