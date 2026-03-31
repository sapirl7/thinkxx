import React, { useEffect, useRef } from 'react';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../theme';
import { withAlpha } from './color';
import { mobileLayout } from './layout';

interface ScreenShellProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  scroll?: boolean;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
}

export default function ScreenShell({
  title,
  subtitle,
  eyebrow = 'THINKXX',
  onBack,
  rightSlot,
  scroll = false,
  children,
  contentContainerStyle,
  footer,
}: ScreenShellProps): React.JSX.Element {
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslate = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(entranceTranslate, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entranceOpacity, entranceTranslate]);

  const content = (
    <>
      <View style={styles.heroGlowPrimary} />
      <View style={styles.heroGlowSecondary} />
      <Animated.View
        style={[
          styles.header,
          { opacity: entranceOpacity, transform: [{ translateY: entranceTranslate }] },
        ]}
      >
        <View style={styles.headerRail}>
          <View style={styles.headerMeta}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <View style={styles.headerActions}>
            {onBack ? (
              <Pressable
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
                onPress={onBack}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.backButtonPlaceholder} />
            )}
            {rightSlot ?? <View style={styles.rightPlaceholder} />}
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
      </Animated.View>
      {scroll ? (
        <Animated.View
          style={[
            styles.scrollView,
            { opacity: entranceOpacity, transform: [{ translateY: entranceTranslate }] },
          ]}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              footer ? styles.scrollContentWithFooter : null,
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            styles.content,
            contentContainerStyle,
            { opacity: entranceOpacity, transform: [{ translateY: entranceTranslate }] },
          ]}
        >
          {children}
        </Animated.View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {content}
      {footer ? (
        <Animated.View
          style={[
            styles.footerDock,
            { opacity: entranceOpacity, transform: [{ translateY: entranceTranslate }] },
          ]}
        >
          {footer}
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  heroGlowPrimary: {
    position: 'absolute',
    top: -120,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: withAlpha(theme.colors.primary, 0.18),
  },
  heroGlowSecondary: {
    position: 'absolute',
    top: 80,
    left: -70,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: withAlpha(theme.colors.secondary, 0.1),
  },
  header: {
    paddingHorizontal: mobileLayout.horizontalPadding,
    paddingTop: mobileLayout.headerTopPadding,
    paddingBottom: mobileLayout.headerBottomPadding,
    gap: theme.spacing.sm,
  },
  headerRail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  headerMeta: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    color: theme.colors.primaryLight,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  backButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: withAlpha(theme.colors.surfaceElevated, 0.94),
  },
  backButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  backButtonText: {
    color: theme.colors.textSoft,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  backButtonPlaceholder: {
    width: 72,
  },
  rightPlaceholder: {
    width: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: mobileLayout.titleSize,
    lineHeight: mobileLayout.titleLineHeight,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: -0.7,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: mobileLayout.horizontalPadding,
    paddingBottom: theme.spacing.xxl,
    gap: mobileLayout.sectionGap,
  },
  scrollContentWithFooter: {
    paddingBottom: mobileLayout.footerReserve,
  },
  content: {
    flex: 1,
    paddingHorizontal: mobileLayout.horizontalPadding,
    paddingBottom: theme.spacing.xxl,
    gap: mobileLayout.sectionGap,
  },
  footerDock: {
    paddingHorizontal: mobileLayout.horizontalPadding,
    paddingTop: mobileLayout.footerTopPadding,
    paddingBottom: mobileLayout.footerBottomPadding,
    backgroundColor: withAlpha(theme.colors.backgroundAlt, 0.96),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderStrong,
  },
});
