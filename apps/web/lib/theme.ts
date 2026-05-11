'use client';

import { createTheme } from '@mui/material/styles';

// "Iris" palette — one indigo-violet accent over cool zinc neutrals.
// Keep these in sync with apps/web/app/globals.css (@theme block).
const ACCENT = '#4F46E5';
const ACCENT_HOVER = '#4338CA';
const ACCENT_LIGHT = '#6366F1';
const ACCENT_SOFT = '#EEF2FF';

const INK = '#18181B';
const MUTED = '#52525B';
const BORDER = '#E4E4E7';
const HOVER_BG = '#F4F4F5';
const BG = '#FAFAFA';

const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: ACCENT,
      light: ACCENT_LIGHT,
      dark: ACCENT_HOVER,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#71717A',
      contrastText: '#FFFFFF',
    },
    error: { main: '#E11D48' },
    success: { main: '#059669' },
    warning: { main: '#F59E0B' },
    info: { main: ACCENT },
    background: {
      default: BG,
      paper: '#FFFFFF',
    },
    text: {
      primary: INK,
      secondary: MUTED,
    },
    divider: BORDER,
  },
  typography: {
    fontFamily:
      'var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600, letterSpacing: '-0.02em' },
    h4: { fontWeight: 600, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600, letterSpacing: '-0.015em' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle1: { letterSpacing: '-0.01em' },
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: 0 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: BG },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 16,
          paddingRight: 16,
          transition: `background-color 150ms ${EASE_OUT}, transform 120ms ${EASE_OUT}, border-color 150ms ${EASE_OUT}`,
          '&:active': { transform: 'translateY(1px)' },
        },
        sizeLarge: { paddingTop: 11, paddingBottom: 11, fontSize: '0.95rem' },
        containedPrimary: {
          backgroundColor: ACCENT,
          '&:hover': { backgroundColor: ACCENT_HOVER },
        },
        outlined: {
          borderColor: BORDER,
          color: INK,
          '&:hover': { borderColor: '#D4D4D8', backgroundColor: HOVER_BG },
        },
        text: {
          color: MUTED,
          '&:hover': { backgroundColor: HOVER_BG, color: INK },
        },
        textPrimary: {
          color: ACCENT,
          '&:hover': { backgroundColor: ACCENT_SOFT, color: ACCENT_HOVER },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: BORDER },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          borderColor: BORDER,
          borderRadius: 12,
          boxShadow: '0 1px 2px rgba(24, 24, 27, 0.04)',
        },
      },
    },
    MuiDialog: {
      defaultProps: { transitionDuration: 200 },
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: `1px solid ${BORDER}`,
          boxShadow:
            '0 1px 1px rgba(24,24,27,0.04), 0 12px 32px -8px rgba(24,24,27,0.16)',
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: { backgroundColor: 'rgba(24, 24, 27, 0.32)' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D4D4D8' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: ACCENT,
            borderWidth: 1,
            boxShadow: `0 0 0 3px ${ACCENT_SOFT}`,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { '&.Mui-focused': { color: ACCENT } },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { gap: 8 },
        grouped: {
          border: `1px solid ${BORDER}`,
          borderRadius: '8px !important',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          borderColor: BORDER,
          color: INK,
          fontWeight: 500,
          textTransform: 'none',
          transition: `background-color 150ms ${EASE_OUT}, color 150ms ${EASE_OUT}`,
          '&:hover': { backgroundColor: HOVER_BG },
          '&.Mui-selected': {
            backgroundColor: ACCENT,
            color: '#FFFFFF',
            borderColor: ACCENT,
            '&:hover': { backgroundColor: ACCENT_HOVER },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500 },
        sizeSmall: { height: 22, fontSize: '0.7rem' },
        outlined: { borderColor: BORDER, color: MUTED },
        filledPrimary: { backgroundColor: ACCENT, color: '#FFFFFF' },
      },
    },
    MuiAlert: {
      defaultProps: { variant: 'standard' },
      styleOverrides: {
        root: { borderRadius: 10, border: '1px solid' },
        standardError: {
          backgroundColor: '#FEF2F4',
          color: '#9F1239',
          borderColor: '#FBCFE0',
        },
        standardSuccess: {
          backgroundColor: '#ECFDF5',
          color: '#065F46',
          borderColor: '#BBF7D0',
        },
        standardWarning: {
          backgroundColor: '#FFFBEB',
          color: '#92400E',
          borderColor: '#FDE68A',
        },
        standardInfo: {
          backgroundColor: ACCENT_SOFT,
          color: ACCENT_HOVER,
          borderColor: '#C7D2FE',
        },
      },
    },
    MuiCircularProgress: {
      defaultProps: { color: 'primary' },
    },
    MuiRating: {
      styleOverrides: {
        iconFilled: { color: '#F59E0B' },
        iconEmpty: { color: '#D4D4D8' },
      },
    },
    MuiSkeleton: {
      defaultProps: { animation: 'wave' },
      styleOverrides: {
        root: { backgroundColor: '#F1F1F3', borderRadius: 8 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: INK,
          fontSize: '0.72rem',
          borderRadius: 6,
          padding: '5px 8px',
        },
      },
    },
    MuiLink: {
      defaultProps: { underline: 'hover' },
      styleOverrides: { root: { color: ACCENT, fontWeight: 500 } },
    },
  },
});
