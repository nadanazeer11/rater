import { redirect } from 'next/navigation';
import { AppBar, Container, Stack, Toolbar, Typography } from '@mui/material';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from './sign-out-button';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in');

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
              {user.email}
            </Typography>
            <SignOutButton />
          </Stack>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Dashboard placeholder. Onboarding lands in the next PR.
        </Typography>
      </Container>
    </>
  );
}
