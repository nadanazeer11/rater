'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { apiDelete } from '@/lib/api';

export function CustomerRowActions({
  customerId,
  customerLabel,
}: {
  customerId: string;
  customerLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (submitting) return;
    setOpen(false);
    setTimeout(() => setError(null), 200);
  }

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      await apiDelete(`/customers/${customerId}`);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Tooltip title="Remove customer" arrow>
        <IconButton size="small" onClick={() => setOpen(true)} aria-label="Remove customer">
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
        <DialogContent sx={{ p: { xs: 3, sm: 4 } }}>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold tracking-tight text-ink">Remove customer?</h2>
              <p className="text-sm leading-relaxed text-muted">
                <span className="font-medium text-ink">{customerLabel}</span> will be removed from
                this location. Past review requests are kept.
              </p>
            </div>
            {error && <Alert severity="error">{error}</Alert>}
            <div className="flex items-center justify-between gap-3">
              <Button variant="text" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting ? 'Removing…' : 'Remove'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
