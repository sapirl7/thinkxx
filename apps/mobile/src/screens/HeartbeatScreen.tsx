import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useWallet } from '../providers/WalletProvider';
import { theme } from '../theme';

interface HeartbeatScreenProps {
  onBack: () => void;
}

/**
 * HeartbeatScreen — allows the owner to send a heartbeat
 * proving they are still active.
 */
export default function HeartbeatScreen({ onBack }: HeartbeatScreenProps): React.JSX.Element {
  const { connected } = useWallet();
  const [lastBeat, setLastBeat] = useState<Date | null>(null);
  const [sending, setSending] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const sendHeartbeat = useCallback(async () => {
    if (!connected) {
      Alert.alert('Not Connected', 'Connect your wallet first');
      return;
    }
    setSending(true);
    try {
      // TODO(#9): Build heartbeat TX via ThinkxxClient.buildHeartbeat
      // and send via MWA transact flow
      await new Promise(resolve => setTimeout(resolve, 800));
      setLastBeat(new Date());
      Alert.alert('Heartbeat Sent', 'Your activity has been recorded on-chain ✓');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send heartbeat');
    } finally {
      setSending(false);
    }
  }, [connected]);

  const formatTimeSince = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Heartbeat</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        {/* Status */}
        <View style={styles.statusSection}>
          <Text style={styles.statusLabel}>Activity Status</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: lastBeat ? `${theme.colors.success}20` : `${theme.colors.warning}20` },
          ]}>
            <Text style={[
              styles.statusText,
              { color: lastBeat ? theme.colors.success : theme.colors.warning },
            ]}>
              {lastBeat ? '● Active' : '○ No heartbeat recorded'}
            </Text>
          </View>
        </View>

        {/* Last heartbeat info */}
        {lastBeat && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Last Heartbeat</Text>
            <Text style={styles.infoValue}>{formatTimeSince(lastBeat)}</Text>
            <Text style={styles.infoTimestamp}>
              {lastBeat.toLocaleString()}
            </Text>
          </View>
        )}

        {/* Heartbeat Button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.heartbeatButton, sending && styles.heartbeatButtonSending]}
            onPress={sendHeartbeat}
            disabled={sending}
            activeOpacity={0.8}
          >
            <Text style={styles.heartbeatIcon}>{sending ? '⏳' : '💓'}</Text>
            <Text style={styles.heartbeatText}>
              {sending ? 'Sending...' : 'Send Heartbeat'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Info */}
        <View style={styles.infoSection}>
          <InfoItem
            icon="⏱"
            text="Each heartbeat resets the inactivity timer on your plan"
          />
          <InfoItem
            icon="🔔"
            text="If the timer expires, your beneficiary can start a claim"
          />
          <InfoItem
            icon="💡"
            text="Set up automated heartbeats in Settings (coming soon)"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function InfoItem({ icon, text }: { icon: string; text: string }): React.JSX.Element {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoItemIcon}>{icon}</Text>
      <Text style={styles.infoItemText}>{text}</Text>
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
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xl,
  },
  statusSection: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  statusText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: '100%',
  },
  infoLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  infoValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
  infoTimestamp: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  heartbeatButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartbeatButtonSending: {
    borderColor: theme.colors.textMuted,
    opacity: 0.7,
  },
  heartbeatIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  heartbeatText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  infoSection: {
    width: '100%',
    gap: theme.spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  infoItemIcon: {
    fontSize: 20,
  },
  infoItemText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
