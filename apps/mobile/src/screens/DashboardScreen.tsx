import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { fetchPlansByOwner, PlanState, PlanMode } from '@thinkxx/sdk';
import type { PlanWithAddress } from '@thinkxx/sdk';
import { useWallet } from '../providers/WalletProvider';
import { theme } from '../theme';

interface DashboardScreenProps {
  onCreatePlan: () => void;
  onHeartbeat: (planAddress?: string) => void;
  onSettings: () => void;
  onPlanDetail: (planAddress: string) => void;
  onDeposit: (planAddress: string) => void;
  lastPlanAddress: string | null;
}

/**
 * Dashboard screen — main view after wallet connection.
 * Fetches real plans via getProgramAccounts and shows vault status.
 */
export default function DashboardScreen({
  onCreatePlan,
  onHeartbeat,
  onSettings,
  onPlanDetail,
  onDeposit,
  lastPlanAddress,
}: DashboardScreenProps): React.JSX.Element {
  const { shortAddress, disconnect, connection, publicKey } = useWallet();
  const [plans, setPlans] = useState<PlanWithAddress[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!publicKey) {
      setPlans([]);
      setBalance(null);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const [lamports, fetchedPlans] = await Promise.all([
        connection.getBalance(publicKey, 'confirmed'),
        fetchPlansByOwner(connection, publicKey),
      ]);
      setBalance(lamports / LAMPORTS_PER_SOL);
      setPlans(fetchedPlans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const firstPlanAddress = plans[0]?.address.toBase58() ?? lastPlanAddress;

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

        {/* Error State */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Plans Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Plans</Text>
            <TouchableOpacity style={styles.createButton} onPress={onCreatePlan}>
              <Text style={styles.createButtonText}>+ New Plan</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <Text style={styles.loadingText}>Loading plans...</Text>
            </View>
          ) : plans.length === 0 ? (
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
            plans.map(plan => (
              <PlanCard
                key={plan.address.toBase58()}
                plan={plan}
                onPress={() => onPlanDetail(plan.address.toBase58())}
              />
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionTile
              icon="💓"
              label="Heartbeat"
              color={theme.colors.secondary}
              onPress={() => onHeartbeat(firstPlanAddress ?? undefined)}
            />
            <ActionTile
              icon="📥"
              label="Deposit"
              color={theme.colors.accent}
              onPress={firstPlanAddress ? () => onDeposit(firstPlanAddress) : undefined}
            />
            <ActionTile
              icon="👁"
              label="Status"
              color={theme.colors.primaryLight}
              onPress={firstPlanAddress ? () => onPlanDetail(firstPlanAddress) : undefined}
            />
            <ActionTile icon="⚙️" label="Settings" color={theme.colors.textMuted} onPress={onSettings} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

const MODE_LABELS: Record<number, string> = {
  [PlanMode.Medical]: 'MEDICAL',
  [PlanMode.LegalRisk]: 'LEGAL RISK',
  [PlanMode.Legacy]: 'LEGACY',
};

const STATE_LABELS: Record<number, string> = {
  [PlanState.Draft]: 'Draft',
  [PlanState.Active]: 'Active',
  [PlanState.ClaimPending]: 'Claim Pending',
  [PlanState.ClaimApproved]: 'Approved',
  [PlanState.Claimed]: 'Claimed',
  [PlanState.Cancelled]: 'Cancelled',
  [PlanState.Paused]: 'Paused',
};

const MODE_COLORS: Record<number, string> = {
  [PlanMode.Medical]: theme.colors.danger,
  [PlanMode.LegalRisk]: theme.colors.warning,
  [PlanMode.Legacy]: theme.colors.primary,
};

const STATE_COLORS: Record<number, string> = {
  [PlanState.Draft]: theme.colors.textMuted,
  [PlanState.Active]: theme.colors.success,
  [PlanState.ClaimPending]: theme.colors.danger,
  [PlanState.ClaimApproved]: theme.colors.warning,
  [PlanState.Claimed]: theme.colors.primary,
  [PlanState.Cancelled]: theme.colors.textMuted,
  [PlanState.Paused]: theme.colors.warning,
};

function PlanCard({ plan, onPress }: { plan: PlanWithAddress; onPress: () => void }): React.JSX.Element {
  const vaultSol = Number(plan.vaultLamports) / LAMPORTS_PER_SOL;
  const lastBeat = new Date(Number(plan.lastHeartbeat) * 1000);
  const stateColor = STATE_COLORS[plan.state] ?? theme.colors.textMuted;

  return (
    <TouchableOpacity style={styles.planCard} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.planCardHeader}>
        <View style={[styles.modeBadge, { backgroundColor: MODE_COLORS[plan.mode] ?? theme.colors.primary }]}>
          <Text style={styles.modeBadgeText}>{MODE_LABELS[plan.mode] ?? 'UNKNOWN'}</Text>
        </View>
        <View style={[styles.stateBadge, { backgroundColor: `${stateColor}20` }]}>
          <View style={[styles.stateDot, { backgroundColor: stateColor }]} />
          <Text style={[styles.stateText, { color: stateColor }]}>
            {STATE_LABELS[plan.state] ?? 'Unknown'}
          </Text>
        </View>
      </View>
      <Text style={styles.planBalance}>{vaultSol.toFixed(4)} SOL</Text>
      <Text style={styles.planAddress}>
        {plan.address.toBase58().slice(0, 8)}...{plan.address.toBase58().slice(-8)}
      </Text>
      <Text style={styles.planMeta}>
        Last heartbeat: {lastBeat.toLocaleDateString()} {lastBeat.toLocaleTimeString()}
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
    <TouchableOpacity
      style={[styles.actionTile, !onPress && styles.actionTileDisabled]}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.actionIconContainer, { backgroundColor: `${color}15` }]}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  errorCard: {
    backgroundColor: `${theme.colors.danger}10`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: `${theme.colors.danger}30`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.dangerLight,
    fontSize: theme.fontSize.sm,
    flex: 1,
  },
  retryButton: {
    backgroundColor: `${theme.colors.danger}20`,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  retryText: {
    color: theme.colors.dangerLight,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
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
  loadingState: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
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
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    gap: 4,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stateText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  planBalance: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  planAddress: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: theme.spacing.xs,
  },
  planMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
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
  actionTileDisabled: {
    opacity: 0.4,
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
