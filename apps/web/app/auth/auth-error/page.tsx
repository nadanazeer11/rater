import Link from 'next/link';
import { Button, Container, Paper, Stack, Typography } from '@mui/material';

export default function AuthErrorPage() {
  return (
    <Container
      maxWidth="sm"
      sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 4 },
          width: '100%',
          border: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Stack spacing={3} alignItems="center">
          <Typography variant="h5">Sign-in failed</Typography>
          <Typography variant="body2" color="text.secondary">
            The link may have expired or already been used.
          </Typography>
          <Button component={Link} href="/sign-in" variant="text">
            Try again
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
