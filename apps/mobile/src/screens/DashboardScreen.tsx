import React, { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { fetchPlansByOwner, PlanMode, PlanState } from '@thinkxx/sdk';
import type { PlanWithAddress } from '@thinkxx/sdk';
import { useWallet } from '../providers/WalletProvider';
import ScreenShell from '../components/ScreenShell';
import {
  AddressBlock,
  MetricPanel,
  Panel,
  PrimaryButton,
  SectionHeading,
  SecondaryButton,
  StatusPill,
} from '../components/Primitives';
import { theme } from '../theme';

interface DashboardScreenProps {
  onCreatePlan: () => void;
  onHeartbeat: (planAddress?: string) => void;
  onSettings: () => void;
  onPlanDetail: (planAddress: string) => void;
  onDeposit: (planAddress: string) => void;
  selectedPlanAddress: string | null;
  lastCreatedPlanAddress: string | null;
}

const MODE_LABELS: Record<number, string> = {
  [PlanMode.Medical]: 'Medical',
  [PlanMode.LegalRisk]: 'Legal Risk',
  [PlanMode.Legacy]: 'Legacy',
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

function stateTone(state: number): 'primary' | 'success' | 'warning' | 'danger' | 'neutral' {
  switch (state) {
    case PlanState.Active:
      return 'success';
    case PlanState.ClaimApproved:
    case PlanState.Paused:
      return 'warning';
    case PlanState.ClaimPending:
      return 'danger';
    case PlanState.Claimed:
      return 'primary';
    default:
      return 'neutral';
  }
}

function formatHeartbeat(timestamp: bigint): string {
  const millis = Number(timestamp) * 1000;
  if (millis <= 0) {
    return 'No heartbeat yet';
  }
  const date = new Date(millis);
  return `${date.toLocaleDateString()} • ${date.toLocaleTimeString()}`;
}

function CommandTile({
  label,
  code,
  description,
  onPress,
}: {
  label: string;
  code: string;
  description: string;
  onPress?: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.commandTile, !onPress && styles.commandTileDisabled]}
      activeOpacity={0.82}
      disabled={!onPress}
      onPress={onPress}
    >
      <View style={styles.commandCode}>
        <Text style={styles.commandCodeText}>{code}</Text>
      </View>
      <Text style={styles.commandLabel}>{label}</Text>
      <Text style={styles.commandDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

function PlanCard({
  plan,
  onPress,
  selected,
}: {
  plan: PlanWithAddress;
  onPress: () => void;
  selected: boolean;
}): React.JSX.Element {
  const vaultSol = Number(plan.vaultLamports) / LAMPORTS_PER_SOL;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
      <Panel style={[styles.planCard, selected && styles.planCardSelected]} tone={selected ? 'primary' : 'neutral'}>
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planMode}>{MODE_LABELS[plan.mode] ?? 'Unknown'}</Text>
            <Text style={styles.planBalance}>{vaultSol.toFixed(4)} SOL</Text>
          </View>
          <View style={styles.planHeaderBadges}>
            {selected ? <StatusPill label="Selected" tone="primary" /> : null}
            <StatusPill label={STATE_LABELS[plan.state] ?? 'Unknown'} tone={stateTone(plan.state)} />
          </View>
        </View>
        <AddressBlock
          label="Plan account"
          address={plan.address.toBase58()}
          helper={`Last heartbeat: ${formatHeartbeat(plan.lastHeartbeat)}`}
        />
      </Panel>
    </TouchableOpacity>
  );
}

/**
 * Dashboard screen — the owner command deck.
 */
export default function DashboardScreen({
  onCreatePlan,
  onHeartbeat,
  onSettings,
  onPlanDetail,
  onDeposit,
  selectedPlanAddress,
  lastCreatedPlanAddress,
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
    void fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const fallbackPlanAddress = selectedPlanAddress ?? lastCreatedPlanAddress;
  const firstPlanAddress = plans[0]?.address.toBase58() ?? fallbackPlanAddress;
  const hasResolvedPlan = Boolean(firstPlanAddress);
  const showPendingSync = !loading && plans.length === 0 && Boolean(firstPlanAddress);
  const prioritizedPlans = selectedPlanAddress
    ? [...plans].sort((left, right) => {
        const leftSelected = left.address.toBase58() === selectedPlanAddress ? 1 : 0;
        const rightSelected = right.address.toBase58() === selectedPlanAddress ? 1 : 0;
        return rightSelected - leftSelected;
      })
    : plans;

  return (
    <ScreenShell
      title="Owner Console"
      subtitle={`Connected as ${shortAddress ?? '…'} on devnet.`}
      eyebrow="Thinkxx / command deck"
      scroll
      rightSlot={
        <TouchableOpacity style={styles.disconnectButton} onPress={disconnect} activeOpacity={0.82}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
      }
      contentContainerStyle={styles.content}
    >
      <MetricPanel
        eyebrow="Wallet balance"
        value={balance !== null ? `${balance.toFixed(4)} SOL` : '—'}
        caption="Devnet owner wallet"
      />

      {hasResolvedPlan ? (
        <Panel tone="primary">
          <SectionHeading label="Active plan focus" />
          <Text style={styles.focusTitle}>Plan-bound actions are locked to the currently selected plan.</Text>
          <AddressBlock
            label="Selected plan"
            address={firstPlanAddress ?? null}
            helper="Heartbeat, status and deposit operate on this plan until you open another one."
          />
        </Panel>
      ) : null}

      {error ? (
        <Panel tone="danger">
          <SectionHeading
            label="Sync issue"
            action={<SecondaryButton label="Retry" tone="danger" onPress={onRefresh} />}
          />
          <Text style={styles.inlineError}>{error}</Text>
        </Panel>
      ) : null}

      <View style={styles.sectionBlock}>
        <SectionHeading
          label="Your Plans"
          action={<PrimaryButton label="+ New Plan" onPress={onCreatePlan} style={styles.compactPrimary} />}
        />

        {loading ? (
          <Panel>
            <View style={styles.centerState}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <Text style={styles.centerStateText}>Loading plans…</Text>
            </View>
          </Panel>
        ) : showPendingSync ? (
          <Panel tone="warning">
            <SectionHeading label="Pending sync" />
            <Text style={styles.pendingTitle}>Plan created, syncing...</Text>
            <Text style={styles.pendingBody}>
              The transaction is done. Open the selected plan directly while getProgramAccounts catches up.
            </Text>
            <AddressBlock label="Pending plan" address={firstPlanAddress ?? null} />
            <PrimaryButton
              label="Open Plan"
              tone="secondary"
              onPress={firstPlanAddress ? () => onPlanDetail(firstPlanAddress) : undefined}
            />
          </Panel>
        ) : plans.length === 0 ? (
          <Panel tone="neutral">
            <SectionHeading label="No plans yet" />
            <Text style={styles.emptyTitle}>No plans yet</Text>
            <Text style={styles.emptyBody}>
              Create your first emergency-access plan to unlock heartbeat, deposit, and guardian management.
            </Text>
            <PrimaryButton label="Create Plan" onPress={onCreatePlan} />
          </Panel>
        ) : (
          <View style={styles.planStack}>
            {prioritizedPlans.map(plan => (
              <PlanCard
                key={plan.address.toBase58()}
                plan={plan}
                selected={plan.address.toBase58() === selectedPlanAddress}
                onPress={() => onPlanDetail(plan.address.toBase58())}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeading label="Quick Actions" />
        <View style={styles.commandsGrid}>
          <CommandTile
            code="HB"
            label="Heartbeat"
            description="Reset inactivity timer for the active plan."
            onPress={hasResolvedPlan ? () => onHeartbeat(firstPlanAddress ?? undefined) : undefined}
          />
          <CommandTile
            code="DP"
            label="Deposit"
            description="Move SOL from wallet into the selected vault."
            onPress={hasResolvedPlan ? () => onDeposit(firstPlanAddress as string) : undefined}
          />
          <CommandTile
            code="ST"
            label="Status"
            description="Inspect vault, timers, and guardian quorum."
            onPress={hasResolvedPlan ? () => onPlanDetail(firstPlanAddress as string) : undefined}
          />
          <CommandTile
            code="CFG"
            label="Settings"
            description="Connection, endpoint, version, and future automations."
            onPress={onSettings}
          />
        </View>
        {!hasResolvedPlan ? (
          <Text style={styles.planHint}>Create or sync a plan before using plan actions.</Text>
        ) : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
  },
  disconnectButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
  },
  disconnectText: {
    color: theme.colors.textSoft,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  inlineError: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  sectionBlock: {
    gap: theme.spacing.md,
  },
  compactPrimary: {
    minHeight: 42,
    paddingHorizontal: theme.spacing.md,
  },
  centerState: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  centerStateText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  pendingTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  pendingBody: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
  },
  emptyBody: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  planStack: {
    gap: theme.spacing.md,
  },
  planCard: {
    gap: theme.spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
  },
  planHeaderBadges: {
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  planMode: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: theme.fontWeight.bold,
  },
  planBalance: {
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: theme.fontWeight.bold,
    marginTop: theme.spacing.xs,
  },
  planCardSelected: {
    borderColor: theme.colors.primary,
  },
  focusTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    lineHeight: 22,
  },
  commandsGrid: {
    gap: theme.spacing.md,
  },
  commandTile: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  commandTileDisabled: {
    opacity: 0.48,
  },
  commandCode: {
    alignSelf: 'flex-start',
    minWidth: 52,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  commandCodeText: {
    color: theme.colors.primaryLight,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  commandLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  commandDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  planHint: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    lineHeight: 19,
  },
});
