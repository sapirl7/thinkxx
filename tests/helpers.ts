/**
 * Shared test helpers for Anchor integration tests.
 * Provides keypair management, airdrop, PDA derivation, and common assertions.
 */
import * as anchor from '@coral-xyz/anchor';
import { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';

export const SEEDS = {
  PLAN: Buffer.from('plan'),
  GUARDIAN_SET: Buffer.from('guardian_set'),
  CLAIM: Buffer.from('claim'),
  VAULT_AUTHORITY: Buffer.from('vault_authority'),
  SOL_VAULT: Buffer.from('sol_vault'),
};

/** Airdrop SOL to a keypair and confirm. */
export async function airdrop(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
  sol: number = 10,
): Promise<void> {
  const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, 'confirmed');
}

/** Derive all PDAs for a plan. */
export function derivePlanPDAs(
  programId: PublicKey,
  owner: PublicKey,
  planId: anchor.BN,
) {
  const [planPda, planBump] = PublicKey.findProgramAddressSync(
    [SEEDS.PLAN, owner.toBuffer(), planId.toArrayLike(Buffer, 'le', 8)],
    programId,
  );
  const [guardianSetPda] = PublicKey.findProgramAddressSync(
    [SEEDS.GUARDIAN_SET, planPda.toBuffer()],
    programId,
  );
  const [claimPda] = PublicKey.findProgramAddressSync(
    [SEEDS.CLAIM, planPda.toBuffer()],
    programId,
  );
  const [vaultAuthorityPda] = PublicKey.findProgramAddressSync(
    [SEEDS.VAULT_AUTHORITY, planPda.toBuffer()],
    programId,
  );
  const [solVaultPda] = PublicKey.findProgramAddressSync(
    [SEEDS.SOL_VAULT, planPda.toBuffer()],
    programId,
  );

  return { planPda, planBump, guardianSetPda, claimPda, vaultAuthorityPda, solVaultPda };
}

/** Create a fresh test context with unique keypairs. */
export function createTestContext(provider: anchor.AnchorProvider) {
  const owner = Keypair.generate();
  const beneficiary = Keypair.generate();
  const guardian1 = Keypair.generate();
  const guardian2 = Keypair.generate();
  const guardian3 = Keypair.generate();

  return { owner, beneficiary, guardian1, guardian2, guardian3 };
}

/** Standard plan parameters for testing. */
export const DEFAULT_PLAN_PARAMS = {
  planId: new anchor.BN(1),
  inactivityDuration: new anchor.BN(86_400),   // 1 day
  gracePeriod: new anchor.BN(86_400),           // 1 day
  guardianQuorum: 2,
  mode: { medical: {} },                        // PlanMode::Medical
};

export const PLAN_MODES = {
  medical: { medical: {} },
  legalRisk: { legalRisk: {} },
  legacy: { legacy: {} },
};
