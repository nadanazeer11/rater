'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { SvgIconComponent } from '@mui/icons-material';

/**
 * Sidebar nav item that flips to its "active" appearance the instant the user
 * clicks — `useTransition` lets us read the pending state before the route
 * commits, so the previously-active tab visually un-selects immediately and a
 * spinner sits in the clicked one until the new page paints.
 */
export function NavLink({
  path,
  label,
  icon: Icon,
  query,
}: {
  path: string;
  label: string;
  icon: SvgIconComponent;
  query: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const matchesPath =
    path === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(path);
  const active = matchesPath || isPending;
  const href = `${path}${query}`;

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (matchesPath) return;
        e.preventDefault();
        startTransition(() => router.push(href));
      }}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-accent-soft font-semibold text-accent'
          : 'font-medium text-muted hover:bg-zinc-50 hover:text-ink'
      }`}
    >
      <Icon fontSize="small" />
      <span className="flex-1">{label}</span>
      {isPending && (
        <span
          aria-hidden
          className="size-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
        />
      )}
    </Link>
  );
}
