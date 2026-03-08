import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { PublicKey, Connection } from '@solana/web3.js';
import { CLUSTER, NETWORK_CONFIG } from '@thinkxx/config';

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
  shortAddress: string | null;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * WalletProvider manages wallet connection state.
 *
 * In production, this will integrate with Mobile Wallet Adapter (MWA).
 * Currently provides the connection and wallet state interface
 * that all screens consume.
 */
export function WalletProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    connecting: false,
    error: null,
  });

  const connection = useMemo(
    () => new Connection(NETWORK_CONFIG[CLUSTER.DEVNET].rpcEndpoint, 'confirmed'),
    []
  );

  const connect = useCallback(async () => {
    setState(s => ({ ...s, connecting: true, error: null }));
    try {
      // TODO(#6): Integrate MWA — `transact(wallet => wallet.authorize(...))`
      // For now, simulate connection with a placeholder
      // In production, this triggers the MWA authorization flow
      // which opens the wallet app for user approval
      setState({
        connected: false,
        publicKey: null,
        connecting: false,
        error: 'MWA integration not yet available — install a Solana wallet app',
      });
    } catch (err) {
      setState(s => ({
        ...s,
        connecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect wallet',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      publicKey: null,
      connecting: false,
      error: null,
    });
  }, []);

  const shortAddress = state.publicKey
    ? `${state.publicKey.toBase58().slice(0, 4)}...${state.publicKey.toBase58().slice(-4)}`
    : null;

  const value: WalletContextValue = {
    ...state,
    connection,
    connect,
    disconnect,
    shortAddress,
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
