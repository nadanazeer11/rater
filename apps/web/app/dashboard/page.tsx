import { redirect } from 'next/navigation';
import {
  AppBar,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { fetchMe } from '@/lib/server-api';
import { AddLocationButton } from './add-location-button';
import { OnboardingDialog } from './onboarding-dialog';
import { SignOutButton } from './sign-out-button';

export default async function DashboardPage() {
  const me = await fetchMe();
  if (!me) redirect('/sign-in');

  return (
    <>
      <AppBar
        position="static"
        color="transparent"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            rater
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {me.email}
            </Typography>
            <SignOutButton />
          </Stack>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5">Locations</Typography>
            {me.onboarded && <AddLocationButton />}
          </Stack>

          {me.locations.length > 0 ? (
            <Stack spacing={2}>
              {me.locations.map((loc) => (
                <Card key={loc.id} variant="outlined">
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Stack spacing={0.25}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {loc.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {loc.business.name}
                        </Typography>
                      </Stack>
                      <Chip
                        label={loc.role}
                        size="small"
                        color={loc.role === 'admin' ? 'primary' : 'default'}
                        variant={loc.role === 'admin' ? 'filled' : 'outlined'}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No locations yet.
            </Typography>
          )}
        </Stack>
      </Container>
      <OnboardingDialog initiallyOpen={!me.onboarded} />
    </>
  );
}
