'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  MenuItem,
  Snackbar,
  TextField,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import type {
  CampaignDelayAnchor,
  CampaignDetail,
  CampaignStepInput,
  CampaignStepType,
} from '@rater/types';
import { TEMPLATE_TOKENS, renderTemplate } from '@rater/types';
import { useUpdateCampaign } from '@/hooks/use-update-campaign';
import { useArchiveCampaign } from '@/hooks/use-archive-campaign';
import { useCampaigns } from '@/hooks/use-campaigns';
import { useDashboard } from '../../dashboard-context';

type Toast = { severity: 'success' | 'error'; message: string };

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '');

/** A campaign is `initial` + at most this many follow-ups. */
const MAX_FOLLOW_UPS = 2;

const STEP_BAR: Record<string, string> = {
  initial: 'bg-accent',
  follow_up_no_rating: 'bg-amber-500',
  follow_up_no_google_review: 'bg-emerald-500',
};
const STEP_CHIP: Record<string, string> = {
  follow_up_no_rating: 'bg-amber-50 text-amber-700 border border-amber-200',
  follow_up_no_google_review:
    'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

type FollowUpKey = 'no_rating' | 'no_google_review';

const FOLLOW_UP_PRESETS: Record<
  FollowUpKey,
  {
    label: string;
    anchorLabel: string;
    stepType: Extract<CampaignStepType, `follow_up_${string}`>;
    delayAnchor: CampaignDelayAnchor;
    requiredState: Record<string, string>;
    starterSubject: string;
    starterBody: string;
  }
> = {
  no_rating: {
    label: "If they haven't rated yet",
    anchorLabel: 'the request was sent',
    stepType: 'follow_up_no_rating',
    delayAnchor: 'request_created',
    requiredState: { ratingStatus: 'not_rated' },
    starterSubject: 'A quick reminder about {{location}}',
    starterBody:
      'Hi {{name}},\n\nJust following up — would you mind taking 10 seconds to rate your visit to {{location}}?\n\n{{rate_link}}\n\n— The {{business}} team',
  },
  no_google_review: {
    label: 'If they rated 4★+ but haven’t posted on Google yet',
    anchorLabel: 'they rated',
    stepType: 'follow_up_no_google_review',
    delayAnchor: 'rating_submitted',
    requiredState: { ratingStatus: 'rated_positive', googleAttributionStatus: 'pending_check' },
    starterSubject: 'Thanks for the {{location}} rating — one more thing?',
    starterBody:
      'Hi {{name}},\n\nThanks so much for rating {{location}}! If you have a moment, it would mean a lot to leave that as a Google review:\n\n{{rate_link}}\n\n— The {{business}} team',
  },
};

function followUpKeyFor(stepType: CampaignStepType): FollowUpKey {
  return stepType === 'follow_up_no_google_review' ? 'no_google_review' : 'no_rating';
}

type EditorStep = CampaignStepInput;

function stripToInput(steps: CampaignDetail['steps']): EditorStep[] {
  return steps.map((s) => ({
    stepType: s.stepType,
    delayDays: s.delayDays,
    delayAnchor: s.delayAnchor,
    requiredState: s.requiredState,
    subjectTemplate: s.subjectTemplate,
    bodyTemplate: s.bodyTemplate,
  }));
}

export function CampaignEditor({ campaign }: { campaign: CampaignDetail }) {
  const router = useRouter();
  const { me } = useDashboard();
  const location = me.locations.find((l) => l.id === campaign.locationId);
  const locationName = location?.name ?? '';
  const businessName = location?.business.name ?? '';
  const { data: campaigns = [] } = useCampaigns(campaign.locationId);
  const canArchive = campaigns.length > 1;
  const [name, setName] = useState(campaign.name);
  const [steps, setSteps] = useState<EditorStep[]>(stripToInput(campaign.steps));
  const [snapshot, setSnapshot] = useState(() =>
    JSON.stringify({ name: campaign.name, steps: stripToInput(campaign.steps) }),
  );
  const [toast, setToast] = useState<Toast | null>(null);

  const update = useUpdateCampaign(campaign.id);
  const archive = useArchiveCampaign(campaign.id);

  const sampleVars = useMemo(
    () => ({
      name: 'Layla Haddad',
      location: locationName,
      business: businessName,
      rate_link: `${APP_URL}/rate/sample`,
    }),
    [locationName, businessName],
  );

  const dirty = JSON.stringify({ name, steps }) !== snapshot;
  const trimmedName = name.trim();
  const allStepsFilled = steps.every(
    (s) => s.subjectTemplate.trim() && s.bodyTemplate.trim(),
  );
  const canSave = dirty && trimmedName.length > 0 && allStepsFilled && !update.isPending;

  function patchStep(i: number, patch: Partial<EditorStep>) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function changeFollowUpTrigger(i: number, key: FollowUpKey) {
    const p = FOLLOW_UP_PRESETS[key];
    patchStep(i, {
      stepType: p.stepType,
      delayAnchor: p.delayAnchor,
      requiredState: p.requiredState,
    });
  }

  function addFollowUp() {
    const p = FOLLOW_UP_PRESETS.no_rating;
    setSteps((prev) => [
      ...prev,
      {
        stepType: p.stepType,
        delayAnchor: p.delayAnchor,
        requiredState: p.requiredState,
        delayDays: 3,
        subjectTemplate: p.starterSubject,
        bodyTemplate: p.starterBody,
      },
    ]);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function appendToken(i: number, token: string) {
    setSteps((prev) =>
      prev.map((s, idx) =>
        idx === i
          ? {
              ...s,
              bodyTemplate:
                s.bodyTemplate +
                (s.bodyTemplate.length === 0 || /\s$/.test(s.bodyTemplate) ? '' : ' ') +
                `{{${token}}}`,
            }
          : s,
      ),
    );
  }

  function handleSave() {
    if (!canSave) return;
    const payload = {
      name: trimmedName,
      steps: steps.map((s) => ({
        ...s,
        subjectTemplate: s.subjectTemplate.trim(),
        bodyTemplate: s.bodyTemplate.trim(),
      })),
    };
    update.mutate(payload, {
      onSuccess: (saved) => {
        const cleaned = stripToInput(saved.steps);
        setName(saved.name);
        setSteps(cleaned);
        setSnapshot(JSON.stringify({ name: saved.name, steps: cleaned }));
        setToast({ severity: 'success', message: 'Campaign saved.' });
      },
      onError: (err) => setToast({ severity: 'error', message: err.message }),
    });
  }

  function handleArchive() {
    archive.mutate(undefined, {
      onSuccess: () => {
        setToast({ severity: 'success', message: 'Campaign archived.' });
        // give the toast a beat to render before we navigate away
        setTimeout(() => {
          router.replace(
            `/dashboard/campaigns?location=${campaign.locationId}`,
          );
          router.refresh();
        }, 1200);
      },
      onError: (err) => setToast({ severity: 'error', message: err.message }),
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        href={`/dashboard/campaigns?location=${campaign.locationId}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowBackRoundedIcon sx={{ fontSize: 16 }} /> Campaigns
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <TextField
          label="Campaign name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          variant="outlined"
          sx={{ width: { xs: '100%', sm: 360 } }}
          disabled={update.isPending}
        />
        {campaign.isDefault && (
          <span className="rounded-md bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent">
            Default — new requests use this
          </span>
        )}
      </div>

      <Alert severity="info">
        Follow-up emails are configured here but aren&apos;t sent automatically
        yet — that comes with the email scheduler. Today only the first email is
        used.
      </Alert>

      <div className="flex flex-col gap-6">
        {steps.map((step, i) => {
          const isInitial = step.stepType === 'initial';
          const followUpKey = isInitial ? null : followUpKeyFor(step.stepType);
          const anchorLabel = followUpKey
            ? FOLLOW_UP_PRESETS[followUpKey].anchorLabel
            : '';
          const chipCls = STEP_CHIP[step.stepType] ?? 'bg-accent-soft text-accent';
          return (
            <section
              key={i}
              className="overflow-hidden rounded-card border border-border bg-surface"
            >
              <div className={`h-[3px] ${STEP_BAR[step.stepType] ?? 'bg-accent'}`} />
              <div className="flex flex-col gap-6 p-7 sm:p-8">
                {isInitial ? (
                  <div className="flex flex-col gap-1">
                    <h2 className="text-[15px] font-semibold text-ink">Initial email</h2>
                    <p className="text-sm text-muted">
                      Sent as soon as you request the review.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] ${chipCls}`}
                    >
                      Follow-up {i}
                    </span>
                    <TextField
                      select
                      size="small"
                      label="When"
                      value={followUpKey ?? 'no_rating'}
                      onChange={(e) =>
                        changeFollowUpTrigger(i, e.target.value as FollowUpKey)
                      }
                      sx={{ minWidth: 280 }}
                      disabled={update.isPending}
                    >
                      {(Object.keys(FOLLOW_UP_PRESETS) as FollowUpKey[]).map((k) => (
                        <MenuItem key={k} value={k}>
                          {FOLLOW_UP_PRESETS[k].label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      type="number"
                      size="small"
                      label={`Days after ${anchorLabel}`}
                      value={step.delayDays}
                      onChange={(e) =>
                        patchStep(i, {
                          delayDays: Math.max(
                            0,
                            Math.min(365, Number(e.target.value) || 0),
                          ),
                        })
                      }
                      sx={{ width: 200 }}
                      slotProps={{ htmlInput: { min: 0, max: 365 } }}
                      disabled={update.isPending}
                    />
                    <span className="flex-1" />
                    <Button
                      size="small"
                      color="error"
                      variant="text"
                      startIcon={<DeleteOutlineRoundedIcon />}
                      onClick={() => removeStep(i)}
                      disabled={update.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                )}

                <div className="grid gap-7 lg:grid-cols-2">
                  <div className="flex flex-col gap-5">
                    <TextField
                      label="Subject"
                      fullWidth
                      value={step.subjectTemplate}
                      onChange={(e) =>
                        patchStep(i, { subjectTemplate: e.target.value })
                      }
                      disabled={update.isPending}
                    />
                    <TextField
                      label="Email body"
                      fullWidth
                      multiline
                      minRows={9}
                      value={step.bodyTemplate}
                      onChange={(e) => patchStep(i, { bodyTemplate: e.target.value })}
                      disabled={update.isPending}
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-faint">Insert:</span>
                      {TEMPLATE_TOKENS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => appendToken(i, t)}
                          disabled={update.isPending}
                          className="tactile rounded-md border border-border bg-bg px-1.5 py-0.5 font-mono text-[11px] text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                        >
                          {`{{${t}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-accent/15 bg-accent-soft/50 p-5">
                    <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                      Preview
                    </p>
                    <p className="text-sm font-semibold text-ink">
                      {renderTemplate(step.subjectTemplate, sampleVars) || (
                        <span className="text-faint">No subject</span>
                      )}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                      {renderTemplate(step.bodyTemplate, sampleVars)}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {steps.length < 1 + MAX_FOLLOW_UPS ? (
        <Button
          variant="outlined"
          onClick={addFollowUp}
          disabled={update.isPending}
          sx={{ alignSelf: 'flex-start' }}
        >
          Add follow-up step
        </Button>
      ) : (
        <p className="text-xs text-faint">
          You can configure up to {MAX_FOLLOW_UPS} follow-up steps per campaign.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <Button
          color="error"
          variant="text"
          onClick={handleArchive}
          disabled={!canArchive || archive.isPending || update.isPending}
          title={canArchive ? undefined : 'You need at least one campaign.'}
        >
          {archive.isPending ? 'Archiving…' : 'Archive campaign'}
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!canSave}>
          {update.isPending ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </Button>
      </div>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert
            severity={toast.severity}
            variant="filled"
            onClose={() => setToast(null)}
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </div>
  );
}
