import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { PublicKey, Transaction } from '@solana/web3.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  ThinkxxClient,
  PlanMode,
  PlanState,
  fetchPlan,
  fetchGuardianSet,
} from '@thinkxx/sdk';
import type { PlanAccountData, ParsedGuardianSet } from '@thinkxx/sdk';
import { deriveGuardianSetPda, deriveSolVaultPda } from '@thinkxx/sdk';
import { useWallet } from '../providers/WalletProvider';
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

const STATE_COLORS: Record<number, string> = {
  [PlanState.Draft]: '#6E7681',
  [PlanState.Active]: theme.colors.success,
  [PlanState.ClaimPending]: theme.colors.danger,
  [PlanState.ClaimApproved]: theme.colors.warning,
  [PlanState.Claimed]: theme.colors.primary,
  [PlanState.Cancelled]: '#6E7681',
  [PlanState.Paused]: theme.colors.warning,
};

function formatTimeSince(timestamp: bigint): string {
  const seconds = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
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

  const planPda = new PublicKey(planAddress);

  const fetchData = useCallback(async () => {
    try {
      const planData = await fetchPlan(connection, planPda);
      if (!planData) {
        Alert.alert('Not Found', 'Plan account not found on devnet.');
        onBack();
        return;
      }
      setPlan(planData);

      const [gsPda] = deriveGuardianSetPda(planPda);
      const gs = await fetchGuardianSet(connection, gsPda);
      setGuardianSet(gs);

      const [solVaultPda] = deriveSolVaultPda(planPda);
      const vaultLamports = await connection.getBalance(solVaultPda, 'confirmed');
      setVaultBalance(vaultLamports / LAMPORTS_PER_SOL);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to fetch plan');
    } finally {
      setLoading(false);
    }
  }, [connection, planAddress, onBack]);

  useEffect(() => {
    setLoading(true);
    fetchData();
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
  }, [plan, publicKey, connection, signAndSendTransaction, fetchData]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Plan Details</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading plan...</Text>
        </View>
      </View>
    );
  }

  if (!plan) return <View style={styles.container} />;

  const stateColor = STATE_COLORS[plan.state] ?? '#6E7681';
  const stateLabel = STATE_LABELS[plan.state] ?? 'Unknown';
  const modeLabel = MODE_LABELS[plan.mode] ?? 'Unknown';
  const isPausable = plan.state === PlanState.Active;
  const isResumable = plan.state === PlanState.Paused;
  const emergencySol = Number(plan.emergencyBucketLamports) / LAMPORTS_PER_SOL;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Plan Details</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: stateColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: stateColor }]} />
            <Text style={[styles.statusText, { color: stateColor }]}>{stateLabel}</Text>
          </View>
          <Text style={styles.modeLabel}>{modeLabel} Mode</Text>
        </View>

        {/* Vault */}
        <View style={styles.vaultCard}>
          <Text style={styles.vaultLabel}>Vault Balance</Text>
          <Text style={styles.vaultAmount}>{vaultBalance.toFixed(4)} SOL</Text>
          <View style={styles.vaultRow}>
            <Text style={styles.vaultSubtext}>Emergency cap: {emergencySol.toFixed(4)} SOL</Text>
          </View>
          <View style={styles.vaultActions}>
            <TouchableOpacity style={styles.vaultBtn} onPress={() => onDeposit(planAddress)}>
              <Text style={styles.vaultBtnText}>📥 Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.vaultBtn, styles.vaultBtnSecondary, styles.comingSoonAction]} disabled>
              <Text style={styles.vaultBtnSecondaryText}>🆘 Emergency</Text>
              <Text style={styles.comingSoonBadge}>Coming Soon</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Heartbeat */}
        <View style={styles.heartbeatCard}>
          <View style={styles.heartbeatHeader}>
            <Text style={styles.heartbeatIcon}>💓</Text>
            <View>
              <Text style={styles.heartbeatLabel}>Last Heartbeat</Text>
              <Text style={styles.heartbeatValue}>{formatTimeSince(plan.lastHeartbeat)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.heartbeatBtn} onPress={() => onHeartbeat(planAddress)}>
            <Text style={styles.heartbeatBtnText}>Send Heartbeat</Text>
          </TouchableOpacity>
        </View>

        {/* Details Grid */}
        <Text style={styles.sectionTitle}>Configuration</Text>
        <View style={styles.detailsGrid}>
          <DetailRow label="Beneficiary" value={shortenAddress(plan.beneficiary.toBase58())} mono />
          <DetailRow
            label="Backup"
            value={plan.backupBeneficiary ? shortenAddress(plan.backupBeneficiary.toBase58()) : 'None'}
          />
          <DetailRow label="Inactivity Window" value={`${Math.round(Number(plan.inactivityDuration) / 86400)} days`} />
          <DetailRow label="Grace Period" value={`${Math.round(Number(plan.gracePeriod) / 86400)} days`} />
          <DetailRow label="Created" value={new Date(Number(plan.createdAt) * 1000).toLocaleDateString()} />
        </View>

        {/* Guardians */}
        <TouchableOpacity style={styles.guardiansCard} onPress={() => onGuardians(planAddress)}>
          <View style={styles.guardiansLeft}>
            <Text style={styles.guardiansIcon}>🛡️</Text>
            <View>
              <Text style={styles.guardiansLabel}>Guardians</Text>
              <Text style={styles.guardiansValue}>
                {guardianSet?.guardians.length ?? 0} guardians • Quorum: {guardianSet?.quorum ?? plan.guardianQuorum}
              </Text>
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionsGrid}>
          {(isPausable || isResumable) && (
            <TouchableOpacity
              style={[styles.actionBtn, acting && styles.actionBtnDisabled]}
              onPress={handlePauseResume}
              disabled={acting}
            >
              <Text style={styles.actionIcon}>{isPausable ? '⏸' : '▶️'}</Text>
              <Text style={styles.actionText}>{isPausable ? 'Pause Plan' : 'Resume Plan'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionBtn, styles.comingSoonAction]} disabled>
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionTextMuted}>Edit Timing</Text>
            <Text style={styles.comingSoonBadge}>Coming Soon</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.comingSoonAction]} disabled>
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionTextMuted}>Update Beneficiary</Text>
            <Text style={styles.comingSoonBadge}>Coming Soon</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.comingSoonAction]} disabled>
            <Text style={styles.actionIcon}>🗑</Text>
            <Text style={styles.actionTextMuted}>Close Plan</Text>
            <Text style={styles.comingSoonBadge}>Coming Soon</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }): React.JSX.Element {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.monoText]}>{value}</Text>
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
  content: { flex: 1 },
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md,
  },
  loadingText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  statusCard: {
    alignItems: 'center', marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: theme.spacing.xs },
  statusText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
  modeLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.xs },
  vaultCard: {
    marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg,
    alignItems: 'center',
  },
  vaultLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  vaultAmount: { color: theme.colors.text, fontSize: 36, fontWeight: theme.fontWeight.bold, marginTop: theme.spacing.xs },
  vaultRow: { marginTop: theme.spacing.xs },
  vaultSubtext: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  vaultActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md, width: '100%' },
  vaultBtn: {
    flex: 1, backgroundColor: theme.colors.accent, borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm, alignItems: 'center',
  },
  vaultBtnText: { color: '#000', fontWeight: theme.fontWeight.bold },
  vaultBtnSecondary: { backgroundColor: theme.colors.danger + '20' },
  vaultBtnSecondaryText: { color: theme.colors.danger, fontWeight: theme.fontWeight.bold },
  heartbeatCard: {
    marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  heartbeatHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  heartbeatIcon: { fontSize: 28 },
  heartbeatLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  heartbeatValue: { color: theme.colors.success, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold },
  heartbeatBtn: {
    backgroundColor: theme.colors.success + '20', borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  heartbeatBtnText: { color: theme.colors.success, fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.sm },
  sectionTitle: {
    color: theme.colors.textMuted, fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.semibold,
    textTransform: 'uppercase', letterSpacing: 1,
    marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg, marginBottom: theme.spacing.xs,
  },
  detailsGrid: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.lg, overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 2,
    borderBottomWidth: 0.5, borderBottomColor: theme.colors.background,
  },
  detailLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  detailValue: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium },
  monoText: { fontFamily: 'monospace' },
  guardiansCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md,
  },
  guardiansLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  guardiansIcon: { fontSize: 24 },
  guardiansLabel: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold },
  guardiansValue: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  chevron: { color: theme.colors.textMuted, fontSize: 24 },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
  },
  actionBtn: {
    width: '48%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md, alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionIcon: { fontSize: 24, marginBottom: theme.spacing.xs },
  actionText: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium },
  actionTextMuted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium },
  comingSoonAction: { opacity: 0.4 },
  comingSoonBadge: {
    color: theme.colors.textMuted, fontSize: 9, fontWeight: theme.fontWeight.semibold,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2,
  },
  bottomSpacer: { height: 40 },
});
