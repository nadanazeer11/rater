'use client';

import { useState } from 'react';
import { Divider, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import { useSignOut } from '@/hooks/use-sign-out';

export function DashboardHeader({
  email,
  businessName,
}: {
  email: string;
  businessName: string | null;
}) {
  const signOut = useSignOut();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  async function handleSignOut() {
    setAnchor(null);
    await signOut();
  }

  const initial = email.trim()[0]?.toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-border bg-surface/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex-1" />
      <Tooltip title="Help — coming soon" arrow>
        <span>
          <IconButton size="small" disabled>
            <HelpOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Notifications — coming soon" arrow>
        <span>
          <IconButton size="small" disabled>
            <NotificationsNoneRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <div className="ml-1.5 h-6 w-px bg-border" />
      <button
        type="button"
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Account menu"
        className="tactile ml-1.5 flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-zinc-50 sm:pr-3"
      >
        <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-fg">
          {initial}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[200px] truncate text-sm font-medium text-ink">
            {email}
          </span>
          <span className="block text-xs text-faint">{businessName ?? '—'}</span>
        </span>
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
    </header>
  );
}
