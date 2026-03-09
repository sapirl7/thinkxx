import React, { useState, useCallback } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { PlanMode, ThinkxxClient } from '@thinkxx/sdk';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useWallet } from '../providers/WalletProvider';
import { theme } from '../theme';

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
  {
    key: 'medical',
    label: 'Medical',
    icon: '🏥',
    description: 'Pre-surgery or high-risk medical procedure',
    defaultInactivity: '30',
    defaultGrace: '7',
  },
  {
    key: 'legal_risk',
    label: 'Legal Risk',
    icon: '⚖️',
    description: 'Travel to high-risk jurisdiction',
    defaultInactivity: '90',
    defaultGrace: '14',
  },
  {
    key: 'legacy',
    label: 'Legacy',
    icon: '🏛',
    description: 'Long-term inheritance planning',
    defaultInactivity: '365',
    defaultGrace: '30',
  },
];

interface CreatePlanScreenProps {
  onBack: () => void;
  onCreated: (planAddress: string) => void;
}

const MODE_TO_PLAN_MODE: Record<PlanModeOption, PlanMode> = {
  medical: PlanMode.Medical,
  legal_risk: PlanMode.LegalRisk,
  legacy: PlanMode.Legacy,
};

const SECONDS_PER_DAY = 86_400;
const MIN_INACTIVITY_DAYS = 1;
const MAX_INACTIVITY_DAYS = 1_825;
const MIN_GRACE_HOURS = 1;
const MIN_GRACE_DAYS = MIN_GRACE_HOURS / 24;
const MAX_GRACE_DAYS = 90;

/**
 * CreatePlanScreen — wizard for creating a new emergency access plan.
 * Collects mode, beneficiary, and timing parameters.
 */
export default function CreatePlanScreen({ onBack, onCreated }: CreatePlanScreenProps): React.JSX.Element {
  const { connection, publicKey, signAndSendTransaction } = useWallet();
  const [selectedMode, setSelectedMode] = useState<PlanModeOption | null>(null);
  const [beneficiary, setBeneficiary] = useState('');
  const [inactivityDays, setInactivityDays] = useState('');
  const [graceDays, setGraceDays] = useState('');
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

  const handleCreate = useCallback(async () => {
    if (!selectedMode) {
      Alert.alert('Select Mode', 'Please select a plan mode');
      return;
    }
    if (!publicKey) {
      Alert.alert('Wallet Required', 'Connect your wallet first');
      return;
    }

    let beneficiaryPublicKey: PublicKey;
    try {
      beneficiaryPublicKey = new PublicKey(beneficiary.trim());
    } catch {
      Alert.alert('Invalid Beneficiary', 'Please enter a valid Solana address');
      return;
    }

    const inactivityValue = Number.parseFloat(inactivityDays);
    const graceValue = Number.parseFloat(graceDays);

    if (!Number.isFinite(inactivityValue) || inactivityValue < MIN_INACTIVITY_DAYS || inactivityValue > MAX_INACTIVITY_DAYS) {
      Alert.alert('Invalid Timing', `Inactivity period must be between ${MIN_INACTIVITY_DAYS} and ${MAX_INACTIVITY_DAYS} days`);
      return;
    }
    if (!Number.isFinite(graceValue) || graceValue < MIN_GRACE_DAYS || graceValue > MAX_GRACE_DAYS) {
      Alert.alert('Invalid Timing', `Grace period must be between ${MIN_GRACE_HOURS} hour and ${MAX_GRACE_DAYS} days`);
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
        inactivityDuration: BigInt(Math.round(inactivityValue * SECONDS_PER_DAY)),
        gracePeriod: BigInt(Math.round(graceValue * SECONDS_PER_DAY)),
        guardianQuorum: 0,
      });

      const signature = await signAndSendTransaction(new Transaction().add(instruction));

      Alert.alert(
        'Plan Created',
        `Plan address:\n${planPda.toBase58()}\n\nSignature:\n${signature}`,
        [{ text: 'Continue', onPress: () => onCreated(planPda.toBase58()) }],
        { cancelable: false }
      );
    } catch (err) {
      Alert.alert('Create Plan Failed', err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  }, [beneficiary, connection, graceDays, inactivityDays, onCreated, publicKey, selectedMode, signAndSendTransaction]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Plan</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Mode Selection */}
        <Text style={styles.sectionLabel}>Plan Mode</Text>
        <View style={styles.modeGrid}>
          {PLAN_MODES.map(mode => (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.modeCard,
                selectedMode === mode.key && styles.modeCardSelected,
              ]}
              onPress={() => handleModeSelect(mode.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.modeIcon}>{mode.icon}</Text>
              <Text style={[
                styles.modeLabel,
                selectedMode === mode.key && styles.modeLabelSelected,
              ]}>
                {mode.label}
              </Text>
              <Text style={styles.modeDescription}>{mode.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Beneficiary */}
        <Text style={styles.sectionLabel}>Beneficiary Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Solana public key (base58)"
          placeholderTextColor={theme.colors.textMuted}
          value={beneficiary}
          onChangeText={setBeneficiary}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Timing */}
        <Text style={styles.sectionLabel}>Timing Parameters</Text>
        <View style={styles.timingRow}>
          <View style={styles.timingField}>
            <Text style={styles.timingLabel}>Inactivity (days)</Text>
            <TextInput
              style={styles.timingInput}
              value={inactivityDays}
              onChangeText={setInactivityDays}
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={styles.timingField}>
            <Text style={styles.timingLabel}>Grace (days)</Text>
            <TextInput
              style={styles.timingInput}
              value={graceDays}
              onChangeText={setGraceDays}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        {/* Summary */}
        {selectedMode && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Plan Summary</Text>
            <SummaryRow label="Mode" value={selectedModeInfo?.label ?? ''} />
            <SummaryRow label="Inactivity" value={`${inactivityDays} days`} />
            <SummaryRow label="Grace Period" value={`${graceDays} days`} />
            <SummaryRow label="Guardians" value="0 (add later)" />
          </View>
        )}

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, (!selectedMode || creating) && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={!selectedMode || creating}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>{creating ? 'Awaiting Wallet...' : 'Create Plan'}</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          ⚠️ This creates an on-chain account. A small rent deposit is required.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  sectionLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: -theme.spacing.sm,
  },
  modeGrid: {
    gap: theme.spacing.md,
  },
  modeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  modeCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  modeIcon: {
    fontSize: 28,
    marginBottom: theme.spacing.xs,
  },
  modeLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  modeLabelSelected: {
    color: theme.colors.primaryLight,
  },
  modeDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
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
  timingRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  timingField: {
    flex: 1,
  },
  timingLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
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
  summaryCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  summaryTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.4,
  },
  createButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  disclaimer: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
