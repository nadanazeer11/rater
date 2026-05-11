'use client';

import { IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useClipboard } from '@/hooks/use-clipboard';

export function CopyLinkButton({ rateUrl }: { rateUrl: string }) {
  const { copied, copy } = useClipboard();

  return (
    <Tooltip title={copied ? 'Copied' : 'Copy rating link'} arrow>
      <IconButton
        size="small"
        onClick={() => copy(rateUrl)}
        color={copied ? 'primary' : 'default'}
        aria-label="Copy rating link"
      >
        {copied ? <CheckRoundedIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
