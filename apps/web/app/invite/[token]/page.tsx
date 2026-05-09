import { Container, Paper, Stack, Typography } from '@mui/material';
import { createClient } from '@/lib/supabase/server';
import { fetchInvitation } from '@/lib/server-api';
import { InviteAcceptCard } from './invite-accept-card';

type PageProps = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  const [invitation, supabase] = await Promise.all([
    fetchInvitation(token),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Container
      maxWidth="sm"
      sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 5 },
          width: '100%',
          border: '1px solid',
          borderColor: 'divider',
          borderTop: '3px solid',
          borderTopColor: 'primary.main',
        }}
      >
        {invitation ? (
          <InviteAcceptCard
            token={token}
            invitation={invitation}
            currentUserEmail={user?.email ?? null}
          />
        ) : (
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Typography variant="h5">Invitation not found</Typography>
            <Typography variant="body2" color="text.secondary">
              The link may be invalid or the invitation may have been revoked.
            </Typography>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
