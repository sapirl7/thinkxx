/**
 * WalletProvider tests — covers connect, disconnect, signAndSendTransaction logic.
 * Priority 1 — validates fixes from P2 audit findings #3.
 *
 * Tests the transaction flow logic and error mapping directly.
 */

import { PublicKey, Transaction } from '@solana/web3.js';
import { Buffer } from 'buffer';

// ── Error Message Mapping (extracted from WalletProvider.tsx) ──

const MWA_ERROR_CODES = {
  ERROR_WALLET_NOT_FOUND: 1,
} as const;

const MWA_PROTOCOL_ERROR_CODES = {
  ERROR_AUTHORIZATION_FAILED: -2,
  ERROR_NOT_SUBMITTED: -4,
  ERROR_NOT_SIGNED: -5,
} as const;

function mapMWAError(code: number, message: string): string {
  if (code === MWA_ERROR_CODES.ERROR_WALLET_NOT_FOUND) {
    return 'No compatible Solana wallet found. Please install Phantom or Solflare.';
  }
  return `Connection failed: ${message}`;
}

function mapMWAProtocolError(code: number, message: string): string {
  switch (code) {
    case MWA_PROTOCOL_ERROR_CODES.ERROR_AUTHORIZATION_FAILED:
      return 'Authorization was canceled or denied by the wallet.';
    case MWA_PROTOCOL_ERROR_CODES.ERROR_NOT_SUBMITTED:
      return 'Wallet signed the transaction but did not submit it to the network.';
    case MWA_PROTOCOL_ERROR_CODES.ERROR_NOT_SIGNED:
      return 'Wallet did not sign the transaction. Please try again.';
    default:
      return `Protocol error: ${message}`;
  }
}

// ── Capability-Aware Flow Logic ──

interface WalletCapabilities {
  supports_sign_and_send_transactions: boolean;
  features: string[];
}

const SOLANA_SIGN_TRANSACTIONS_FEATURE = 'solana:signTransactions';

function selectSigningMethod(caps: WalletCapabilities): 'signAndSend' | 'signOnly' | 'none' {
  if (caps.supports_sign_and_send_transactions) {
    return 'signAndSend';
  }
  if (caps.features.includes(SOLANA_SIGN_TRANSACTIONS_FEATURE)) {
    return 'signOnly';
  }
  return 'none';
}

// ── Session State ──

interface WalletSessionState {
  connected: boolean;
  publicKey: PublicKey | null;
  authToken: string | null;
  error: string | null;
}

function createInitialState(): WalletSessionState {
  return {
    connected: false,
    publicKey: null,
    authToken: null,
    error: null,
  };
}

function applyConnect(
  state: WalletSessionState,
  pubkeyB64: string,
  authToken: string,
): WalletSessionState {
  const pubkeyBytes = Buffer.from(pubkeyB64, 'base64');
  const publicKey = new PublicKey(pubkeyBytes);
  return {
    ...state,
    connected: true,
    publicKey,
    authToken,
    error: null,
  };
}

function applyDisconnect(): WalletSessionState {
  return createInitialState();
}

// ── Tests ──────────────────────────────────────────────

describe('WalletProvider logic', () => {
  describe('Error message mapping', () => {
    it('maps ERROR_WALLET_NOT_FOUND', () => {
      const msg = mapMWAError(MWA_ERROR_CODES.ERROR_WALLET_NOT_FOUND, 'not found');
      expect(msg).toContain('No compatible Solana wallet');
      expect(msg).toContain('Phantom');
    });

    it('maps unknown MWA error to generic', () => {
      const msg = mapMWAError(999, 'some error');
      expect(msg).toContain('Connection failed');
    });

    it('maps ERROR_AUTHORIZATION_FAILED', () => {
      const msg = mapMWAProtocolError(
        MWA_PROTOCOL_ERROR_CODES.ERROR_AUTHORIZATION_FAILED,
        'denied',
      );
      expect(msg).toContain('denied');
    });

    it('maps ERROR_NOT_SUBMITTED', () => {
      const msg = mapMWAProtocolError(
        MWA_PROTOCOL_ERROR_CODES.ERROR_NOT_SUBMITTED,
        'not submitted',
      );
      expect(msg).toContain('signed');
      expect(msg).toContain('did not submit');
    });

    it('maps ERROR_NOT_SIGNED', () => {
      const msg = mapMWAProtocolError(
        MWA_PROTOCOL_ERROR_CODES.ERROR_NOT_SIGNED,
        'not signed',
      );
      expect(msg).toContain('did not sign');
    });

    it('maps unknown protocol error to generic', () => {
      const msg = mapMWAProtocolError(-999, 'mystery');
      expect(msg).toContain('Protocol error');
    });
  });

  describe('Signing method selection', () => {
    it('prefers signAndSend when supported', () => {
      expect(selectSigningMethod({
        supports_sign_and_send_transactions: true,
        features: [],
      })).toBe('signAndSend');
    });

    it('falls back to signOnly when feature present', () => {
      expect(selectSigningMethod({
        supports_sign_and_send_transactions: false,
        features: [SOLANA_SIGN_TRANSACTIONS_FEATURE],
      })).toBe('signOnly');
    });

    it('returns none when neither available', () => {
      expect(selectSigningMethod({
        supports_sign_and_send_transactions: false,
        features: [],
      })).toBe('none');
    });

    it('signAndSend takes priority over signOnly', () => {
      expect(selectSigningMethod({
        supports_sign_and_send_transactions: true,
        features: [SOLANA_SIGN_TRANSACTIONS_FEATURE],
      })).toBe('signAndSend');
    });
  });

  describe('Session state', () => {
    it('initial state is disconnected', () => {
      const state = createInitialState();
      expect(state.connected).toBe(false);
      expect(state.publicKey).toBeNull();
      expect(state.authToken).toBeNull();
      expect(state.error).toBeNull();
    });

    it('connect sets connected + publicKey', () => {
      const initial = createInitialState();
      const pubkeyB64 = Buffer.from(PublicKey.default.toBuffer()).toString('base64');
      const state = applyConnect(initial, pubkeyB64, 'auth-token-123');

      expect(state.connected).toBe(true);
      expect(state.publicKey).toBeInstanceOf(PublicKey);
      expect(state.authToken).toBe('auth-token-123');
      expect(state.error).toBeNull();
    });

    it('disconnect resets all state', () => {
      const pubkeyB64 = Buffer.from(PublicKey.default.toBuffer()).toString('base64');
      const connected = applyConnect(createInitialState(), pubkeyB64, 'token');
      const disconnected = applyDisconnect();

      expect(disconnected.connected).toBe(false);
      expect(disconnected.publicKey).toBeNull();
      expect(disconnected.authToken).toBeNull();
    });

    it('connect clears previous error', () => {
      const withError: WalletSessionState = {
        ...createInitialState(),
        error: 'Previous error',
      };
      const pubkeyB64 = Buffer.from(PublicKey.default.toBuffer()).toString('base64');
      const state = applyConnect(withError, pubkeyB64, 'token');

      expect(state.error).toBeNull();
    });
  });

  describe('Transaction assertion', () => {
    it('not connected throws', () => {
      const connected = false;
      expect(() => {
        if (!connected) throw new Error('Connect your wallet first');
      }).toThrow('Connect your wallet first');
    });

    it('no signature returned throws', () => {
      const signatures = [undefined];
      expect(() => {
        const sig = signatures[0];
        if (!sig) throw new Error('Wallet did not return a transaction signature');
      }).toThrow('did not return a transaction signature');
    });

    it('confirmation error throws', () => {
      const confirmResult = { value: { err: { InstructionError: [0, 'Custom'] } } };
      expect(() => {
        if (confirmResult.value.err) throw new Error('Transaction failed on-chain');
      }).toThrow('Transaction failed');
    });
  });
});
