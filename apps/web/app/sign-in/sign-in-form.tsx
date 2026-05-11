'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Button, Stack, TextField } from '@mui/material';
import { createClient } from '@/lib/supabase/client';

type Status = 'idle' | 'sending' | 'sent' | 'error';

function isSafeNext(value: string | null): value is string {
  // Only allow same-origin paths (must start with `/` and not `//`).
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'));
}

export function SignInForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const next = isSafeNext(nextParam) ? nextParam : '/dashboard';

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
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
        Check <strong>{email}</strong> for a sign-in link.
      </Alert>
    );
  }

  return (
    <Stack component="form" onSubmit={handleSubmit} spacing={2.5}>
      <TextField
        label="Email"
        type="email"
        required
        fullWidth
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={status === 'sending'}
        autoComplete="email"
        helperText="No password — we'll email you a link that signs you in."
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={status === 'sending' || email.length === 0}
      >
        {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
