import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { fetchPlan, PlanState, ThinkxxClient } from '@thinkxx/sdk';
import type { PlanAccountData } from '@thinkxx/sdk';
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useWallet } from '../providers/WalletProvider';
import ScreenShell from '../components/ScreenShell';
import {
  AddressBlock,
  Panel,
  PrimaryButton,
  SectionHeading,
  StatusPill,
} from '../components/Primitives';
import { theme } from '../theme';

interface HeartbeatScreenProps {
  onBack: () => void;
  planAddress: string | null;
}

type PlanValidationState =
  | { status: 'loading'; message: string }
  | { status: 'ready'; message: string }
  | { status: 'invalid'; message: string };

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * HeartbeatScreen — sends heartbeat for the selected plan only.
 */
export default function HeartbeatScreen({ onBack, planAddress }: HeartbeatScreenProps): React.JSX.Element {
  const { connected, publicKey, connection, signAndSendTransaction } = useWallet();
  const [plan, setPlan] = useState<PlanAccountData | null>(null);
  const [validationState, setValidationState] = useState<PlanValidationState>({
    status: 'loading',
    message: 'Checking selected plan...',
  });
  const [sending, setSending] = useState(false);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const hydratePlanState = useCallback(async (): Promise<void> => {
    if (!connected || !publicKey) {
      setPlan(null);
      setValidationState({
        status: 'invalid',
        message: 'Connect your wallet first.',
      });
      return;
    }

    if (!planAddress) {
      setPlan(null);
      setValidationState({
        status: 'invalid',
        message: 'No valid plan connected. Create or select a plan first.',
      });
      return;
    }

    let planPda: PublicKey;
    try {
      planPda = new PublicKey(planAddress);
    } catch {
      setPlan(null);
      setValidationState({
        status: 'invalid',
        message: 'Stored plan address is invalid. Re-open the plan from Dashboard.',
      });
      return;
    }

    setValidationState({
      status: 'loading',
      message: 'Checking selected plan...',
    });

    try {
      const planData = await fetchPlan(connection, planPda);
      if (!planData) {
        setPlan(null);
        setValidationState({
          status: 'invalid',
          message: 'Selected plan was not found on-chain yet. Pull to refresh Dashboard.',
        });
        return;
      }

      if (!planData.owner.equals(publicKey)) {
        setPlan(null);
        setValidationState({
          status: 'invalid',
          message: 'Selected plan belongs to another wallet.',
        });
        return;
      }

      if (planData.state === PlanState.Claimed || planData.state === PlanState.Cancelled) {
        setPlan(planData);
        setValidationState({
          status: 'invalid',
          message: 'Heartbeat is unavailable for this plan state.',
        });
        return;
      }

      setPlan(planData);
      setValidationState({
        status: 'ready',
        message: 'Plan is ready for heartbeat.',
      });
    } catch (err) {
      setPlan(null);
      setValidationState({
        status: 'invalid',
        message: err instanceof Error ? err.message : 'Failed to validate selected plan.',
      });
    }
  }, [connected, connection, planAddress, publicKey]);

  useEffect(() => {
    void hydratePlanState();
  }, [hydratePlanState]);

  useEffect(() => {
    if (validationState.status !== 'ready' && !sending) {
      pulseAnim.stopAnimation?.();
      pulseAnim.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, sending, validationState.status]);

  const sendHeartbeat = useCallback(async () => {
    if (!publicKey || !planAddress || validationState.status !== 'ready') {
      return;
    }

    setSending(true);
    try {
      const planPda = new PublicKey(planAddress);
      const client = new ThinkxxClient(connection);
      const instruction = client.buildHeartbeat(publicKey, planPda);
      const signature = await signAndSendTransaction(new Transaction().add(instruction));

      setLastSignature(signature);
      await hydratePlanState();
      Alert.alert('Heartbeat Sent', `Your activity has been recorded on-chain.\n\nSignature:\n${signature}`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send heartbeat');
    } finally {
      setSending(false);
    }
  }, [connection, hydratePlanState, planAddress, publicKey, signAndSendTransaction, validationState.status]);

  const heartbeatDate = plan ? new Date(Number(plan.lastHeartbeat) * 1000) : null;
  const canSendHeartbeat = validationState.status === 'ready' && Boolean(planAddress) && !sending;
  const tone =
    validationState.status === 'ready'
      ? 'success'
      : validationState.status === 'loading'
        ? 'warning'
        : 'danger';
  const readinessCode =
    validationState.status === 'ready'
      ? 'Ready'
      : validationState.status === 'loading'
        ? 'Syncing'
        : 'Blocked';
  const beaconTone =
    validationState.status === 'ready'
      ? 'success'
      : validationState.status === 'loading'
        ? 'warning'
        : 'danger';
  const beaconTitle =
    validationState.status === 'ready'
      ? 'Owner heartbeat uplink'
      : validationState.status === 'loading'
        ? 'Validating selected plan'
        : 'Heartbeat locked';
  const beaconBody =
    validationState.status === 'ready'
      ? 'Send a keepalive signal to reset inactivity timing and preserve the current access posture of this plan.'
      : validationState.status === 'loading'
        ? 'The app is checking ownership, plan state, and on-chain availability before enabling the heartbeat action.'
        : 'Resolve the selected plan on Dashboard before attempting a heartbeat. Wallet and beneficiary addresses cannot be used here.';
  const beaconCode =
    sending
      ? '…'
      : validationState.status === 'ready'
        ? 'HB'
        : validationState.status === 'loading'
          ? 'SYNC'
          : 'LOCK';

  return (
    <ScreenShell
      title="Heartbeat"
      subtitle="Record owner activity for the currently selected plan."
      eyebrow="Owner flow / keepalive"
      onBack={onBack}
      scroll
      contentContainerStyle={styles.content}
      footer={
        <View style={styles.footerDock}>
          <PrimaryButton
            label={sending ? 'Sending...' : 'Send Heartbeat'}
            onPress={sendHeartbeat}
            disabled={!canSendHeartbeat}
            loading={sending}
          />
          <Text style={styles.footerHint}>
            The action remains locked until the selected plan is found, owned by the current wallet, and in a heartbeat-eligible state.
          </Text>
        </View>
      }
    >
      <Panel tone={tone}>
        <SectionHeading label="Plan readiness" />
        <StatusPill label={validationState.message} tone={tone} />
        <Text style={styles.readinessCode}>{readinessCode}</Text>
      </Panel>

      <AddressBlock
        label="Selected plan"
        address={planAddress}
        helper={
          planAddress
            ? 'Heartbeat only operates on the selected plan account. Wallet and beneficiary addresses are not valid here.'
            : 'Create or select a plan before attempting heartbeat.'
        }
      />

      <Panel style={styles.beaconPanel} tone={beaconTone}>
        <Animated.View style={[styles.beaconOuter, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.beaconInner}>
            <Text style={styles.beaconCode}>{beaconCode}</Text>
          </View>
        </Animated.View>
        <Text style={styles.beaconTitle}>{beaconTitle}</Text>
        <Text style={styles.beaconBody}>{beaconBody}</Text>
      </Panel>

      {heartbeatDate ? (
        <Panel>
          <SectionHeading label="Last Recorded Heartbeat" />
          <Text style={styles.metricValue}>{formatTimeSince(heartbeatDate)}</Text>
          <Text style={styles.metricCaption}>{heartbeatDate.toLocaleString()}</Text>
          {lastSignature ? (
            <Text style={styles.signatureText}>
              Last signature: {lastSignature.slice(0, 8)}…{lastSignature.slice(-8)}
            </Text>
          ) : null}
        </Panel>
      ) : (
        <Panel tone={validationState.status === 'ready' ? 'warning' : 'danger'}>
          <SectionHeading label="Last Recorded Heartbeat" />
          <Text style={styles.emptyHeartbeatTitle}>
            {validationState.status === 'ready' ? 'No heartbeat recorded yet' : 'Waiting for a valid plan...'}
          </Text>
          <Text style={styles.emptyHeartbeatBody}>
            {validationState.status === 'ready'
              ? 'This selected plan is valid, but it has not recorded an owner heartbeat on-chain yet.'
              : 'A heartbeat timestamp appears here only when the selected plan exists on-chain and has already recorded owner activity.'}
          </Text>
        </Panel>
      )}

      <Panel>
        <SectionHeading label="Operator notes" />
        <View style={styles.noteList}>
          <Text style={styles.noteItem}>Heartbeat resets the inactivity timer for the selected plan.</Text>
          <Text style={styles.noteItem}>If no valid plan is selected, the action remains disabled until you sync one.</Text>
          <Text style={styles.noteItem}>Automated heartbeats remain a future feature in Settings.</Text>
        </View>
      </Panel>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
  },
  beaconPanel: {
    alignItems: 'center',
  },
  beaconOuter: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  beaconInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  beaconCode: {
    color: theme.colors.text,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1.6,
  },
  beaconTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    marginTop: theme.spacing.lg,
  },
  beaconBody: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: theme.fontWeight.bold,
  },
  metricCaption: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  signatureText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontFamily: 'monospace',
  },
  emptyHeartbeatTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  emptyHeartbeatBody: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  noteList: {
    gap: theme.spacing.sm,
  },
  noteItem: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  readinessCode: {
    color: theme.colors.textSoft,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: -0.4,
  },
  footerDock: {
    gap: theme.spacing.md,
  },
  footerHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    textAlign: 'center',
  },
});
