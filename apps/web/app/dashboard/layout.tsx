import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { fetchMe } from '@/lib/server-api';
import { DashboardShell } from './dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await fetchMe();
  if (!me) redirect('/sign-in');
  return <DashboardShell me={me}>{children}</DashboardShell>;
}
