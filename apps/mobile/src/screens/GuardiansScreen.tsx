import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { PublicKey, Transaction } from '@solana/web3.js';
import { ThinkxxClient, fetchGuardianSet } from '@thinkxx/sdk';
import type { ParsedGuardianSet } from '@thinkxx/sdk';
import { deriveGuardianSetPda } from '@thinkxx/sdk';
import { useWallet } from '../providers/WalletProvider';
import { theme } from '../theme';

const MAX_GUARDIANS = 5;

interface GuardiansScreenProps {
  planAddress: string;
  onBack: () => void;
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
  }, [connection, planAddress]);

  useEffect(() => {
    setLoading(true);
    fetchData();
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

    if (guardianSet?.guardians.some((g: PublicKey) => g.equals(guardianPubkey))) {
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
  }, [publicKey, newGuardian, guardianSet, connection, signAndSendTransaction, fetchData]);

  const handleRemoveGuardian = useCallback(async (guardian: PublicKey) => {
    if (!publicKey) return;

    Alert.alert('Remove Guardian', `Remove ${guardian.toBase58().slice(0, 8)}...?`, [
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
  }, [publicKey, connection, signAndSendTransaction, fetchData]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Guardians</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quorum Info */}
        {guardianSet && (
          <View style={styles.quorumCard}>
            <Text style={styles.quorumLabel}>Quorum</Text>
            <Text style={styles.quorumValue}>
              {guardianSet.quorum} of {guardianSet.guardians.length}
            </Text>
            <Text style={styles.quorumDescription}>
              {guardianSet.quorum} guardian{guardianSet.quorum !== 1 ? 's' : ''} must approve claims
            </Text>
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading guardians...</Text>
          </View>
        )}

        {/* Guardian List */}
        {!loading && guardianSet && (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>
              GUARDIANS ({guardianSet.guardians.length}/{MAX_GUARDIANS})
            </Text>

            {guardianSet.guardians.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🛡️</Text>
                <Text style={styles.emptyText}>No guardians added yet</Text>
              </View>
            ) : (
              guardianSet.guardians.map((guardian: PublicKey, idx: number) => (
                <View key={guardian.toBase58()} style={styles.guardianRow}>
                  <View style={styles.guardianInfo}>
                    <View style={styles.guardianAvatar}>
                      <Text style={styles.avatarText}>{String.fromCodePoint(0x1F6E1)}</Text>
                    </View>
                    <View>
                      <Text style={styles.guardianLabel}>Guardian {idx + 1}</Text>
                      <Text style={styles.guardianAddress}>{guardian.toBase58()}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemoveGuardian(guardian)}
                    disabled={acting}
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* Add Guardian */}
        {!loading && (guardianSet?.guardians.length ?? 0) < MAX_GUARDIANS && (
          <View style={styles.addSection}>
            {showAdd ? (
              <View style={styles.addForm}>
                <TextInput
                  style={styles.input}
                  value={newGuardian}
                  onChangeText={setNewGuardian}
                  placeholder="Paste guardian wallet address..."
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.addActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => { setShowAdd(false); setNewGuardian(''); }}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmBtn, acting && styles.confirmBtnDisabled]}
                    onPress={handleAddGuardian}
                    disabled={acting || !newGuardian.trim()}
                  >
                    {acting ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={styles.confirmBtnText}>Add Guardian</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
                <Text style={styles.addBtnText}>+ Add Guardian</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  content: { flex: 1, paddingHorizontal: theme.spacing.lg },
  quorumCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg, alignItems: 'center', marginBottom: theme.spacing.md,
  },
  quorumLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  quorumValue: {
    color: theme.colors.text, fontSize: 32, fontWeight: theme.fontWeight.bold,
    marginVertical: theme.spacing.xs,
  },
  quorumDescription: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  loadingState: {
    alignItems: 'center', paddingVertical: theme.spacing.xl, gap: theme.spacing.md,
  },
  loadingText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  listSection: { gap: theme.spacing.sm },
  sectionTitle: {
    color: theme.colors.textMuted, fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: theme.spacing.xs,
  },
  emptyState: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl, alignItems: 'center', borderWidth: 1,
    borderColor: theme.colors.border, borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 36, marginBottom: theme.spacing.sm },
  emptyText: { color: theme.colors.textMuted, fontSize: theme.fontSize.md },
  guardianRow: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  guardianInfo: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 },
  guardianAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16 },
  guardianLabel: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium },
  guardianAddress: {
    color: theme.colors.textMuted, fontSize: theme.fontSize.xs, fontFamily: 'monospace',
    maxWidth: 200,
  },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.danger + '15', alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { color: theme.colors.danger, fontSize: 14 },
  addSection: { marginTop: theme.spacing.md },
  addForm: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md, gap: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 4,
    color: theme.colors.text, fontSize: theme.fontSize.sm, fontFamily: 'monospace',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  addActions: { flexDirection: 'row', gap: theme.spacing.sm },
  cancelBtn: {
    flex: 1, borderRadius: theme.borderRadius.md, paddingVertical: theme.spacing.sm + 2,
    alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border,
  },
  cancelBtnText: { color: theme.colors.textSecondary, fontWeight: theme.fontWeight.semibold },
  confirmBtn: {
    flex: 1, backgroundColor: theme.colors.accent, borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm + 2, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#000', fontWeight: theme.fontWeight.bold },
  addBtn: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.primary + '40', borderStyle: 'dashed',
  },
  addBtnText: { color: theme.colors.primary, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold },
});
