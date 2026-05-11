'use client';

import { useState } from 'react';
import { Alert } from '@mui/material';
import { useOnboarding } from '@/hooks/use-onboarding';
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
  const onboarding = useOnboarding();

  const totalSteps = 1 + locationCount;
  const locationIndex = step - 1;
  const isLastLocation = locationIndex === locationCount - 1;

  function handleBusinessNext(name: string, count: LocationCount) {
    setBusinessName(name);
    setLocationCount(count);
    setLocations([]);
    setStep(1);
  }

  function handleLocationNext(loc: LocationDraft) {
    const next = [...locations];
    next[locationIndex] = loc;
    setLocations(next);

    if (!isLastLocation) {
      setStep(step + 1);
      return;
    }

    onboarding.mutate(
      { businessName, locations: next },
      { onSuccess: () => onComplete() },
    );
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          {step === 0 ? 'Welcome to Rater' : `Step ${step + 1} of ${totalSteps}`}
        </p>
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                i <= step ? 'bg-accent' : 'bg-zinc-200'
              }`}
            />
          ))}
        </div>
      </div>

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
            submitting={onboarding.isPending && isLastLocation}
          />
        </GoogleMapsLoader>
      )}

      {onboarding.error && <Alert severity="error">{onboarding.error.message}</Alert>}
    </div>
  );
}
