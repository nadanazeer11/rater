'use client';

import { EmptyState } from '@/components/empty-state';
import { useDashboard } from './dashboard-context';
import { AddLocationButton } from './add-location-button';
import { LocationDetail } from './location-detail';

export function DashboardHome() {
  const { me, location } = useDashboard();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      {location ? (
        <LocationDetail location={location} />
      ) : me.onboarded ? (
        <EmptyState
          title="No locations yet"
          description="Add your first location to start collecting reviews from customers."
          action={<AddLocationButton />}
        />
      ) : null}
    </main>
  );
}
