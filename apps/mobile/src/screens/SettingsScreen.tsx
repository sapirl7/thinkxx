import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PROGRAM_ID } from '@thinkxx/config';
import { useWallet } from '../providers/WalletProvider';
import ScreenShell from '../components/ScreenShell';
import {
  AddressBlock,
  Panel,
  PrimaryButton,
  SectionHeading,
  StatusPill,
  KeyValueRow,
} from '../components/Primitives';
import { theme } from '../theme';

const appManifest = require('../../app.json') as {
  expo: {
    version: string;
    scheme?: string;
    extra?: { solana?: { cluster?: string } };
  };
};
const appVersion = appManifest.expo.version;
const appScheme = appManifest.expo.scheme ?? 'thinkxx';
const appCluster = appManifest.expo.extra?.solana?.cluster ?? 'devnet';

interface SettingsScreenProps {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps): React.JSX.Element {
  const { disconnect, shortAddress, walletLabel, rpcEndpoint } = useWallet();

  const displayEndpoint = (() => {
    try {
      const url = new URL(rpcEndpoint);
      return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
    } catch {
      return rpcEndpoint;
    }
  })();

  return (
    <ScreenShell
      title="Settings"
      subtitle="Connection metadata, network context, and future automation controls."
      eyebrow="Owner flow / settings"
      onBack={onBack}
      scroll
      contentContainerStyle={styles.content}
      footer={<PrimaryButton label="Disconnect Wallet" onPress={() => void disconnect()} tone="secondary" />}
    >
      <Panel tone="primary">
        <SectionHeading label="WALLET" />
        <KeyValueRow label="Connected wallet" value={shortAddress ?? 'Not Connected'} />
        <KeyValueRow label="Wallet app" value={walletLabel ?? 'Unknown'} />
        <KeyValueRow label="Network" value={appCluster.charAt(0).toUpperCase() + appCluster.slice(1)} />
        <KeyValueRow label="RPC endpoint" value={displayEndpoint} />
      </Panel>

      <Panel>
        <SectionHeading label="CURRENT OPERATOR SURFACE" />
        <View style={styles.featureList}>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Wallet session restore</Text>
            <StatusPill label="Live" tone="success" />
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Plan-bound navigation</Text>
            <StatusPill label="Live" tone="success" />
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Owner heartbeat + deposit</Text>
            <StatusPill label="Live" tone="success" />
          </View>
        </View>
      </Panel>

      <Panel>
        <SectionHeading label="PLANNED CAPABILITIES" />
        <View style={styles.featureList}>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Push Notifications</Text>
            <StatusPill label="Coming Soon" tone="neutral" />
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Telegram Alerts</Text>
            <StatusPill label="Coming Soon" tone="neutral" />
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Biometric Lock</Text>
            <StatusPill label="Coming Soon" tone="neutral" />
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Auto-Heartbeat</Text>
            <StatusPill label="Coming Soon" tone="neutral" />
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Sponsored Transactions</Text>
            <StatusPill label="Coming Soon" tone="neutral" />
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Transaction History</Text>
            <StatusPill label="Coming Soon" tone="neutral" />
          </View>
        </View>
      </Panel>

      <Panel tone="secondary">
        <SectionHeading label="APP" />
        <KeyValueRow label="Version" value={`v${appVersion}`} />
        <KeyValueRow label="Protocol" value="Lifeline v0.1.0" />
        <KeyValueRow label="Release track" value="devnet-only" />
        <KeyValueRow label="Identity scheme" value={`${appScheme}://app`} mono />
        <AddressBlock
          label="Devnet program"
          address={PROGRAM_ID.toBase58()}
          helper="This is the on-chain program the mobile client targets for owner-side actions."
        />
      </Panel>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
  },
  featureList: {
    gap: theme.spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  featureLabel: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
  },
});
