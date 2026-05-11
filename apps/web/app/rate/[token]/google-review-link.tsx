'use client';

import { beaconRedirectedToGoogle } from '@/lib/api';

export function GoogleReviewLink({ url, token }: { url: string; token: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => beaconRedirectedToGoogle(token)}
      className="tactile inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
    >
      Post a review on Google
    </a>
  );
}
