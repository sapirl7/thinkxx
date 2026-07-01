import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { PlanSummary } from '@thinkxx/sdk';
import { useWallet } from '../providers/WalletProvider';
import { usePlans } from '../hooks/useThinkxx';
import { theme } from '../theme';
import {
  Screen,
  Card,
  Badge,
  Button,
  SectionTitle,
  Loading,
  ErrorView,
  EmptyState,
  DevnetBanner,
  planModeLabel,
  planStateLabel,
  planStateTone,
} from '../components';
import { formatSol, shortenAddress, formatDate } from '../lib/format';

interface DashboardScreenProps {
  onCreatePlan: () => void;
  onOpenPlan: (address: string) => void;
  onClaim: () => void;
  onSettings: () => void;
}

/**
 * Dashboard — the home screen after wallet connection.
 * Shows the wallet balance and the connected wallet's real on-chain plans.
 */
export default function DashboardScreen({
  onCreatePlan,
  onOpenPlan,
  onClaim,
  onSettings,
}: DashboardScreenProps): React.JSX.Element {
  const { shortAddress, connection, publicKey } = useWallet();
  const { data: plans, loading, error, refetch } = usePlans();
  const [balance, setBalance] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    try {
      const lamports = await connection.getBalance(publicKey, 'confirmed');
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch {
      setBalance(null);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchBalance(), refetch()]);
    setRefreshing(false);
  }, [fetchBalance, refetch]);

  return (
    <Screen scroll padded refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.brand}>Thinkxx</Text>
          <Text style={styles.address}>{shortAddress ?? '…'}</Text>
        </View>
        <TouchableOpacity
          onPress={onSettings}
          style={styles.iconButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Text style={styles.iconGlyph} importantForAccessibility="no">⚙︎</Text>
        </TouchableOpacity>
      </View>

      <DevnetBanner />

      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Wallet balance</Text>
        <Text style={styles.balanceValue}>
          {balance !== null ? `${balance.toFixed(4)} SOL` : '—'}
        </Text>
      </Card>

      <View style={styles.sectionHeader}>
        <SectionTitle>Your plans</SectionTitle>
        <View style={styles.newButton}>
          <Button label="+ New" onPress={onCreatePlan} fullWidth={false} accessibilityHint="Create a new emergency access plan" />
        </View>
      </View>

      {loading ? (
        <Loading label="Loading your plans…" />
      ) : error ? (
        <ErrorView message={error} onRetry={refetch} />
      ) : plans.length === 0 ? (
        <EmptyState
          title="No plans yet"
          description="Create your first emergency access plan to protect your assets."
          action={<Button label="Create plan" onPress={onCreatePlan} fullWidth={false} />}
        />
      ) : (
        plans.map(plan => (
          <PlanCard key={plan.address.toBase58()} plan={plan} onPress={() => onOpenPlan(plan.address.toBase58())} />
        ))
      )}

      <View style={styles.claimSection}>
        <SectionTitle>Named in someone&apos;s plan?</SectionTitle>
        <Button
          label="Access a plan"
          variant="secondary"
          onPress={onClaim}
          accessibilityHint="Act on a claim for a plan where you are a beneficiary or guardian"
        />
      </View>
    </Screen>
  );
}

function PlanCard({ plan, onPress }: { plan: PlanSummary; onPress: () => void }): React.JSX.Element {
  const { account, vaultLamports, address } = plan;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Open plan ${planModeLabel(account.mode)}, ${planStateLabel(account.state)}`}
    >
      <Card>
        <View style={styles.planTop}>
          <Badge label={planModeLabel(account.mode).toUpperCase()} tone="info" />
          <Badge label={planStateLabel(account.state)} tone={planStateTone(account.state)} />
        </View>
        <Text style={styles.planBalance}>{formatSol(vaultLamports)}</Text>
        <Text style={styles.planMeta}>Beneficiary: {shortenAddress(account.beneficiary.toBase58())}</Text>
        <Text style={styles.planMetaMuted}>
          Last heartbeat: {formatDate(account.lastHeartbeat)} · {shortenAddress(address.toBase58())}
        </Text>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerText: { gap: 2 },
  brand: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.text },
  address: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: { fontSize: 20, color: theme.colors.text },
  balanceCard: { alignItems: 'center' },
  balanceLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  balanceValue: { fontSize: theme.fontSize.hero, fontWeight: theme.fontWeight.bold, color: theme.colors.text },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  newButton: { minWidth: 84 },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planBalance: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.text },
  planMeta: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  planMetaMuted: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  claimSection: { gap: theme.spacing.md, marginTop: theme.spacing.sm },
});
