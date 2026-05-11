'use client';

import { useState } from 'react';
import { Alert, Button, Rating, TextField } from '@mui/material';
import { apiPost } from '@/lib/api';

type RateResult = { routedTo: 'google' | 'feedback'; googleReviewUrl: string | null };
type Phase = 'rate' | 'redirecting' | 'feedback' | 'feedback-done' | 'thanks';

export function RateForm({
  token,
  businessName,
  locationName,
}: {
  token: string;
  businessName: string;
  locationName: string;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('rate');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitRating() {
    if (!rating) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost<RateResult>(`/review-requests/by-token/${token}/rate`, { rating });
      if (res.routedTo === 'google') {
        if (res.googleReviewUrl) {
          setPhase('redirecting');
          window.location.href = res.googleReviewUrl;
        } else {
          setPhase('thanks');
        }
      } else {
        setPhase('feedback');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitFeedback() {
    setSubmitting(true);
    setError(null);
    try {
      await apiPost(`/review-requests/by-token/${token}/feedback`, { text: text.trim() });
      setPhase('feedback-done');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === 'redirecting' || phase === 'thanks') {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Thanks!</h1>
        <p className="text-sm leading-relaxed text-muted">
          {phase === 'redirecting'
            ? 'Taking you to Google to post your review…'
            : `Glad you enjoyed ${locationName}. Appreciate you taking a moment.`}
        </p>
      </div>
    );
  }

  if (phase === 'feedback-done') {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Thanks for the feedback</h1>
        <p className="text-sm leading-relaxed text-muted">
          It goes straight to {businessName} — they&apos;ll take it from here.
        </p>
      </div>
    );
  }

  if (phase === 'feedback') {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Sorry to hear that</h1>
          <p className="text-sm leading-relaxed text-muted">
            What went wrong? This goes privately to {businessName} — it won&apos;t be posted
            publicly.
          </p>
        </div>
        <TextField
          label="Your feedback"
          multiline
          minRows={4}
          fullWidth
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={submitting}
          autoFocus
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={submitFeedback}
          disabled={submitting || text.trim().length === 0}
        >
          {submitting ? 'Sending…' : 'Send feedback'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          How was your visit to {locationName}?
        </h1>
        <p className="text-sm leading-relaxed text-muted">Tap a rating — it takes a second.</p>
      </div>
      <div className="flex justify-center py-2">
        <Rating
          value={rating}
          onChange={(_, v) => setRating(v)}
          size="large"
          sx={{ fontSize: '3rem' }}
        />
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={submitRating}
        disabled={submitting || !rating}
      >
        {submitting ? 'Submitting…' : 'Submit rating'}
      </Button>
    </div>
  );
}
