import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Linking, TouchableOpacity } from 'react-native';
import { Transaction, type TransactionInstruction } from '@solana/web3.js';
import { deriveClaimPda, PlanState, ClaimState } from '@thinkxx/sdk';
import { useWallet } from '../providers/WalletProvider';
import { useThinkxxClient, usePlanDetail } from '../hooks/useThinkxx';
import { theme } from '../theme';
import {
  Screen,
  ScreenHeader,
  Card,
  Badge,
  Button,
  SectionTitle,
  InfoRow,
  Loading,
  ErrorView,
  planModeLabel,
  planStateLabel,
  planStateTone,
  claimStateLabel,
} from '../components';
import { formatSol, formatDuration, formatDate, shortenAddress, solToLamports } from '../lib/format';
import { explorerTxUrl } from '../lib/solana';

interface PlanDetailScreenProps {
  planAddress: string | null;
  onBack: () => void;
  onGuardians: () => void;
}

type AmountAction = 'deposit' | 'emergency' | null;

export default function PlanDetailScreen({
  planAddress,
  onBack,
  onGuardians,
}: PlanDetailScreenProps): React.JSX.Element {
  const { publicKey, signAndSendTransaction } = useWallet();
  const client = useThinkxxClient();
  const { data, loading, error, refetch } = usePlanDetail(planAddress);

  const [busy, setBusy] = useState<string | null>(null);
  const [amountAction, setAmountAction] = useState<AmountAction>(null);
  const [amount, setAmount] = useState('');

  const send = useCallback(
    async (instruction: TransactionInstruction, label: string) => {
      try {
        setBusy(label);
        const signature = await signAndSendTransaction(new Transaction().add(instruction));
        setAmountAction(null);
        setAmount('');
        Alert.alert('Success', `${label} confirmed.`, [
          { text: 'View on Explorer', onPress: () => void Linking.openURL(explorerTxUrl(signature)) },
          { text: 'Done', style: 'cancel' },
        ]);
        await refetch();
      } catch (e) {
        Alert.alert('Transaction failed', e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setBusy(null);
      }
    },
    [signAndSendTransaction, refetch],
  );

  if (loading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title="Plan details" onBack={onBack} />
        <Loading label="Loading plan…" />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen padded={false}>
        <ScreenHeader title="Plan details" onBack={onBack} />
        <ErrorView message={error ?? 'Plan not found.'} onRetry={refetch} />
      </Screen>
    );
  }

  const { account, guardianSet, claim, vaultLamports, address } = data;
  const planPda = address;
  const isOwner = !!publicKey && account.owner.equals(publicKey);
  const guardianCount = guardianSet?.guardians.length ?? 0;
  const quorum = guardianSet?.quorum ?? account.guardianQuorum;
  const protectedSol = formatSol(account.protectedLamports);
  const emergencySol = formatSol(account.emergencyBucketLamports);

  const confirmAndSend = (title: string, message: string, ix: TransactionInstruction, label: string, destructive = false) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: destructive ? 'destructive' : 'default', onPress: () => void send(ix, label) },
    ]);
  };

  const submitAmount = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }
    const lamports = solToLamports(value);
    if (amountAction === 'deposit') {
      void send(client.buildDepositSol(account.owner, planPda, lamports), `Deposit ${value} SOL`);
    } else if (amountAction === 'emergency') {
      Alert.alert(
        'Emergency withdrawal',
        `Withdraw ${value} SOL from the emergency bucket to your wallet? This bypasses guardians.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Withdraw',
            style: 'destructive',
            onPress: () => void send(client.buildEmergencyWithdraw(account.owner, planPda, lamports), `Emergency withdraw ${value} SOL`),
          },
        ],
      );
    }
  };

  const claimActive = account.state === PlanState.ClaimPending || account.state === PlanState.ClaimApproved;

  return (
    <Screen padded={false} keyboardAvoiding>
      <ScreenHeader title="Plan details" onBack={onBack} />
      <Screen scroll padded>
        {/* Status */}
        <Card style={styles.center}>
          <Badge label={planStateLabel(account.state)} tone={planStateTone(account.state)} />
          <Text style={styles.mode}>{planModeLabel(account.mode)} mode</Text>
        </Card>

        {/* Claim banner */}
        {claimActive && claim ? (
          <Card style={styles.claimCard}>
            <Text style={styles.claimTitle}>⚠️ Claim in progress</Text>
            <InfoRow label="Status" value={claimStateLabel(claim.state)} />
            <InfoRow label="Claimant" value={shortenAddress(claim.claimant.toBase58())} mono />
            <InfoRow label="Approvals" value={`${claim.approvals.length} / ${quorum}`} />
            <InfoRow label="Grace ends" value={formatDate(claim.graceDeadline)} />
            {isOwner && claim.state === ClaimState.Pending ? (
              <Button
                label="Cancel claim (I'm still here)"
                variant="danger"
                loading={busy?.startsWith('Cancel')}
                onPress={() =>
                  confirmAndSend(
                    'Cancel claim',
                    'This cancels the active claim and resets your heartbeat. Only works during the grace window.',
                    client.buildCancelClaim(account.owner, planPda, deriveClaimPda(planPda)[0]),
                    'Cancel claim',
                  )
                }
              />
            ) : null}
          </Card>
        ) : null}

        {/* Vault */}
        <Card style={styles.center}>
          <Text style={styles.vaultLabel}>Vault balance</Text>
          <Text style={styles.vaultValue}>{formatSol(vaultLamports)}</Text>
          <Text style={styles.vaultSub}>Protected: {protectedSol} · Emergency: {emergencySol}</Text>
        </Card>

        {/* Owner amount actions */}
        {isOwner && amountAction ? (
          <Card>
            <SectionTitle>{amountAction === 'deposit' ? 'Deposit SOL' : 'Emergency withdraw'}</SectionTitle>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount in SOL"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
              accessibilityLabel="Amount in SOL"
              autoFocus
            />
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Button label="Cancel" variant="secondary" onPress={() => { setAmountAction(null); setAmount(''); }} />
              </View>
              <View style={styles.rowItem}>
                <Button label="Confirm" loading={!!busy} onPress={submitAmount} />
              </View>
            </View>
          </Card>
        ) : null}

        {/* Owner actions */}
        {isOwner && !amountAction ? (
          <View style={styles.actions}>
            {account.state === PlanState.Draft ? (
              <Button
                label="Activate plan"
                loading={busy === 'Activate plan'}
                onPress={() => confirmAndSend('Activate plan', 'Activate this plan so the inactivity timer starts.', client.buildActivatePlan(account.owner, planPda), 'Activate plan')}
              />
            ) : null}

            {account.state === PlanState.Active ? (
              <>
                <Button
                  label="💓 Send heartbeat"
                  loading={busy === 'Heartbeat'}
                  onPress={() => void send(client.buildHeartbeat(account.owner, planPda), 'Heartbeat')}
                  accessibilityHint="Prove you are active and reset the inactivity timer"
                />
                <Button label="Deposit SOL" variant="secondary" onPress={() => setAmountAction('deposit')} />
                <Button label="Emergency withdraw" variant="secondary" onPress={() => setAmountAction('emergency')} />
                <Button
                  label="Pause plan"
                  variant="secondary"
                  loading={busy === 'Pause plan'}
                  onPress={() => confirmAndSend('Pause plan', 'Pausing stops the inactivity timer until you resume.', client.buildPausePlan(account.owner, planPda), 'Pause plan')}
                />
              </>
            ) : null}

            {account.state === PlanState.Paused ? (
              <>
                <Button
                  label="Resume plan"
                  loading={busy === 'Resume plan'}
                  onPress={() => confirmAndSend('Resume plan', 'Resume the plan and restart the inactivity timer.', client.buildResumePlan(account.owner, planPda), 'Resume plan')}
                />
                <Button label="Deposit SOL" variant="secondary" onPress={() => setAmountAction('deposit')} />
              </>
            ) : null}
          </View>
        ) : null}

        {/* Configuration */}
        <SectionTitle>Configuration</SectionTitle>
        <Card>
          <InfoRow label="Beneficiary" value={shortenAddress(account.beneficiary.toBase58())} mono />
          <InfoRow
            label="Backup"
            value={account.backupBeneficiary ? shortenAddress(account.backupBeneficiary.toBase58()) : 'None'}
            mono
          />
          <InfoRow label="Inactivity window" value={formatDuration(account.inactivityDuration)} />
          <InfoRow label="Grace period" value={formatDuration(account.gracePeriod)} />
          <InfoRow label="Last heartbeat" value={formatDate(account.lastHeartbeat)} />
          <InfoRow label="Created" value={formatDate(account.createdAt)} />
          <InfoRow label="Plan address" value={shortenAddress(planPda.toBase58())} mono />
        </Card>

        {/* Guardians */}
        <TouchableOpacity onPress={onGuardians} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Manage guardians">
          <Card>
            <View style={styles.guardianRow}>
              <View>
                <Text style={styles.guardianTitle}>🛡 Guardians</Text>
                <Text style={styles.guardianSub}>{guardianCount} guardians · quorum {quorum}</Text>
              </View>
              <Text style={styles.chevron} importantForAccessibility="no">›</Text>
            </View>
          </Card>
        </TouchableOpacity>
      </Screen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  mode: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  vaultLabel: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  vaultValue: { color: theme.colors.text, fontSize: theme.fontSize.hero, fontWeight: theme.fontWeight.bold },
  vaultSub: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  claimCard: { borderColor: `${theme.colors.danger}55` },
  claimTitle: { color: theme.colors.dangerLight, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
  actions: { gap: theme.spacing.md },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
  },
  row: { flexDirection: 'row', gap: theme.spacing.md },
  rowItem: { flex: 1 },
  guardianRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guardianTitle: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold },
  guardianSub: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  chevron: { color: theme.colors.textMuted, fontSize: 28 },
});
