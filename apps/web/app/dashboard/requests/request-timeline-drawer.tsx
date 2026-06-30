'use client';

import { Drawer, IconButton } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import DraftsOutlinedIcon from '@mui/icons-material/DraftsOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ReportGmailerrorredOutlinedIcon from '@mui/icons-material/ReportGmailerrorredOutlined';
import SkipNextOutlinedIcon from '@mui/icons-material/SkipNextOutlined';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import type { TimelineKind } from '@rater/types';
import { useRequestTimeline } from '@/hooks/use-request-timeline';

const dateTimeFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

type Tone = 'accent' | 'emerald' | 'amber' | 'rose' | 'zinc';

const KIND_META: Record<TimelineKind, { icon: SvgIconComponent; tone: Tone }> = {
  created: { icon: AddCircleOutlineIcon, tone: 'accent' },
  scheduled: { icon: ScheduleOutlinedIcon, tone: 'zinc' },
  sent: { icon: SendOutlinedIcon, tone: 'accent' },
  delivered: { icon: MarkEmailReadOutlinedIcon, tone: 'emerald' },
  opened: { icon: DraftsOutlinedIcon, tone: 'emerald' },
  bounced: { icon: ErrorOutlineIcon, tone: 'rose' },
  complained: { icon: ReportGmailerrorredOutlinedIcon, tone: 'rose' },
  failed: { icon: ErrorOutlineIcon, tone: 'rose' },
  skipped: { icon: SkipNextOutlinedIcon, tone: 'zinc' },
  rated: { icon: StarOutlineRoundedIcon, tone: 'amber' },
  feedback: { icon: ChatBubbleOutlineRoundedIcon, tone: 'amber' },
  redirected: { icon: OpenInNewRoundedIcon, tone: 'emerald' },
  event: { icon: CircleOutlinedIcon, tone: 'zinc' },
};

const TONE_DOT: Record<Tone, string> = {
  accent: 'bg-accent-soft text-accent',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  zinc: 'bg-zinc-100 text-faint',
};

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted">
      <span className="text-faint">{label}</span>
      <span className="font-medium text-ink">{value.replace(/_/g, ' ')}</span>
    </span>
  );
}

export function RequestTimelineDrawer({
  requestId,
  onClose,
}: {
  requestId: string | null;
  onClose: () => void;
}) {
  const { data, isPending, error } = useRequestTimeline(requestId);
  const open = requestId !== null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 } } } }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">Activity</h2>
            {data && (
              <p className="truncate font-mono text-xs text-muted">
                {data.customer.name ?? data.customer.email}
              </p>
            )}
          </div>
          <IconButton size="small" onClick={onClose} aria-label="Close">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </div>

        {data && (
          <div className="flex flex-wrap gap-1.5 border-b border-border px-5 py-3">
            <Chip label="campaign" value={data.campaignName} />
            <Chip label="delivery" value={data.deliveryStatus} />
            <Chip label="engagement" value={data.engagementStatus} />
            <Chip label="rating" value={data.ratingStatus} />
            {data.googleAttributionStatus !== 'not_applicable' && (
              <Chip label="google" value={data.googleAttributionStatus} />
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {error ? (
            <p className="text-sm text-rose-700">Couldn&apos;t load activity. {error.message}</p>
          ) : isPending ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <span className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-zinc-200/80" />
                  <span className="mt-1 block h-4 w-40 animate-pulse rounded bg-zinc-200/80" />
                </div>
              ))}
            </div>
          ) : data.entries.length === 0 ? (
            <p className="text-sm text-faint">No activity recorded yet.</p>
          ) : (
            <ol className="relative">
              {data.entries.map((e, i) => {
                const meta = KIND_META[e.kind] ?? KIND_META.event;
                const Icon = meta.icon;
                const last = i === data.entries.length - 1;
                return (
                  <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                    {!last && (
                      <span className="absolute left-3.5 top-7 -ml-px h-[calc(100%-1rem)] w-px bg-border" />
                    )}
                    <span
                      className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${TONE_DOT[meta.tone]}`}
                    >
                      <Icon sx={{ fontSize: 16 }} />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium capitalize text-ink">{e.label}</p>
                        <time className="shrink-0 font-mono text-[11px] text-faint">
                          {dateTimeFmt.format(new Date(e.at))}
                        </time>
                      </div>
                      {e.detail && (
                        <p className="mt-0.5 wrap-break-word text-xs leading-relaxed text-muted">
                          {e.detail}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </Drawer>
  );
}
