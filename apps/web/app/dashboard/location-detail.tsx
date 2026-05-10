import StarRoundedIcon from '@mui/icons-material/StarRounded';
import {
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
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
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
            spacing={2}
          >
            <Stack spacing={1.5} flex={1} minWidth={0}>
              <Stack spacing={0.5}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <Typography variant="h5" fontWeight={700}>
                    {location.name}
                  </Typography>
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
                      variant="outlined"
                      sx={{ borderStyle: 'dashed' }}
                    />
                  )}
                </Stack>
                {location.googleAddress && (
                  <Typography variant="body2" color="text.secondary">
                    {location.googleAddress}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {location.business.name}
                </Typography>
              </Stack>

              {location.googleRating !== null && (
                <Stack direction="row" spacing={2} alignItems="center">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <StarRoundedIcon
                      sx={{ fontSize: 22, color: '#F5B400' }}
                    />
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
              <Stack direction="row" spacing={1}>
                <InviteTeammateButton
                  locationId={location.id}
                  locationName={location.name}
                />
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={1}>
        <Typography variant="overline" color="text.secondary">
          This location
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems="stretch"
        >
          <StatCard label="Review requests sent" value="0" hint="No campaigns yet" />
          <StatCard label="Awaiting response" value="0" hint="—" />
          <StatCard
            label="New Google reviews"
            value="0"
            hint={
              location.baselineScrapedAt
                ? 'since baseline'
                : 'baseline not yet captured'
            }
          />
        </Stack>
      </Stack>
    </Stack>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
          <Divider sx={{ my: 0.5 }} />
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
