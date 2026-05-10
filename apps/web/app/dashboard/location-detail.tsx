import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { LocationSummary } from '@/lib/server-api';
import { InviteTeammateButton } from './invite-teammate-button';

type Props = {
  location: LocationSummary;
};

export function LocationDetail({ location }: Props) {
  const isAdmin = location.role === 'admin';
  const isScraping =
    location.baselineScrapedAt === null &&
    Date.now() - new Date(location.createdAt).getTime() < 5 * 60_000;

  return (
    <Stack spacing={4}>
      {/* Hero */}
      <Card
        sx={{
          borderRadius: 3,
          background:
            'linear-gradient(135deg, rgba(10,124,110,0.06) 0%, rgba(245,158,11,0.10) 100%)',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={3}
          >
            <Stack spacing={1.5} flex={1} minWidth={0}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                  label={location.business.name}
                  size="small"
                  sx={{
                    bgcolor: 'primary.light',
                    color: 'primary.dark',
                    fontWeight: 600,
                  }}
                />
                <Chip
                  label={location.role}
                  size="small"
                  color={isAdmin ? 'primary' : 'default'}
                  variant={isAdmin ? 'filled' : 'outlined'}
                />
                {isScraping && (
                  <Chip
                    label="Scraping reviews…"
                    size="small"
                    sx={{
                      bgcolor: 'warning.light',
                      color: 'warning.main',
                      borderStyle: 'dashed',
                      borderWidth: 1,
                      borderColor: 'warning.main',
                      fontWeight: 600,
                    }}
                  />
                )}
                {location.baselineScrapedAt && (
                  <Chip
                    label="Baseline captured"
                    size="small"
                    sx={{
                      bgcolor: 'success.light',
                      color: 'success.main',
                      fontWeight: 600,
                    }}
                  />
                )}
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="h3" fontWeight={700} lineHeight={1.1}>
                  {location.name}
                </Typography>
                {location.googleAddress && (
                  <Tooltip title="Open in Google Maps">
                    <IconButton
                      size="small"
                      component="a"
                      href={`https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(
                        location.id,
                      )}`}
                      target="_blank"
                      rel="noopener"
                      sx={{ color: 'text.secondary' }}
                    >
                      <LaunchRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>

              {location.googleAddress && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <LocationOnRoundedIcon
                    fontSize="small"
                    sx={{ color: 'text.secondary' }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {location.googleAddress}
                  </Typography>
                </Stack>
              )}

              {location.googleRating !== null && (
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <StarRoundedIcon sx={{ fontSize: 24, color: '#F5B400' }} />
                    <Typography variant="h6" fontWeight={700}>
                      {location.googleRating.toFixed(1)}
                    </Typography>
                  </Stack>
                  {location.googleReviewsCount !== null && (
                    <Typography variant="body2" color="text.secondary">
                      {location.googleReviewsCount.toLocaleString()} Google reviews
                    </Typography>
                  )}
                </Stack>
              )}
            </Stack>

            {isAdmin && (
              <InviteTeammateButton
                locationId={location.id}
                locationName={location.name}
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Section header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack spacing={0.25}>
          <Typography variant="overline" color="text.secondary">
            This location
          </Typography>
          <Typography variant="h5">Overview</Typography>
        </Stack>
      </Stack>

      {/* Stats */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2.5}
        alignItems="stretch"
      >
        <StatCard
          label="Review requests sent"
          value="0"
          hint="Start a campaign to send your first batch"
          accent="primary.main"
        />
        <StatCard
          label="Awaiting response"
          value="0"
          hint="Customers we've emailed but who haven't rated yet"
          accent="warning.main"
        />
        <StatCard
          label="New Google reviews"
          value="0"
          hint={
            location.baselineScrapedAt
              ? 'Since baseline was captured'
              : 'Baseline not yet captured'
          }
          accent="success.main"
        />
      </Stack>
    </Stack>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  hint: string;
  accent: string;
};

function StatCard({ label, value, hint, accent }: StatCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        flex: 1,
        borderRadius: 2.5,
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow 150ms ease, transform 150ms ease',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(44, 42, 54, 0.06)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          bgcolor: accent,
        }}
      />
      <CardContent sx={{ pt: 3 }}>
        <Stack spacing={1.25}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {label}
          </Typography>
          <Typography variant="h3" fontWeight={700} lineHeight={1}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
