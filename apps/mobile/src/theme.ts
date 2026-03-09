/**
 * Theme constants for the Thinkxx mobile app.
 * Dark-first design with unique teal + amber identity.
 */
export const theme = {
  colors: {
    background: '#0E1117',
    surface: '#161B22',
    surfaceElevated: '#1C2129',
    primary: '#00BFA6',
    primaryLight: '#4DDBCA',
    secondary: '#E8A838',
    secondaryDark: '#C48A20',
    accent: '#E8A838',
    text: '#E6EDF3',
    textSecondary: '#8B949E',
    textMuted: '#6E7681',
    border: '#21262D',
    danger: '#F85149',
    dangerLight: '#FF7A8F',
    warning: '#D29922',
    success: '#3FB950',
    cardGradientStart: '#1C2129',
    cardGradientEnd: '#161B22',
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

// Legacy aliases kept for screens that still use the pre-refactor theme API.
export const COLORS = {
  ...theme.colors,
  textPrimary: theme.colors.text,
} as const;

export const SPACING = theme.spacing;
export const FONT_SIZES = theme.fontSize;
export const BORDER_RADIUS = theme.borderRadius;

export type Theme = typeof theme;
