import { Suspense } from 'react';
import Skeleton from '@mui/material/Skeleton';
import { AuthShell } from '@/components/auth-shell';
import { SignInForm } from './sign-in-form';

export default function SignInPage() {
  return (
    <AuthShell>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign in</h1>
        <p className="text-sm leading-relaxed text-muted">
          Enter your email and we&apos;ll send a one-time sign-in link.
        </p>
      </div>
      <div className="mt-8">
        <Suspense fallback={<Skeleton variant="rounded" height={132} />}>
          <SignInForm />
        </Suspense>
      </div>
    </AuthShell>
  );
}
