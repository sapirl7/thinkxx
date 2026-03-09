import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '../providers/WalletProvider';
import { theme } from '../theme';

/** Plan data (placeholder until SDK wired) */
interface PlanSummary {
  id: string;
  mode: string;
  state: string;
  beneficiary: string;
  address?: string;
  lastHeartbeat: Date;
  vaultBalance: number;
  nextHeartbeatDue: Date;
}

interface DashboardScreenProps {
  onCreatePlan: () => void;
  onHeartbeat: () => void;
  onSettings: () => void;
  lastPlanAddress: string | null;
}

/**
 * Dashboard screen — main view after wallet connection.
 * Shows plan list, vault status, and quick actions.
 */
export default function DashboardScreen({
  onCreatePlan,
  onHeartbeat,
  onSettings,
  lastPlanAddress,
}: DashboardScreenProps): React.JSX.Element {
  const { shortAddress, disconnect, connection, publicKey } = useWallet();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!publicKey) {
      setPlans([]);
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
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const visiblePlans = plans.length > 0
    ? plans
    : lastPlanAddress
      ? [{
        id: lastPlanAddress,
        address: lastPlanAddress,
        mode: 'pending',
        state: 'Created',
        beneficiary: '',
        lastHeartbeat: new Date(),
        vaultBalance: 0,
        nextHeartbeatDue: new Date(),
      }]
      : [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Thinkxx</Text>
          <Text style={styles.address}>{shortAddress ?? '...'}</Text>
        </View>
        <TouchableOpacity
          style={styles.disconnectButton}
          onPress={disconnect}
        >
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceValue}>
            {balance !== null ? `${balance.toFixed(4)} SOL` : '—'}
          </Text>
          <Text style={styles.networkTag}>devnet</Text>
        </View>

        {/* Plans Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Plans</Text>
            <TouchableOpacity style={styles.createButton} onPress={onCreatePlan}>
              <Text style={styles.createButtonText}>+ New Plan</Text>
            </TouchableOpacity>
          </View>

          {visiblePlans.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No plans yet</Text>
              <Text style={styles.emptyDescription}>
                Create your first emergency access plan to protect your assets
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={onCreatePlan}>
                <Text style={styles.emptyButtonText}>Create Plan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            visiblePlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} />
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionTile icon="💓" label="Heartbeat" color={theme.colors.secondary} onPress={onHeartbeat} />
            <ActionTile icon="📥" label="Deposit" color={theme.colors.accent} />
            <ActionTile icon="👁" label="Status" color={theme.colors.primaryLight} />
            <ActionTile icon="⚙️" label="Settings" color={theme.colors.textMuted} onPress={onSettings} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({ plan }: { plan: PlanSummary }): React.JSX.Element {
  const modeColors: Record<string, string> = {
    medical: theme.colors.danger,
    legal_risk: theme.colors.warning,
    legacy: theme.colors.primary,
  };

  return (
    <TouchableOpacity style={styles.planCard} activeOpacity={0.7}>
      <View style={styles.planCardHeader}>
        <View style={[styles.modeBadge, { backgroundColor: modeColors[plan.mode] ?? theme.colors.primary }]}>
          <Text style={styles.modeBadgeText}>{plan.mode.toUpperCase()}</Text>
        </View>
        <Text style={styles.planState}>{plan.state}</Text>
      </View>
      <Text style={styles.planBalance}>{plan.vaultBalance.toFixed(4)} SOL</Text>
      {plan.address ? (
        <Text style={styles.planAddress}>{plan.address}</Text>
      ) : null}
      <Text style={styles.planMeta}>
        Last heartbeat: {plan.lastHeartbeat.toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
}

function ActionTile({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress?: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.actionTile} activeOpacity={0.7} onPress={onPress} disabled={!onPress}>
      <View style={[styles.actionIconContainer, { backgroundColor: `${color}15` }]}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  greeting: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  address: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  disconnectButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  disconnectText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  balanceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  balanceValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  networkTag: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  createButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  emptyState: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  emptyButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  planCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  modeBadge: {
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  modeBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  planState: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  planBalance: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  planMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  planAddress: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  actionTile: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
});
