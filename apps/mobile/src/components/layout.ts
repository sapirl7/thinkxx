import { Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

const isCompactWidth = width < 390;
const isShortHeight = height < 780;

// On Android, SafeAreaView does NOT inset for the status bar.
// We must manually add StatusBar.currentHeight to the header padding.
const androidStatusBarHeight = StatusBar.currentHeight ?? 0;
const baseHeaderTopPadding = isShortHeight ? 12 : 16;
const headerTopPadding =
  Platform.OS === 'android'
    ? baseHeaderTopPadding + androidStatusBarHeight
    : baseHeaderTopPadding;

export const mobileLayout = {
  width,
  height,
  isCompactWidth,
  isShortHeight,
  horizontalPadding: isCompactWidth ? 20 : 24,
  headerTopPadding,
  headerBottomPadding: isShortHeight ? 20 : 24,
  sectionGap: isCompactWidth ? 20 : 24,
  footerTopPadding: isShortHeight ? 12 : 16,
  footerBottomPadding: Platform.OS === 'android' ? 18 : 14,
  footerReserve: isShortHeight ? 128 : 148,
  titleSize: isCompactWidth ? 28 : 30,
  titleLineHeight: isCompactWidth ? 32 : 34,
} as const;
