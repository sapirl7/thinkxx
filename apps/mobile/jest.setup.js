/**
 * Jest setup file for Thinkxx mobile tests.
 * Mocks platform APIs that don't exist in the test environment.
 */

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Mock react-native-get-random-values (polyfill)
jest.mock('react-native-get-random-values', () => {});
