'use client';

import { Alert, Dialog, DialogContent } from '@mui/material';
import { useAddLocation } from '@/hooks/use-add-location';
import { GoogleMapsLoader } from '../onboarding/google-maps-loader';
import { LocationStep, type LocationDraft } from '../onboarding/location-step';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AddLocationDialog({ open, onClose }: Props) {
  const addLocation = useAddLocation();

  function handleClose() {
    if (addLocation.isPending) return;
    addLocation.reset();
    onClose();
  }

  function handleAdd(loc: LocationDraft) {
    addLocation.mutate(loc, { onSuccess: () => onClose() });
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
              submitting={addLocation.isPending}
            />
          </GoogleMapsLoader>
          {addLocation.error && (
            <Alert severity="error">{addLocation.error.message}</Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
