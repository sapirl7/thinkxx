/**
 * Shared mobile mock-kit.
 *
 * Provides mocks for MWA, Solana Connection, Alert, and RN modules.
 * Every test file MUST call `resetMobileMocks()` in `beforeEach`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { PublicKey, Transaction } from '@solana/web3.js';
import { Buffer } from 'buffer';

// ── Mock wallet object ──────────────────────────────────────────
export const mockWallet = {
  authorize: jest.fn(),
  deauthorize: jest.fn(),
  getCapabilities: jest.fn(),
  signAndSendTransactions: jest.fn(),
  signTransactions: jest.fn(),
};

// ── Mock transact ───────────────────────────────────────────────
/**
 * By default, `transact` invokes its callback with `mockWallet`.
 * Override per test: `mockTransact.mockImplementation(...)`.
 */
export const mockTransact = jest.fn(
  async (callback: (wallet: any) => Promise<any>, _options?: unknown) => {
    return callback(mockWallet);
  }
);

// ── Mock Connection ─────────────────────────────────────────────
export const mockConnection = {
  getBalance: jest.fn().mockResolvedValue(5_000_000_000), // 5 SOL
  getAccountInfo: jest.fn().mockResolvedValue(null),
  getLatestBlockhash: jest.fn().mockResolvedValue({
    blockhash: 'mock-blockhash-' + 'A'.repeat(32),
    lastValidBlockHeight: 999,
  }),
  sendRawTransaction: jest.fn().mockResolvedValue('mock-signature-sendraw'),
  confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
};

// ── Mock Alert ──────────────────────────────────────────────────
export const mockAlert = jest.fn();

const mockAsyncStorageMemory = new Map<string, string>();
const mockSecureStorageMemory = new Map<string, string>();

// ── Default wallet authorize response ───────────────────────────
const defaultPubkey = PublicKey.default;
export const defaultAuthResponse = {
  accounts: [{ address: Buffer.from(defaultPubkey.toBuffer()).toString('base64') }],
  // Test-only mock value — not a real secret (nosec)
  auth_token: 'test-auth-token', // NOSONAR
  wallet_uri_base: 'https://test-wallet.app',
};

// ── Default capabilities ────────────────────────────────────────
export const defaultCapabilities = {
  supports_sign_and_send_transactions: true,
  features: ['solana:signTransactions'],
};

// ── Reset all mocks ─────────────────────────────────────────────
export function resetMobileMocks(): void {
  const mockSignedTransaction = new Transaction();
  jest.spyOn(mockSignedTransaction, 'serialize').mockReturnValue(Buffer.alloc(100));

  mockWallet.authorize.mockReset().mockResolvedValue(defaultAuthResponse);
  mockWallet.deauthorize.mockReset().mockResolvedValue(undefined);
  mockWallet.getCapabilities.mockReset().mockResolvedValue(defaultCapabilities);
  mockWallet.signAndSendTransactions.mockReset().mockResolvedValue(['mock-signature-sas']);
  mockWallet.signTransactions.mockReset().mockResolvedValue([mockSignedTransaction]);

  mockTransact.mockReset().mockImplementation(async (cb: any) => cb(mockWallet));

  mockConnection.getBalance.mockReset().mockResolvedValue(5_000_000_000);
  mockConnection.getAccountInfo.mockReset().mockResolvedValue(null);
  mockConnection.getLatestBlockhash.mockReset().mockResolvedValue({
    blockhash: 'mock-blockhash-' + 'A'.repeat(32),
    lastValidBlockHeight: 999,
  });
  mockConnection.sendRawTransaction.mockReset().mockResolvedValue('mock-signature-sendraw');
  mockConnection.confirmTransaction.mockReset().mockResolvedValue({ value: { err: null } });

  mockAlert.mockReset();
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    globalThis.localStorage.clear();
  }
  mockAsyncStorageMemory.clear();
  mockSecureStorageMemory.clear();
}

// ── Register global jest.mock calls ─────────────────────────────
// These must be at module scope for jest hoisting.

jest.mock('@solana-mobile/mobile-wallet-adapter-protocol-web3js', () => ({
  transact: (callback: (wallet: any) => Promise<any>, options?: unknown) =>
    mockTransact(callback, options),
}));

jest.mock('@solana-mobile/mobile-wallet-adapter-protocol', () => {
  class SolanaMobileWalletAdapterError extends Error {
    code: number;
    constructor(message: string, code: number, _data?: unknown) {
      super(message);
      this.name = 'SolanaMobileWalletAdapterError';
      this.code = code;
    }
  }
  class SolanaMobileWalletAdapterProtocolError extends Error {
    code: number;
    constructor(message: string, code: number, _data?: unknown) {
      super(message);
      this.name = 'SolanaMobileWalletAdapterProtocolError';
      this.code = code;
    }
  }
  return {
    SolanaMobileWalletAdapterError,
    SolanaMobileWalletAdapterErrorCode: { ERROR_WALLET_NOT_FOUND: 1 },
    SolanaMobileWalletAdapterProtocolError,
    SolanaMobileWalletAdapterProtocolErrorCode: {
      ERROR_AUTHORIZATION_FAILED: -2,
      ERROR_NOT_SUBMITTED: -4,
      ERROR_NOT_SIGNED: -5,
    },
  };
});

jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn(() => mockConnection),
  };
});

jest.mock(
  '@react-native-async-storage/async-storage',
  () => ({
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => mockAsyncStorageMemory.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        mockAsyncStorageMemory.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        mockAsyncStorageMemory.delete(key);
      }),
    },
  }),
  { virtual: true }
);

jest.mock(
  'expo-secure-store',
  () => ({
    getItemAsync: jest.fn(async (key: string) => mockSecureStorageMemory.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      mockSecureStorageMemory.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      mockSecureStorageMemory.delete(key);
    }),
  }),
  { virtual: true }
);

jest.mock('react-native', () => {
  const React = require('react');
  // RN props that must NOT be passed to DOM elements
  const STRIP = new Set([
    'style','contentContainerStyle','showsVerticalScrollIndicator',
    'showsHorizontalScrollIndicator','keyboardShouldPersistTaps',
    'bounces','alwaysBounceVertical','refreshControl',
    'accessibilityRole','accessibilityLabel','accessibilityHint',
    'accessibilityState','testID','pointerEvents',
    'collapsable','needsOffscreenAlphaCompositing',
    'numberOfLines','ellipsizeMode','selectable',
    'adjustsFontSizeToFit','minimumFontScale','onLayout',
    'activeOpacity','placeholderTextColor','trackColor','thumbColor',
    'keyboardType','editable','autoCorrect','autoCapitalize',
  ]);
  const clean = (p: any) => {
    const out: any = {};
    for (const k of Object.keys(p)) if (!STRIP.has(k)) out[k] = p[k];
    return out;
  };
  const mk = (tag: string) => React.forwardRef((props: any, ref: any) => {
    const { children, ...rest } = props;
    return React.createElement(tag, { ...clean(rest), ref }, children);
  });
  return {
    View: mk('div'),
    Text: mk('span'),
    Pressable: React.forwardRef((props: any, ref: any) => {
      const { children, onPress, disabled, style, ...rest } = props;
      const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style;
      return React.createElement('button', {
        ...clean({ ...rest, style: resolvedStyle }),
        ref,
        onClick: onPress,
        disabled,
      }, children);
    }),
    TouchableOpacity: React.forwardRef((props: any, ref: any) => {
      const { children, onPress, disabled, ...rest } = props;
      return React.createElement('button', { ...clean(rest), ref, onClick: onPress, disabled }, children);
    }),
    TextInput: React.forwardRef((props: any, ref: any) => {
      const { value, onChangeText, ...rest } = props;
      return React.createElement('input', {
        ...clean(rest), ref, value: value ?? '',
        onChange: (e: any) => onChangeText?.(e.target.value),
      });
    }),
    ScrollView: mk('div'),
    SafeAreaView: mk('div'),
    ActivityIndicator: mk('div'),
    RefreshControl: mk('div'),
    Switch: React.forwardRef((props: any, ref: any) => {
      const { value, onValueChange, ...rest } = props;
      return React.createElement('input', {
        ...clean(rest), ref, type: 'checkbox', checked: value ?? false,
        onChange: (e: any) => onValueChange?.(e.target.checked),
      });
    }),
    StyleSheet: { create: (s: any) => s },
    Animated: {
      View: mk('div'),
      Value: jest.fn(() => ({
        interpolate: jest.fn(),
        setValue: jest.fn(),
        stopAnimation: jest.fn(),
      })),
      timing: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
      loop: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
      sequence: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
      parallel: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    },
    Alert: { alert: (...args: any[]) => mockAlert(...args) },
    Dimensions: { get: jest.fn(() => ({ width: 375, height: 812 })) },
    StatusBar: { currentHeight: 24 },
    Platform: { OS: 'android', select: jest.fn((m: any) => m.android ?? m.default) },
  };
});

jest.mock('expo-status-bar', () => {
  const React = require('react');
  return { StatusBar: () => React.createElement('div', { 'data-testid': 'status-bar' }) };
});
jest.mock('react-native-get-random-values', () => {});

jest.mock('@thinkxx/config', () => {
  const { PublicKey: PK } = jest.requireActual('@solana/web3.js');
  return {
    CLUSTER: { DEVNET: 'devnet' },
    NETWORK_CONFIG: {
      devnet: { rpcEndpoint: 'https://api.devnet.solana.com' },
    },
    PROGRAM_ID: new PK('5FEoFcJ2QK7T8SFDX7jKtCfSKvfGhE8QDRLVH2xSWvaP'),
  };
});
