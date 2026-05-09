'use client';

import { createTheme } from '@mui/material/styles';

// Brand palette (ColorHunt — soft purple / cream / teal / lilac)
const PRIMARY = '#9B8EC7';
const PRIMARY_LIGHT = '#C5B0D5';
const PRIMARY_DARK = '#7B6FA8';
const SECONDARY = '#B8D4D9';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: PRIMARY,
      light: PRIMARY_LIGHT,
      dark: PRIMARY_DARK,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: SECONDARY,
      contrastText: '#2C2A36',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2C2A36',
      secondary: '#6B6678',
    },
    divider: 'rgba(44, 42, 54, 0.12)',
  },
  typography: {
    fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, paddingTop: 8, paddingBottom: 8 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});
