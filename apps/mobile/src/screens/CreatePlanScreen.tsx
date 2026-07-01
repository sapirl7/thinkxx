import React, { useCallback, useState } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { PlanMode, ThinkxxClient } from '@thinkxx/sdk';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, Linking } from 'react-native';
import { useWallet } from '../providers/WalletProvider';
import { theme } from '../theme';
import { Screen, ScreenHeader, Card, Button, SectionTitle, InfoRow } from '../components';
import { formatDuration } from '../lib/format';
import { isValidPublicKey, explorerTxUrl } from '../lib/solana';

type PlanModeOption = 'medical' | 'legal_risk' | 'legacy';

interface PlanModeInfo {
  key: PlanModeOption;
  label: string;
  icon: string;
  description: string;
  defaultInactivity: string;
  defaultGrace: string;
}

const PLAN_MODES: PlanModeInfo[] = [
  { key: 'medical', label: 'Medical', icon: '🏥', description: 'Pre-surgery or high-risk medical procedure', defaultInactivity: '30', defaultGrace: '7' },
  { key: 'legal_risk', label: 'Legal Risk', icon: '⚖️', description: 'Travel to a high-risk jurisdiction', defaultInactivity: '90', defaultGrace: '14' },
  { key: 'legacy', label: 'Legacy', icon: '🏛', description: 'Long-term inheritance planning', defaultInactivity: '365', defaultGrace: '30' },
];

const MODE_TO_PLAN_MODE: Record<PlanModeOption, PlanMode> = {
  medical: PlanMode.Medical,
  legal_risk: PlanMode.LegalRisk,
  legacy: PlanMode.Legacy,
};

const SECONDS_PER_DAY = 86_400;
const MIN_INACTIVITY_DAYS = 1;
const MAX_INACTIVITY_DAYS = 1_825;
const MIN_GRACE_DAYS = 1 / 24;
const MAX_GRACE_DAYS = 90;
const MAX_QUORUM = 5;

interface CreatePlanScreenProps {
  onBack: () => void;
  onCreated: (planAddress: string) => void;
}

export default function CreatePlanScreen({ onBack, onCreated }: CreatePlanScreenProps): React.JSX.Element {
  const { connection, publicKey, signAndSendTransaction } = useWallet();
  const [selectedMode, setSelectedMode] = useState<PlanModeOption | null>(null);
  const [beneficiary, setBeneficiary] = useState('');
  const [inactivityDays, setInactivityDays] = useState('');
  const [graceDays, setGraceDays] = useState('');
  const [quorum, setQuorum] = useState(0);
  const [creating, setCreating] = useState(false);

  const selectedModeInfo = PLAN_MODES.find(m => m.key === selectedMode);

  const handleModeSelect = useCallback((mode: PlanModeOption) => {
    setSelectedMode(mode);
    const info = PLAN_MODES.find(m => m.key === mode);
    if (info) {
      setInactivityDays(info.defaultInactivity);
      setGraceDays(info.defaultGrace);
    }
  }, []);

  const inactivityValue = Number.parseFloat(inactivityDays);
  const graceValue = Number.parseFloat(graceDays);
  const inactivitySeconds = Number.isFinite(inactivityValue) ? Math.round(inactivityValue * SECONDS_PER_DAY) : 0;
  const graceSeconds = Number.isFinite(graceValue) ? Math.round(graceValue * SECONDS_PER_DAY) : 0;

  const handleCreate = useCallback(async () => {
    if (!selectedMode) {
      Alert.alert('Select a mode', 'Please choose a plan mode.');
      return;
    }
    if (!publicKey) {
      Alert.alert('Wallet required', 'Connect your wallet first.');
      return;
    }
    if (!isValidPublicKey(beneficiary)) {
      Alert.alert('Invalid beneficiary', 'Enter a valid Solana address.');
      return;
    }
    const beneficiaryPublicKey = new PublicKey(beneficiary.trim());
    if (beneficiaryPublicKey.equals(publicKey)) {
      Alert.alert('Invalid beneficiary', 'The beneficiary cannot be your own wallet.');
      return;
    }
    if (!Number.isFinite(inactivityValue) || inactivityValue < MIN_INACTIVITY_DAYS || inactivityValue > MAX_INACTIVITY_DAYS) {
      Alert.alert('Invalid timing', `Inactivity must be between ${MIN_INACTIVITY_DAYS} and ${MAX_INACTIVITY_DAYS} days.`);
      return;
    }
    if (!Number.isFinite(graceValue) || graceValue < MIN_GRACE_DAYS || graceValue > MAX_GRACE_DAYS) {
      Alert.alert('Invalid timing', `Grace must be between 1 hour and ${MAX_GRACE_DAYS} days.`);
      return;
    }

    setCreating(true);
    try {
      const client = new ThinkxxClient(connection);
      const planId = BigInt(Date.now());
      const { instruction, planPda } = client.buildInitializePlan(publicKey, {
        planId,
        mode: MODE_TO_PLAN_MODE[selectedMode],
        beneficiary: beneficiaryPublicKey,
        inactivityDuration: BigInt(inactivitySeconds),
        gracePeriod: BigInt(graceSeconds),
        guardianQuorum: quorum,
      });
      const signature = await signAndSendTransaction(new Transaction().add(instruction));
      Alert.alert('Plan created', 'Your plan is on-chain. Add guardians and activate it next.', [
        { text: 'View on Explorer', onPress: () => void Linking.openURL(explorerTxUrl(signature)) },
        { text: 'Continue', onPress: () => onCreated(planPda.toBase58()) },
      ]);
    } catch (err) {
      Alert.alert('Create plan failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setCreating(false);
    }
  }, [beneficiary, connection, graceValue, graceSeconds, inactivityValue, inactivitySeconds, onCreated, publicKey, quorum, selectedMode, signAndSendTransaction]);

  return (
    <Screen padded={false} keyboardAvoiding>
      <ScreenHeader title="Create plan" onBack={onBack} />
      <Screen scroll padded>
        <SectionTitle>Plan mode</SectionTitle>
        <View style={styles.modeGrid}>
          {PLAN_MODES.map(mode => {
            const active = selectedMode === mode.key;
            return (
              <TouchableOpacity
                key={mode.key}
                style={[styles.modeCard, active && styles.modeCardActive]}
                onPress={() => handleModeSelect(mode.key)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${mode.label} mode`}
              >
                <Text style={styles.modeIcon} importantForAccessibility="no">{mode.icon}</Text>
                <View style={styles.modeText}>
                  <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{mode.label}</Text>
                  <Text style={styles.modeDesc}>{mode.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionTitle>Beneficiary</SectionTitle>
        <TextInput
          style={styles.input}
          placeholder="Beneficiary Solana address (base58)"
          placeholderTextColor={theme.colors.textMuted}
          value={beneficiary}
          onChangeText={setBeneficiary}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Beneficiary address"
        />

        <SectionTitle>Timing</SectionTitle>
        <View style={styles.timingRow}>
          <View style={styles.timingField}>
            <Text style={styles.fieldLabel}>Inactivity (days)</Text>
            <TextInput
              style={styles.timingInput}
              value={inactivityDays}
              onChangeText={setInactivityDays}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel="Inactivity in days"
            />
          </View>
          <View style={styles.timingField}>
            <Text style={styles.fieldLabel}>Grace (days)</Text>
            <TextInput
              style={styles.timingInput}
              value={graceDays}
              onChangeText={setGraceDays}
              keyboardType="decimal-pad"
              placeholder="7"
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel="Grace period in days"
            />
          </View>
        </View>

        <SectionTitle>Guardian quorum</SectionTitle>
        <Card>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setQuorum(q => Math.max(0, q - 1))}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Decrease quorum"
            >
              <Text style={styles.stepperGlyph}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{quorum}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setQuorum(q => Math.min(MAX_QUORUM, q + 1))}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Increase quorum"
            >
              <Text style={styles.stepperGlyph}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.note}>
            {quorum === 0
              ? 'No guardian oversight — a claim auto-finalizes after the grace period.'
              : `${quorum} guardian${quorum > 1 ? 's' : ''} must approve a claim. Add them after creating the plan. Quorum is fixed now and can’t change later.`}
          </Text>
        </Card>

        {selectedMode ? (
          <Card>
            <SectionTitle>Summary</SectionTitle>
            <InfoRow label="Mode" value={selectedModeInfo?.label ?? ''} />
            <InfoRow label="Inactivity" value={formatDuration(inactivitySeconds)} />
            <InfoRow label="Grace period" value={formatDuration(graceSeconds)} />
            <InfoRow label="Quorum" value={quorum === 0 ? 'None' : `${quorum} of ${quorum}`} />
          </Card>
        ) : null}

        <Button label={creating ? 'Awaiting wallet…' : 'Create plan'} loading={creating} disabled={!selectedMode} onPress={handleCreate} />
        <Text style={styles.disclaimer}>⚠️ Creates an on-chain account; a small rent deposit is required. Devnet only.</Text>
      </Screen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeGrid: { gap: theme.spacing.md },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  modeCardActive: { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}10` },
  modeIcon: { fontSize: 28 },
  modeText: { flex: 1 },
  modeLabel: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.text },
  modeLabelActive: { color: theme.colors.primaryLight },
  modeDesc: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontFamily: 'monospace',
  },
  timingRow: { flexDirection: 'row', gap: theme.spacing.md },
  timingField: { flex: 1 },
  fieldLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  timingInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xl },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperGlyph: { color: theme.colors.primary, fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold },
  stepperValue: { color: theme.colors.text, fontSize: 32, fontWeight: theme.fontWeight.bold, minWidth: 44, textAlign: 'center' },
  note: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, lineHeight: 18 },
  disclaimer: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, textAlign: 'center' },
});
