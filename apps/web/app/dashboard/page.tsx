import { redirect } from 'next/navigation';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import {
  Avatar,
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { fetchMe } from '@/lib/server-api';
import { AddLocationButton } from './add-location-button';
import { LocationDetail } from './location-detail';
import { OnboardingDialog } from './onboarding-dialog';
import { Sidebar } from './sidebar';
import { SignOutButton } from './sign-out-button';

type SearchParams = Promise<{ location?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const me = await fetchMe();
  if (!me) redirect('/sign-in');

  const { location: locationParam } = await searchParams;
  const isAdminAnywhere = me.locations.some((l) => l.role === 'admin');
  const selected =
    me.locations.find((l) => l.id === locationParam) ?? me.locations[0] ?? null;

  const userInitial = (me.email[0] ?? '?').toUpperCase();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        locations={me.locations}
        currentLocationId={selected?.id ?? null}
        canAddLocation={isAdminAnywhere}
      />

      <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
        {/* Top bar */}
        <Box
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            px: { xs: 3, sm: 4 },
            py: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Help (coming soon)" arrow>
              <span>
                <IconButton size="small" disabled>
                  <HelpOutlineRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Notifications (coming soon)" arrow>
              <span>
                <IconButton size="small" disabled>
                  <NotificationsNoneRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Box
              sx={{
                ml: 1,
                pl: 1.5,
                borderLeft: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {userInitial}
              </Avatar>
              <Stack spacing={0} sx={{ display: { xs: 'none', sm: 'flex' } }}>
                <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                  {me.email}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  lineHeight={1.2}
                >
                  {selected?.business.name ?? '—'}
                </Typography>
              </Stack>
              <SignOutButton />
            </Box>
          </Stack>
        </Box>

        {/* Body */}
        <Box sx={{ px: { xs: 3, sm: 4 }, py: { xs: 3, sm: 4 } }}>
          {selected ? (
            <LocationDetail location={selected} />
          ) : me.onboarded ? (
            <Stack spacing={2} alignItems="flex-start" sx={{ maxWidth: 480 }}>
              <Typography variant="h4">No locations yet</Typography>
              <Typography variant="body2" color="text.secondary">
                Add your first location to start collecting reviews.
              </Typography>
              <AddLocationButton />
            </Stack>
          ) : null}
        </Box>
      </Box>

      <OnboardingDialog initiallyOpen={!me.onboarded} />
    </Box>
  );
}
