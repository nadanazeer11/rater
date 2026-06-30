'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import type { GoogleReviewSummary } from '@rater/types';
import { useDraftReply } from '@/hooks/use-review-reply';
import { useClipboard } from '@/hooks/use-clipboard';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function ReviewReply({ review }: { review: GoogleReviewSummary }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const draftReply = useDraftReply();
  const { copied, copy } = useClipboard();

  const generate = async () => {
    try {
      const { draft: text } = await draftReply.mutateAsync(review.id);
      setDraft(text);
    } catch {
      setToast('Could not draft a reply. Try again.');
    }
  };

  const openDialog = async () => {
    setOpen(true);
    if (!draft) await generate();
  };

  return (
    <div className="mt-2">
      {review.ownerReplyText ? (
        <div className="rounded-lg border border-border bg-bg px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-faint">
            Your reply{review.ownerRepliedAt ? ` · ${dateFmt.format(new Date(review.ownerRepliedAt))}` : ''}
          </p>
          <p className="mt-0.5 whitespace-pre-line text-sm text-muted">{review.ownerReplyText}</p>
        </div>
      ) : (
        <Button
          type="button"
          size="small"
          variant="outlined"
          startIcon={<AutoAwesomeRoundedIcon />}
          onClick={openDialog}
        >
          Reply with AI
        </Button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogContent>
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Reply to {review.reviewerName}</h2>
              <p className="text-xs text-muted">
                Edit the draft, copy it, then paste it as your reply on Google.
              </p>
            </div>
            <TextField
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              multiline
              minRows={4}
              fullWidth
              placeholder={draftReply.isPending ? 'Drafting…' : ''}
              disabled={draftReply.isPending}
            />
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={generate} disabled={draftReply.isPending} color="inherit">
            {draftReply.isPending ? 'Drafting…' : 'Regenerate'}
          </Button>
          <Button
            variant="contained"
            startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyIcon />}
            onClick={() => copy(draft)}
            disabled={!draft.trim()}
          >
            {copied ? 'Copied' : 'Copy reply'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity="error" onClose={() => setToast(null)} variant="filled">
            {toast}
          </Alert>
        ) : undefined}
      </Snackbar>
    </div>
  );
}
