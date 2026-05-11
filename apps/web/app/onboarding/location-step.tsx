'use client';

import { useState } from 'react';
import {
  Autocomplete,
  Button,
  CircularProgress,
  Rating,
  TextField,
} from '@mui/material';
import usePlacesAutocomplete, { getDetails } from 'use-places-autocomplete';

type SelectedPlace = {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  totalReviews?: number;
};

export type LocationDraft = {
  name: string;
  googlePlaceId: string;
  googleReviewUrl: string;
  googleRating?: number;
  googleReviewsCount?: number;
  googleAddress?: string;
};

type Option = { label: string; placeId: string };

export function LocationStep({
  index,
  total,
  onBack,
  onNext,
  submitting,
}: {
  index: number;
  total: number;
  onBack: () => void;
  onNext: (loc: LocationDraft) => void;
  submitting: boolean;
}) {
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
  } = usePlacesAutocomplete({ debounce: 200 });

  const isLast = index === total - 1;
  const options: Option[] = data.map((s) => ({
    label: s.description,
    placeId: s.place_id,
  }));

  async function handleSelect(placeId: string) {
    try {
      const details = (await getDetails({
        placeId,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'rating',
          'user_ratings_total',
        ],
      })) as google.maps.places.PlaceResult;

      setSelected({
        placeId: details.place_id ?? placeId,
        name: details.name ?? value,
        address: details.formatted_address ?? '',
        rating: details.rating,
        totalReviews: details.user_ratings_total,
      });
    } catch {
      // ignore — user can pick another result
    }
  }

  function handleContinue() {
    if (!selected) return;
    onNext({
      name: selected.name,
      googlePlaceId: selected.placeId,
      googleReviewUrl: `https://search.google.com/local/writereview?placeid=${selected.placeId}`,
      googleRating: selected.rating,
      googleReviewsCount: selected.totalReviews,
      googleAddress: selected.address || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          {total > 1
            ? `Find location ${index + 1} of ${total} on Google`
            : 'Find your location on Google'}
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Search by business name and we&apos;ll fill in the rest.
        </p>
      </div>

      <Autocomplete<Option, false, false, true>
        freeSolo
        options={options}
        getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
        filterOptions={(x) => x}
        loading={
          !ready || (status === 'OK' && data.length === 0 && value.length > 0)
        }
        onInputChange={(_, val) => setValue(val)}
        onChange={(_, val) => {
          if (val && typeof val !== 'string') {
            void handleSelect(val.placeId);
          }
        }}
        disabled={!ready || submitting}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search for your business"
            placeholder="e.g. Cleopatra Salon, Cairo"
            fullWidth
          />
        )}
      />

      {selected && (
        <div className="rounded-card border border-border bg-bg p-4">
          <p className="text-[15px] font-medium text-ink">{selected.name}</p>
          {selected.address && (
            <p className="mt-0.5 text-sm text-muted">{selected.address}</p>
          )}
          {selected.rating !== undefined && (
            <div className="mt-2 flex items-center gap-2">
              <Rating
                value={selected.rating}
                precision={0.1}
                readOnly
                size="small"
              />
              <span className="text-sm text-muted">
                <span className="font-mono tabular-nums text-ink">
                  {selected.rating.toFixed(1)}
                </span>{' '}
                <span className="font-mono tabular-nums">
                  ({(selected.totalReviews ?? 0).toLocaleString()} reviews)
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="text" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleContinue}
          disabled={!selected || submitting}
        >
          {submitting ? (
            <CircularProgress size={20} color="inherit" />
          ) : isLast ? (
            'Finish'
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </div>
  );
}
