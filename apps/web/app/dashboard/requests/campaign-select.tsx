'use client';

import { MenuItem, TextField } from '@mui/material';
import type { CampaignSummary } from '@rater/types';

/** Renders nothing only when there are no campaigns at all — with one campaign
 *  the dropdown still shows, locked to that campaign, so the admin always sees
 *  which campaign their request will run. */
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
  if (campaigns.length === 0) return null;
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
