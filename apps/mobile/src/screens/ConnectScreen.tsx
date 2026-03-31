import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWallet } from '../providers/WalletProvider';
import ScreenShell from '../components/ScreenShell';
import { Panel, PrimaryButton, SectionHeading, StatusPill } from '../components/Primitives';
import { theme } from '../theme';

function Mark(): React.JSX.Element {
  return (
    <View style={styles.mark}>
      <View style={styles.markOuter}>
        <View style={styles.markInner}>
          <Text style={styles.markText}>TX</Text>
        </View>
      </View>
      <View style={styles.signalBarShort} />
      <View style={styles.signalBarLong} />
    </View>
  );
}

function FeatureRow({
  code,
  title,
  description,
}: {
  code: string;
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureCode}>
        <Text style={styles.featureCodeText}>{code}</Text>
      </View>
      <View style={styles.featureBody}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

/**
 * Connect screen — shown when no wallet is connected.
 * Establishes the Thinkxx visual system with one dominant CTA.
 */
export default function ConnectScreen(): React.JSX.Element {
  const { connect, connecting, error } = useWallet();

  return (
    <ScreenShell
      title="Owner Console"
      subtitle="Devnet emergency-access control room for your Solana plan."
      eyebrow="Thinkxx / Lifeline"
      contentContainerStyle={styles.content}
    >
      <View style={styles.heroSection}>
        <Mark />
        <View style={styles.heroCopy}>
          <StatusPill label="Devnet only" tone="warning" />
          <Text style={styles.heroTitle}>Connect your Seeker wallet to manage plan state.</Text>
          <Text style={styles.heroText}>
            Thinkxx keeps custody in the wallet and moves critical logic on-chain. The mobile app is the operator surface, not the vault.
          </Text>
        </View>
      </View>

      <Panel tone="primary">
        <SectionHeading label="Mission profile" />
        <FeatureRow
          code="NC"
          title="Non-Custodial"
          description="Keys remain inside the wallet app. Thinkxx never stores seed phrases or private keys."
        />
        <FeatureRow
          code="TL"
          title="Time-Locked Access"
          description="Beneficiaries can only act after an inactivity window and an on-chain grace period."
        />
        <FeatureRow
          code="GV"
          title="Guardian Oversight"
          description="Trusted guardians can approve, block, or reshape access before funds are released."
        />
      </Panel>

      {error ? (
        <Panel tone="danger">
          <Text style={styles.errorEyebrow}>Connection issue</Text>
          <Text style={styles.errorText}>{error}</Text>
        </Panel>
      ) : null}

      <View style={styles.footer}>
        <PrimaryButton
          label={connecting ? 'Connecting...' : 'Connect Wallet'}
          onPress={connect}
          disabled={connecting}
          loading={connecting}
          style={styles.cta}
        />
        {!connecting ? (
          <Text style={styles.footerText}>
            Mobile Wallet Adapter will open your installed wallet for approval on devnet.
          </Text>
        ) : (
          <View style={styles.connectingRow}>
            <ActivityIndicator color={theme.colors.primaryLight} size="small" />
            <Text style={styles.footerText}>Waiting for wallet approval…</Text>
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
  },
  heroSection: {
    gap: theme.spacing.lg,
  },
  mark: {
    alignSelf: 'flex-start',
    gap: theme.spacing.sm,
  },
  markOuter: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  markText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1.2,
  },
  signalBarShort: {
    width: 74,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.secondary,
  },
  signalBarLong: {
    width: 112,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  heroCopy: {
    gap: theme.spacing.md,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: -0.6,
  },
  heroText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    lineHeight: 23,
  },
  featureRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
  },
  featureCode: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  featureCodeText: {
    color: theme.colors.primaryLight,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 0.8,
  },
  featureBody: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  featureDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  errorEyebrow: {
    color: theme.colors.dangerLight,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  errorText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  footer: {
    gap: theme.spacing.md,
  },
  cta: {
    width: '100%',
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
  connectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
});
