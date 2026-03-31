import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
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
import {
  clearWalletSession,
  loadWalletSession,
  persistWalletSession,
} from '../state/wallet-session';

const SOLANA_SIGN_TRANSACTIONS_FEATURE = 'solana:signTransactions';

/** Wallet connection state */
interface WalletState {
  connected: boolean;
  publicKey: PublicKey | null;
  connecting: boolean;
  error: string | null;
  hydrated: boolean;
}

/** Wallet context value */
interface WalletContextValue extends WalletState {
  connection: Connection;
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndSendTransaction: (transaction: Transaction) => Promise<string>;
  shortAddress: string | null;
  /** Best-effort wallet app label derived from wallet_uri_base host */
  walletLabel: string | null;
  /** Current RPC endpoint URL */
  rpcEndpoint: string;
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

const APP_SCHEME = 'thinkxx';
const APP_IDENTITY = {
  name: 'Thinkxx',
  // Use the app scheme until a dedicated public app site exists.
  // This avoids wallet approval sheets presenting a generic github.com host.
  uri: `${APP_SCHEME}://app`,
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
    hydrated: false,
    authToken: null,
    walletUriBase: null,
  });

  const connection = useMemo(
    () => new Connection(NETWORK_CONFIG[CLUSTER.DEVNET].rpcEndpoint, 'confirmed'),
    []
  );

  useEffect(() => {
    let active = true;

    const hydrateSession = async (): Promise<void> => {
      try {
        const session = await loadWalletSession();
        if (!active) {
          return;
        }

        const { publicKeyBase58, authToken, walletUriBase } = session;

        if (publicKeyBase58 && authToken) {
          setState(current => ({
            ...current,
            connected: true,
            publicKey: new PublicKey(publicKeyBase58),
            authToken,
            walletUriBase,
            hydrated: true,
          }));
          return;
        }
      } catch {
        // Ignore corrupted persisted session and continue with empty state.
      }

      if (!active) {
        return;
      }

      setState(current => ({
        ...current,
        hydrated: true,
      }));
    };

    void hydrateSession();

    return () => {
      active = false;
    };
  }, []);

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
        hydrated: true,
        authToken: session.authToken,
        walletUriBase: session.walletUriBase,
      }));

      await persistWalletSession({
        publicKeyBase58: session.publicKey.toBase58(),
        authToken: session.authToken,
        walletUriBase: session.walletUriBase,
        lastConnectedAt: Date.now(),
      });

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
      setState(s => ({
        ...s,
        connecting: false,
        hydrated: true,
        error: toWalletErrorMessage(err),
      }));
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

    void clearWalletSession();

    setState({
      connected: false,
      publicKey: null,
      connecting: false,
      error: null,
      hydrated: true,
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
          const capabilities = await wallet.getCapabilities();
          const features = new Set<string>(capabilities.features as string[] | undefined);

          // Fetch the freshest possible blockhash right before signing.
          // Use 'processed' commitment for minimum staleness.
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('processed');

          transaction.feePayer = transaction.feePayer ?? session.publicKey;
          transaction.recentBlockhash = blockhash;

          let signature: string | undefined;

          // Prefer signTransactions over signAndSendTransactions.
          // With signTransactions the wallet returns the signed tx immediately
          // and we submit it ourselves — avoiding the wallet's internal
          // blockhash-staleness check that causes "Transaction expired".
          if (features.has(SOLANA_SIGN_TRANSACTIONS_FEATURE)) {
            const [signedTransaction] = await wallet.signTransactions({
              transactions: [transaction],
            });

            if (!signedTransaction) {
              throw new Error('Wallet did not return a signed transaction');
            }

            signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
              skipPreflight: true,
              preflightCommitment: 'confirmed',
            });
          } else if (capabilities.supports_sign_and_send_transactions) {
            [signature] = await wallet.signAndSendTransactions({
              transactions: [transaction],
              commitment: 'confirmed',
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

  const shortAddress = state.publicKey
    ? `${state.publicKey.toBase58().slice(0, 4)}...${state.publicKey.toBase58().slice(-4)}`
    : null;

  // Derive wallet label from wallet_uri_base, e.g. "phantom" from "https://phantom.app/..."
  const walletLabel = useMemo(() => {
    if (!state.walletUriBase) return null;
    try {
      const host = new URL(state.walletUriBase).hostname;
      // Strip common TLD patterns: "phantom.app" → "Phantom"
      const name = host.split('.')[0] ?? host;
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      return state.walletUriBase;
    }
  }, [state.walletUriBase]);

  const rpcEndpoint = NETWORK_CONFIG[CLUSTER.DEVNET].rpcEndpoint;

  const value: WalletContextValue = {
    ...state,
    connection,
    connect,
    disconnect,
    signAndSendTransaction,
    shortAddress,
    walletLabel,
    rpcEndpoint,
  };

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
