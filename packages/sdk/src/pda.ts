import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, SEEDS } from '@thinkxx/config';
import BN from 'bn.js';

/**
 * Derive PlanAccount PDA.
 * Seeds: ["plan", owner, plan_id]
 */
export function deriveplanPda(
  owner: PublicKey,
  planId: BN
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.PLAN, owner.toBuffer(), planId.toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID
  );
}

/**
 * Derive GuardianSetAccount PDA.
 * Seeds: ["guardian_set", plan]
 */
export function deriveGuardianSetPda(
  plan: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.GUARDIAN_SET, plan.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive ClaimAccount PDA.
 * Seeds: ["claim", plan]
 */
export function deriveClaimPda(
  plan: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.CLAIM, plan.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive Vault Authority PDA.
 * Seeds: ["vault_authority", plan]
 */
export function deriveVaultAuthorityPda(
  plan: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.VAULT_AUTHORITY, plan.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive SOL Vault PDA.
 * Seeds: ["sol_vault", plan]
 */
export function deriveSolVaultPda(
  plan: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.SOL_VAULT, plan.toBuffer()],
    PROGRAM_ID
  );
}
