'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  ButtonBase,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import type { LocationSummary } from '@/lib/server-api';
import { AddLocationDialog } from './add-location-dialog';

type Props = {
  locations: LocationSummary[];
  currentLocationId: string | null;
  canAddLocation: boolean;
};

const navItems = [
  { label: 'Dashboard', icon: HomeRoundedIcon, active: true },
  { label: 'Customers', icon: GroupsRoundedIcon, active: false },
  { label: 'Campaigns', icon: CampaignRoundedIcon, active: false },
  { label: 'Reviews', icon: RateReviewRoundedIcon, active: false },
  { label: 'Settings', icon: SettingsRoundedIcon, active: false },
];

const DOT_COLORS = [
  'primary.main',
  'warning.main',
  'error.main',
  'success.main',
];

export function Sidebar({
  locations,
  currentLocationId,
  canAddLocation,
}: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Box
      component="aside"
      sx={{
        width: 264,
        flexShrink: 0,
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}
    >
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              display: 'grid',
              placeItems: 'center',
              color: 'primary.contrastText',
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            r
          </Box>
          <Typography variant="h6" fontWeight={700}>
            rater
          </Typography>
        </Stack>
      </Box>

      <Stack spacing={0.25} sx={{ px: 1.5 }}>
        {navItems.map(({ label, icon: Icon, active }) => {
          const content = (
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{
                px: 1.5,
                py: 1.1,
                borderRadius: 1.5,
                width: '100%',
                color: active ? 'primary.dark' : 'text.secondary',
                bgcolor: active ? 'primary.light' : 'transparent',
                opacity: active ? 1 : 0.85,
                transition: 'background-color 120ms ease',
                '&:hover': active
                  ? { bgcolor: 'primary.light' }
                  : { bgcolor: 'action.hover', color: 'text.primary' },
              }}
            >
              <Icon fontSize="small" />
              <Typography variant="body2" fontWeight={active ? 600 : 500}>
                {label}
              </Typography>
            </Stack>
          );
          return active ? (
            <ButtonBase
              key={label}
              sx={{ borderRadius: 1.5, justifyContent: 'flex-start' }}
              disableRipple
            >
              {content}
            </ButtonBase>
          ) : (
            <Tooltip key={label} title="Coming soon" placement="right" arrow>
              <ButtonBase
                sx={{
                  borderRadius: 1.5,
                  justifyContent: 'flex-start',
                  cursor: 'not-allowed',
                }}
                disableRipple
              >
                {content}
              </ButtonBase>
            </Tooltip>
          );
        })}
      </Stack>

      <Divider sx={{ my: 2, mx: 3 }} />

      <Stack spacing={0.5} sx={{ px: 1.5, pb: 1 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 1.5, mb: 0.5 }}
        >
          <Typography variant="overline" color="text.secondary">
            Locations
          </Typography>
          {canAddLocation && (
            <Tooltip title="Add location" placement="top" arrow>
              <IconButton
                size="small"
                onClick={() => setAddOpen(true)}
                sx={{
                  bgcolor: 'primary.light',
                  color: 'primary.dark',
                  '&:hover': { bgcolor: 'primary.main', color: 'common.white' },
                }}
              >
                <AddRoundedIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {locations.length === 0 ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ px: 1.5, py: 1 }}
          >
            No locations yet.
          </Typography>
        ) : (
          locations.map((loc, i) => {
            const active = loc.id === currentLocationId;
            const dotColor = DOT_COLORS[i % DOT_COLORS.length];
            const isScraping =
              loc.baselineScrapedAt === null &&
              Date.now() - new Date(loc.createdAt).getTime() < 5 * 60_000;

            return (
              <ButtonBase
                key={loc.id}
                onClick={() => router.push(`/dashboard?location=${loc.id}`)}
                sx={{
                  borderRadius: 1.5,
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                }}
                disableRipple
              >
                <Stack
                  direction="row"
                  spacing={1.25}
                  alignItems="center"
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: 1.5,
                    width: '100%',
                    bgcolor: active ? 'primary.light' : 'transparent',
                    color: active ? 'primary.dark' : 'text.primary',
                    transition: 'background-color 120ms ease',
                    '&:hover': active
                      ? { bgcolor: 'primary.light' }
                      : { bgcolor: 'action.hover' },
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: dotColor,
                      flexShrink: 0,
                      outline: isScraping ? '2px solid' : 'none',
                      outlineColor: 'warning.main',
                      outlineOffset: 1,
                    }}
                  />
                  <Stack spacing={0} minWidth={0} flex={1}>
                    <Typography
                      variant="body2"
                      fontWeight={active ? 600 : 500}
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {loc.name}
                    </Typography>
                    {loc.googleAddress && (
                      <Typography
                        variant="caption"
                        color={active ? 'primary.dark' : 'text.secondary'}
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          opacity: active ? 0.85 : 1,
                        }}
                      >
                        {loc.googleAddress}
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </ButtonBase>
            );
          })
        )}
      </Stack>

      <Box sx={{ flexGrow: 1 }} />

      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            bgcolor: 'primary.light',
            border: '1px solid',
            borderColor: 'primary.main',
            borderRadius: 2,
            p: 2.5,
            textAlign: 'center',
          }}
        >
          <Stack spacing={1} alignItems="center">
            <StorefrontRoundedIcon
              sx={{ color: 'primary.dark', fontSize: 28 }}
            />
            <Typography variant="body2" fontWeight={700} color="primary.dark">
              Bring in reviews
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ lineHeight: 1.4 }}
            >
              Upload a customer list and we&apos;ll do the rest. Coming soon.
            </Typography>
          </Stack>
        </Box>
      </Box>

      <AddLocationDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </Box>
  );
}
