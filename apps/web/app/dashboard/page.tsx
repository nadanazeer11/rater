import { redirect } from 'next/navigation';
import {
  AppBar,
  Box,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { fetchMe } from '@/lib/server-api';
import { AddLocationButton } from './add-location-button';
import { LocationDetail } from './location-detail';
import { LocationSelector } from './location-selector';
import { OnboardingDialog } from './onboarding-dialog';
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

  return (
    <>
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            rater
          </Typography>
          {selected && (
            <>
              <Box
                sx={{
                  width: 1,
                  height: 24,
                  bgcolor: 'divider',
                  mx: 0.5,
                }}
              />
              <LocationSelector
                locations={me.locations}
                currentLocationId={selected.id}
                canAddLocation={isAdminAnywhere}
              />
            </>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {me.email}
          </Typography>
          <SignOutButton />
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }} maxWidth="lg">
        {selected ? (
          <LocationDetail location={selected} />
        ) : me.onboarded ? (
          <Stack spacing={2} alignItems="flex-start">
            <Typography variant="h5">No locations yet</Typography>
            <Typography variant="body2" color="text.secondary">
              Add a location to get started.
            </Typography>
            <AddLocationButton />
          </Stack>
        ) : null}
      </Container>

      <OnboardingDialog initiallyOpen={!me.onboarded} />
    </>
  );
}
