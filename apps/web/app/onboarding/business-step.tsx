'use client';

import { useState, type FormEvent } from 'react';
import {
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          Set up your business
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          A few details so we can start collecting reviews for you.
        </p>
      </div>

      <TextField
        label="Business name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        autoFocus
        required
      />

      <div className="flex flex-col gap-2">
        <label
          htmlFor="location-count"
          className="block text-sm font-medium text-ink"
        >
          How many locations?
        </label>
        <ToggleButtonGroup
          id="location-count"
          value={count}
          exclusive
          onChange={(_, val: LocationCount | null) => val && setCount(val)}
          fullWidth
        >
          <ToggleButton value={1}>1</ToggleButton>
          <ToggleButton value={2}>2</ToggleButton>
          <ToggleButton value={3}>3</ToggleButton>
        </ToggleButtonGroup>
        <p className="text-xs text-faint">You can add more later.</p>
      </div>

      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={name.trim().length === 0}
      >
        Continue
      </Button>
    </form>
  );
}
