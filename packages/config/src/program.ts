import { PublicKey } from '@solana/web3.js';

const textEncoder = new TextEncoder();

function encodeSeed(value: string): Uint8Array {
  return textEncoder.encode(value);
}

/**
 * Default Lifeline program ID (last devnet deployment).
 * Override at runtime without code changes via env:
 *   - EXPO_PUBLIC_PROGRAM_ID  (mobile / Expo — inlined at build time)
 *   - THINKXX_PROGRAM_ID      (CLI / Node)
 * Set this to the freshly-issued program id after a new deploy.
 */
const DEFAULT_PROGRAM_ID = '5FEoFcJ2QK7T8SFDX7jKtCfSKvfGhE8QDRLVH2xSWvaP';

function resolveProgramId(): PublicKey {
  const env = ((globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env) ?? {};
  const candidate = env.EXPO_PUBLIC_PROGRAM_ID ?? env.THINKXX_PROGRAM_ID ?? DEFAULT_PROGRAM_ID;
  try {
    return new PublicKey(candidate);
  } catch {
    return new PublicKey(DEFAULT_PROGRAM_ID);
  }
}

export const PROGRAM_ID = resolveProgramId();

/** PDA seed prefixes used by the Lifeline program */
export const SEEDS = {
  PLAN: encodeSeed('plan'),
  GUARDIAN_SET: encodeSeed('guardian_set'),
  CLAIM: encodeSeed('claim'),
  VAULT_AUTHORITY: encodeSeed('vault_authority'),
  SOL_VAULT: encodeSeed('sol_vault'),
} as const;
