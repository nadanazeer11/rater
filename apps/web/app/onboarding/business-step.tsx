'use client';

import { useState, type FormEvent } from 'react';
import {
  Button,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';

export type LocationCount = 1 | 2 | 3;

export function BusinessStep({
  defaultName,
  defaultCount,
  onNext,
}: {
  defaultName: string;
  defaultCount: LocationCount;
  onNext: (name: string, count: LocationCount) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [count, setCount] = useState<LocationCount>(defaultCount);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onNext(trimmed, count);
  }

  return (
    <Stack component="form" onSubmit={handleSubmit} spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5">Set up your business</Typography>
        <Typography variant="body2" color="text.secondary">
          A few details so we can start collecting reviews for you.
        </Typography>
      </Stack>

      <TextField
        label="Business name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        autoFocus
        required
      />

      <Stack spacing={1}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Number of locations
        </Typography>
        <ToggleButtonGroup
          value={count}
          exclusive
          onChange={(_, val: LocationCount | null) => val && setCount(val)}
          fullWidth
          color="primary"
        >
          <ToggleButton value={1}>1</ToggleButton>
          <ToggleButton value={2}>2</ToggleButton>
          <ToggleButton value={3}>3</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary">
          You can add more later.
        </Typography>
      </Stack>

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={name.trim().length === 0}
      >
        Continue
      </Button>
    </Stack>
  );
}
