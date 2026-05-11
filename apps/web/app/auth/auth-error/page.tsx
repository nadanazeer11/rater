import Link from 'next/link';
import { Button } from '@mui/material';
import { AuthShell } from '@/components/auth-shell';

export default function AuthErrorPage() {
  return (
    <AuthShell>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Sign-in failed
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          That link may have expired or already been used. Request a fresh one
          and you&apos;ll be in.
        </p>
      </div>
      <div className="mt-8">
        <Button component={Link} href="/sign-in" variant="contained" size="large" fullWidth>
          Back to sign in
        </Button>
      </div>
    </AuthShell>
  );
}
