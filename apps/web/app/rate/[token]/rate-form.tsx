'use client';

import { useState } from 'react';
import { Alert, Button, Rating, TextField } from '@mui/material';
import { beaconRedirectedToGoogle } from '@/lib/api';
import { useSubmitFeedback, useSubmitRating } from '@/hooks/use-rate-submission';

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
  const submitRating = useSubmitRating(token);
  const submitFeedback = useSubmitFeedback(token);

  function handleSubmitRating() {
    if (!rating) return;
    submitRating.mutate(rating, {
      onSuccess: (res) => {
        if (res.routedTo === 'google') {
          if (res.googleReviewUrl) {
            setPhase('redirecting');
            beaconRedirectedToGoogle(token);
            window.location.href = res.googleReviewUrl;
          } else {
            setPhase('thanks');
          }
        } else {
          setPhase('feedback');
        }
      },
    });
  }

  function handleSubmitFeedback() {
    submitFeedback.mutate(text.trim(), {
      onSuccess: () => setPhase('feedback-done'),
    });
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
      <div className="flex flex-col gap-5">
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
          disabled={submitFeedback.isPending}
          autoFocus
        />
        {submitFeedback.error && (
          <Alert severity="error">{submitFeedback.error.message}</Alert>
        )}
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleSubmitFeedback}
          disabled={submitFeedback.isPending || text.trim().length === 0}
        >
          {submitFeedback.isPending ? 'Sending…' : 'Send feedback'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
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
      {submitRating.error && (
        <Alert severity="error">{submitRating.error.message}</Alert>
      )}
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={handleSubmitRating}
        disabled={submitRating.isPending || !rating}
      >
        {submitRating.isPending ? 'Submitting…' : 'Submit rating'}
      </Button>
    </div>
  );
}
