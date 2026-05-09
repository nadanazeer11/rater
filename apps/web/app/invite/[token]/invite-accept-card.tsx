'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { apiPost } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import type { InvitationDetails } from '@/lib/server-api';

type Props = {
  token: string;
  invitation: InvitationDetails;
  currentUserEmail: string | null;
};

export function InviteAcceptCard({
  token,
  invitation,
  currentUserEmail,
}: Props) {
  const router = useRouter();

  // Non-pending: short-circuit before any of the action branches.
  if (invitation.status !== 'pending') {
    return (
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Typography variant="h5">
          {invitation.status === 'accepted'
            ? 'Invitation already accepted'
            : invitation.status === 'expired'
              ? 'This invitation has expired'
              : 'This invitation has been revoked'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ask {invitation.invitedBy?.email ?? 'the inviter'} for a new link.
        </Typography>
        <Button component={Link} href="/" variant="text">
          Back to home
        </Button>
      </Stack>
    );
  }

  const inviterDisplay =
    invitation.invitedBy?.name ?? invitation.invitedBy?.email ?? 'A teammate';
  const headline = (
    <Stack spacing={1.5} textAlign="center">
      <Typography variant="h5">
        Join {invitation.location.businessName}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {inviterDisplay} invited you to <strong>{invitation.location.name}</strong>{' '}
        as a <Chip label={invitation.role} size="small" sx={{ ml: 0.5 }} />
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Sent to {invitation.email}
      </Typography>
    </Stack>
  );

  // Branch 1: not signed in → send magic link directly using the invitation's email.
  if (!currentUserEmail) {
    return (
      <Stack spacing={3}>
        {headline}
        <SendSignInLink token={token} email={invitation.email} />
      </Stack>
    );
  }

  // Branch 2: signed in with the wrong email.
  if (currentUserEmail.toLowerCase() !== invitation.email.toLowerCase()) {
    async function handleSignOut() {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
    }
    return (
      <Stack spacing={3}>
        {headline}
        <Alert severity="warning">
          You&apos;re signed in as <strong>{currentUserEmail}</strong>, but this
          invitation was sent to <strong>{invitation.email}</strong>.
        </Alert>
        <Button onClick={handleSignOut} variant="outlined" fullWidth>
          Sign out and accept as {invitation.email}
        </Button>
      </Stack>
    );
  }

  // Branch 3: signed in with the right email → auto-accept.
  return (
    <Stack spacing={3}>
      {headline}
      <AutoAccept token={token} />
    </Stack>
  );
}

function SendSignInLink({ token, email }: { token: string; email: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setStatus('sending');
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/invite/${token}`)}`,
      },
    });
    if (signInError) {
      setError(signInError.message);
      setStatus('error');
      return;
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <Alert severity="success">
        Check <strong>{email}</strong> for a sign-in link. Open it on this
        device to finish joining.
      </Alert>
    );
  }

  return (
    <>
      <Button
        onClick={handleClick}
        variant="contained"
        size="large"
        fullWidth
        disabled={status === 'sending'}
      >
        {status === 'sending'
          ? 'Sending…'
          : `Send sign-in link to ${email}`}
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
    </>
  );
}

function AutoAccept({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  async function accept() {
    setRetrying(true);
    setError(null);
    try {
      await apiPost(
        `/invitations/by-token/${encodeURIComponent(token)}/accept`,
        {},
      );
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setRetrying(false);
    }
  }

  useEffect(() => {
    void accept();
    // Run once on mount; re-running would re-POST.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <>
        <Alert severity="error">{error}</Alert>
        <Button
          onClick={accept}
          variant="contained"
          size="large"
          fullWidth
          disabled={retrying}
        >
          {retrying ? <CircularProgress size={20} color="inherit" /> : 'Try again'}
        </Button>
      </>
    );
  }

  return (
    <Stack alignItems="center" spacing={1.5} sx={{ py: 2 }}>
      <CircularProgress size={28} />
      <Typography variant="body2" color="text.secondary">
        Joining…
      </Typography>
    </Stack>
  );
}
