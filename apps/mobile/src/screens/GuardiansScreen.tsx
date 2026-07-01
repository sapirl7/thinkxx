import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { PublicKey, Transaction, type TransactionInstruction } from '@solana/web3.js';
import { deriveGuardianSetPda } from '@thinkxx/sdk';
import { useWallet } from '../providers/WalletProvider';
import { useThinkxxClient, usePlanDetail } from '../hooks/useThinkxx';
import { theme } from '../theme';
import {
  Screen,
  ScreenHeader,
  Card,
  Button,
  InfoRow,
  Loading,
  ErrorView,
  EmptyState,
} from '../components';
import { shortenAddress } from '../lib/format';
import { isValidPublicKey } from '../lib/solana';

interface GuardiansScreenProps {
  planAddress: string | null;
  onBack: () => void;
}

const MAX_GUARDIANS = 5;

export default function GuardiansScreen({ planAddress, onBack }: GuardiansScreenProps): React.JSX.Element {
  const { publicKey, signAndSendTransaction } = useWallet();
  const client = useThinkxxClient();
  const { data, loading, error, refetch } = usePlanDetail(planAddress);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const send = useCallback(
    async (instruction: TransactionInstruction, successMessage: string) => {
      try {
        setBusy(true);
        await signAndSendTransaction(new Transaction().add(instruction));
        setInput('');
        await refetch();
        Alert.alert('Done', successMessage);
      } catch (e) {
        Alert.alert('Transaction failed', e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setBusy(false);
      }
    },
    [signAndSendTransaction, refetch],
  );

  if (loading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title="Guardians" onBack={onBack} />
        <Loading label="Loading guardians…" />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen padded={false}>
        <ScreenHeader title="Guardians" onBack={onBack} />
        <ErrorView message={error ?? 'Plan not found.'} onRetry={refetch} />
      </Screen>
    );
  }

  const { account, guardianSet, address: planPda } = data;
  const guardians = guardianSet?.guardians ?? [];
  const quorum = guardianSet?.quorum ?? account.guardianQuorum;
  const isOwner = !!publicKey && account.owner.equals(publicKey);
  const [guardianSetPda] = deriveGuardianSetPda(planPda);

  const onAdd = () => {
    const trimmed = input.trim();
    if (!isValidPublicKey(trimmed)) {
      Alert.alert('Invalid address', 'Enter a valid base58 public key.');
      return;
    }
    const key = new PublicKey(trimmed);
    if (key.equals(account.owner)) {
      Alert.alert('Not allowed', 'The owner cannot be their own guardian.');
      return;
    }
    if (guardians.some(g => g.equals(key))) {
      Alert.alert('Duplicate', 'This guardian is already in the set.');
      return;
    }
    if (guardians.length >= MAX_GUARDIANS) {
      Alert.alert('Limit reached', `A plan can have at most ${MAX_GUARDIANS} guardians.`);
      return;
    }
    Alert.alert('Add guardian', `Add ${shortenAddress(trimmed)} as a guardian?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Add', onPress: () => void send(client.buildAddGuardian(account.owner, planPda, guardianSetPda, key), 'Guardian added.') },
    ]);
  };

  const onRemove = (key: PublicKey) => {
    Alert.alert('Remove guardian', `Remove ${shortenAddress(key.toBase58())} from the guardian set?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void send(client.buildRemoveGuardian(account.owner, planPda, guardianSetPda, key), 'Guardian removed.'),
      },
    ]);
  };

  return (
    <Screen padded={false} keyboardAvoiding>
      <ScreenHeader title="Guardians" onBack={onBack} />
      <Screen scroll padded>
        <Card>
          <Text style={styles.infoText}>
            🛡 Guardians can approve or veto a beneficiary&apos;s claim. A single veto cancels the claim immediately.
          </Text>
          <InfoRow label="Quorum" value={`${quorum} of ${guardians.length} must approve`} />
          <Text style={styles.note}>Quorum is fixed when the plan is created.</Text>
        </Card>

        {isOwner ? (
          <Card>
            <TextInput
              style={styles.input}
              placeholder="Guardian public key"
              placeholderTextColor={theme.colors.textMuted}
              value={input}
              onChangeText={setInput}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Guardian public key"
            />
            <Button label="Add guardian" loading={busy} onPress={onAdd} />
          </Card>
        ) : null}

        {guardians.length === 0 ? (
          <EmptyState
            icon="👤"
            title="No guardians yet"
            description="Without guardians, a claim auto-finalizes after the grace period."
          />
        ) : (
          guardians.map(g => (
            <Card key={g.toBase58()}>
              <View style={styles.guardianRow}>
                <Text style={styles.guardianKey}>{shortenAddress(g.toBase58())}</Text>
                {isOwner ? (
                  <TouchableOpacity
                    onPress={() => onRemove(g)}
                    style={styles.removeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove guardian ${shortenAddress(g.toBase58())}`}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Card>
          ))
        )}

        <Text style={styles.footer}>{guardians.length}/{MAX_GUARDIANS} guardians</Text>
      </Screen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, lineHeight: 20 },
  note: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  guardianRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guardianKey: { color: theme.colors.text, fontSize: theme.fontSize.md, fontFamily: 'monospace' },
  removeBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: `${theme.colors.danger}22`,
  },
  removeText: { color: theme.colors.dangerLight, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold },
  footer: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, textAlign: 'center' },
});
