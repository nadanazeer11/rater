'use client';

import { useState } from 'react';
import { Button } from '@mui/material';
import { AddLocationDialog } from './add-location-dialog';

export function AddLocationButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Add location
      </Button>
      <AddLocationDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
