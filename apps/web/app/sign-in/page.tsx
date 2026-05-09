import { Container, Paper, Stack, Typography } from '@mui/material';
import { SignInForm } from './sign-in-form';

export default function SignInPage() {
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
        }}
      >
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h5">Sign in to rater</Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your email and we&apos;ll send you a magic link.
            </Typography>
          </Stack>
          <SignInForm />
        </Stack>
      </Paper>
    </Container>
  );
}
