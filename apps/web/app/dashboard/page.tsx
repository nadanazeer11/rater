import { redirect } from 'next/navigation';
import { fetchMe } from '@/lib/server-api';
import { EmptyState } from '@/components/empty-state';
import { AddLocationButton } from './add-location-button';
import { DashboardHeader } from './dashboard-header';
import { LocationDetail } from './location-detail';
import { OnboardingDialog } from './onboarding-dialog';
import { Sidebar } from './sidebar';

type SearchParams = Promise<{ location?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const me = await fetchMe();
  if (!me) redirect('/sign-in');

  const { location: locationParam } = await searchParams;
  const selected =
    me.locations.find((l) => l.id === locationParam) ?? me.locations[0] ?? null;
  const canAddLocation = me.locations.some((l) => l.role === 'admin');

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar
        locations={me.locations}
        currentLocationId={selected?.id ?? null}
        canAddLocation={canAddLocation}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          email={me.email}
          businessName={selected?.business.name ?? null}
        />

        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
          {selected ? (
            <LocationDetail location={selected} />
          ) : me.onboarded ? (
            <EmptyState
              title="No locations yet"
              description="Add your first location to start collecting reviews from customers."
              action={<AddLocationButton />}
            />
          ) : null}
        </main>
      </div>

      <OnboardingDialog initiallyOpen={!me.onboarded} />
    </div>
  );
}
