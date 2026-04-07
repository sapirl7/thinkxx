import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
import {
  deriveGuardianSetPda,
  deriveSolVaultPda,
  fetchGuardianSet,
  fetchPlan,
  PlanMode,
  PlanState,
  ThinkxxClient,
} from '@thinkxx/sdk';
import type { ParsedGuardianSet, PlanAccountData } from '@thinkxx/sdk';
import { useWallet } from '../providers/WalletProvider';
import ScreenShell from '../components/ScreenShell';
import { readBalanceWithRetry, retryRpcRead, toRpcReadMessage } from '../lib/rpc';
import {
  AddressBlock,
  KeyValueRow,
  Panel,
  PrimaryButton,
  SectionHeading,
  SecondaryButton,
  StatusPill,
} from '../components/Primitives';
import { theme } from '../theme';

interface PlanDetailScreenProps {
  planAddress: string;
  onBack: () => void;
  onGuardians: (planAddress: string) => void;
  onHeartbeat: (planAddress: string) => void;
  onDeposit: (planAddress: string) => void;
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

function formatTimeSince(timestamp: bigint): string {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) {
    return 'No heartbeat yet';
  }

  const seconds = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return 'Heartbeat unavailable';
  }
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function PlanDetailScreen({
  planAddress,
  onBack,
  onGuardians,
  onHeartbeat,
  onDeposit,
}: PlanDetailScreenProps): React.JSX.Element {
  const { connection, publicKey, signAndSendTransaction } = useWallet();
  const [plan, setPlan] = useState<PlanAccountData | null>(null);
  const [guardianSet, setGuardianSet] = useState<ParsedGuardianSet | null>(null);
  const [vaultBalance, setVaultBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const planPda = useMemo(() => new PublicKey(planAddress), [planAddress]);

  const fetchData = useCallback(async () => {
    setLoadError(null);

    try {
      const planData = await retryRpcRead(() => fetchPlan(connection, planPda));
      if (!planData) {
        setPlan(null);
        setGuardianSet(null);
        setLoadError('Plan account not found on devnet.');
        return;
      }
      setPlan(planData);

      const [gsPda] = deriveGuardianSetPda(planPda);
      const gs = await retryRpcRead(() => fetchGuardianSet(connection, gsPda));
      setGuardianSet(gs);

      const [solVaultPda] = deriveSolVaultPda(planPda);
      const vaultLamports = await readBalanceWithRetry(connection, solVaultPda, 'confirmed');
      setVaultBalance(vaultLamports / LAMPORTS_PER_SOL);
    } catch (err) {
      setPlan(null);
      setGuardianSet(null);
      setLoadError(toRpcReadMessage(err, 'Failed to fetch plan.'));
    } finally {
      setLoading(false);
    }
  }, [connection, planPda]);

  useEffect(() => {
    setLoading(true);
    void fetchData();
  }, [fetchData]);

  const handlePauseResume = useCallback(async () => {
    if (!plan || !publicKey) return;
    setActing(true);
    try {
      const client = new ThinkxxClient(connection);
      const isPaused = plan.state === PlanState.Paused;
      const instruction = isPaused
        ? client.buildResumePlan(publicKey, planPda)
        : client.buildPausePlan(publicKey, planPda);
      await signAndSendTransaction(new Transaction().add(instruction));
      Alert.alert('Success', isPaused ? 'Plan resumed.' : 'Plan paused.');
      await fetchData();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setActing(false);
    }
  }, [connection, fetchData, plan, planPda, publicKey, signAndSendTransaction]);

  if (loading) {
    return (
      <ScreenShell
        title="Plan Detail"
        subtitle="Resolving plan state from chain."
        eyebrow="Owner flow / plan detail"
        onBack={onBack}
      >
        <Panel>
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading plan...</Text>
          </View>
        </Panel>
      </ScreenShell>
    );
  }

  if (!plan) {
    return (
      <ScreenShell
        title="Plan Detail"
        subtitle="Selected plan is unavailable."
        eyebrow="Owner flow / plan detail"
        onBack={onBack}
      >
        <Panel tone="danger">
          <SectionHeading
            label="Plan not found"
            action={<SecondaryButton label="Retry" tone="danger" onPress={() => void fetchData()} />}
          />
          <Text style={styles.emptyText}>{loadError ?? 'Return to Dashboard and sync plans again.'}</Text>
        </Panel>
      </ScreenShell>
    );
  }

  const stateLabel = STATE_LABELS[plan.state] ?? 'Unknown';
  const modeLabel = MODE_LABELS[plan.mode] ?? 'Unknown';
  const emergencySol = Number(plan.emergencyBucketLamports) / LAMPORTS_PER_SOL;
  const isPausable = plan.state === PlanState.Active;
  const isResumable = plan.state === PlanState.Paused;

  return (
    <ScreenShell
      title="Plan Detail"
      subtitle={`${modeLabel} mode • owner-side controls for the selected plan account.`}
      eyebrow="Owner flow / plan detail"
      onBack={onBack}
      scroll
      contentContainerStyle={styles.content}
    >
      <Panel tone={stateTone(plan.state)}>
        <SectionHeading label="Plan status" />
        <StatusPill label={stateLabel} tone={stateTone(plan.state)} />
        <Text style={styles.vaultLabel}>Vault Balance</Text>
        <Text style={styles.statusHeadline}>{vaultBalance.toFixed(4)} SOL</Text>
        <Text style={styles.statusSubline}>Emergency cap: {emergencySol.toFixed(4)} SOL</Text>
        <AddressBlock
          label="Plan account"
          address={planAddress}
          helper={`Last heartbeat: ${formatTimeSince(plan.lastHeartbeat)}`}
        />
      </Panel>

      <View style={styles.actionsRow}>
        <PrimaryButton label="Deposit" onPress={() => onDeposit(planAddress)} style={styles.actionButton} />
        <SecondaryButton
          label="Emergency cap"
          tone="danger"
          badge="Coming Soon"
          disabled
          style={styles.actionButton}
        />
      </View>

      <Panel tone="success">
        <SectionHeading label="Owner heartbeat" />
        <Text style={styles.heartbeatValue}>{formatTimeSince(plan.lastHeartbeat)}</Text>
        <Text style={styles.heartbeatCaption}>
          Heartbeat refreshes the inactivity timer that protects this plan.
        </Text>
        <PrimaryButton label="Send Heartbeat" onPress={() => onHeartbeat(planAddress)} />
      </Panel>

      <Panel>
        <SectionHeading label="Configuration" />
        <KeyValueRow label="Mode" value={modeLabel} />
        <KeyValueRow label="Inactivity Window" value={`${Math.round(Number(plan.inactivityDuration) / 86400)} days`} />
        <KeyValueRow label="Grace Period" value={`${Math.round(Number(plan.gracePeriod) / 86400)} days`} />
        <KeyValueRow label="Guardian quorum" value={`${guardianSet?.quorum ?? plan.guardianQuorum}`} />
        <KeyValueRow
          label="Created"
          value={
            Number.isFinite(Number(plan.createdAt)) && Number(plan.createdAt) > 0
              ? new Date(Number(plan.createdAt) * 1000).toLocaleDateString()
              : 'Unknown'
          }
        />
      </Panel>

      <Panel>
        <SectionHeading label="Beneficiaries" />
        <AddressBlock
          label="Primary Beneficiary"
          address={plan.beneficiary.toBase58()}
          helper="This wallet can start a claim only after inactivity and grace rules allow it."
        />
        <AddressBlock
          label="Backup Beneficiary"
          address={plan.backupBeneficiary?.toBase58() ?? null}
          helper={
            plan.backupBeneficiary
              ? 'Backup beneficiary is available if the primary beneficiary cannot act.'
              : 'No backup beneficiary configured for this plan.'
          }
        />
      </Panel>

      <TouchableOpacity activeOpacity={0.82} onPress={() => onGuardians(planAddress)}>
        <Panel>
          <SectionHeading label="Guardians" action={<Text style={styles.chevron}>Open</Text>} />
          <Text style={styles.guardiansValue}>
            {guardianSet?.guardians.length ?? 0} guardians • quorum {guardianSet?.quorum ?? plan.guardianQuorum}
          </Text>
          <Text style={styles.guardiansHelper}>
            Review addresses, add new guardians, or remove stale ones from the selected plan.
          </Text>
        </Panel>
      </TouchableOpacity>

      <View style={styles.futureActions}>
        {(isPausable || isResumable) ? (
          <SecondaryButton
            label={isPausable ? 'Pause Plan' : 'Resume Plan'}
            tone={isPausable ? 'warning' : 'success'}
            onPress={handlePauseResume}
            disabled={acting}
          />
        ) : null}
        <SecondaryButton label="Edit Timing" badge="Coming Soon" disabled />
        <SecondaryButton label="Update Beneficiary" badge="Coming Soon" disabled />
        <SecondaryButton label="Close Plan" badge="Coming Soon" disabled />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
  },
  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  statusHeadline: {
    color: theme.colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: theme.fontWeight.bold,
  },
  vaultLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statusSubline: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  heartbeatValue: {
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: theme.fontWeight.bold,
  },
  heartbeatCaption: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  chevron: {
    color: theme.colors.primaryLight,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
  },
  guardiansValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  guardiansHelper: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  futureActions: {
    gap: theme.spacing.md,
  },
});
