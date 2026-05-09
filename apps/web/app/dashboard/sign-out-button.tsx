'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@mui/material';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/sign-in');
    router.refresh();
  }

  return (
    <Button variant="text" size="small" onClick={handleSignOut}>
      Sign out
    </Button>
  );
}
