import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';

interface Guardian {
  pubkey: string;
  addedAt: Date;
}

interface GuardiansScreenProps {
  onBack: () => void;
}

export default function GuardiansScreen({ onBack }: GuardiansScreenProps): React.JSX.Element {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [newGuardianKey, setNewGuardianKey] = useState('');
  const [quorum, setQuorum] = useState(1);

  const handleAddGuardian = (): void => {
    if (!newGuardianKey.trim()) {
      Alert.alert('Error', 'Enter a guardian public key');
      return;
    }
    if (guardians.length >= 5) {
      Alert.alert('Limit Reached', 'Maximum 5 guardians per plan');
      return;
    }
    if (guardians.some(g => g.pubkey === newGuardianKey.trim())) {
      Alert.alert('Duplicate', 'This guardian is already added');
      return;
    }

    setGuardians(prev => [...prev, {
      pubkey: newGuardianKey.trim(),
      addedAt: new Date(),
    }]);
    setNewGuardianKey('');
  };

  const handleRemoveGuardian = (pubkey: string): void => {
    Alert.alert(
      'Remove Guardian',
      `Remove ${pubkey.slice(0, 8)}...?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setGuardians(prev => prev.filter(g => g.pubkey !== pubkey));
            if (quorum > guardians.length - 1) {
              setQuorum(Math.max(1, guardians.length - 1));
            }
          },
        },
      ],
    );
  };

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

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>🛡️</Text>
        <Text style={styles.infoText}>
          Guardians can approve or veto beneficiary claims.{'\n'}
          A single veto cancels the entire claim immediately.
        </Text>
      </View>

      {/* Quorum Setting */}
      <View style={styles.quorumCard}>
        <Text style={styles.quorumLabel}>Approval Quorum</Text>
        <View style={styles.quorumControls}>
          <TouchableOpacity
            style={styles.quorumBtn}
            onPress={() => setQuorum(Math.max(1, quorum - 1))}
          >
            <Text style={styles.quorumBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.quorumValue}>{quorum}</Text>
          <TouchableOpacity
            style={styles.quorumBtn}
            onPress={() => setQuorum(Math.min(guardians.length || 1, quorum + 1))}
          >
            <Text style={styles.quorumBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.quorumHint}>
          {quorum} of {guardians.length || 0} guardians must approve a claim
        </Text>
      </View>

      {/* Add Guardian */}
      <View style={styles.addSection}>
        <TextInput
          style={styles.input}
          placeholder="Guardian public key..."
          placeholderTextColor={COLORS.textMuted}
          value={newGuardianKey}
          onChangeText={setNewGuardianKey}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddGuardian}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Guardian List */}
      <FlatList
        data={guardians}
        keyExtractor={item => item.pubkey}
        renderItem={({ item }) => (
          <View style={styles.guardianRow}>
            <View style={styles.guardianInfo}>
              <Text style={styles.guardianKey}>
                {item.pubkey.slice(0, 4)}...{item.pubkey.slice(-4)}
              </Text>
              <Text style={styles.guardianDate}>
                Added {item.addedAt.toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemoveGuardian(item.pubkey)}
            >
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>No guardians added yet</Text>
            <Text style={styles.emptyHint}>
              Without guardians, claims auto-finalize after grace period
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Guardian Count */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {guardians.length}/5 guardians • Quorum: {quorum}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 20, paddingBottom: SPACING.md,
  },
  backBtn: { width: 60 },
  backText: { color: COLORS.accent, fontSize: FONT_SIZES.md },
  title: { color: COLORS.textPrimary, fontSize: FONT_SIZES.xl, fontWeight: '700' },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.lg, marginTop: SPACING.sm, padding: SPACING.md,
  },
  infoIcon: { fontSize: 24, marginRight: SPACING.sm },
  infoText: { flex: 1, color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, lineHeight: 20 },
  quorumCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md, padding: SPACING.md,
    alignItems: 'center',
  },
  quorumLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, marginBottom: SPACING.sm },
  quorumControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  quorumBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.accent + '30', alignItems: 'center', justifyContent: 'center',
  },
  quorumBtnText: { color: COLORS.accent, fontSize: FONT_SIZES.xl, fontWeight: '700' },
  quorumValue: { color: COLORS.textPrimary, fontSize: 32, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  quorumHint: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: SPACING.sm },
  addSection: {
    flexDirection: 'row', marginHorizontal: SPACING.lg,
    marginTop: SPACING.md, gap: SPACING.sm,
  },
  input: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    color: COLORS.textPrimary, fontSize: FONT_SIZES.sm,
  },
  addBtn: {
    backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg, justifyContent: 'center',
  },
  addBtnText: { color: '#000', fontWeight: '700', fontSize: FONT_SIZES.md },
  listContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  guardianRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  guardianInfo: { flex: 1 },
  guardianKey: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontFamily: 'monospace' },
  guardianDate: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.danger + '20', alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { color: COLORS.danger, fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.lg, fontWeight: '600' },
  emptyHint: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, textAlign: 'center', marginTop: SPACING.sm, paddingHorizontal: SPACING.xl },
  footer: {
    paddingVertical: SPACING.md, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: COLORS.surface,
  },
  footerText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
});
