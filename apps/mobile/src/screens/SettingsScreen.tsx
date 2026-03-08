import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';

interface SettingsScreenProps {
  onBack: () => void;
  onDisconnect: () => void;
}

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
  onPress?: () => void;
  danger?: boolean;
}

function SettingRow({ icon, label, value, isToggle, toggleValue, onToggle, onPress, danger }: SettingRowProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={isToggle}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <Text style={[styles.settingLabel, danger && styles.dangerText]}>{label}</Text>
      <View style={styles.settingRight}>
        {isToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: COLORS.surface, true: COLORS.accent + '50' }}
            thumbColor={toggleValue ? COLORS.accent : COLORS.textMuted}
          />
        ) : value ? (
          <Text style={styles.settingValue}>{value}</Text>
        ) : (
          <Text style={styles.chevron}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ onBack, onDisconnect }: SettingsScreenProps): React.JSX.Element {
  const [biometrics, setBiometrics] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoHeartbeat, setAutoHeartbeat] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Security */}
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.section}>
          <SettingRow
            icon="🔐"
            label="Biometric Lock"
            isToggle
            toggleValue={biometrics}
            onToggle={setBiometrics}
          />
          <SettingRow icon="🔑" label="Connected Wallet" value="Phantom" />
          <SettingRow icon="🌐" label="Network" value="Devnet" />
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.section}>
          <SettingRow
            icon="🔔"
            label="Push Notifications"
            isToggle
            toggleValue={notifications}
            onToggle={setNotifications}
          />
          <SettingRow
            icon="💓"
            label="Auto-Heartbeat Reminder"
            isToggle
            toggleValue={autoHeartbeat}
            onToggle={setAutoHeartbeat}
          />
          <SettingRow icon="📱" label="Telegram Alerts" value="Not set" />
        </View>

        {/* Protocol */}
        <Text style={styles.sectionTitle}>Protocol</Text>
        <View style={styles.section}>
          <SettingRow icon="📋" label="Transaction History" />
          <SettingRow icon="🏦" label="Emergency Bucket" value="Not set" />
          <SettingRow icon="⚡" label="Sponsored Transactions" value="Off" />
          <SettingRow icon="🔄" label="RPC Endpoint" value="Auto" />
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <SettingRow icon="📖" label="Documentation" />
          <SettingRow icon="🐛" label="Report Bug" />
          <SettingRow icon="📄" label="Version" value="0.3.0" />
          <SettingRow icon="⚖️" label="License" value="Apache 2.0" />
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, styles.dangerText]}>Danger Zone</Text>
        <View style={styles.section}>
          <SettingRow
            icon="🔌"
            label="Disconnect Wallet"
            onPress={onDisconnect}
            danger
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  sectionTitle: {
    color: COLORS.textMuted, fontSize: FONT_SIZES.xs, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1,
    marginHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.xs,
  },
  section: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.lg, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.md,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.background,
  },
  settingIcon: { fontSize: 20, marginRight: SPACING.sm, width: 28 },
  settingLabel: { flex: 1, color: COLORS.textPrimary, fontSize: FONT_SIZES.md },
  settingRight: { flexDirection: 'row', alignItems: 'center' },
  settingValue: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
  chevron: { color: COLORS.textMuted, fontSize: 20 },
  dangerText: { color: COLORS.danger },
  bottomSpacer: { height: 40 },
});
