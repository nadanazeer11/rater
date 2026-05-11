'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

let loaderPromise: Promise<typeof google> | null = null;

function isPlacesReady(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & { google?: typeof google };
  return Boolean(w.google?.maps?.places);
}

export function GoogleMapsLoader({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(isPlacesReady);

  useEffect(() => {
    if (ready) return;
    if (!loaderPromise) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return;
      }
      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places'],
      });
      loaderPromise = loader.load();
    }
    loaderPromise.then(() => setReady(true)).catch(() => setReady(false));
  }, [ready]);

  if (!ready) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="space-y-2">
          <span className="block h-6 w-56 animate-pulse rounded bg-zinc-200/80" />
          <span className="block h-4 w-72 animate-pulse rounded bg-zinc-200/60" />
        </div>
        <span className="block h-14 w-full animate-pulse rounded-lg bg-zinc-200/70" />
        <div className="flex justify-between">
          <span className="block h-9 w-16 animate-pulse rounded-lg bg-zinc-200/50" />
          <span className="block h-9 w-24 animate-pulse rounded-lg bg-zinc-200/70" />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
