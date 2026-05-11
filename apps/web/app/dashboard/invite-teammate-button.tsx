'use client';

import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { apiPost } from '@/lib/api';

type Props = {
  locationId: string;
  locationName: string;
};

type Stage =
  | { kind: 'form' }
  | { kind: 'sent'; email: string; shareUrl: string; role: string };

type CreateResponse = {
  id: string;
  email: string;
  role: string;
  shareUrl: string;
  expiresAt: string;
};

export function InviteTeammateButton({ locationId, locationName }: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'form' });
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleClose() {
    if (submitting) return;
    setOpen(false);
    setTimeout(() => {
      setStage({ kind: 'form' });
      setEmail('');
      setRole('member');
      setError(null);
      setCopied(false);
    }, 200);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiPost<CreateResponse>('/invitations', {
        locationId,
        email: email.trim(),
        role,
      });
      setStage({
        kind: 'sent',
        email: result.email,
        shareUrl: result.shareUrl,
        role: result.role,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable — rare in modern browsers.
    }
  }

  return (
    <>
      <Button variant="text" size="small" onClick={() => setOpen(true)}>
        Invite teammate
      </Button>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogContent sx={{ p: { xs: 3, sm: 5 } }}>
          {stage.kind === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                  Team
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-ink">
                  Invite a teammate
                </h2>
                <p className="text-sm leading-relaxed text-muted">
                  They&apos;ll join{' '}
                  <span className="font-medium text-ink">{locationName}</span>{' '}
                  with the role you choose.
                </p>
              </div>
              <TextField
                label="Email"
                type="email"
                required
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                autoFocus
                disabled={submitting}
              />
              <TextField
                select
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
                fullWidth
                disabled={submitting}
              >
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
              {error && <Alert severity="error">{error}</Alert>}
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="text"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting || email.trim().length === 0}
                >
                  {submitting ? 'Generating…' : 'Generate invite'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                  Invite ready
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-ink">
                  Share this link
                </h2>
                <p className="text-sm leading-relaxed text-muted">
                  Send it to{' '}
                  <span className="font-medium text-ink">{stage.email}</span>.
                  They&apos;ll join as{' '}
                  <span className="font-medium text-ink">{stage.role}</span>.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-bg py-1.5 pl-3 pr-1.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-muted">
                  {stage.shareUrl}
                </span>
                <Tooltip title={copied ? 'Copied' : 'Copy link'}>
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(stage.shareUrl)}
                    color={copied ? 'primary' : 'default'}
                  >
                    {copied ? (
                      <CheckRoundedIcon fontSize="small" />
                    ) : (
                      <ContentCopyIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </div>
              <p className="text-xs leading-relaxed text-faint">
                The link expires in 7 days. Email delivery comes in a future
                update — share it manually for now.
              </p>
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
