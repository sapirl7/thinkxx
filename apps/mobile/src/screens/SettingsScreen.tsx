import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { PROGRAM_ID } from '@thinkxx/config';
import { useWallet } from '../providers/WalletProvider';
import { theme } from '../theme';
import { Screen, ScreenHeader, Card, SectionTitle, InfoRow, Button } from '../components';
import { shortenAddress } from '../lib/format';
import { explorerAddressUrl } from '../lib/solana';

interface SettingsScreenProps {
  onBack: () => void;
  onDisconnect: () => void;
}

const APP_VERSION = '0.3.0';
const REPO_URL = 'https://github.com/sapirl7/thinkxx';
const ISSUES_URL = 'https://github.com/sapirl7/thinkxx/issues';

function LinkRow({ label, onPress }: { label: string; onPress: () => void }): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.linkRow}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.linkLabel}>{label}</Text>
      <Text style={styles.chevron} importantForAccessibility="no">›</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ onBack, onDisconnect }: SettingsScreenProps): React.JSX.Element {
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58() ?? null;

  return (
    <Screen padded={false}>
      <ScreenHeader title="Settings" onBack={onBack} />
      <Screen scroll padded>
        <SectionTitle>Wallet</SectionTitle>
        <Card>
          <InfoRow label="Address" value={address ? shortenAddress(address) : 'Not connected'} mono />
          <InfoRow label="Network" value="Devnet" />
          <InfoRow label="Program ID" value={shortenAddress(PROGRAM_ID.toBase58())} mono />
          {address ? <LinkRow label="View wallet on Explorer" onPress={() => void Linking.openURL(explorerAddressUrl(address))} /> : null}
        </Card>

        <SectionTitle>Notifications</SectionTitle>
        <Card>
          <InfoRow label="Telegram alerts" value="Not configured" />
          <Text style={styles.note}>
            Off-chain heartbeat and claim alerts can be delivered via the Thinkxx notifications service.
          </Text>
        </Card>

        <SectionTitle>About</SectionTitle>
        <Card>
          <LinkRow label="Documentation" onPress={() => void Linking.openURL(REPO_URL)} />
          <LinkRow label="Report a bug" onPress={() => void Linking.openURL(ISSUES_URL)} />
          <InfoRow label="Version" value={APP_VERSION} />
          <InfoRow label="License" value="Apache 2.0" />
        </Card>

        <SectionTitle>Danger zone</SectionTitle>
        <View>
          <Button label="Disconnect wallet" variant="danger" onPress={onDisconnect} />
        </View>
      </Screen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.xs },
  linkLabel: { color: theme.colors.text, fontSize: theme.fontSize.sm },
  chevron: { color: theme.colors.textMuted, fontSize: 22 },
  note: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, lineHeight: 18 },
});
