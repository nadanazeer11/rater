import type { ReactNode } from 'react';
import { BrandPanel } from './brand-panel';
import { Logo } from './logo';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <BrandPanel />
      <main className="flex flex-col justify-center bg-bg px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-[400px]">
          <Logo className="mb-10 text-lg text-ink md:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
