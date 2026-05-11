function Star({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={className} fill="currentColor">
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.78l-5.2 2.73.99-5.79L1.58 7.62l5.82-.85L10 1.5z" />
    </svg>
  );
}

export function Stars({
  value = 5,
  className = 'h-4 w-4',
}: {
  value?: number;
  className?: string;
}) {
  const full = Math.round(value);
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${className} ${i < full ? 'text-star' : 'text-zinc-300'}`}
        />
      ))}
    </span>
  );
}

export function StarRating({
  rating,
  count,
  className = '',
}: {
  rating: number;
  count?: number | null;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs text-muted ${className}`}
    >
      <Star className="h-3.5 w-3.5 text-star" />
      <span className="font-mono tabular-nums text-ink">{rating.toFixed(1)}</span>
      {count != null && (
        <>
          <span aria-hidden className="text-faint">
            ·
          </span>
          <span className="font-mono tabular-nums">
            {count.toLocaleString()} reviews
          </span>
        </>
      )}
    </span>
  );
}
