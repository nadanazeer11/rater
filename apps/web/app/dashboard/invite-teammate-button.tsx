'use client';

import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { apiPost } from '@/lib/api';

type Props = {
  locationId: string;
  locationName: string;
};

type Stage =
  | { kind: 'form' }
  | {
      kind: 'sent';
      email: string;
      shareUrl: string;
      role: string;
    };

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
    // Reset on next open.
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
      // Fallback: select-and-copy via execCommand could go here; rare in modern browsers.
    }
  }

  return (
    <>
      <Button variant="text" size="small" onClick={() => setOpen(true)}>
        Invite teammate
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderTop: '3px solid',
              borderTopColor: 'primary.main',
            },
          },
        }}
      >
        <DialogContent sx={{ p: { xs: 3, sm: 5 } }}>
          {stage.kind === 'form' ? (
            <Stack
              component="form"
              onSubmit={handleSubmit}
              spacing={3}
            >
              <Stack spacing={0.5}>
                <Typography variant="h5">Invite a teammate</Typography>
                <Typography variant="body2" color="text.secondary">
                  They&apos;ll join <strong>{locationName}</strong> with the role you choose.
                </Typography>
              </Stack>
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
              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Button variant="text" onClick={handleClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting || email.trim().length === 0}
                >
                  {submitting ? 'Generating…' : 'Generate invite'}
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={3}>
              <Stack spacing={0.5}>
                <Typography variant="h5">Share this link</Typography>
                <Typography variant="body2" color="text.secondary">
                  Send it to <strong>{stage.email}</strong>. They&apos;ll join as a{' '}
                  {stage.role}.
                </Typography>
              </Stack>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  bgcolor: 'background.default',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    flexGrow: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                    fontSize: 13,
                  }}
                >
                  {stage.shareUrl}
                </Typography>
                <Tooltip title={copied ? 'Copied' : 'Copy link'}>
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(stage.shareUrl)}
                    color={copied ? 'primary' : 'default'}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="text.secondary">
                The link expires in 7 days. Email delivery comes in a future update — share manually for now.
              </Typography>
              <Stack direction="row" justifyContent="flex-end">
                <Button variant="contained" onClick={handleClose}>
                  Done
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
