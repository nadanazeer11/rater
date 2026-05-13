'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Button, CircularProgress } from '@mui/material';
import type { InvitationDetails } from '@rater/types';
import { createClient } from '@/lib/supabase/client';
import { useAcceptInvitation } from '@/hooks/use-accept-invitation';

type Props = {
  token: string;
  invitation: InvitationDetails;
  currentUserEmail: string | null;
};

function RolePill({ role }: { role: string }) {
  return (
    <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] font-medium text-accent">
      {role}
    </span>
  );
}

export function InviteAcceptCard({
  token,
  invitation,
  currentUserEmail,
}: Props) {
  const router = useRouter();

  // Non-pending: short-circuit before any of the action branches.
  if (invitation.status !== 'pending') {
    const title =
      invitation.status === 'accepted'
        ? 'Invitation already accepted'
        : invitation.status === 'expired'
          ? 'This invitation has expired'
          : 'This invitation has been revoked';
    return (
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted">
            Ask {invitation.invitedBy?.email ?? 'whoever invited you'} for a new
            link.
          </p>
        </div>
        <Button component={Link} href="/" variant="contained" size="large" fullWidth>
          Back to home
        </Button>
      </div>
    );
  }

  const inviterDisplay =
    invitation.invitedBy?.name ?? invitation.invitedBy?.email ?? 'A teammate';

  const headline: ReactNode = (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Join {invitation.location.businessName}
      </h1>
      <p className="text-sm leading-relaxed text-muted">
        {inviterDisplay} invited you to{' '}
        <span className="font-medium text-ink">{invitation.location.name}</span>{' '}
        as <RolePill role={invitation.role} />
      </p>
      <p className="font-mono text-[11px] text-faint">
        Sent to {invitation.email}
      </p>
    </div>
  );

  // Branch 1: not signed in → send magic link directly using the invitation's email.
  if (!currentUserEmail) {
    return (
      <div className="flex flex-col gap-7">
        {headline}
        <SendSignInLink token={token} email={invitation.email} />
      </div>
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
      <div className="flex flex-col gap-7">
        {headline}
        <div className="flex flex-col gap-4">
          <Alert severity="warning">
            You&apos;re signed in as <strong>{currentUserEmail}</strong>, but
            this invitation was sent to <strong>{invitation.email}</strong>.
          </Alert>
          <Button onClick={handleSignOut} variant="contained" size="large" fullWidth>
            Sign out and accept as {invitation.email}
          </Button>
        </div>
      </div>
    );
  }

  // Branch 3: signed in with the right email → auto-accept.
  return (
    <div className="flex flex-col gap-7">
      {headline}
      <AutoAccept token={token} />
    </div>
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
    <div className="flex flex-col gap-4">
      <Button
        onClick={handleClick}
        variant="contained"
        size="large"
        fullWidth
        disabled={status === 'sending'}
      >
        {status === 'sending' ? 'Sending…' : `Send sign-in link to ${email}`}
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
    </div>
  );
}

function AutoAccept({ token }: { token: string }) {
  const acceptInvitation = useAcceptInvitation();
  const { mutate } = acceptInvitation;

  useEffect(() => {
    mutate(token);
  }, [mutate, token]);

  if (acceptInvitation.error) {
    return (
      <div className="flex flex-col gap-4">
        <Alert severity="error">{acceptInvitation.error.message}</Alert>
        <Button
          onClick={() => mutate(token)}
          variant="contained"
          size="large"
          fullWidth
          disabled={acceptInvitation.isPending}
        >
          {acceptInvitation.isPending ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            'Try again'
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-4 text-sm text-muted">
      <CircularProgress size={18} color="primary" />
      Joining…
    </div>
  );
}
