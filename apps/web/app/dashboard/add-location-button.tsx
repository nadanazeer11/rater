'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Dialog, DialogContent } from '@mui/material';
import { apiPost } from '@/lib/api';
import { GoogleMapsLoader } from '../onboarding/google-maps-loader';
import { LocationStep, type LocationDraft } from '../onboarding/location-step';

export function AddLocationButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (submitting) return;
    setOpen(false);
    setError(null);
  }

  async function handleAdd(loc: LocationDraft) {
    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/locations', loc);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Add location
      </Button>
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
    </>
  );
}
