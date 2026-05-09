'use client';

import { useState } from 'react';
import {
  Autocomplete,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Rating,
  Stack,
  TextField,
  Typography,
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
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5">
          {total > 1
            ? `Find location ${index + 1} of ${total} on Google`
            : 'Find your location on Google'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Search by business name and we&apos;ll fill in the rest.
        </Typography>
      </Stack>

      <Autocomplete<Option, false, false, true>
        freeSolo
        options={options}
        getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
        filterOptions={(x) => x}
        loading={!ready || (status === 'OK' && data.length === 0 && value.length > 0)}
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
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="h6">{selected.name}</Typography>
              {selected.address && (
                <Typography variant="body2" color="text.secondary">
                  {selected.address}
                </Typography>
              )}
              {selected.rating !== undefined && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Rating
                    value={selected.rating}
                    precision={0.1}
                    readOnly
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {selected.rating.toFixed(1)} ({selected.totalReviews ?? 0} reviews)
                  </Typography>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Stack direction="row" spacing={2} justifyContent="space-between">
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
      </Stack>
    </Stack>
  );
}
