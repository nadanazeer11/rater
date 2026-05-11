'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** `copy(text)` writes to the clipboard and flips `copied` true for `resetMs`. */
export function useClipboard(resetMs = 1800) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetMs);
      } catch {
        // Clipboard API unavailable — rare in modern browsers.
      }
    },
    [resetMs],
  );

  return { copied, copy };
}
