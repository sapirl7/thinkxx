/** @type {import('jest').Config} */
module.exports = {
  // Do NOT use "react-native" preset with jest@30 — RN setup.js uses ESM
  // Instead configure transforms manually
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-flow',
        ['@babel/preset-react', { runtime: 'automatic' }],
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
  setupFiles: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
};
