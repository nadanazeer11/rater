'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { LocationSummary, MeResponse } from '@rater/types';
import { useMe } from '@/hooks/use-me';

type DashboardValue = {
  me: MeResponse;
  /** null when the user hasn't onboarded yet (no locations) — the
   *  `OnboardingDialog` opens in that case; otherwise always populated. */
  location: LocationSummary | null;
  locations: LocationSummary[];
  canAddLocation: boolean;
  selectLocation: (id: string) => void;
};

const DashboardCtx = createContext<DashboardValue | null>(null);

function CenteredSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <span
        aria-label="Loading"
        className="size-6 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
      />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md rounded-card border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        <p className="font-medium">Couldn&apos;t load your account.</p>
        <p className="mt-1 text-rose-600">{message}</p>
        <p className="mt-3 text-xs text-rose-500">
          Try refreshing the page; if it keeps failing, sign out and back in.
        </p>
      </div>
    </div>
  );
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { data: me, error, isPending } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectLocation = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('location', id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const value = useMemo<DashboardValue | null>(() => {
    if (!me) return null;
    const locationParam = searchParams.get('location');
    const location =
      me.locations.find((l) => l.id === locationParam) ??
      me.locations[0] ??
      null;
    const canAddLocation = me.locations.some((l) => l.role === 'admin');
    return {
      me,
      location,
      locations: me.locations,
      canAddLocation,
      selectLocation,
    };
  }, [me, searchParams, selectLocation]);

  if (error) return <ErrorState message={error.message} />;
  if (isPending || !value) return <CenteredSpinner />;

  return <DashboardCtx.Provider value={value}>{children}</DashboardCtx.Provider>;
}

export function useDashboard(): DashboardValue {
  const ctx = useContext(DashboardCtx);
  if (!ctx) {
    throw new Error('useDashboard called outside <DashboardProvider>');
  }
  return ctx;
}
