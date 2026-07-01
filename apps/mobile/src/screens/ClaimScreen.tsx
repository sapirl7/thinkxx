import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Linking } from 'react-native';
import { Transaction, type TransactionInstruction } from '@solana/web3.js';
import { deriveGuardianSetPda, deriveClaimPda, PlanState, ClaimState } from '@thinkxx/sdk';
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
  EmptyState,
  planStateLabel,
  planStateTone,
  claimStateLabel,
} from '../components';
import { formatSol, formatDuration, formatDate, shortenAddress, relativeFromNow } from '../lib/format';
import { isValidPublicKey, explorerTxUrl } from '../lib/solana';

interface ClaimScreenProps {
  initialPlanAddress: string | null;
  onBack: () => void;
}

/**
 * Claim access — for a beneficiary or guardian acting on someone else's plan.
 * Look up a plan by address, then start / approve / veto / finalize a claim
 * according to the connected wallet's role and the claim state.
 */
export default function ClaimScreen({ initialPlanAddress, onBack }: ClaimScreenProps): React.JSX.Element {
  const { publicKey, signAndSendTransaction } = useWallet();
  const client = useThinkxxClient();
  const [input, setInput] = useState(initialPlanAddress ?? '');
  const [lookup, setLookup] = useState<string | null>(initialPlanAddress);
  const { data, loading, error, refetch } = usePlanDetail(lookup);
  const [busy, setBusy] = useState(false);

  const send = useCallback(
    async (instruction: TransactionInstruction, successMessage: string) => {
      try {
        setBusy(true);
        const signature = await signAndSendTransaction(new Transaction().add(instruction));
        await refetch();
        Alert.alert('Done', successMessage, [
          { text: 'View on Explorer', onPress: () => void Linking.openURL(explorerTxUrl(signature)) },
          { text: 'OK', style: 'cancel' },
        ]);
      } catch (e) {
        Alert.alert('Transaction failed', e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setBusy(false);
      }
    },
    [signAndSendTransaction, refetch],
  );

  const onLookup = () => {
    if (!isValidPublicKey(input)) {
      Alert.alert('Invalid address', 'Enter a valid plan address.');
      return;
    }
    setLookup(input.trim());
  };

  const nowSec = Date.now() / 1000;

  return (
    <Screen padded={false} keyboardAvoiding>
      <ScreenHeader title="Claim access" onBack={onBack} />
      <Screen scroll padded>
        <Card>
          <Text style={styles.help}>
            Enter the address of a plan you are a beneficiary or guardian of to act on a claim.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Plan address (base58)"
            placeholderTextColor={theme.colors.textMuted}
            value={input}
            onChangeText={setInput}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Plan address"
          />
          <Button label="Load plan" onPress={onLookup} />
        </Card>

        {!lookup ? null : loading ? (
          <Loading label="Loading plan…" />
        ) : error || !data ? (
          <ErrorView message={error ?? 'Plan not found.'} onRetry={refetch} />
        ) : (
          <ClaimBody
            data={data}
            publicKey={publicKey}
            nowSec={nowSec}
            busy={busy}
            onSend={send}
            client={client}
          />
        )}
      </Screen>
    </Screen>
  );
}

function ClaimBody({
  data,
  publicKey,
  nowSec,
  busy,
  onSend,
  client,
}: {
  data: NonNullable<ReturnType<typeof usePlanDetail>['data']>;
  publicKey: ReturnType<typeof useWallet>['publicKey'];
  nowSec: number;
  busy: boolean;
  onSend: (ix: TransactionInstruction, msg: string) => void;
  client: ReturnType<typeof useThinkxxClient>;
}): React.JSX.Element {
  const { account, guardianSet, claim, vaultLamports, address: planPda } = data;
  const me = publicKey;

  if (!me) {
    return <EmptyState icon="🔌" title="Connect your wallet" description="Connect a wallet to act on this plan." />;
  }

  const [guardianSetPda] = deriveGuardianSetPda(planPda);
  const [claimPda] = deriveClaimPda(planPda);

  const isBeneficiary = account.beneficiary.equals(me) || (!!account.backupBeneficiary && account.backupBeneficiary.equals(me));
  const isGuardian = !!guardianSet?.guardians.some(g => g.equals(me));
  const isClaimant = !!claim && claim.claimant.equals(me);

  const inactivityDeadline = Number(account.lastHeartbeat) + Number(account.inactivityDuration);
  const inactivityElapsed = nowSec >= inactivityDeadline;
  const graceElapsed = !!claim && nowSec >= Number(claim.graceDeadline);
  const alreadyApproved = !!claim && claim.approvals.some(a => a.equals(me));
  const noGuardians = (guardianSet?.guardians.length ?? 0) === 0 || account.guardianQuorum === 0;

  const canStart = isBeneficiary && account.state === PlanState.Active && !claim && inactivityElapsed;
  const claimPending = !!claim && claim.state === ClaimState.Pending;
  const claimApproved = !!claim && claim.state === ClaimState.Approved;
  const canApprove = isGuardian && claimPending && !alreadyApproved;
  const canVeto = isGuardian && claimPending;
  const canFinalize = isClaimant && ((claimApproved && graceElapsed) || (claimPending && graceElapsed && noGuardians));

  return (
    <>
      <Card style={styles.center}>
        <Badge label={planStateLabel(account.state)} tone={planStateTone(account.state)} />
        <Text style={styles.vault}>{formatSol(vaultLamports)}</Text>
        <Text style={styles.role}>
          You are {isBeneficiary ? 'the beneficiary' : isGuardian ? 'a guardian' : 'not a participant'} of this plan
        </Text>
      </Card>

      <SectionTitle>Plan</SectionTitle>
      <Card>
        <InfoRow label="Owner" value={shortenAddress(account.owner.toBase58())} mono />
        <InfoRow label="Beneficiary" value={shortenAddress(account.beneficiary.toBase58())} mono />
        <InfoRow label="Inactivity window" value={formatDuration(account.inactivityDuration)} />
        <InfoRow label="Grace period" value={formatDuration(account.gracePeriod)} />
        <InfoRow
          label="Eligible to claim"
          value={inactivityElapsed ? 'Yes' : relativeFromNow(inactivityDeadline)}
        />
      </Card>

      {claim ? (
        <>
          <SectionTitle>Active claim</SectionTitle>
          <Card>
            <InfoRow label="Status" value={claimStateLabel(claim.state)} />
            <InfoRow label="Claimant" value={shortenAddress(claim.claimant.toBase58())} mono />
            <InfoRow label="Approvals" value={`${claim.approvals.length} / ${guardianSet?.quorum ?? account.guardianQuorum}`} />
            <InfoRow label="Grace ends" value={`${formatDate(claim.graceDeadline)} (${relativeFromNow(claim.graceDeadline, nowSec * 1000)})`} />
          </Card>
        </>
      ) : null}

      <SectionTitle>Actions</SectionTitle>
      <View style={styles.actions}>
        {canStart ? (
          <Button
            label="Start claim"
            loading={busy}
            onPress={() =>
              Alert.alert('Start claim', 'Begin a claim on this plan? The owner can cancel during the grace period.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Start', onPress: () => onSend(client.buildStartClaim(me, planPda), 'Claim started.') },
              ])
            }
          />
        ) : null}

        {canApprove ? (
          <Button
            label="Approve claim"
            loading={busy}
            onPress={() =>
              onSend(client.buildApproveClaim(me, planPda, guardianSetPda, claimPda), 'Claim approved.')
            }
          />
        ) : null}

        {canVeto ? (
          <Button
            label="Veto claim"
            variant="danger"
            loading={busy}
            onPress={() =>
              Alert.alert('Veto claim', 'A veto immediately and permanently cancels this claim. Continue?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Veto', style: 'destructive', onPress: () => onSend(client.buildVetoClaim(me, planPda, guardianSetPda, claimPda), 'Claim vetoed.') },
              ])
            }
          />
        ) : null}

        {canFinalize ? (
          <Button
            label="Finalize & withdraw"
            loading={busy}
            onPress={() =>
              Alert.alert('Finalize claim', `Transfer ${formatSol(vaultLamports)} from the vault to your wallet?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Finalize', onPress: () => onSend(client.buildFinalizeClaim(me, planPda, guardianSetPda, claimPda), 'Claim finalized.') },
              ])
            }
          />
        ) : null}

        {!canStart && !canApprove && !canVeto && !canFinalize ? (
          <Card>
            <Text style={styles.help}>
              {!isBeneficiary && !isGuardian
                ? 'This wallet is not the beneficiary or a guardian of this plan.'
                : claim
                  ? 'No action available for you right now. Check back after the grace period.'
                  : isBeneficiary && !inactivityElapsed
                    ? `You can start a claim ${relativeFromNow(inactivityDeadline, nowSec * 1000)}.`
                    : 'No action available for you right now.'}
            </Text>
          </Card>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  help: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, lineHeight: 20 },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontFamily: 'monospace',
  },
  center: { alignItems: 'center' },
  vault: { color: theme.colors.text, fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold },
  role: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, textAlign: 'center' },
  actions: { gap: theme.spacing.md },
});
