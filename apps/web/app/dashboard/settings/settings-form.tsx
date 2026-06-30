'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Snackbar,
  TextField,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import type { SenderProvider, UpdateSenderSettingsInput } from '@rater/types';
import {
  useSenderSettings,
  useUpdateSenderSettings,
} from '@/hooks/use-sender-settings';
import { useClipboard } from '@/hooks/use-clipboard';
import { useDashboard } from '../dashboard-context';

export function SettingsForm() {
  const { location } = useDashboard();
  const locationId = location?.id ?? '';
  const isAdmin = location?.role === 'admin';
  const businessName = location?.business.name ?? 'Your business';

  const { data, isPending, error } = useSenderSettings(isAdmin ? locationId : '');
  const update = useUpdateSenderSettings(locationId);
  const { copied, copy } = useClipboard();

  const [provider, setProvider] = useState<SenderProvider>('shared');
  const [replyTo, setReplyTo] = useState('');
  const [domain, setDomain] = useState('');
  const [token, setToken] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (!data) return;
    setProvider(data.senderProvider);
    setReplyTo(data.replyToEmail ?? '');
    setDomain(data.fromEmailDomain ?? '');
  }, [data]);

  if (!location) return null;

  if (!isAdmin) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-3 text-sm text-muted">
          Only admins of <span className="font-medium text-ink">{location.name}</span> can
          change its email settings. Ask an admin if you need access.
        </p>
      </main>
    );
  }

  const sharedFrom = data?.sharedFromEmail ?? '';
  const fromPreview =
    provider === 'postmark_domain' && domain.trim()
      ? `"${businessName}" <reviews@${domain.trim().toLowerCase()}>`
      : `"${businessName}" <${sharedFrom}>`;

  const instructions = [
    `Hi — we use rater to collect customer reviews for ${businessName}, and we'd like emails to`,
    `come from our own domain (${domain.trim() || 'ourdomain.com'}). Could you add the DNS records`,
    `that rater shows on the email Settings page to our domain's DNS? It's a DKIM (CNAME) record`,
    `and a Return-Path (CNAME) record — they prove the emails are really from us so they land in`,
    `inboxes. Once added, click "Verify" in rater. Thanks!`,
  ].join(' ');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const input: UpdateSenderSettingsInput = {
      senderProvider: provider,
      replyToEmail: replyTo.trim() ? replyTo.trim() : null,
      fromEmailDomain: domain.trim() ? domain.trim() : null,
    };
    if (token.trim()) input.postmarkServerToken = token.trim();
    try {
      await update.mutateAsync(input);
      setToken('');
      setToast({ kind: 'success', msg: 'Email settings saved.' });
    } catch (err) {
      setToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Could not save settings.' });
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Email settings</h1>
        <p className="text-sm text-muted">
          How review-request emails are sent from{' '}
          <span className="font-medium text-ink">{location.name}</span>.
        </p>
      </div>

      {error ? (
        <Alert severity="error" className="mt-6">
          Couldn&apos;t load settings. {error.message}
        </Alert>
      ) : isPending ? (
        <div className="mt-6 h-48 animate-pulse rounded-card bg-zinc-100" />
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
          <RadioGroup
            value={provider}
            onChange={(e) => setProvider(e.target.value as SenderProvider)}
            className="flex flex-col gap-2"
          >
            <ProviderOption
              value="shared"
              title="Send via rater (recommended)"
              desc="No setup. Emails come from rater with your business name, and replies go to you. Best deliverability with zero DNS work."
            />
            <ProviderOption
              value="postmark_domain"
              title="Send from your own domain"
              desc="Emails come from your domain — needs two DNS records added by whoever manages your website. Until verified, we keep sending via rater."
            />
          </RadioGroup>

          <div className="rounded-card border border-border bg-bg px-4 py-3">
            <p className="text-xs text-faint">Customers will see</p>
            <p className="mt-0.5 font-mono text-sm text-ink">{fromPreview}</p>
          </div>

          <TextField
            label="Reply-to email"
            type="email"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="owner@yourbusiness.com"
            helperText="Where customer replies should land. Leave blank to use the default."
            size="small"
            fullWidth
          />

          {provider === 'postmark_domain' && (
            <div className="flex flex-col gap-3">
              <TextField
                label="Your sending domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="yourbusiness.com"
                helperText="A bare domain, e.g. yourbusiness.com"
                size="small"
                fullWidth
              />
              <div className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-800">
                  {data?.fromEmailDomainVerified
                    ? 'Domain verified — sending from your domain.'
                    : 'Not verified yet — still sending via rater.'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-700">
                  Most owners forward the setup to whoever built their website or manages their
                  domain. Copy the note below and send it to them.
                </p>
                <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyIcon />}
                  onClick={() => copy(instructions)}
                  className="mt-2"
                >
                  {copied ? 'Copied' : 'Copy setup note for your web admin'}
                </Button>
              </div>
              <TextField
                label="Postmark server token (optional, advanced)"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={data?.postmarkConfigured ? '•••••••• (configured)' : 'Leave blank unless you have your own Postmark server'}
                helperText="Write-only — we never display a saved token."
                size="small"
                fullWidth
              />
            </div>
          )}

          <div>
            <Button type="submit" variant="contained" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </form>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.kind} onClose={() => setToast(null)} variant="filled">
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </main>
  );
}

function ProviderOption({
  value,
  title,
  desc,
}: {
  value: SenderProvider;
  title: string;
  desc: string;
}) {
  return (
    <FormControlLabel
      value={value}
      control={<Radio sx={{ alignSelf: 'flex-start', pt: 0.5 }} />}
      label={
        <span className="block py-1">
          <span className="block text-sm font-medium text-ink">{title}</span>
          <span className="block text-xs leading-relaxed text-muted">{desc}</span>
        </span>
      }
      className="m-0 items-start rounded-card border border-border px-3 py-1"
    />
  );
}
