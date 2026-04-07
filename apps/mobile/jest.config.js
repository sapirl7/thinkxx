/** @type {import('jest').Config} */
const resolveFromMobile = packageName =>
  require.resolve(packageName, { paths: [__dirname] });

module.exports = {
  // Use jsdom for renderHook / render support
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      presets: [
        [resolveFromMobile('@babel/preset-env'), { targets: { node: 'current' } }],
        resolveFromMobile('@babel/preset-typescript'),
        [resolveFromMobile('@babel/preset-react'), { runtime: 'automatic' }],
      ],
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        [resolveFromMobile('@babel/preset-env'), { targets: { node: 'current' } }],
        resolveFromMobile('@babel/preset-flow'),
        [resolveFromMobile('@babel/preset-react'), { runtime: 'automatic' }],
      ],
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@solana|@solana-mobile|@coral-xyz|@thinkxx|react-native|@react-native|expo|expo-status-bar|react-native-get-random-values|buffer)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    '^@thinkxx/sdk$': '<rootDir>/../../packages/sdk/src/index.ts',
    '^@thinkxx/config$': '<rootDir>/../../packages/config/src/index.ts',
    '^@thinkxx/rpc$': '<rootDir>/../../packages/rpc/src/index.ts',
    '^@thinkxx/notifications$': '<rootDir>/../../packages/notifications/src/index.ts',
  },
  // polyfills must load FIRST (TextEncoder etc), then mock-kit
  setupFiles: ['<rootDir>/test/polyfills.js', '<rootDir>/test/setup.ts'],
};
