export function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-sans font-semibold tracking-tight lowercase select-none ${className}`}
    >
      rater<span className="text-accent">.</span>
    </span>
  );
}
