'use client';

import { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

export function CopyLinkButton({ rateUrl }: { rateUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(rateUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable — rare in modern browsers.
    }
  }

  return (
    <Tooltip title={copied ? 'Copied' : 'Copy rating link'} arrow>
      <IconButton
        size="small"
        onClick={handleCopy}
        color={copied ? 'primary' : 'default'}
        aria-label="Copy rating link"
      >
        {copied ? <CheckRoundedIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
