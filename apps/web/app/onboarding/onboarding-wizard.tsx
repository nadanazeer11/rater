'use client';

import { useState } from 'react';
import { Alert, Box, Stack } from '@mui/material';
import { apiPost } from '@/lib/api';
import { BusinessStep, type LocationCount } from './business-step';
import { GoogleMapsLoader } from './google-maps-loader';
import { LocationStep, type LocationDraft } from './location-step';

type Props = {
  /** Called after a successful POST /onboarding. Owner of the wizard
   *  is responsible for refreshing/closing/navigating. */
  onComplete: () => void;
};

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0); // 0 = business; 1..N = locations
  const [businessName, setBusinessName] = useState('');
  const [locationCount, setLocationCount] = useState<LocationCount>(1);
  const [locations, setLocations] = useState<LocationDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 1 + locationCount;
  const locationIndex = step - 1;
  const isLastLocation = locationIndex === locationCount - 1;

  function handleBusinessNext(name: string, count: LocationCount) {
    setBusinessName(name);
    setLocationCount(count);
    setLocations([]);
    setStep(1);
  }

  async function handleLocationNext(loc: LocationDraft) {
    const next = [...locations];
    next[locationIndex] = loc;
    setLocations(next);

    if (!isLastLocation) {
      setStep(step + 1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/onboarding', {
        businessName,
        locations: next,
      });
      onComplete();
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  return (
    <Stack spacing={4}>
      <Stack direction="row" spacing={1} justifyContent="center">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 32,
              height: 4,
              borderRadius: 2,
              bgcolor:
                i <= step ? 'primary.main' : 'action.disabledBackground',
              transition: 'background-color 200ms ease',
            }}
          />
        ))}
      </Stack>

      {step === 0 ? (
        <BusinessStep
          defaultName={businessName}
          defaultCount={locationCount}
          onNext={handleBusinessNext}
        />
      ) : (
        <GoogleMapsLoader>
          <LocationStep
            key={locationIndex}
            index={locationIndex}
            total={locationCount}
            onBack={handleBack}
            onNext={handleLocationNext}
            submitting={submitting && isLastLocation}
          />
        </GoogleMapsLoader>
      )}

      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
