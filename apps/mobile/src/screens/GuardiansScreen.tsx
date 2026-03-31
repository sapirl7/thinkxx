import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PublicKey, Transaction } from '@solana/web3.js';
import { deriveGuardianSetPda, fetchGuardianSet, ThinkxxClient } from '@thinkxx/sdk';
import type { ParsedGuardianSet } from '@thinkxx/sdk';
import { useWallet } from '../providers/WalletProvider';
import ScreenShell from '../components/ScreenShell';
import {
  AddressBlock,
  Panel,
  PrimaryButton,
  SectionHeading,
  SecondaryButton,
  StatusPill,
} from '../components/Primitives';
import { theme } from '../theme';

const MAX_GUARDIANS = 5;

interface GuardiansScreenProps {
  planAddress: string;
  onBack: () => void;
}

function GuardianCard({
  guardian,
  index,
  guardianCount,
  quorum,
  onRemove,
  disabled,
}: {
  guardian: PublicKey;
  index: number;
  guardianCount: number;
  quorum: number;
  onRemove: () => void;
  disabled: boolean;
}): React.JSX.Element {
  const remainingGuardians = Math.max(guardianCount - 1, 0);
  const breaksQuorum = remainingGuardians < quorum;

  return (
    <Panel style={styles.guardianCard}>
      <View style={styles.guardianHeader}>
        <View style={styles.guardianIdentity}>
          <View style={styles.guardianIndex}>
            <Text style={styles.guardianIndexText}>{index + 1}</Text>
          </View>
          <Text style={styles.guardianLabel}>Guardian {index + 1}</Text>
        </View>
        <StatusPill
          label={breaksQuorum ? 'Quorum risk' : 'Quorum intact'}
          tone={breaksQuorum ? 'danger' : 'neutral'}
        />
      </View>
      <AddressBlock label="Guardian wallet" address={guardian.toBase58()} />
      <View style={styles.guardianImpact}>
        <Text style={styles.guardianImpactLabel}>After removal</Text>
        <Text style={styles.guardianImpactText}>
          {remainingGuardians} guardian{remainingGuardians !== 1 ? 's' : ''} remaining • quorum {quorum}
        </Text>
        <Text style={[styles.guardianImpactHint, breaksQuorum && styles.guardianImpactHintDanger]}>
          {breaksQuorum
            ? 'This would leave the plan without enough guardians to meet the current approval quorum.'
            : 'Guardian quorum remains satisfiable after removal.'}
        </Text>
      </View>
      <View style={styles.guardianActions}>
        <Text style={styles.guardianActionHint}>Only remove a guardian if another trusted reviewer already covers this role.</Text>
        <Pressable
          onPress={onRemove}
          disabled={disabled}
          style={({ pressed }) => [
            styles.guardianRemoveAction,
            disabled && styles.guardianRemoveActionDisabled,
            pressed && !disabled ? styles.guardianRemoveActionPressed : null,
          ]}
        >
          <Text style={styles.guardianRemoveText}>Remove guardian</Text>
        </Pressable>
      </View>
    </Panel>
  );
}

export default function GuardiansScreen({
  planAddress,
  onBack,
}: GuardiansScreenProps): React.JSX.Element {
  const { connection, publicKey, signAndSendTransaction } = useWallet();
  const [guardianSet, setGuardianSet] = useState<ParsedGuardianSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [newGuardian, setNewGuardian] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const planPda = new PublicKey(planAddress);
  const client = new ThinkxxClient(connection);

  const fetchData = useCallback(async () => {
    try {
      const [gsPda] = deriveGuardianSetPda(planPda);
      const gs = await fetchGuardianSet(connection, gsPda);
      setGuardianSet(gs);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to fetch guardians');
    } finally {
      setLoading(false);
    }
  }, [connection, planPda]);

  useEffect(() => {
    setLoading(true);
    void fetchData();
  }, [fetchData]);

  const handleAddGuardian = useCallback(async () => {
    if (!publicKey || !newGuardian.trim()) return;

    let guardianPubkey: PublicKey;
    try {
      guardianPubkey = new PublicKey(newGuardian.trim());
    } catch {
      Alert.alert('Invalid Address', 'Please enter a valid Solana address.');
      return;
    }

    if (guardianSet?.guardians.some((guardian: PublicKey) => guardian.equals(guardianPubkey))) {
      Alert.alert('Duplicate', 'This guardian is already added.');
      return;
    }

    if ((guardianSet?.guardians.length ?? 0) >= MAX_GUARDIANS) {
      Alert.alert('Max Reached', `Maximum ${MAX_GUARDIANS} guardians allowed.`);
      return;
    }

    setActing(true);
    try {
      const [gsPda] = deriveGuardianSetPda(planPda);
      const ix = client.buildAddGuardian(publicKey, planPda, gsPda, guardianPubkey);
      await signAndSendTransaction(new Transaction().add(ix));
      Alert.alert('Added', 'Guardian added successfully.');
      setNewGuardian('');
      setShowAdd(false);
      await fetchData();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add guardian');
    } finally {
      setActing(false);
    }
  }, [client, fetchData, guardianSet, newGuardian, planPda, publicKey, signAndSendTransaction]);

  const handleRemoveGuardian = useCallback(
    async (guardian: PublicKey, guardianCount: number, quorum: number) => {
      if (!publicKey) return;
      const remainingGuardians = Math.max(guardianCount - 1, 0);
      const breaksQuorum = remainingGuardians < quorum;

      Alert.alert('Remove Guardian', `${guardian.toBase58().slice(0, 8)}… will be removed from this plan.\n\nAfter removal: ${remainingGuardians} guardian${remainingGuardians !== 1 ? 's' : ''} remaining • quorum ${quorum}${breaksQuorum ? '\n\nWarning: this breaks the current quorum.' : ''}`, [
        { text: 'Cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActing(true);
            try {
              const [gsPda] = deriveGuardianSetPda(planPda);
              const ix = client.buildRemoveGuardian(publicKey, planPda, gsPda, guardian);
              await signAndSendTransaction(new Transaction().add(ix));
              Alert.alert('Removed', 'Guardian removed.');
              await fetchData();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove guardian');
            } finally {
              setActing(false);
            }
          },
        },
      ]);
    },
    [client, fetchData, planPda, publicKey, signAndSendTransaction],
  );

  return (
    <ScreenShell
      title="Guardians"
      subtitle="Review quorum and maintain the trusted veto/approval set for this plan."
      eyebrow="Owner flow / guardians"
      onBack={onBack}
      scroll
      contentContainerStyle={styles.content}
    >
      <AddressBlock
        label="Selected plan"
        address={planAddress}
        helper="Guardians are attached to this plan account only."
      />

      {guardianSet ? (
        <Panel tone="primary">
          <SectionHeading label="Quorum state" />
          <StatusPill
            label={`${guardianSet.quorum} of ${guardianSet.guardians.length || 0} required`}
            tone="primary"
          />
          <Text style={styles.quorumText}>
            Claims need {guardianSet.quorum} guardian{guardianSet.quorum !== 1 ? 's' : ''} to approve before release.
          </Text>
        </Panel>
      ) : null}

      {loading ? (
        <Panel>
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading guardians...</Text>
          </View>
        </Panel>
      ) : guardianSet && guardianSet.guardians.length > 0 ? (
        <View style={styles.guardianStack}>
          <SectionHeading label={`GUARDIANS (${guardianSet.guardians.length}/${MAX_GUARDIANS})`} />
          {guardianSet.guardians.map((guardian, index) => (
            <GuardianCard
              key={guardian.toBase58()}
              guardian={guardian}
              index={index}
              guardianCount={guardianSet.guardians.length}
              quorum={guardianSet.quorum}
              onRemove={() => void handleRemoveGuardian(guardian, guardianSet.guardians.length, guardianSet.quorum)}
              disabled={acting}
            />
          ))}
        </View>
      ) : (
        <Panel tone="warning">
          <SectionHeading label="Guardian registry" />
          <Text style={styles.emptyTitle}>No guardians added yet</Text>
          <Text style={styles.emptyBody}>
            Guardian review is optional, but it adds a human checkpoint before funds can move.
          </Text>
        </Panel>
      )}

      {(guardianSet?.guardians.length ?? 0) < MAX_GUARDIANS ? (
        <Panel>
          <SectionHeading label="Add guardian" />
          {showAdd ? (
            <>
              <Text style={styles.formHelp}>
                Enter the wallet address of a person who can approve or veto beneficiary claims for this plan.
              </Text>
              <TextInput
                style={styles.input}
                value={newGuardian}
                onChangeText={setNewGuardian}
                placeholder="Paste guardian wallet address..."
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.formActions}>
                <SecondaryButton
                  label="Cancel"
                  onPress={() => {
                    setShowAdd(false);
                    setNewGuardian('');
                  }}
                />
                <PrimaryButton
                  label="Add Guardian"
                  onPress={() => void handleAddGuardian()}
                  disabled={acting || !newGuardian.trim()}
                  loading={acting}
                  style={styles.inlineButton}
                />
              </View>
            </>
          ) : (
            <PrimaryButton label="+ Add Guardian" onPress={() => setShowAdd(true)} />
          )}
        </Panel>
      ) : (
        <Panel tone="warning">
          <SectionHeading label="Guardian capacity" />
          <Text style={styles.emptyBody}>Maximum guardian count reached. Remove an existing guardian before adding a new one.</Text>
        </Panel>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
  },
  quorumText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  loadingState: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  guardianStack: {
    gap: theme.spacing.md,
  },
  guardianCard: {
    gap: theme.spacing.md,
  },
  guardianHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  guardianIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  guardianIndex: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  guardianIndexText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  guardianLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  guardianImpact: {
    gap: theme.spacing.xs,
  },
  guardianImpactLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  guardianImpactText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  guardianImpactHint: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  guardianImpactHintDanger: {
    color: theme.colors.dangerLight,
  },
  guardianActions: {
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderStrong,
    gap: theme.spacing.sm,
  },
  guardianActionHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
  },
  guardianRemoveAction: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: 0,
  },
  guardianRemoveActionPressed: {
    opacity: 0.72,
  },
  guardianRemoveActionDisabled: {
    opacity: 0.4,
  },
  guardianRemoveText: {
    color: theme.colors.dangerLight,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    letterSpacing: 0.2,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  emptyBody: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  formHelp: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  input: {
    minHeight: 56,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontFamily: 'monospace',
  },
  formActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  inlineButton: {
    flex: 1,
  },
});
