import { PublicKey } from '@solana/web3.js';

const textEncoder = new TextEncoder();

function encodeSeed(value: string): Uint8Array {
  return textEncoder.encode(value);
}

/**
 * Lifeline program ID.
 * Updated after each deployment.
 */
export const PROGRAM_ID = new PublicKey(
  '11111111111111111111111111111111' // Placeholder — updated after first deployment
);

/** PDA seed prefixes used by the Lifeline program */
export const SEEDS = {
  PLAN: encodeSeed('plan'),
  GUARDIAN_SET: encodeSeed('guardian_set'),
  CLAIM: encodeSeed('claim'),
  VAULT_AUTHORITY: encodeSeed('vault_authority'),
  SOL_VAULT: encodeSeed('sol_vault'),
} as const;
