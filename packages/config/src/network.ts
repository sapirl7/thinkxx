import type { NetworkConfig } from './types';

/** Solana cluster identifiers */
export const CLUSTER = {
  DEVNET: 'devnet',
  MAINNET: 'mainnet-beta',
  LOCALNET: 'localnet',
} as const;

/** Network configurations */
export const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  [CLUSTER.DEVNET]: {
    name: 'Devnet',
    rpcEndpoint: 'https://api.devnet.solana.com',
    explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
  },
  [CLUSTER.LOCALNET]: {
    name: 'Localnet',
    rpcEndpoint: 'http://127.0.0.1:8899',
    explorerUrl: 'https://explorer.solana.com/?cluster=custom',
  },
} as const;
