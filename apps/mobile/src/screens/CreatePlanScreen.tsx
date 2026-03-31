import React, { useState, useCallback } from 'react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { fetchPlan, PlanMode, ThinkxxClient } from '@thinkxx/sdk';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWallet } from '../providers/WalletProvider';
import ScreenShell from '../components/ScreenShell';
import {
  AddressBlock,
  KeyValueRow,
  Panel,
  PrimaryButton,
  SectionHeading,
  StatusPill,
} from '../components/Primitives';
import { theme } from '../theme';

type PlanModeOption = 'medical' | 'legal_risk' | 'legacy';

interface PlanModeInfo {
  key: PlanModeOption;
  label: string;
  code: string;
  description: string;
  defaultInactivity: string;
  defaultGrace: string;
}

const PLAN_MODES: PlanModeInfo[] = [
  {
    key: 'medical',
    label: 'Medical',
    code: 'MED',
    description: 'Emergency cover for surgery, treatment windows, or health-risk travel.',
    defaultInactivity: '30',
    defaultGrace: '7',
  },
  {
    key: 'legal_risk',
    label: 'Legal Risk',
    code: 'RISK',
    description: 'A longer inactivity window for detention, conflict, or border-risk scenarios.',
    defaultInactivity: '90',
    defaultGrace: '14',
  },
  {
    key: 'legacy',
    label: 'Legacy',
    code: 'EST',
    description: 'Long-horizon inheritance planning with calmer defaults and wider review time.',
    defaultInactivity: '365',
    defaultGrace: '30',
  },
];

interface CreatePlanScreenProps {
  onBack: () => void;
  onCreated: (planAddress: string) => void;
}

type CreationStage = 'editing' | 'awaiting_wallet' | 'confirming_chain';

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
const PLAN_FETCH_RETRIES = 5;
const PLAN_FETCH_DELAY_MS = 400;

async function waitForPlanConfirmation(
  connection: Connection,
  planAddress: PublicKey,
): Promise<void> {
  for (let attempt = 0; attempt < PLAN_FETCH_RETRIES; attempt += 1) {
    const plan = await fetchPlan(connection, planAddress);
    if (plan) {
      return;
    }

    await new Promise(resolve => {
      setTimeout(resolve, PLAN_FETCH_DELAY_MS);
    });
  }

  throw new Error(
    'Plan transaction confirmed, but the new plan is not visible on-chain yet. Pull to refresh the dashboard in a few seconds.',
  );
}

function ModeCard({
  mode,
  selected,
  onSelect,
}: {
  mode: PlanModeInfo;
  selected: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.modeCard, selected && styles.modeCardSelected]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      <View style={styles.modeHeader}>
        <View style={[styles.modeCode, selected && styles.modeCodeSelected]}>
          <Text style={[styles.modeCodeText, selected && styles.modeCodeTextSelected]}>{mode.code}</Text>
        </View>
        {selected ? <StatusPill label="Selected" tone="primary" /> : null}
      </View>
      <Text style={styles.modeLabel}>{mode.label}</Text>
      <Text style={styles.modeDescription}>{mode.description}</Text>
      <View style={styles.modeDefaults}>
        <Text style={styles.modeDefaultText}>Inactive: {mode.defaultInactivity}d</Text>
        <Text style={styles.modeDefaultText}>Grace: {mode.defaultGrace}d</Text>
      </View>
    </TouchableOpacity>
  );
}

function StageRail({ stage }: { stage: CreationStage }): React.JSX.Element {
  const configureActive = stage === 'editing';
  const approveActive = stage === 'awaiting_wallet';
  const confirmActive = stage === 'confirming_chain';

  return (
    <View style={styles.stageRail}>
      <View style={styles.stageNode}>
        <View style={[styles.stageDot, configureActive && styles.stageDotActive]} />
        <Text style={styles.stageNodeText}>Configure</Text>
      </View>
      <View style={styles.stageLine} />
      <View style={styles.stageNode}>
        <View style={[styles.stageDot, approveActive && styles.stageDotActive]} />
        <Text style={styles.stageNodeText}>Approve</Text>
      </View>
      <View style={styles.stageLine} />
      <View style={styles.stageNode}>
        <View style={[styles.stageDot, confirmActive && styles.stageDotActive]} />
        <Text style={styles.stageNodeText}>Confirm</Text>
      </View>
    </View>
  );
}

/**
 * CreatePlanScreen — owner-side plan creation.
 * The redesign makes the flow feel like an on-chain provisioning sequence.
 */
export default function CreatePlanScreen({ onBack, onCreated }: CreatePlanScreenProps): React.JSX.Element {
  const { connection, publicKey, signAndSendTransaction } = useWallet();
  const [selectedMode, setSelectedMode] = useState<PlanModeOption | null>(null);
  const [beneficiary, setBeneficiary] = useState('');
  const [inactivityDays, setInactivityDays] = useState('');
  const [graceDays, setGraceDays] = useState('');
  const [creationStage, setCreationStage] = useState<CreationStage>('editing');

  const selectedModeInfo = PLAN_MODES.find(mode => mode.key === selectedMode);
  const creating = creationStage !== 'editing';
  const stageLabel =
    creationStage === 'awaiting_wallet'
      ? 'Approve this plan request in your wallet.'
      : creationStage === 'confirming_chain'
        ? 'Wallet approved. Waiting for the new plan account to appear on-chain.'
        : 'Review configuration before opening the wallet approval step.';

  const handleModeSelect = useCallback((mode: PlanModeOption) => {
    setSelectedMode(mode);
    const info = PLAN_MODES.find(option => option.key === mode);
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

    if (
      !Number.isFinite(inactivityValue) ||
      inactivityValue < MIN_INACTIVITY_DAYS ||
      inactivityValue > MAX_INACTIVITY_DAYS
    ) {
      Alert.alert(
        'Invalid Timing',
        `Inactivity period must be between ${MIN_INACTIVITY_DAYS} and ${MAX_INACTIVITY_DAYS} days`,
      );
      return;
    }
    if (!Number.isFinite(graceValue) || graceValue < MIN_GRACE_DAYS || graceValue > MAX_GRACE_DAYS) {
      Alert.alert(
        'Invalid Timing',
        `Grace period must be between ${MIN_GRACE_HOURS} hour and ${MAX_GRACE_DAYS} days`,
      );
      return;
    }

    setCreationStage('awaiting_wallet');

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
      setCreationStage('confirming_chain');
      await waitForPlanConfirmation(connection, planPda);
      onCreated(planPda.toBase58());

      Alert.alert(
        'Plan Created',
        `Plan address:\n${planPda.toBase58()}\n\nSignature:\n${signature}`,
        [{ text: 'Continue' }],
        { cancelable: false },
      );
    } catch (err) {
      Alert.alert('Create Plan Failed', err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setCreationStage('editing');
    }
  }, [
    beneficiary,
    connection,
    graceDays,
    inactivityDays,
    onCreated,
    publicKey,
    selectedMode,
    signAndSendTransaction,
  ]);

  return (
    <ScreenShell
      title="Create Plan"
      subtitle="Provision a new on-chain emergency-access plan for the connected owner wallet."
      eyebrow="Owner flow / provisioning"
      onBack={onBack}
      scroll
      contentContainerStyle={styles.content}
      footer={
        <View style={styles.footerDock}>
          <PrimaryButton
            label={
              creationStage === 'awaiting_wallet'
                ? 'Approve in Wallet...'
                : creationStage === 'confirming_chain'
                  ? 'Confirming On-Chain...'
                  : 'Create Plan'
            }
            onPress={handleCreate}
            disabled={!selectedMode || creating}
            loading={creating}
          />
          <Text style={styles.disclaimer}>
            This provisions a new on-chain account. Devnet rent and network fees will appear in the wallet approval step.
          </Text>
        </View>
      }
    >
      <Panel tone="primary">
        <SectionHeading label="Flow preview" />
        <StatusPill
          label={stageLabel}
          tone={creationStage === 'editing' ? 'primary' : 'warning'}
        />
        <StageRail stage={creationStage} />
        <Text style={styles.stageText}>
          This flow creates a dedicated plan account on devnet. After chain confirmation, the app switches to the live plan view instead of pretending the plan already exists.
        </Text>
      </Panel>

      <View style={styles.modeStack}>
        <SectionHeading label="Choose mission profile" />
        {PLAN_MODES.map(mode => (
          <ModeCard
            key={mode.key}
            mode={mode}
            selected={selectedMode === mode.key}
            onSelect={() => handleModeSelect(mode.key)}
          />
        ))}
      </View>

      <Panel>
        <SectionHeading label="Beneficiary identity" />
        <Text style={styles.formHelp}>
          Enter the beneficiary wallet address. This is not your owner wallet and not the future plan account.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Solana public key (base58)"
          placeholderTextColor={theme.colors.textMuted}
          value={beneficiary}
          onChangeText={setBeneficiary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {beneficiary.trim() ? (
          <AddressBlock
            label="Beneficiary preview"
            address={beneficiary.trim()}
            helper="Confirm this carefully. A wrong beneficiary address changes who can later claim."
          />
        ) : null}
      </Panel>

      <Panel tone="secondary">
        <SectionHeading label="Timing controls" />
        <View style={styles.timingGrid}>
          <View style={styles.timingField}>
            <Text style={styles.timingLabel}>Inactivity window (days)</Text>
            <TextInput
              style={styles.timingInput}
              value={inactivityDays}
              onChangeText={setInactivityDays}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={styles.timingField}>
            <Text style={styles.timingLabel}>Grace period (days)</Text>
            <TextInput
              style={styles.timingInput}
              value={graceDays}
              onChangeText={setGraceDays}
              keyboardType="decimal-pad"
              placeholder="7"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>
        <Text style={styles.timingHint}>
          On-chain bounds: inactivity {MIN_INACTIVITY_DAYS}–{MAX_INACTIVITY_DAYS} days, grace {MIN_GRACE_HOURS}
          h–{MAX_GRACE_DAYS} days.
        </Text>
      </Panel>

      {selectedMode ? (
        <Panel>
          <SectionHeading label="Provision summary" />
          <KeyValueRow label="Mode" value={selectedModeInfo?.label ?? ''} />
          <KeyValueRow label="Inactivity" value={`${inactivityDays} days`} />
          <KeyValueRow label="Grace period" value={`${graceDays} days`} />
          <KeyValueRow label="Guardians" value="0 (add later)" muted />
        </Panel>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
  },
  stageText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  stageRail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  stageNode: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.borderStrong,
    borderWidth: 1,
    borderColor: theme.colors.textMuted,
  },
  stageDotActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.focusRing,
  },
  stageLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderStrong,
  },
  stageNodeText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.fontWeight.semibold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  modeStack: {
    gap: theme.spacing.md,
  },
  modeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  modeCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceMuted,
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  modeCode: {
    minWidth: 56,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
  },
  modeCodeSelected: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  modeCodeText: {
    color: theme.colors.textSoft,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1.1,
  },
  modeCodeTextSelected: {
    color: theme.colors.text,
  },
  modeLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  modeDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  modeDefaults: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  modeDefaultText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
  timingGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  timingField: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  timingLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  timingInput: {
    minHeight: 56,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: theme.fontWeight.bold,
  },
  timingHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
  },
  footerDock: {
    gap: theme.spacing.md,
  },
  disclaimer: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    textAlign: 'center',
  },
});
