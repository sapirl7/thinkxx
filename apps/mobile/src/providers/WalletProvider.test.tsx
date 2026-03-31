/**
 * WalletProvider tests — full renderHook-based tests.
 *
 * Uses shared mock-kit. Covers:
 * - connect() happy path + error mapping
 * - disconnect() with deauthorize + state clear
 * - signAndSendTransaction() paths and errors
 *
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Buffer } from 'buffer';

import {
  resetMobileMocks,
  mockTransact,
  mockWallet,
  mockConnection,
  defaultAuthResponse,
  defaultCapabilities,
} from '../../test/setup';

// Import the real provider + hook
import { WalletProvider, useWallet } from '../providers/WalletProvider';

function wrapper({ children }: { children: ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}

beforeEach(() => {
  resetMobileMocks();
});

describe('WalletProvider', () => {
  describe('connect()', () => {
    it('restores persisted session on mount', async () => {
      const secureStore = require('expo-secure-store');
      await secureStore.setItemAsync(
        'thinkxx.wallet.session',
        JSON.stringify({
          publicKeyBase58: PublicKey.default.toBase58(),
          authToken: 'persisted-token',
          walletUriBase: 'https://persisted-wallet.app',
          lastConnectedAt: Date.now(),
        })
      );

      const { result } = renderHook(() => useWallet(), { wrapper });

      await waitFor(() => {
        expect(result.current.hydrated).toBe(true);
        expect(result.current.connected).toBe(true);
      });
      expect(result.current.publicKey?.toBase58()).toBe(PublicKey.default.toBase58());
    });

    it('sets connected, publicKey, clears error on success', async () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      expect(result.current.connected).toBe(false);
      expect(result.current.publicKey).toBeNull();

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.connected).toBe(true);
      expect(result.current.publicKey).toBeInstanceOf(PublicKey);
      expect(result.current.error).toBeNull();
    });

    it('maps ERROR_WALLET_NOT_FOUND to human-readable message', async () => {
      const { SolanaMobileWalletAdapterError, SolanaMobileWalletAdapterErrorCode } =
        require('@solana-mobile/mobile-wallet-adapter-protocol');

      mockTransact.mockRejectedValueOnce(
        new SolanaMobileWalletAdapterError(
          'not found',
          SolanaMobileWalletAdapterErrorCode.ERROR_WALLET_NOT_FOUND,
        ),
      );

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.error).toContain('No compatible Solana wallet');
      expect(result.current.connected).toBe(false);
    });

    it('maps ERROR_AUTHORIZATION_FAILED to human-readable message', async () => {
      const { SolanaMobileWalletAdapterProtocolError, SolanaMobileWalletAdapterProtocolErrorCode } =
        require('@solana-mobile/mobile-wallet-adapter-protocol');

      mockTransact.mockRejectedValueOnce(
        new SolanaMobileWalletAdapterProtocolError(
          'denied',
          SolanaMobileWalletAdapterProtocolErrorCode.ERROR_AUTHORIZATION_FAILED,
        ),
      );

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.error).toContain('canceled or denied');
      expect(result.current.connected).toBe(false);
    });
  });

  describe('disconnect()', () => {
    it('calls deauthorize when authToken present and clears all state', async () => {
      const secureStore = require('expo-secure-store');
      const { result } = renderHook(() => useWallet(), { wrapper });

      // Connect first
      await act(async () => {
        await result.current.connect();
      });
      expect(result.current.connected).toBe(true);

      // Disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.publicKey).toBeNull();
      // deauthorize called via transact
      expect(mockTransact).toHaveBeenCalled();
      await Promise.resolve();
      expect(await secureStore.getItemAsync('thinkxx.wallet.session')).toBeNull();
    });
  });

  describe('signAndSendTransaction()', () => {
    it('throws when not connected', async () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      await expect(
        act(async () => {
          await result.current.signAndSendTransaction(new Transaction());
        }),
      ).rejects.toThrow('Connect your wallet first');
    });

    it('uses signAndSendTransactions when supported', async () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      let signature: string | undefined;
      await act(async () => {
        signature = await result.current.signAndSendTransaction(new Transaction());
      });

      expect(signature).toBe('mock-signature-sas');
      expect(mockWallet.signAndSendTransactions).toHaveBeenCalled();
      expect(mockConnection.confirmTransaction).toHaveBeenCalled();
    });

    it('falls back to signTransactions + sendRawTransaction', async () => {
      // getCapabilities returns fallback-only for ALL transact calls
      mockWallet.getCapabilities.mockResolvedValue({
        supports_sign_and_send_transactions: false,
        features: ['solana:signTransactions'],
      });

      // signTransactions must return something serializable
      const mockSignedTx = new Transaction();
      // Patch serialize since the TX has no real signatures
      jest.spyOn(mockSignedTx, 'serialize').mockReturnValue(Buffer.alloc(100));
      mockWallet.signTransactions.mockResolvedValue([mockSignedTx]);

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      let signature: string | undefined;
      await act(async () => {
        signature = await result.current.signAndSendTransaction(new Transaction());
      });

      expect(signature).toBe('mock-signature-sendraw');
      expect(mockWallet.signTransactions).toHaveBeenCalled();
      expect(mockConnection.sendRawTransaction).toHaveBeenCalled();
    });

    it('throws when wallet supports neither signing method', async () => {
      mockWallet.getCapabilities.mockResolvedValue({
        supports_sign_and_send_transactions: false,
        features: [],
      });

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      await expect(
        act(async () => {
          await result.current.signAndSendTransaction(new Transaction());
        }),
      ).rejects.toThrow('does not support transaction submission');
    });

    it('throws when no signature returned', async () => {
      mockWallet.signAndSendTransactions.mockResolvedValue([undefined]);

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      await expect(
        act(async () => {
          await result.current.signAndSendTransaction(new Transaction());
        }),
      ).rejects.toThrow('did not return a transaction signature');
    });

    it('throws when confirmTransaction returns err', async () => {
      mockConnection.confirmTransaction.mockResolvedValue({
        value: { err: { InstructionError: [0, 'Custom'] } },
      });

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      await expect(
        act(async () => {
          await result.current.signAndSendTransaction(new Transaction());
        }),
      ).rejects.toThrow('Transaction failed');
    });

    it('maps ERROR_NOT_SUBMITTED to human-readable message', async () => {
      const { SolanaMobileWalletAdapterProtocolError, SolanaMobileWalletAdapterProtocolErrorCode } =
        require('@solana-mobile/mobile-wallet-adapter-protocol');

      // Make transact throw during signAndSend (second call, after connect)
      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      // Override transact for the sign call
      mockTransact.mockRejectedValueOnce(
        new SolanaMobileWalletAdapterProtocolError(
          'not submitted',
          SolanaMobileWalletAdapterProtocolErrorCode.ERROR_NOT_SUBMITTED,
        ),
      );

      await expect(
        act(async () => {
          await result.current.signAndSendTransaction(new Transaction());
        }),
      ).rejects.toThrow('did not submit');
    });

    it('maps ERROR_NOT_SIGNED to human-readable message', async () => {
      const { SolanaMobileWalletAdapterProtocolError, SolanaMobileWalletAdapterProtocolErrorCode } =
        require('@solana-mobile/mobile-wallet-adapter-protocol');

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      mockTransact.mockRejectedValueOnce(
        new SolanaMobileWalletAdapterProtocolError(
          'not signed',
          SolanaMobileWalletAdapterProtocolErrorCode.ERROR_NOT_SIGNED,
        ),
      );

      await expect(
        act(async () => {
          await result.current.signAndSendTransaction(new Transaction());
        }),
      ).rejects.toThrow('did not sign');
    });
  });
});
