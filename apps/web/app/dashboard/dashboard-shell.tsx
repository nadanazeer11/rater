'use client';

import type { ReactNode } from 'react';
import { useDashboard } from './dashboard-context';
import { Sidebar } from './sidebar';
import { DashboardHeader } from './dashboard-header';
import { OnboardingDialog } from './onboarding-dialog';

export function DashboardShell({ children }: { children: ReactNode }) {
  const { me } = useDashboard();

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader />
        {children}
      </div>
      <OnboardingDialog initiallyOpen={!me.onboarded} />
    </div>
  );
}
