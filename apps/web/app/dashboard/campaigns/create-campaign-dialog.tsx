'use client';

import { useState, type FormEvent } from 'react';
import { Alert, Button, Dialog, DialogContent, TextField } from '@mui/material';
import { useCreateCampaign } from '@/hooks/use-create-campaign';

export function CreateCampaignButton({ locationId }: { locationId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const createCampaign = useCreateCampaign();
  const submitting = createCampaign.isPending;

  function handleClose() {
    if (submitting) return;
    setOpen(false);
    setTimeout(() => {
      setName('');
      createCampaign.reset();
    }, 200);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    createCampaign.mutate({ locationId, name: name.trim() });
    // navigates to the new campaign's editor on success
  }

  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        New campaign
      </Button>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogContent sx={{ p: { xs: 3, sm: 5 } }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="space-y-1.5">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                Campaigns
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-ink">
                New campaign
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                It starts as a copy of the standard review-request email. You can
                edit the wording and add follow-up steps next.
              </p>
            </div>
            <TextField
              label="Campaign name"
              required
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Restaurant tone"
              autoFocus
              disabled={submitting}
            />
            {createCampaign.error && (
              <Alert severity="error">{createCampaign.error.message}</Alert>
            )}
            <div className="flex items-center justify-between gap-3">
              <Button variant="text" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting || name.trim().length === 0}
              >
                {submitting ? 'Creating…' : 'Create campaign'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
