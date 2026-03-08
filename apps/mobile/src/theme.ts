/**
 * Theme constants for the Thinkxx mobile app.
 * Dark-first design with Solana-inspired accent colors.
 */
export const theme = {
  colors: {
    background: '#0A0E1A',
    surface: '#141929',
    surfaceElevated: '#1C2237',
    primary: '#9945FF',
    primaryLight: '#B77BFF',
    secondary: '#14F195',
    secondaryDark: '#0BB97A',
    accent: '#4C6FFF',
    text: '#FFFFFF',
    textSecondary: '#8B95B0',
    textMuted: '#505A78',
    border: '#1E2640',
    danger: '#FF4D6A',
    dangerLight: '#FF7A8F',
    warning: '#FFB84D',
    success: '#14F195',
    cardGradientStart: '#1A1F36',
    cardGradientEnd: '#141929',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
  },
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 36,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export type Theme = typeof theme;
