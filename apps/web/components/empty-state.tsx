import type { ReactNode } from 'react';

function PinGlyph() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden
      className="h-11 w-11 text-faint"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M24 42c8-8.5 14-15.4 14-22a14 14 0 1 0-28 0c0 6.6 6 13.5 14 22Z" />
      <circle cx="24" cy="20" r="5" />
    </svg>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-16 text-center">
      {icon ?? <PinGlyph />}
      <div className="space-y-1">
        <p className="text-[15px] font-medium text-ink">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
