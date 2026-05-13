'use client';

import { MenuItem, TextField } from '@mui/material';
import type { CampaignSummary } from '@rater/types';

/** Renders nothing when there's only one campaign — the request just uses it. */
export function CampaignSelect({
  campaigns,
  value,
  onChange,
  disabled,
}: {
  campaigns: CampaignSummary[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  if (campaigns.length < 2) return null;
  return (
    <TextField
      select
      label="Campaign"
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      helperText="The email and follow-ups this request runs."
    >
      {campaigns.map((c) => (
        <MenuItem key={c.id} value={c.id}>
          {c.name}
          {c.isDefault ? ' (default)' : ''}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function defaultCampaignId(campaigns: CampaignSummary[]): string {
  return campaigns.find((c) => c.isDefault)?.id ?? campaigns[0]?.id ?? '';
}
