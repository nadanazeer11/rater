'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  Stack,
  Typography,
} from '@mui/material';
import { apiPost } from '@/lib/api';
import { GoogleMapsLoader } from '../onboarding/google-maps-loader';
import { LocationStep, type LocationDraft } from '../onboarding/location-step';

type Props = {
  /** Custom trigger renderer. If omitted, renders the default outlined button. */
  renderAs?: (open: () => void) => ReactNode;
};

export function AddLocationButton({ renderAs }: Props = {}) {
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
      const created = await apiPost<{ id: string }>('/locations', loc);
      setOpen(false);
      router.push(`/dashboard?location=${created.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {renderAs ? (
        renderAs(() => setOpen(true))
      ) : (
        <Button variant="outlined" onClick={() => setOpen(true)}>
          Add location
        </Button>
      )}
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderTop: '3px solid',
              borderTopColor: 'primary.main',
            },
          },
        }}
      >
        <DialogContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack spacing={3}>
            <Stack spacing={0.5}>
              <Typography variant="h5">Add a location</Typography>
              <Typography variant="body2" color="text.secondary">
                Find it on Google and we&apos;ll add it to your business.
              </Typography>
            </Stack>
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
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
