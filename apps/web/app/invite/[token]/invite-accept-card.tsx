'use client';

import { useState } from 'react';
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
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Not signed in.
  if (!currentUserEmail) {
    return (
      <Stack spacing={3}>
        {headline}
        <Button
          component={Link}
          href={`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`}
          variant="contained"
          size="large"
          fullWidth
        >
          Sign in as {invitation.email}
        </Button>
      </Stack>
    );
  }

  // Signed in with the wrong email.
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
          Sign out and sign in as {invitation.email}
        </Button>
      </Stack>
    );
  }

  // Signed in with the right email — ready to accept.
  async function handleAccept() {
    setAccepting(true);
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
      setAccepting(false);
    }
  }

  return (
    <Stack spacing={3}>
      {headline}
      <Button
        onClick={handleAccept}
        variant="contained"
        size="large"
        fullWidth
        disabled={accepting}
      >
        {accepting ? <CircularProgress size={20} color="inherit" /> : 'Accept invitation'}
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
