'use client';

import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  TextField,
} from '@mui/material';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import type { CampaignSummary } from '@rater/types';
import { useCreateReviewRequest } from '@/hooks/use-create-review-request';
import { CampaignSelect, defaultCampaignId } from './campaign-select';

type Stage = { kind: 'form' } | { kind: 'done'; email: string };

export function RequestReviewButton({
  locationId,
  campaigns,
}: {
  locationId: string;
  campaigns: CampaignSummary[];
}) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'form' });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [campaignId, setCampaignId] = useState(() => defaultCampaignId(campaigns));
  const createRequest = useCreateReviewRequest();
  const submitting = createRequest.isPending;

  function handleClose() {
    if (submitting) return;
    setOpen(false);
    setTimeout(() => {
      setStage({ kind: 'form' });
      setName('');
      setEmail('');
      setPhone('');
      setCampaignId(defaultCampaignId(campaigns));
      createRequest.reset();
    }, 200);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    createRequest.mutate(
      {
        locationId,
        campaignId: campaignId || undefined,
        customer: {
          name: name.trim(),
          email: trimmedEmail,
          phone: phone.trim() || undefined,
        },
      },
      {
        onSuccess: () => setStage({ kind: 'done', email: trimmedEmail }),
      },
    );
  }

  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Request a review
      </Button>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogContent sx={{ p: { xs: 3, sm: 5 } }}>
          {stage.kind === 'form' ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="space-y-1.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                  Review request
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-ink">
                  Request a review
                </h2>
                <p className="text-sm leading-relaxed text-muted">
                  We&apos;ll add this person as a customer and generate a rating link to send
                  them. Name and email are required.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <CampaignSelect
                  campaigns={campaigns}
                  value={campaignId}
                  onChange={setCampaignId}
                  disabled={submitting}
                />
                <TextField
                  label="Name"
                  required
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Layla Haddad"
                  autoFocus
                  disabled={submitting}
                />
                <TextField
                  label="Email"
                  type="email"
                  required
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  disabled={submitting}
                />
                <TextField
                  label="Phone"
                  fullWidth
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                  disabled={submitting}
                />
              </div>
              {createRequest.error && (
                <Alert severity="error">{createRequest.error.message}</Alert>
              )}
              <div className="flex items-center justify-between gap-3">
                <Button variant="text" onClick={handleClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={
                    submitting || name.trim().length === 0 || email.trim().length === 0
                  }
                >
                  {submitting ? 'Creating…' : 'Create request'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <MarkEmailReadRoundedIcon fontSize="small" />
                </span>
                <div className="space-y-1.5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                    Sent
                  </p>
                  <h2 className="text-xl font-semibold tracking-tight text-ink">
                    Email on its way
                  </h2>
                  <p className="text-sm leading-relaxed text-muted">
                    We sent the rating link to{' '}
                    <span className="font-medium text-ink">{stage.email}</span>. When they tap a
                    rating, a high one goes to your Google listing; a low one comes back to you
                    privately.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="contained" onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
