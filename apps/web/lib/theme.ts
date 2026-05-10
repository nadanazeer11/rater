'use client';

import { createTheme } from '@mui/material/styles';

// Brand palette
//   #0A7C6E — deep teal (primary)
//   #F59E0B — warm amber (secondary / warning)
//   #FF6B35 — vibrant coral (accent / error)
//   #FAFAFA — near-white background
const PRIMARY = '#0A7C6E';
const PRIMARY_LIGHT = '#CFE6E2';
const PRIMARY_DARK = '#085F54';

const SECONDARY = '#F59E0B';
const SECONDARY_LIGHT = '#FDE8C6';
const SECONDARY_DARK = '#C97F08';

const ACCENT = '#FF6B35';
const ACCENT_LIGHT = '#FFD4C4';
const ACCENT_DARK = '#D9491A';

// Synthesized success — a brighter teal-green so it reads distinctly from primary
const SUCCESS = '#10A395';
const SUCCESS_LIGHT = '#CCEEE9';

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
      light: SECONDARY_LIGHT,
      dark: SECONDARY_DARK,
      contrastText: '#FFFFFF',
    },
    error: {
      main: ACCENT,
      light: ACCENT_LIGHT,
      dark: ACCENT_DARK,
      contrastText: '#FFFFFF',
    },
    warning: {
      main: SECONDARY,
      light: SECONDARY_LIGHT,
      dark: SECONDARY_DARK,
      contrastText: '#FFFFFF',
    },
    info: {
      main: PRIMARY,
      light: PRIMARY_LIGHT,
      dark: PRIMARY_DARK,
      contrastText: '#FFFFFF',
    },
    success: {
      main: SUCCESS,
      light: SUCCESS_LIGHT,
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1F1E',
      secondary: '#5E6868',
    },
    divider: 'rgba(26, 31, 30, 0.10)',
  },
  typography: {
    fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.015em' },
    h4: { fontWeight: 700, letterSpacing: '-0.015em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    overline: { letterSpacing: '0.08em', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, paddingTop: 8, paddingBottom: 8 },
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
        root: { borderRadius: 14 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
  },
});
