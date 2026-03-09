import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';

interface PlanDetailScreenProps {
  onBack: () => void;
  onGuardians: () => void;
}

type PlanState = 'Draft' | 'Active' | 'Paused' | 'ClaimPending' | 'Claimed' | 'Cancelled';

const STATE_COLORS: Record<PlanState, string> = {
  Draft: '#6E7681',
  Active: COLORS.success,
  Paused: '#D29922',
  ClaimPending: COLORS.danger,
  Claimed: '#00BFA6',
  Cancelled: '#6E7681',
};

export default function PlanDetailScreen({ onBack, onGuardians }: PlanDetailScreenProps): React.JSX.Element {
  const [planState] = useState<PlanState>('Active');

  const planData = {
    mode: 'Medical',
    beneficiary: 'B7n4...xK9r',
    backupBeneficiary: 'None',
    inactivity: '2 days',
    grace: '1 day',
    lastHeartbeat: '2 min ago',
    vaultBalance: '5.250 SOL',
    emergencyBucket: '0.500 SOL',
    guardians: 3,
    quorum: 2,
    createdAt: 'Mar 8, 2026',
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Plan Details</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: STATE_COLORS[planState] + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: STATE_COLORS[planState] }]} />
            <Text style={[styles.statusText, { color: STATE_COLORS[planState] }]}>{planState}</Text>
          </View>
          <Text style={styles.modeLabel}>{planData.mode} Mode</Text>
        </View>

        {/* Vault */}
        <View style={styles.vaultCard}>
          <Text style={styles.vaultLabel}>Vault Balance</Text>
          <Text style={styles.vaultAmount}>{planData.vaultBalance}</Text>
          <View style={styles.vaultRow}>
            <Text style={styles.vaultSubtext}>Emergency: {planData.emergencyBucket}</Text>
          </View>
          <View style={styles.vaultActions}>
            <TouchableOpacity style={styles.vaultBtn}>
              <Text style={styles.vaultBtnText}>📥 Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.vaultBtn, styles.vaultBtnSecondary]}>
              <Text style={styles.vaultBtnSecondaryText}>🆘 Emergency</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Heartbeat */}
        <View style={styles.heartbeatCard}>
          <View style={styles.heartbeatHeader}>
            <Text style={styles.heartbeatIcon}>💓</Text>
            <View>
              <Text style={styles.heartbeatLabel}>Last Heartbeat</Text>
              <Text style={styles.heartbeatValue}>{planData.lastHeartbeat}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.heartbeatBtn}>
            <Text style={styles.heartbeatBtnText}>Send Heartbeat</Text>
          </TouchableOpacity>
        </View>

        {/* Details Grid */}
        <Text style={styles.sectionTitle}>Configuration</Text>
        <View style={styles.detailsGrid}>
          <DetailRow label="Beneficiary" value={planData.beneficiary} mono />
          <DetailRow label="Backup" value={planData.backupBeneficiary} />
          <DetailRow label="Inactivity Window" value={planData.inactivity} />
          <DetailRow label="Grace Period" value={planData.grace} />
          <DetailRow label="Created" value={planData.createdAt} />
        </View>

        {/* Guardians */}
        <TouchableOpacity style={styles.guardiansCard} onPress={onGuardians}>
          <View style={styles.guardiansLeft}>
            <Text style={styles.guardiansIcon}>🛡️</Text>
            <View>
              <Text style={styles.guardiansLabel}>Guardians</Text>
              <Text style={styles.guardiansValue}>
                {planData.guardians} guardians • Quorum: {planData.quorum}
              </Text>
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>⏸</Text>
            <Text style={styles.actionText}>Pause Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionText}>Edit Timing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionText}>Update Beneficiary</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.dangerAction]}>
            <Text style={styles.actionIcon}>🗑</Text>
            <Text style={[styles.actionText, styles.dangerText]}>Close Plan</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }): React.JSX.Element {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.monoText]}>{value}</Text>
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
  content: { flex: 1 },
  statusCard: {
    alignItems: 'center', marginHorizontal: SPACING.lg, marginTop: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.xs },
  statusText: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  modeLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, marginTop: SPACING.xs },
  vaultCard: {
    marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
    alignItems: 'center',
  },
  vaultLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
  vaultAmount: { color: COLORS.textPrimary, fontSize: 36, fontWeight: '700', marginTop: SPACING.xs },
  vaultRow: { marginTop: SPACING.xs },
  vaultSubtext: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  vaultActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, width: '100%' },
  vaultBtn: {
    flex: 1, backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm, alignItems: 'center',
  },
  vaultBtnText: { color: '#000', fontWeight: '700' },
  vaultBtnSecondary: { backgroundColor: COLORS.danger + '20' },
  vaultBtnSecondaryText: { color: COLORS.danger, fontWeight: '700' },
  heartbeatCard: {
    marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  heartbeatHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  heartbeatIcon: { fontSize: 28 },
  heartbeatLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  heartbeatValue: { color: COLORS.success, fontSize: FONT_SIZES.md, fontWeight: '600' },
  heartbeatBtn: {
    backgroundColor: COLORS.success + '20', borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  heartbeatBtnText: { color: COLORS.success, fontWeight: '700', fontSize: FONT_SIZES.sm },
  sectionTitle: {
    color: COLORS.textMuted, fontSize: FONT_SIZES.xs, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1,
    marginHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.xs,
  },
  detailsGrid: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.lg, overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.background,
  },
  detailLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
  detailValue: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '500' },
  monoText: { fontFamily: 'monospace' },
  guardiansCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
  },
  guardiansLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  guardiansIcon: { fontSize: 24 },
  guardiansLabel: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '600' },
  guardiansValue: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  chevron: { color: COLORS.textMuted, fontSize: 24 },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
  },
  actionBtn: {
    width: '48%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center',
  },
  actionIcon: { fontSize: 24, marginBottom: SPACING.xs },
  actionText: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '500' },
  dangerAction: { borderWidth: 1, borderColor: COLORS.danger + '30' },
  dangerText: { color: COLORS.danger },
  bottomSpacer: { height: 40 },
});
