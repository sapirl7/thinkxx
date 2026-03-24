import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useWallet } from '../providers/WalletProvider';
import { theme } from '../theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const appVersion: string = (require('../../package.json') as { version: string }).version;

interface SettingsScreenProps {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps): React.JSX.Element {
  const { disconnect, shortAddress, walletLabel, rpcEndpoint } = useWallet();

  const handleDisconnect = async (): Promise<void> => {
    await disconnect();
  };

  // Shorten RPC endpoint for display
  const displayEndpoint = (() => {
    try {
      const url = new URL(rpcEndpoint);
      return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
    } catch {
      return rpcEndpoint;
    }
  })();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Wallet Section */}
        <Text style={styles.sectionTitle}>WALLET</Text>
        <View style={styles.card}>
          <SettingsRow label="Connected Wallet" value={shortAddress ?? 'Not Connected'} />
          <SettingsRow label="Wallet App" value={walletLabel ?? 'Unknown'} />
          <SettingsRow label="Network" value="Devnet" />
          <SettingsRow label="RPC Endpoint" value={displayEndpoint} />
        </View>

        {/* Notifications — Coming Soon */}
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <ComingSoonRow label="Push Notifications" />
          <ComingSoonRow label="Telegram Alerts" />
        </View>

        {/* Security — Coming Soon */}
        <Text style={styles.sectionTitle}>SECURITY</Text>
        <View style={styles.card}>
          <ComingSoonRow label="Biometric Lock" />
        </View>

        {/* Automation — Coming Soon */}
        <Text style={styles.sectionTitle}>AUTOMATION</Text>
        <View style={styles.card}>
          <ComingSoonRow label="Auto-Heartbeat" />
          <ComingSoonRow label="Sponsored Transactions" />
        </View>

        {/* Data — Coming Soon */}
        <Text style={styles.sectionTitle}>DATA</Text>
        <View style={styles.card}>
          <ComingSoonRow label="Transaction History" />
        </View>

        {/* App Info */}
        <Text style={styles.sectionTitle}>APP</Text>
        <View style={styles.card}>
          <SettingsRow label="Version" value={`v${appVersion}`} />
          <SettingsRow label="Protocol" value="Lifeline v0.1.0" />
          <SettingsRow label="Build" value="devnet-only" />
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
          <Text style={styles.disconnectText}>Disconnect Wallet</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function ComingSoonRow({ label }: { label: string }): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.comingSoonBadge}>
        <Text style={styles.comingSoonText}>Coming Soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl + 20, paddingBottom: theme.spacing.md,
  },
  backBtn: { width: 60 },
  backText: { color: theme.colors.primary, fontSize: theme.fontSize.md },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold },
  content: { flex: 1, paddingHorizontal: theme.spacing.lg },
  sectionTitle: {
    color: theme.colors.textMuted, fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold, textTransform: 'uppercase',
    letterSpacing: 1, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 4,
    borderBottomWidth: 0.5, borderBottomColor: theme.colors.background,
  },
  rowLabel: { color: theme.colors.text, fontSize: theme.fontSize.sm },
  rowValue: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  comingSoonBadge: {
    backgroundColor: theme.colors.textMuted + '20', borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm, paddingVertical: 2,
  },
  comingSoonText: {
    color: theme.colors.textMuted, fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  disconnectButton: {
    marginTop: theme.spacing.xl, backgroundColor: theme.colors.danger + '15',
    borderRadius: theme.borderRadius.lg, paddingVertical: theme.spacing.md, alignItems: 'center',
  },
  disconnectText: {
    color: theme.colors.danger, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold,
  },
});
