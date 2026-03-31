import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { theme } from '../theme';
import { withAlpha } from './color';
import { mobileLayout } from './layout';

type Tone = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';

function resolveTone(tone: Tone): { bg: string; border: string; text: string } {
  switch (tone) {
    case 'primary':
      return {
        bg: withAlpha(theme.colors.primary, 0.14),
        border: withAlpha(theme.colors.primary, 0.4),
        text: theme.colors.primaryLight,
      };
    case 'secondary':
      return {
        bg: withAlpha(theme.colors.secondary, 0.12),
        border: withAlpha(theme.colors.secondary, 0.35),
        text: theme.colors.secondary,
      };
    case 'success':
      return {
        bg: withAlpha(theme.colors.success, 0.14),
        border: withAlpha(theme.colors.success, 0.32),
        text: theme.colors.success,
      };
    case 'warning':
      return {
        bg: withAlpha(theme.colors.warning, 0.18),
        border: withAlpha(theme.colors.warning, 0.35),
        text: theme.colors.warning,
      };
    case 'danger':
      return {
        bg: withAlpha(theme.colors.danger, 0.14),
        border: withAlpha(theme.colors.danger, 0.35),
        text: theme.colors.dangerLight,
      };
    default:
      return {
        bg: withAlpha(theme.colors.surfaceElevated, 0.92),
        border: theme.colors.borderStrong,
        text: theme.colors.textSoft,
      };
  }
}

interface PanelProps {
  children: React.ReactNode;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}

export function Panel({ children, tone = 'neutral', style }: PanelProps): React.JSX.Element {
  const palette = resolveTone(tone);
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
        style,
      ]}
    >
      <View style={[styles.panelAccent, { backgroundColor: palette.text }]} />
      {children}
    </View>
  );
}

interface StatusPillProps {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}

export function StatusPill({ label, tone = 'neutral', style }: StatusPillProps): React.JSX.Element {
  const palette = resolveTone(tone);
  return (
    <View
      style={[
        styles.statusPill,
        { backgroundColor: palette.bg, borderColor: palette.border },
        style,
      ]}
    >
      <View style={[styles.statusDot, { backgroundColor: palette.text }]} />
      <Text style={[styles.statusText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

interface SectionHeadingProps {
  label: string;
  action?: React.ReactNode;
}

export function SectionHeading({ label, action }: SectionHeadingProps): React.JSX.Element {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionHeadingText}>{label}</Text>
      {action}
    </View>
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  tone = 'primary',
  style,
}: PrimaryButtonProps): React.JSX.Element {
  const backgroundColor = tone === 'primary' ? theme.colors.primary : theme.colors.secondary;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor },
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading ? styles.primaryButtonPressed : null,
        style,
      ]}
      disabled={disabled || loading || !onPress}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color="#04100E" />
      ) : (
        <Text style={styles.primaryButtonText}>{label}</Text>
      )}
    </Pressable>
  );
}

interface SecondaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: Tone;
  badge?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function SecondaryButton({
  label,
  onPress,
  disabled = false,
  tone = 'neutral',
  badge,
  style,
  textStyle,
}: SecondaryButtonProps): React.JSX.Element {
  const palette = resolveTone(tone);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.secondaryButton,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
        disabled && styles.buttonDisabled,
        pressed && !disabled ? styles.secondaryButtonPressed : null,
        style,
      ]}
      disabled={disabled || !onPress}
      onPress={onPress}
    >
      <Text style={[styles.secondaryButtonText, { color: palette.text }, textStyle]}>{label}</Text>
      {badge ? <Text style={styles.secondaryBadge}>{badge}</Text> : null}
    </Pressable>
  );
}

interface MetricProps {
  eyebrow: string;
  value: string;
  caption?: string;
}

export function MetricPanel({ eyebrow, value, caption }: MetricProps): React.JSX.Element {
  return (
    <Panel style={styles.metricPanel}>
      <Text style={styles.metricEyebrow}>{eyebrow}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {caption ? <Text style={styles.metricCaption}>{caption}</Text> : null}
    </Panel>
  );
}

interface AddressBlockProps {
  label: string;
  address: string | null;
  helper?: string;
}

export function AddressBlock({ label, address, helper }: AddressBlockProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const display = useMemo(() => {
    if (!address) {
      return 'Not available';
    }
    if (expanded || address.length <= 18) {
      return address;
    }
    return `${address.slice(0, 6)}…${address.slice(-6)}`;
  }, [address, expanded]);

  return (
    <Panel style={styles.addressPanel}>
      <View style={styles.addressHeader}>
        <Text style={styles.addressLabel}>{label}</Text>
        {address ? (
          <Pressable onPress={() => setExpanded(current => !current)}>
            <Text style={styles.addressToggle}>{expanded ? 'Hide full' : 'Reveal full'}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.addressValue}>{display}</Text>
      {helper ? <Text style={styles.addressHelper}>{helper}</Text> : null}
    </Panel>
  );
}

interface KeyValueRowProps {
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
}

export function KeyValueRow({ label, value, mono = false, muted = false }: KeyValueRowProps): React.JSX.Element {
  return (
    <View style={styles.keyValueRow}>
      <Text style={styles.keyLabel}>{label}</Text>
      <Text style={[styles.keyValue, mono && styles.monoText, muted && styles.keyValueMuted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    overflow: 'hidden',
  },
  panelAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  sectionHeadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  primaryButtonText: {
    color: '#04100E',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 0.2,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  secondaryButton: {
    minHeight: mobileLayout.isCompactWidth ? 50 : 52,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  secondaryButtonPressed: {
    transform: [{ scale: 0.988 }],
    opacity: 0.88,
  },
  secondaryBadge: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  buttonDisabled: {
    opacity: 0.48,
  },
  metricPanel: {
    alignItems: 'center',
  },
  metricEyebrow: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: -0.8,
  },
  metricCaption: {
    color: theme.colors.primaryLight,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  addressPanel: {
    gap: theme.spacing.sm,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  addressLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  addressToggle: {
    color: theme.colors.primaryLight,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 0.4,
  },
  addressValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
    fontWeight: theme.fontWeight.medium,
    fontFamily: 'monospace',
  },
  addressHelper: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    lineHeight: 16,
  },
  keyValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
  },
  keyLabel: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  keyValue: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'right',
  },
  keyValueMuted: {
    color: theme.colors.textSecondary,
  },
  monoText: {
    fontFamily: 'monospace',
  },
});
