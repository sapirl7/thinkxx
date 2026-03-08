import { PublicKey } from '@solana/web3.js';

/**
 * Lifeline program ID.
 * Updated after each deployment.
 */
export const PROGRAM_ID = new PublicKey(
  '11111111111111111111111111111111' // Placeholder — updated after first deployment
);

/** PDA seed prefixes used by the Lifeline program */
export const SEEDS = {
  PLAN: Buffer.from('plan'),
  GUARDIAN_SET: Buffer.from('guardian_set'),
  CLAIM: Buffer.from('claim'),
  VAULT_AUTHORITY: Buffer.from('vault_authority'),
  SOL_VAULT: Buffer.from('sol_vault'),
} as const;
