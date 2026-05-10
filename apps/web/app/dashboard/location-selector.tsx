'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import type { LocationSummary } from '@/lib/server-api';
import { AddLocationButton } from './add-location-button';

type Props = {
  locations: LocationSummary[];
  currentLocationId: string;
  canAddLocation: boolean;
};

export function LocationSelector({
  locations,
  currentLocationId,
  canAddLocation,
}: Props) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const current = locations.find((l) => l.id === currentLocationId) ?? locations[0];

  if (!current) return null;

  function handleSelect(id: string) {
    setAnchorEl(null);
    router.push(`/dashboard?location=${id}`);
  }

  return (
    <>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={<KeyboardArrowDownIcon />}
        variant="text"
        sx={{
          textTransform: 'none',
          color: 'text.primary',
          px: 1.5,
          py: 0.75,
          borderRadius: 1.5,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Stack spacing={0.1} alignItems="flex-start">
          <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
            {current.name}
          </Typography>
          {current.googleAddress && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                maxWidth: 240,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}
            >
              {current.googleAddress}
            </Typography>
          )}
        </Stack>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 320,
              maxWidth: 400,
              borderRadius: 2,
            },
          },
        }}
      >
        {locations.map((loc) => {
          const isCurrent = loc.id === current.id;
          return (
            <MenuItem
              key={loc.id}
              selected={isCurrent}
              onClick={() => handleSelect(loc.id)}
              sx={{ py: 1.25 }}
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      {loc.name}
                    </Typography>
                    {isCurrent && (
                      <CheckRoundedIcon
                        sx={{ fontSize: 16, color: 'primary.main' }}
                      />
                    )}
                  </Stack>
                }
                secondary={
                  loc.googleAddress ?? `${loc.business.name} · no address`
                }
                secondaryTypographyProps={{
                  variant: 'caption',
                  sx: {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  },
                }}
              />
            </MenuItem>
          );
        })}
        {canAddLocation && [
          <Divider key="div" sx={{ my: 0.5 }} />,
          <MenuItem
            key="add"
            disableRipple
            sx={{ p: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <AddLocationButton
              renderAs={(onClick) => (
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  onClick={() => {
                    setAnchorEl(null);
                    onClick();
                  }}
                  sx={{
                    px: 2,
                    py: 1.25,
                    width: '100%',
                    color: 'primary.main',
                    cursor: 'pointer',
                  }}
                >
                  <AddIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={600}>
                    Add location
                  </Typography>
                </Stack>
              )}
            />
          </MenuItem>,
        ]}
      </Menu>
    </>
  );
}
