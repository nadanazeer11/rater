'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Divider, Menu, MenuItem } from '@mui/material';
import { createClient } from '@/lib/supabase/client';
import { Logo } from './logo';

export function TopBar({ email }: { email: string }) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAnchor(null);
    router.push('/sign-in');
    router.refresh();
  }

  const initial = email.trim()[0]?.toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Logo className="text-base text-ink" />
        <button
          type="button"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="Account menu"
          className="tactile flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-1 text-sm text-muted transition-colors hover:bg-zinc-50 sm:pr-3"
        >
          <span className="grid size-6 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-fg">
            {initial}
          </span>
          <span className="hidden max-w-[200px] truncate sm:inline">{email}</span>
        </button>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { mt: 1, minWidth: 200 } } }}
        >
          <div className="px-3 pb-1.5 pt-1 font-mono text-[11px] leading-tight text-faint sm:hidden">
            {email}
          </div>
          <Divider className="sm:hidden" />
          <MenuItem onClick={handleSignOut} sx={{ fontSize: 14 }}>
            Sign out
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
}
