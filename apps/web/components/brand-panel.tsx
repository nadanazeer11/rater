import { Logo } from './logo';
import { Stars } from './star-rating';

export function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-ink text-white md:flex md:flex-col md:justify-between md:p-12 lg:p-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-accent/15 blur-3xl"
      />

      <div className="relative">
        <Logo className="text-lg text-white" />
      </div>

      <div className="relative max-w-md">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">
          Happy customers, more Google reviews — without chasing them.
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
          Rater asks for a review the moment someone visits. The fans land on
          your Google listing; the gripes reach you privately first.
        </p>

        <figure className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-fg">
              L
            </span>
            <div className="leading-tight">
              <p className="text-sm font-medium text-white">Layla Haddad</p>
              <p className="font-mono text-[11px] text-zinc-500">
                4 days ago · via Google
              </p>
            </div>
            <Stars value={5} className="ml-auto h-3.5 w-3.5" />
          </div>
          <blockquote className="mt-3 text-sm leading-relaxed text-zinc-300">
            “Booked a last-minute slot and they still squeezed me in. Spotless,
            and the staff actually remembered my name.”
          </blockquote>
        </figure>
      </div>

      <p className="relative font-mono text-xs text-zinc-600">
        Built for salons, clinics &amp; cafés across the Gulf.
      </p>
    </aside>
  );
}
