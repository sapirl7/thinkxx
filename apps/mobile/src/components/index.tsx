import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { PlanMode, PlanState, ClaimState } from '@thinkxx/sdk';
import { theme } from '../theme';

// ─────────────────────────────────────────────────────────────
// Screen scaffold
// ─────────────────────────────────────────────────────────────

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  keyboardAvoiding?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Full-screen container with safe-area, optional scroll and keyboard avoidance. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  keyboardAvoiding = false,
  refreshing,
  onRefresh,
  contentStyle,
}: ScreenProps): React.JSX.Element {
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[padded && styles.screenPadded, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh
          ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.screenPadded, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

/** Consistent secondary-screen header: back control + centered title. */
export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.headerSide}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.headerBack}>‹ Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.headerSide} />
      )}
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  accessibilityHint,
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading || !onPress;
  const spinnerColor = variant === 'secondary' || variant === 'ghost'
    ? theme.colors.text
    : '#04140F';
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        btnVariant[variant],
        fullWidth && styles.btnFull,
        isDisabled && styles.btnDisabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[styles.btnText, btnTextVariant[variant]]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// Card / SectionTitle / InfoRow / Badge
// ─────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }): React.JSX.Element {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.mono]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const badgeToneColor: Record<BadgeTone, string> = {
  neutral: theme.colors.textMuted,
  success: theme.colors.success,
  warning: theme.colors.warning,
  danger: theme.colors.danger,
  info: theme.colors.primary,
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }): React.JSX.Element {
  const color = badgeToneColor[tone];
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Loading / Error / Empty
// ─────────────────────────────────────────────────────────────

export function Loading({ label = 'Loading…' }: { label?: string }): React.JSX.Element {
  return (
    <View style={styles.centerBox}>
      <ActivityIndicator color={theme.colors.primary} />
      <Text style={styles.centerLabel}>{label}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }): React.JSX.Element {
  return (
    <View style={styles.centerBox}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.centerTitle}>Something went wrong</Text>
      <Text style={styles.centerLabel}>{message}</Text>
      {onRetry ? <View style={styles.retryWrap}><Button label="Try again" variant="secondary" onPress={onRetry} fullWidth={false} /></View> : null}
    </View>
  );
}

export function EmptyState({
  icon = '📋',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyIcon} importantForAccessibility="no">{icon}</Text>
      <Text style={styles.centerTitle}>{title}</Text>
      {description ? <Text style={styles.centerLabel}>{description}</Text> : null}
      {action ? <View style={styles.retryWrap}>{action}</View> : null}
    </View>
  );
}

export function DevnetBanner(): React.JSX.Element {
  return (
    <View style={styles.devnetBanner}>
      <Text style={styles.devnetText}>🟣 Devnet — test funds only, not real money</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Domain label / tone helpers
// ─────────────────────────────────────────────────────────────

export function planModeLabel(mode: PlanMode): string {
  switch (mode) {
    case PlanMode.Medical: return 'Medical';
    case PlanMode.LegalRisk: return 'Legal risk';
    case PlanMode.Legacy: return 'Legacy';
    default: return 'Unknown';
  }
}

export function planStateLabel(state: PlanState): string {
  switch (state) {
    case PlanState.Draft: return 'Draft';
    case PlanState.Active: return 'Active';
    case PlanState.ClaimPending: return 'Claim pending';
    case PlanState.ClaimApproved: return 'Claim approved';
    case PlanState.Claimed: return 'Claimed';
    case PlanState.Cancelled: return 'Cancelled';
    case PlanState.Paused: return 'Paused';
    default: return 'Unknown';
  }
}

export function planStateTone(state: PlanState): BadgeTone {
  switch (state) {
    case PlanState.Active: return 'success';
    case PlanState.ClaimPending: return 'danger';
    case PlanState.ClaimApproved: return 'warning';
    case PlanState.Paused: return 'warning';
    case PlanState.Claimed:
    case PlanState.Cancelled: return 'neutral';
    default: return 'info';
  }
}

export function claimStateLabel(state: ClaimState): string {
  switch (state) {
    case ClaimState.Pending: return 'Pending';
    case ClaimState.Approved: return 'Approved';
    case ClaimState.Vetoed: return 'Vetoed';
    case ClaimState.Finalized: return 'Finalized';
    case ClaimState.Cancelled: return 'Cancelled';
    default: return 'Unknown';
  }
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: theme.colors.background },
  screenPadded: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerSide: { width: 72, justifyContent: 'center' },
  headerRight: { alignItems: 'flex-end' },
  headerBack: { color: theme.colors.primary, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.medium },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  btn: {
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnFull: { width: '100%' },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  infoLabel: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  infoValue: { color: theme.colors.text, fontSize: theme.fontSize.sm, flexShrink: 1, textAlign: 'right' },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  badge: {
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold, letterSpacing: 0.4 },
  centerBox: { alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, gap: theme.spacing.sm },
  centerTitle: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.semibold },
  centerLabel: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, textAlign: 'center' },
  errorIcon: { fontSize: 36 },
  retryWrap: { marginTop: theme.spacing.md },
  emptyBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 44 },
  devnetBanner: {
    backgroundColor: `${theme.colors.secondary}1A`,
    borderColor: `${theme.colors.secondary}55`,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
  },
  devnetText: { color: theme.colors.secondary, fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.medium },
});

const btnVariant: Record<ButtonVariant, StyleProp<ViewStyle>> = {
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border },
  danger: { backgroundColor: theme.colors.danger },
  ghost: { backgroundColor: 'transparent' },
};

const btnTextVariant: Record<ButtonVariant, { color: string }> = {
  primary: { color: '#04140F' },
  secondary: { color: theme.colors.text },
  danger: { color: '#1A0B0B' },
  ghost: { color: theme.colors.primary },
};
