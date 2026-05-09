'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { CircularProgress, Stack } from '@mui/material';

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
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress size={32} />
      </Stack>
    );
  }
  return <>{children}</>;
}
