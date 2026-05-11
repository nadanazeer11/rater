'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Ends the Supabase session and routes back to sign-in. */
export function useSignOut() {
  const router = useRouter();
  return useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/sign-in');
    router.refresh();
  }, [router]);
}
