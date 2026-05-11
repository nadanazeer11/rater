'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Dialog, DialogContent } from '@mui/material';
import { apiPost } from '@/lib/api';
import { GoogleMapsLoader } from '../onboarding/google-maps-loader';
import { LocationStep, type LocationDraft } from '../onboarding/location-step';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AddLocationDialog({ open, onClose }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (submitting) return;
    setError(null);
    onClose();
  }

  async function handleAdd(loc: LocationDraft) {
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiPost<{ id: string }>('/locations', loc);
      onClose();
      router.push(`/dashboard?location=${created.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogContent sx={{ p: { xs: 3, sm: 5 } }}>
        <div className="space-y-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            New location
          </p>
          <GoogleMapsLoader>
            <LocationStep
              index={0}
              total={1}
              onBack={handleClose}
              onNext={handleAdd}
              submitting={submitting}
            />
          </GoogleMapsLoader>
          {error && <Alert severity="error">{error}</Alert>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
