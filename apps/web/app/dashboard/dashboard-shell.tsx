'use client';

import type { ReactNode } from 'react';
import type { MeResponse } from '@rater/types';
import { useSelectedLocation } from '@/hooks/use-selected-location';
import { Sidebar } from './sidebar';
import { DashboardHeader } from './dashboard-header';
import { OnboardingDialog } from './onboarding-dialog';

export function DashboardShell({
  me,
  children,
}: {
  me: MeResponse;
  children: ReactNode;
}) {
  const { location } = useSelectedLocation(me.locations);

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar locations={me.locations} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          email={me.email}
          businessName={location?.business.name ?? null}
        />
        {children}
      </div>
      <OnboardingDialog initiallyOpen={!me.onboarded} />
    </div>
  );
}
