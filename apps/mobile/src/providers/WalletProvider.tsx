import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import {
  transact,
  type Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { CLUSTER, NETWORK_CONFIG, PROGRAM_ID } from '@thinkxx/config';
import {
  SolanaMobileWalletAdapterError,
  SolanaMobileWalletAdapterErrorCode,
  SolanaMobileWalletAdapterProtocolError,
  SolanaMobileWalletAdapterProtocolErrorCode,
} from '@solana-mobile/mobile-wallet-adapter-protocol';

const SOLANA_SIGN_TRANSACTIONS_FEATURE = 'solana:signTransactions';

/** Wallet connection state */
interface WalletState {
  connected: boolean;
  publicKey: PublicKey | null;
  connecting: boolean;
  error: string | null;
}

/** Wallet context value */
interface WalletContextValue extends WalletState {
  connection: Connection;
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndSendTransaction: (transaction: Transaction) => Promise<string>;
  shortAddress: string | null;
}

interface WalletSessionState extends WalletState {
  authToken: string | null;
  walletUriBase: string | null;
}

interface WalletAuthorizationResult {
  accounts: Array<{ address: string }>;
  auth_token: string;
  wallet_uri_base?: string;
}

interface AuthorizedWalletSession {
  publicKey: PublicKey;
  authToken: string;
  walletUriBase: string | null;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const APP_IDENTITY = {
  name: 'Thinkxx',
  uri: 'https://github.com/sapirl7/thinkxx',
} as const;

const DEVNET_CHAIN = 'solana:devnet';
const UNCONFIGURED_PROGRAM_ID = '11111111111111111111111111111111';
const PROGRAM_NOT_DEPLOYED_MESSAGE =
  'Thinkxx program is not deployed to devnet yet. Set a real PROGRAM_ID before testing on-chain actions.';

function toPublicKey(base64Address: string): PublicKey {
  return new PublicKey(Buffer.from(base64Address, 'base64'));
}

function toAuthorizedSession(
  authorization: WalletAuthorizationResult,
  fallbackWalletUriBase: string | null,
): AuthorizedWalletSession {
  const [account] = authorization.accounts;
  if (!account) {
    throw new Error('Wallet did not return an authorized account');
  }

  return {
    publicKey: toPublicKey(account.address),
    authToken: authorization.auth_token,
    walletUriBase: authorization.wallet_uri_base ?? fallbackWalletUriBase,
  };
}

function containsUnconfiguredThinkxxInstruction(transaction: Transaction): boolean {
  if (PROGRAM_ID.toBase58() !== UNCONFIGURED_PROGRAM_ID) {
    return false;
  }

  return transaction.instructions.some(instruction => instruction.programId.equals(PROGRAM_ID));
}

function toWalletErrorMessage(error: unknown): string {
  if (
    error instanceof SolanaMobileWalletAdapterError &&
    error.code === SolanaMobileWalletAdapterErrorCode.ERROR_WALLET_NOT_FOUND
  ) {
    return 'No compatible Solana wallet found. Install Phantom or Solflare on this device.';
  }

  if (
    error instanceof SolanaMobileWalletAdapterProtocolError &&
    error.code === SolanaMobileWalletAdapterProtocolErrorCode.ERROR_AUTHORIZATION_FAILED
  ) {
    return 'Wallet authorization was canceled or denied.';
  }

  if (
    error instanceof SolanaMobileWalletAdapterProtocolError &&
    error.code === SolanaMobileWalletAdapterProtocolErrorCode.ERROR_NOT_SUBMITTED
  ) {
    return 'Wallet signed the transaction but did not submit it.';
  }

  if (
    error instanceof SolanaMobileWalletAdapterProtocolError &&
    error.code === SolanaMobileWalletAdapterProtocolErrorCode.ERROR_NOT_SIGNED
  ) {
    return 'Wallet did not sign the transaction.';
  }

  return error instanceof Error ? error.message : 'Failed to connect wallet';
}

/**
 * WalletProvider manages wallet connection state.
 *
 * In production, this will integrate with Mobile Wallet Adapter (MWA).
 * Currently provides the connection and wallet state interface
 * that all screens consume.
 */
export function WalletProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<WalletSessionState>({
    connected: false,
    publicKey: null,
    connecting: false,
    error: null,
    authToken: null,
    walletUriBase: null,
  });

  const connection = useMemo(
    () => new Connection(NETWORK_CONFIG[CLUSTER.DEVNET].rpcEndpoint, 'confirmed'),
    []
  );

  const authorizeWallet = useCallback(
    async (wallet: Web3MobileWallet): Promise<AuthorizedWalletSession> => {
      const authorization = await wallet.authorize({
        auth_token: state.authToken ?? undefined,
        chain: DEVNET_CHAIN,
        identity: APP_IDENTITY,
      });
      const session = toAuthorizedSession(authorization, state.walletUriBase);

      setState(current => ({
        ...current,
        connected: true,
        connecting: false,
        publicKey: session.publicKey,
        error: null,
        authToken: session.authToken,
        walletUriBase: session.walletUriBase,
      }));

      return session;
    },
    [state.authToken, state.walletUriBase]
  );

  const connect = useCallback(async () => {
    setState(s => ({ ...s, connecting: true, error: null }));
    try {
      await transact(
        async wallet => {
          await authorizeWallet(wallet);
        },
        state.walletUriBase ? { baseUri: state.walletUriBase } : undefined
      );
    } catch (err) {
      setState(s => ({ ...s, error: toWalletErrorMessage(err) }));
    } finally {
      // Guarantee the connecting spinner clears on every path.
      setState(s => (s.connecting ? { ...s, connecting: false } : s));
    }
  }, [authorizeWallet, state.walletUriBase]);

  const disconnect = useCallback(() => {
    const authToken = state.authToken;
    const walletUriBase = state.walletUriBase;

    if (authToken) {
      void transact(
        async wallet => wallet.deauthorize({ auth_token: authToken }),
        walletUriBase ? { baseUri: walletUriBase } : undefined
      ).catch(() => {
        // Ignore disconnect cleanup failures and clear local session state regardless.
      });
    }

    setState({
      connected: false,
      publicKey: null,
      connecting: false,
      error: null,
      authToken: null,
      walletUriBase: null,
    });
  }, [state.authToken, state.walletUriBase]);

  const signAndSendTransaction = useCallback(async (transaction: Transaction): Promise<string> => {
    if (!state.connected) {
      throw new Error('Connect your wallet first');
    }

    if (containsUnconfiguredThinkxxInstruction(transaction)) {
      throw new Error(PROGRAM_NOT_DEPLOYED_MESSAGE);
    }

    try {
      return await transact(
        async wallet => {
          const session = await authorizeWallet(wallet);
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
          const capabilities = await wallet.getCapabilities();
          const features = new Set<string>(capabilities.features as string[] | undefined);

          transaction.feePayer = transaction.feePayer ?? session.publicKey;
          transaction.recentBlockhash = blockhash;

          let signature: string | undefined;

          if (capabilities.supports_sign_and_send_transactions) {
            [signature] = await wallet.signAndSendTransactions({
              transactions: [transaction],
              commitment: 'confirmed',
            });
          } else if (features.has(SOLANA_SIGN_TRANSACTIONS_FEATURE)) {
            const [signedTransaction] = await wallet.signTransactions({
              transactions: [transaction],
            });

            if (!signedTransaction) {
              throw new Error('Wallet did not return a signed transaction');
            }

            signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
              preflightCommitment: 'confirmed',
            });
          } else {
            throw new Error('This wallet does not support transaction submission for Thinkxx.');
          }

          if (!signature) {
            throw new Error('Wallet did not return a transaction signature');
          }

          const confirmation = await connection.confirmTransaction(
            { signature, blockhash, lastValidBlockHeight },
            'confirmed'
          );

          if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
          }

          return signature;
        },
        state.walletUriBase ? { baseUri: state.walletUriBase } : undefined
      );
    } catch (err) {
      const message = toWalletErrorMessage(err);
      setState(current => ({ ...current, error: message }));
      throw new Error(message);
    }
  }, [authorizeWallet, connection, state.connected, state.walletUriBase]);

  const value = useMemo<WalletContextValue>(() => {
    const shortAddress = state.publicKey
      ? `${state.publicKey.toBase58().slice(0, 4)}...${state.publicKey.toBase58().slice(-4)}`
      : null;
    return {
      ...state,
      connection,
      connect,
      disconnect,
      signAndSendTransaction,
      shortAddress,
    };
  }, [state, connection, connect, disconnect, signAndSendTransaction]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

/**
 * Hook to access wallet context.
 * Must be used within a WalletProvider.
 */
export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return ctx;
}
