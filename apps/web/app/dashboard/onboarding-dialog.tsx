'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@mui/material';
import { OnboardingWizard } from '../onboarding/onboarding-wizard';

export function OnboardingDialog({ initiallyOpen }: { initiallyOpen: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);

  function handleComplete() {
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} fullWidth maxWidth="sm" disableEscapeKeyDown>
      <DialogContent sx={{ p: { xs: 3, sm: 5 } }}>
        <OnboardingWizard onComplete={handleComplete} />
      </DialogContent>
    </Dialog>
  );
}
